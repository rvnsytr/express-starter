import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { storageTableSchema } from "@/core/schema.zod";
import { formatZodError, transformKeys } from "@/core/utils";
import { Router } from "express";
import multer from "multer";
import z from "zod";
import { getPresignedUrl, removeFiles, uploadFiles } from "./actions";

const router = Router();

router.get("/", authorize({ storage: ["list"] }), async (req, res) => {
  const bodyParsed = z
    .object({
      url: z.coerce.boolean().optional().default(false),
      category: storageTableSchema.shape.category.optional(),
    })
    .safeParse(req.query);

  if (!bodyParsed.success)
    return res.api({ code: 400, message: formatZodError(bodyParsed.error) });

  const { url: withUrl, category } = bodyParsed.data;

  let query = db.selectFrom("storage").selectAll();
  if (category) query = query.where("category", "=", category);

  let result = await query.orderBy("created_at", (ob) => ob.desc()).execute();

  if (withUrl) {
    result = await Promise.all(
      result.map(async (f) => {
        const fileName = f.file_name;
        const fileUrl = await getPresignedUrl(f.file_path, { fileName });
        return { ...f, fileUrl };
      }),
    );
  }

  return res.api({ data: transformKeys(result, "camel") });
});

router.post(
  "/presigned-url",
  authorize({ storage: ["list"] }),
  async (req, res) => {
    try {
      const bodyParsed = z
        .object({ data: z.string().array() })
        .safeParse(req.body);

      if (!bodyParsed.success)
        throw new Error(formatZodError(bodyParsed.error));

      const { data: keys } = bodyParsed.data;

      const result = await db
        .selectFrom("storage")
        .select(["id", "file_path"])
        .where("id", "in", keys)
        .execute();

      const data = await Promise.all(
        result.map(async ({ id, file_path }) => {
          const fileUrl = await getPresignedUrl(file_path);
          return { id, fileUrl };
        }),
      );

      return res.api({ data });
    } catch (e) {
      return res.api({ code: 400, message: (e as Error).message });
    }
  },
);

router.post(
  "/",
  authorize({ storage: ["create"] }),
  multer().any(),
  async (req, res) => {
    const upload = await uploadFiles(req, {
      overwriteByQuery: true,
      min: 1,
      // disabled: true,
    });
    if (!upload.success) return res.api({ code: 400, message: upload.error });
    return res.api(upload);
  },
);

router.delete("/", authorize({ storage: ["delete"] }), async (req, res) => {
  const bodyParsed = z
    .object({ ids: z.array(z.uuidv4()), userId: z.string() })
    .safeParse(req.body);

  if (!bodyParsed.success) throw new Error(formatZodError(bodyParsed.error));

  const queryParsed = z
    .object({ by: z.enum(["id", "file_path"]).default("id") })
    .safeParse(req.query);
  if (!queryParsed.success) throw new Error(formatZodError(queryParsed.error));

  const { by } = queryParsed.data;
  const { ids, userId } = bodyParsed.data;

  const { count, error } = await removeFiles(ids, userId, { by });
  if (error) return res.api({ code: 400, message: error });

  return res.api({ count: { total: count } });
});

export { router };
