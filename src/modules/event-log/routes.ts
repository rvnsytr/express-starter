import { dataTableSchema, withDataTable } from "@/core/data-table";
import { db } from "@/core/db";
import { authorize } from "@/core/middlewares";
import { formatZodError, transformKeys } from "@/core/utils/formaters";
import { Router } from "express";
import z from "zod";
import { getEventLogById, getEventLogDataWDTConfig } from "./actions";

const router = Router();

router.get("/", authorize({ event_log: ["list"] }), async (req, res) => {
  const parsedBody = dataTableSchema.safeParse(req.body);
  if (!parsedBody.success)
    return { code: 400, message: formatZodError(parsedBody.error) };

  const dataDef = getEventLogDataWDTConfig();

  const count = await withDataTable(parsedBody.data, {
    queryBuilder: db
      .selectFrom("event_log as el")
      .select((eb) => eb.fn.countAll<number>().as("total")),
    config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
  }).executeTakeFirst();

  const data = await withDataTable(parsedBody.data, dataDef).execute();

  return res.api({ count, data: transformKeys(data, "camel") });
});

router.post("/me", authorize(), async (req, res) => {
  const authUserId = req.session?.user.id;
  if (!authUserId) return res.api({ code: 400 });
  const json = await getEventLogById(req.body, authUserId);
  return res.api(json);
});

router.post("/:id", authorize({ event_log: ["get"] }), async (req, res) => {
  const parsedParams = z.object({ id: z.string() }).safeParse(req.params);
  if (!parsedParams.success)
    return res.api({ message: formatZodError(parsedParams.error) });

  const parsedBody = dataTableSchema.safeParse(req.body);
  if (!parsedBody.success)
    return res.api({ code: 400, message: formatZodError(parsedBody.error) });

  const json = await getEventLogById(req.body, parsedParams.data.id);
  return res.api(json);
});

export { router };
