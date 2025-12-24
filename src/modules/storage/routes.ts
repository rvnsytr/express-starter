import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { storageTableSchema } from "@/core/schema.zod";
import { formatZodError, keysToCamel } from "@/core/utils";
import { Router } from "express";
import multer from "multer";
import z from "zod";
import { getPresignedUrl, removeFiles, uploadFiles } from "./actions";

const router = Router();

router.get("/", authorize({ storage: ["list"] }), async (req, res) => {
  const parsed = z
    .object({
      url: z.coerce.boolean().optional().default(false),
      category: storageTableSchema.shape.category.optional(),
    })
    .safeParse(req.query);
  if (!parsed.success)
    return res.api({ code: 400, message: formatZodError(parsed.error) });

  const { url: withUrl, category } = parsed.data;

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

  return res.api({ data: keysToCamel(result) });
});

router.post(
  "/presigned-url",
  authorize({ storage: ["list"] }),
  async (req, res) => {
    try {
      const parsed = z.object({ data: z.string().array() }).safeParse(req.body);
      if (!parsed.success) throw new Error(formatZodError(parsed.error));

      const { data: keys } = parsed.data;

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
    const { data, error } = await uploadFiles(req, {
      overwriteByQuery: true,
      min: 1,
      // disabled: true,
    });
    if (error) return res.api({ code: 400, message: error });
    return res.api({ data });
  },
);

router.delete("/:id", authorize({ storage: ["delete"] }), async (req, res) => {
  const userId = req.session!.user.id;

  const keys = z.uuidv4().safeParse(req.params.id);
  if (!keys.success) throw new Error(formatZodError(keys.error));

  const queryParsed = z
    .object({ by: z.enum(["id", "file_path"]).default("id") })
    .safeParse(req.query);
  if (!queryParsed.success) throw new Error(formatZodError(queryParsed.error));
  const { by } = queryParsed.data;

  const { count, error } = await removeFiles([keys.data], userId, { by });
  if (error) return res.api({ code: 400, message: error });

  return res.api({ data: count });
});

export { router };
