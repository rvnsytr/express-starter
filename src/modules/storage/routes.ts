import { authorize } from "@/core/middlewares";
import { formatZodError } from "@/core/utils";
import { Router } from "express";
import multer from "multer";
import z from "zod";
import { getFiles, getPresignedUrl, removeFiles, uploadFiles } from "./actions";

const router = Router();

router.get("/", authorize({ storage: ["read"] }), async (req, res) => {
  const { data } = await getFiles(req);
  return res.api({ data });
});

router.get(
  "/presigned-url",
  authorize({ storage: ["read"] }),
  async (req, res) => {
    try {
      const parsed = z
        .string()
        .array()
        .safeParse(req.body ?? []);
      if (!parsed.success) throw new Error(formatZodError(parsed.error));

      const paths = parsed.data;
      const data = await Promise.all(paths.map((p) => getPresignedUrl(p)));

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
    const { data, error } = await uploadFiles(req, { min: 1 });
    if (error) return res.api({ code: 400, message: error });
    return res.api({ data });
  },
);

router.delete("/:id", authorize({ storage: ["delete"] }), async (req, res) => {
  const userId = req.session?.user.id;
  if (!userId) return res.api({ code: 401, message: "Unauthorized" });

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
