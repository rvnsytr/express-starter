import { auth } from "@/core/auth";
import {
  dataTableSchema,
  defineWDTConfig,
  withDataTable,
} from "@/core/data-table";
import { countWhere, db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { formatZodError, transformKeys } from "@/core/utils/formaters";
import { toNodeHandler } from "better-auth/node";
import { json, Router } from "express";
import { getPresignedUrl } from "../storage/actions";

const router = Router();

router.post(
  "/admin/list-users",
  authorize({ user: ["list"] }),
  json(),
  async (req, res) => {
    const baseQb = db
      .selectFrom("user as u")
      .leftJoin("storage as s", "u.image", "s.id");

    const countQb = baseQb
      .select(({ fn }) => fn.countAll<number>().as("total"))
      .select([
        countWhere("u.role = 'user'").as("user"),
        countWhere("u.role = 'admin'").as("admin"),
        countWhere("u.banned = 1").as("banned"),
        countWhere("u.banned = 0").as("active"),
      ]);

    const parsedBody = dataTableSchema.safeParse(req.body);
    if (!parsedBody.success)
      return res.api({ code: 400, message: formatZodError(parsedBody.error) });

    const dataDef = defineWDTConfig({
      queryBuilder: baseQb.selectAll("u").select("s.file_path"),
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

    const count = await withDataTable(parsedBody.data, {
      queryBuilder: countQb,
      config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
    }).executeTakeFirst();

    const dataTable = await withDataTable(parsedBody.data, dataDef).execute();

    const data = await Promise.all(
      dataTable.map(async ({ file_path, ...rest }) => ({
        ...rest,
        image: file_path ? await getPresignedUrl(file_path) : null,
      })),
    );

    return res.api({ count, data: transformKeys(data, "camel") });
  },
);

router.all("/*splat", toNodeHandler(auth));

export { router };
