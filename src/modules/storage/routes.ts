import { db } from "@/core/db";
import { authorize, validateRequest } from "@/core/middlewares";
import { sharedSchemas } from "@/core/schema.zod";
import { getPresignedUrl, removeFiles, uploadFiles } from "@/core/storage";
import { transformKeys } from "@/core/utils/formaters";
import { Router } from "express";
import multer from "multer";
import z from "zod";
import { storageTableSchema } from "./schema";

const router = Router();

router.get(
  "/",
  authorize({ storage: ["list"] }),
  validateRequest({
    body: z.object({
      url: sharedSchemas.boolean("URL").optional().default(false),
      category: storageTableSchema.shape.category.optional(),
    }),
  }),
  async (req, res) => {
    const { url: withUrl, category } = req.body;

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
  },
);

router.post(
  "/presigned-url",
  authorize({ storage: ["get"] }),
  validateRequest({ body: z.object({ data: z.string().array() }) }),
  async (req, res) => {
    const result = await db
      .selectFrom("storage")
      .select(["id", "file_path"])
      .where("id", "in", req.body.data)
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
      allowBodyOverride: true,
      enabled: false,
    });
    if (!upload.success) return res.api({ code: 400, ...upload });

    const code = upload.success ? 200 : 400;
    return res.api({ code, ...upload });
  },
);

router.delete(
  "/",
  authorize({ storage: ["delete"] }),
  validateRequest({
    query: z.object({ by: z.enum(["id", "file_path"]).default("id") }),
    body: z.object({ ids: z.array(z.uuidv4()), userId: z.string() }),
  }),
  async (req, res) => {
    const { ids, userId } = req.body;
    const remove = await removeFiles(ids, userId, { by: req.query.by });
    if (!remove.success) return res.api({ code: 400, ...remove });
    return res.api(remove);
  },
);

export { router };
