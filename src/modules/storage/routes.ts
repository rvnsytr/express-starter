import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { getPresignedUrl, removeFiles, uploadFiles } from "@/core/storage";
import { formatZodError, transformKeys } from "@/core/utils/formaters";
import { Router } from "express";
import multer from "multer";
import z from "zod";
import { storageTableSchema } from "./schema";

const router = Router();

router.get("/", authorize({ storage: ["list"] }), async (req, res) => {
  const parsedBody = z
    .object({
      url: z.coerce.boolean().optional().default(false),
      category: storageTableSchema.shape.category.optional(),
    })
    .safeParse(req.query);

  if (!parsedBody.success)
    return res.api({ code: 400, ...formatZodError(parsedBody.error, true) });

  const { url: withUrl, category } = parsedBody.data;

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
  authorize({ storage: ["get"] }),
  async (req, res) => {
    const parsedBody = z
      .object({ data: z.string().array() })
      .safeParse(req.body);

    if (!parsedBody.success)
      return res.api({ code: 400, ...formatZodError(parsedBody.error, true) });

    const { data: keys } = parsedBody.data;

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
    if (!upload.success) return res.api({ code: 400, ...upload });

    return res.api(upload);
  },
);

router.delete("/", authorize({ storage: ["delete"] }), async (req, res) => {
  const parsedBody = z
    .object({ ids: z.array(z.uuidv4()), userId: z.string() })
    .safeParse(req.body);

  if (!parsedBody.success)
    return res.api({ code: 400, ...formatZodError(parsedBody.error, true) });

  const queryParsed = z
    .object({ by: z.enum(["id", "file_path"]).default("id") })
    .safeParse(req.query);
  if (!queryParsed.success)
    return res.api({ code: 400, ...formatZodError(queryParsed.error, true) });

  const { by } = queryParsed.data;
  const { ids, userId } = parsedBody.data;

  const remove = await removeFiles(ids, userId, { by });
  if (!remove.success) return res.api({ code: 400, ...remove });

  return res.api(remove);
});

export { router };
