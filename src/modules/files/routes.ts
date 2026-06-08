import { db } from "@/core/db";
import { authorize, validateRequest } from "@/core/middlewares";
import { getPresignedUrl, removeFiles, uploadFiles } from "@/core/s3";
import { sharedSchemas } from "@/core/schema";
import { Router } from "express";
import multer from "multer";
import z from "zod";
import { allFileCategories } from "./config";
import { filesTableSchema } from "./schema";

const router = Router();

router.get(
  "/",
  authorize({ files: ["list"] }),
  validateRequest({
    body: z.object({
      url: sharedSchemas.boolean("URL").optional().default(false),
      category: filesTableSchema.shape.category.optional(),
    }),
  }),
  async (req, res) => {
    const { url: withUrl, category } = req.body;

    let query = db.selectFrom("files").selectAll();
    if (category) query = query.where("category", "=", category);

    let data = await query.orderBy("created_at", (ob) => ob.desc()).execute();

    if (withUrl) {
      data = await Promise.all(
        data.map(async (f) => {
          const fileName = f.file_name;
          const fileUrl = await getPresignedUrl(f.file_path, { fileName });
          return { ...f, fileUrl };
        }),
      );
    }

    return res.success({ data });
  },
);

router.post(
  "/presigned-url",
  authorize({ files: ["get"] }),
  validateRequest({ body: z.object({ data: z.string().array() }) }),
  async (req, res) => {
    const result = await db
      .selectFrom("files")
      .select(["id", "file_path"])
      .where("id", "in", req.body.data)
      .execute();

    const data = await Promise.all(
      result.map(async ({ id, file_path }) => {
        const fileUrl = await getPresignedUrl(file_path);
        return { id, fileUrl };
      }),
    );

    return res.success({ data });
  },
);

router.post(
  "/",
  authorize({ files: ["create"] }),
  multer().any(),
  async (req, res) => {
    const upload = await uploadFiles(req, {
      allowedCategories: [...allFileCategories],
      allowBodyOverride: true,
      // enabled: false,
    });

    if (!upload.success) return res.success({ code: 400, ...upload });

    const code = upload.success ? 200 : 400;
    return res.success({ code, ...upload });
  },
);

router.delete(
  "/",
  authorize({ files: ["delete"] }),
  validateRequest({
    query: z.object({ by: z.enum(["id", "file_path"]).default("id") }),
    body: z.object({ ids: z.array(z.uuidv4()), userId: z.string() }),
  }),
  async (req, res) => {
    const { ids, userId } = req.body;
    const remove = await removeFiles(ids, userId, { by: req.query.by });
    if (!remove.success) return res.error({ code: 400, ...remove });
    return res.success(remove);
  },
);

export { router };
