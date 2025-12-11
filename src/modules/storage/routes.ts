import { authorize } from "@/core/middlewares";
import { Router } from "express";
import multer from "multer";
import { getFiles, removeFiles, uploadFiles } from "./actions";

const router = Router();

router.get("/", authorize(), async (req, res) => {
  const { data } = await getFiles(req);
  return res.api({ data });
});

router.post("/", authorize(), multer().any(), async (req, res) => {
  const { data, error } = await uploadFiles(req, { min: 1 });
  if (error) return res.api({ code: 400, message: error });
  return res.api({ data });
});

router.delete("/", authorize(), async (req, res) => {
  const { count, error } = await removeFiles(
    ["175AEC8C-6E4B-4EAB-8458-A9DFDFE0A37A"],
    req.session!.user.id,
    { by: "file_path" },
  );
  if (error) return res.api({ code: 400, message: error });
  return res.api({ data: count });
});

export { router };
