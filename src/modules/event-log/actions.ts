import {
  dataControllerSchema,
  defineWDCConfig,
  withDataController,
} from "@/core/data-controller";
import { countWhere, db } from "@/core/db";
import { formatZodError, transformKeys } from "@/core/utils/formaters";
import { allEventLogType } from "./constants";

const eventLogQuery = db.selectFrom("event_log as el").select((eb) => [
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

export const eventLogCountQuery = db
  .selectFrom("event_log as el")
  .select((eb) => eb.fn.countAll<number>().as("total"))
  .select(allEventLogType.map((t) => countWhere(`el.type = '${t}'`).as(t)));

type EventLogQuery = typeof eventLogQuery;

export function getEventLogWDCConfig(
  getQB?: (qb: EventLogQuery) => EventLogQuery,
) {
  return defineWDCConfig({
    queryBuilder: getQB?.(eventLogQuery) ?? eventLogQuery,
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
  const parsedBody = dataControllerSchema.safeParse(reqBody);
  if (!parsedBody.success)
    return { code: 400, message: formatZodError(parsedBody.error) };

  const dataDef = getEventLogWDCConfig((qb) => qb.where("el.user_id", "=", id));

  const count = await withDataController(parsedBody.data, {
    queryBuilder: eventLogCountQuery.where("el.user_id", "=", id),
    config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
  }).executeTakeFirst();

  const data = await withDataController(parsedBody.data, dataDef).execute();

  return { count, data: transformKeys(data, "camel") };
}
