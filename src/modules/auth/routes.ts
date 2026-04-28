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

const router = Router();

router.post(
  "/admin/list-users",
  authorize({ user: ["list"] }),
  validateRequest({ body: dataControllerSchema }),
  async (req, res) => {
    const baseQb = db
      .selectFrom("user as u")
      .leftJoin("files as f", "u.image", "f.id");

    const countQb = baseQb
      .select((eb) => eb.fn.countAll<number>().as("total"))
      .select([
        countWhere("u.role = 'user'").as("user"),
        countWhere("u.role = 'admin'").as("admin"),
        countWhere("u.banned = 1").as("banned"),
        countWhere("u.banned = 0").as("active"),
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

    return res.success({ count, data: transformKeys(data, "camel") });
  },
);

router.all("/*splat", toNodeHandler(auth));

export { router };
