import {
  dataControllerSchema,
  withDataController,
} from "@/core/data-controller";
import { authorize } from "@/core/middlewares";
import { formatZodError, transformKeys } from "@/core/utils/formaters";
import { Router } from "express";
import z from "zod";
import {
  eventLogCountQuery,
  getEventLogById,
  getEventLogWDCConfig,
} from "./actions";

const router = Router();

router.post("/", authorize({ event_log: ["list"] }), async (req, res) => {
  const parsedBody = dataControllerSchema.safeParse(req.body);
  if (!parsedBody.success)
    return res.api({ code: 400, ...formatZodError(parsedBody.error, true) });

  const dataDef = getEventLogWDCConfig();

  const count = await withDataController(parsedBody.data, {
    queryBuilder: eventLogCountQuery,
    config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
  }).executeTakeFirst();

  const data = await withDataController(parsedBody.data, dataDef).execute();

  return res.api({ count, data: transformKeys(data, "camel") });
});

router.post("/me", authorize({ event_log: ["list:own"] }), async (req, res) => {
  const authUserId = req.session?.user.id;
  if (!authUserId) return res.api({ code: 400 });

  const parsedBody = dataControllerSchema.safeParse(req.body);
  if (!parsedBody.success)
    return res.api({ code: 400, ...formatZodError(parsedBody.error) });

  const json = await getEventLogById(parsedBody.data, authUserId);
  return res.api(json);
});

router.post(
  "/:id",
  authorize({ event_log: ["list:user"] }),
  async (req, res) => {
    const parsedParams = z.object({ id: z.string() }).safeParse(req.params);
    if (!parsedParams.success)
      return res.api({ code: 400, ...formatZodError(parsedParams.error) });

    const parsedBody = dataControllerSchema.safeParse(req.body);
    if (!parsedBody.success)
      return res.api({ code: 400, ...formatZodError(parsedBody.error) });

    const json = await getEventLogById(parsedBody.data, parsedParams.data.id);
    return res.api(json);
  },
);

export { router };
