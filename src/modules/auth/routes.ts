import { auth } from "@/core/auth";
import { db } from "@/core/db";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { Router } from "express";
import { getPresignedUrl } from "../storage";
import { AuthSession } from "./constants";

const router = Router();

router.get("/get-session", async (req, res) => {
  const headers = fromNodeHeaders(req.headers);
  const authSession = await auth.api.getSession({ headers });
  if (!authSession?.user) return res.json(authSession);

  const { session, user: userData } = authSession;
  if (!userData.image) return res.json(authSession);

  const file = await db
    .selectFrom("storage")
    .select("file_path")
    .where("id", "=", userData.image)
    .executeTakeFirst();

  if (!file) return res.json(authSession);

  const image = await getPresignedUrl(file.file_path);
  const user = { ...userData, image };

  return res.json({ session, user } satisfies AuthSession);
});

router.all("/*splat", toNodeHandler(auth));

export { router };
