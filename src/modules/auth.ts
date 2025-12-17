import { auth } from "@/core/auth";
import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { Router } from "express";
import { getPresignedUrl } from "./storage";

const router = Router();

router.get(
  "/admin/list-users",
  authorize({ user: ["list"] }),
  async (req, res) => {
    const result = await auth.api.listUsers({
      headers: fromNodeHeaders(req.headers),
      query: { sortBy: "createdAt", sortDirection: "desc" },
    });

    const { users, ...rest } = result;

    const images = await db
      .selectFrom("storage")
      .select(["id", "file_path"])
      .where("category", "=", "image")
      .where("deleted_at", "is", null)
      .where("id", "in", users.map((u) => u.image ?? null).filter(Boolean))
      .execute();

    const usersWithImage = await Promise.all(
      users.map(async ({ image: imageId, ...rest }) => {
        const imagePath =
          images.find((img) => img.id === imageId)?.file_path ?? null;
        const image = imagePath ? await getPresignedUrl(imagePath) : null;
        return { ...rest, image };
      }),
    );

    res.json({ users: usersWithImage, ...rest });
  },
);

router.all("/*splat", toNodeHandler(auth));

export { router };
