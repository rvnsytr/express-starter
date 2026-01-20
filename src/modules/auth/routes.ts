import { auth } from "@/core/auth";
import { defineWDTConfig, withDataTable } from "@/core/data-table";
import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { dataTableSchema } from "@/core/schema.zod";
import { formatZodError, transformKeys } from "@/core/utils";
import { toNodeHandler } from "better-auth/node";
import { json, Router } from "express";
import { sql } from "kysely";

const router = Router();

router.post(
  "/admin/list-users",
  authorize({ user: ["list"] }),
  json(),
  async (req, res) => {
    const baseQb = db
      .selectFrom("user as u")
      .leftJoin("storage as s", "u.image", "s.id");

    const countQb = baseQb.select(() => [
      sql<number>`COUNT(u.id)`.as("total"),
      sql<number>`COALESCE(SUM(CASE WHEN u.role = 'user' THEN 1 ELSE 0 END), 0)`.as(
        "user",
      ),
      sql<number>`COALESCE(SUM(CASE WHEN u.role = 'admin' THEN 1 ELSE 0 END), 0)`.as(
        "admin",
      ),
      sql<number>`COALESCE(SUM(CASE WHEN u.banned = 1 THEN 1 ELSE 0 END), 0)`.as(
        "banned",
      ),
      sql<number>`COALESCE(SUM(CASE WHEN u.banned = 0 THEN 1 ELSE 0 END), 0)`.as(
        "active",
      ),
    ]);

    const dataQb = baseQb
      .selectAll("u")
      .select(["s.id as file_id", "s.file_path"]);

    const bodyParsed = dataTableSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return res.api({ code: 400, message: formatZodError(bodyParsed.error) });

    const dataDef = defineWDTConfig({
      queryBuilder: dataQb,
      config: {
        columns: {
          name: { column: "u.name", type: "string" },
          email: { column: "u.email", type: "string" },
          status: {
            column: "u.banned",
            type: "boolean",
            parser: (v) => typeof v === "string" && v === "banned",
          },
          role: { column: "u.role", type: "string" },
          updatedAt: { column: "u.updated_at", type: "string" },
          createdAt: { column: "u.created_at", type: "string" },
        },
        defaultOrderBy: { column: "u.created_at", desc: true },
      },
    });

    const count = await withDataTable(bodyParsed.data, {
      queryBuilder: countQb,
      config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
    }).executeTakeFirst();

    const data = await withDataTable(bodyParsed.data, dataDef).execute();

    return res.api({ count, data: transformKeys(data, "camel") });
  },
);

router.all("/*splat", toNodeHandler(auth));

export { router };
