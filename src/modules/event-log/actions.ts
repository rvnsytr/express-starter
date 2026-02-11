import {
  dataTableSchema,
  defineWDTConfig,
  withDataTable,
} from "@/core/data-table";
import { db } from "@/core/db";
import { formatZodError, transformKeys } from "@/core/utils/formaters";

export const eventLogDataQuery = db
  .selectFrom("event_log as el")
  .select((eb) => [
    "el.id",
    "el.type",
    "el.data",
    "el.created_at",
    eb
      .case()
      .when("el.type", "in", [
        "admin-user-create",
        "admin-user-ban",
        "admin-user-unban",
        "admin-user-remove",
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

export function getEventLogDataWDTConfig(qb?: typeof eventLogDataQuery) {
  return defineWDTConfig({
    queryBuilder: qb ?? eventLogDataQuery,
    config: {
      columns: {
        type: { column: "el.type", type: "string" },
        createdAt: { column: "el.created_at", type: "date" },
      },
      defaultOrderBy: { column: "el.created_at", desc: true },
    },
  });
}

export async function getEventLogById(
  reqBody: Record<string, unknown>,
  id: string,
) {
  const parsedBody = dataTableSchema.safeParse(reqBody);
  if (!parsedBody.success)
    return { code: 400, message: formatZodError(parsedBody.error) };

  const dataDef = getEventLogDataWDTConfig(
    eventLogDataQuery.where("el.user_id", "=", id),
  );

  const count = await withDataTable(parsedBody.data, {
    queryBuilder: db
      .selectFrom("event_log as el")
      .select((eb) => eb.fn.countAll<number>().as("total")),
    config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
  }).executeTakeFirst();

  const data = await withDataTable(parsedBody.data, dataDef).execute();

  return { count, data: transformKeys(data, "camel") };
}
