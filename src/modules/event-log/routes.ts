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
  if (!parsedBody.success) {
    const message = formatZodError(parsedBody.error, true);
    return res.api({ code: 400, message });
  }

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
  const json = await getEventLogById(req.body, authUserId);
  return res.api(json);
});

router.post(
  "/:id",
  authorize({ event_log: ["list:user"] }),
  async (req, res) => {
    const parsedParams = z.object({ id: z.string() }).safeParse(req.params);
    if (!parsedParams.success)
      return res.api({ message: formatZodError(parsedParams.error) });

    const parsedBody = dataControllerSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const message = formatZodError(parsedBody.error);
      return res.api({ code: 400, message });
    }

    const json = await getEventLogById(req.body, parsedParams.data.id);
    return res.api(json);
  },
);

export { router };
