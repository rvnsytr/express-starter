import { auth } from "@/core/auth";
import {
  dataControllerSchema,
  defineWDCConfig,
  withDataController,
} from "@/core/data-controller";
import { countWhere, db } from "@/core/db";
import { authorize, validateRequest } from "@/core/middlewares";
import { getPresignedUrl } from "@/core/s3";
import { transformKeys } from "@/core/utils";
import { toNodeHandler } from "better-auth/node";
import { Router } from "express";
import { sql } from "kysely";

const router = Router();

router.post(
  "/admin/list-users",
  authorize({ user: ["list"] }),
  validateRequest({ body: dataControllerSchema }),
  async (req, res) => {
    const baseQb = db
      .selectFrom("user as u")
      .leftJoin("file as f", "u.image", "f.id");

    const countQb = baseQb
      .select((eb) => eb.fn.countAll<number>().as("total"))
      .select([
        countWhere(sql`u.role = 'user'`).as("user"),
        countWhere(sql`u.role = 'admin'`).as("admin"),
        countWhere(sql`u.banned = 1`).as("banned"),
        countWhere(sql`u.banned = 0 AND u.email_verified = 0`).as("active"),
        countWhere(sql`u.banned = 0 AND u.email_verified = 1`).as("verified"),
      ]);

    const dataDef = defineWDCConfig({
      queryBuilder: baseQb.selectAll("u").select("f.file_path"),
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
          updatedAt: { column: "u.updated_at", type: "date" },
          createdAt: { column: "u.created_at", type: "date" },
        },
        defaultOrderBy: { column: "u.created_at", desc: true },
      },
    });

    const count = await withDataController(req.body, {
      queryBuilder: countQb,
      config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
    }).executeTakeFirst();

    const controlledData = await withDataController(
      req.body,
      dataDef,
    ).execute();

    const data = await Promise.all(
      controlledData.map(async ({ file_path, ...rest }) => ({
        ...rest,
        image: file_path ? await getPresignedUrl(file_path) : null,
      })),
    );

    // const rows = await db
    //   .selectFrom("user as u")
    //   .leftJoin("file as f", "u.image", "f.id")
    //   .selectAll("u")
    //   .select("f.file_path")
    //   .execute();

    // const data = await Promise.all(
    //   rows.map(async ({ file_path, ...rest }) => ({
    //     ...rest,
    //     image: file_path ? await getPresignedUrl(file_path) : null,
    //   })),
    // );

    return res.success({ count, data: transformKeys(data, "camel") });
    // return res.success({ data: transformKeys(data, "camel") });
  },
);

router.all("/*splat", toNodeHandler(auth));

export { router };
