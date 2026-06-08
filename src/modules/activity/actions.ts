import {
  DataController,
  defineWDCConfig,
  withDataController,
} from "@/core/data-controller";
import { countWhere, db } from "@/core/db";
import { sql } from "kysely";
import { allActivityTypes } from "./config";

const activityQuery = db.selectFrom("activity as ac").select((eb) => [
  "ac.id",
  "ac.user_id",
  "ac.type",
  "ac.data",
  "ac.created_at",
  eb
    .case()
    .when("ac.type", "in", [
      "user-created",

      "admin-user-create",
      "admin-user-update-role",
      "admin-user-ban",
      "admin-user-unban",
      "admin-user-delete",
    ])
    .then(
      eb
        .selectFrom("user as u")
        .select("u.name")
        .whereRef("u.id", "=", "ac.entity_id"),
    )
    .else(null)
    .end()
    .as("entity"),
]);

export const activityCountQuery = db
  .selectFrom("activity as ac")
  .select((eb) => eb.fn.countAll<number>().as("total"))
  .select(allActivityTypes.map((t) => countWhere(sql`ac.type = '${t}'`).as(t)));

export function getActivityWDCConfig(
  getQB?: (qb: typeof activityQuery) => typeof activityQuery,
) {
  return defineWDCConfig({
    queryBuilder: getQB?.(activityQuery) ?? activityQuery,
    config: {
      columns: {
        type: { column: "ac.type", type: "string" },
        createdAt: { column: "ac.created_at", type: "date" },
      },
      defaultOrderBy: { column: "ac.created_at", desc: true },
    },
  });
}

export async function getActivityById(dc: DataController, id: string) {
  const dataDef = getActivityWDCConfig((qb) => qb.where("ac.user_id", "=", id));

  const count = await withDataController(dc, {
    queryBuilder: activityCountQuery.where("ac.user_id", "=", id),
    config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
  }).executeTakeFirst();

  const data = await withDataController(dc, dataDef).execute();

  return { count, data };
}
