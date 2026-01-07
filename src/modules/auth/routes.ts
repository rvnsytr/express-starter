import { auth } from "@/core/auth";
import { withDataTable } from "@/core/data-table";
import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { dataTableSchema } from "@/core/schema.zod";
import { formatZodError } from "@/core/utils";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { json, Router } from "express";
import { getPresignedUrl } from "../storage";

const router = Router();

router.get(
  "/admin/list-users",
  authorize({ user: ["list"] }),
  json(),
  async (req, res) => {
    const qb = db
      .selectFrom("user as u")
      .leftJoin("storage as s", "u.image", "s.id")
      .select(["s.id as file_id", "s.file_path"])
      .selectAll(["u"]);

    const bodyParsed = dataTableSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return res.api({ code: 400, message: formatZodError(bodyParsed.error) });

    const { state } = bodyParsed.data;

    const data = await withDataTable(qb, state, {
      columns: {
        name: "u.name",
        email: "u.email",
        status: "u.banned",
        role: "u.role",
        updatedAt: "u.updated_at",
        createdAt: "u.created_at",
      },
      globalFilter: ["u.name", "u.email"],
      defaultOrder: { id: "u.created_at", desc: true },
    }).execute();

    return res.api({ code: 200, data: { state, data } });

    const result = await auth.api.listUsers({
      headers: fromNodeHeaders(req.headers),
      query: { sortBy: "createdAt", sortDirection: "desc" },
    });

    const { users, ...rest } = result;
    const userImageIds = users.map((u) => u.image ?? null).filter((v) => !!v);

    let query = db
      .selectFrom("storage")
      .select(["id", "file_path"])
      .where("category", "=", "image")
      .where("deleted_at", "is", null);

    if (userImageIds.length) query = query.where("id", "in", userImageIds);
    const images = await query.execute();

    const usersWithImage = await Promise.all(
      users.map(async ({ image: imageId, ...rest }) => {
        const imagePath =
          images.find((img) => img.id === imageId)?.file_path ?? null;
        const image = imagePath ? await getPresignedUrl(imagePath) : null;
        return { ...rest, image, imageId };
      }),
    );

    res.json({ users: usersWithImage, ...rest });
  },
);

router.all("/*splat", toNodeHandler(auth));

export { router };
