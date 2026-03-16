import {
  dataControllerSchema,
  withDataController,
} from "@/core/data-controller";
import { authorize, validateRequest } from "@/core/middlewares";
import { transformKeys } from "@/core/utils/formaters";
import { Router } from "express";
import z from "zod";
import {
  eventLogCountQuery,
  getEventLogById,
  getEventLogWDCConfig,
} from "./actions";

const router = Router();

router.post(
  "/",
  authorize({ event_log: ["list"] }),
  validateRequest({ body: dataControllerSchema }),
  async (req, res) => {
    const dataDef = getEventLogWDCConfig();

    const count = await withDataController(req.body, {
      queryBuilder: eventLogCountQuery,
      config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
    }).executeTakeFirst();

    const data = await withDataController(req.body, dataDef).execute();

    return res.success({ count, data: transformKeys(data, "camel") });
  },
);

router.post(
  "/me",
  authorize({ event_log: ["list:own"] }),
  validateRequest({ body: dataControllerSchema }),
  async (req, res) =>
    res.success(await getEventLogById(req.body, req.session!.user.id)),
);

router.post(
  "/:id",
  authorize({ event_log: ["list:user"] }),
  validateRequest({
    params: z.object({ id: z.string() }),
    body: dataControllerSchema,
  }),
  async (req, res) =>
    res.success(await getEventLogById(req.body, req.params.id)),
);

export { router };
