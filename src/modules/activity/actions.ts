import {
  DataController,
  defineWDCConfig,
  withDataController,
} from "@/core/data-controller";
import { countWhere, db } from "@/core/db";
import { transformKeys } from "@/core/utils";
import { allActivityTypes } from "./schema";

const activityQuery = db.selectFrom("activity as el").select((eb) => [
  "el.id",
  "el.type",
  "el.data",
  "el.created_at",
  eb
    .case()
    .when("el.type", "in", [
      "user-created",
      "admin-user-create",
      "admin-user-ban",
      "admin-user-unban",
      "admin-user-delete",
    ])
    .then(
      eb
        .selectFrom("user as u")
        .select("u.name")
        .whereRef("u.id", "=", "el.entity_id"),
    )
    .else(null)
    .end()
    .as("entity"),
]);

export const activityCountQuery = db
  .selectFrom("activity as el")
  .select((eb) => eb.fn.countAll<number>().as("total"))
  .select(allActivityTypes.map((t) => countWhere(`el.type = '${t}'`).as(t)));

type ActivityQuery = typeof activityQuery;

export function getActivityWDCConfig(
  getQB?: (qb: ActivityQuery) => ActivityQuery,
) {
  return defineWDCConfig({
    queryBuilder: getQB?.(activityQuery) ?? activityQuery,
    config: {
      columns: {
        type: { column: "el.type", type: "string" },
        createdAt: { column: "el.created_at", type: "date" },
      },
      defaultOrderBy: { column: "el.created_at", desc: true },
    },
  });
}

export async function getActivityById(dc: DataController, id: string) {
  const dataDef = getActivityWDCConfig((qb) => qb.where("el.user_id", "=", id));

  const count = await withDataController(dc, {
    queryBuilder: activityCountQuery.where("el.user_id", "=", id),
    config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
  }).executeTakeFirst();

  const data = await withDataController(dc, dataDef).execute();

  return { count, data: transformKeys(data, "camel") };
}
