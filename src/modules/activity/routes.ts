import {
  dataControllerSchema,
  withDataController,
} from "@/core/data-controller";
import { authorize, validateRequest } from "@/core/middlewares";
import { Router } from "express";
import z from "zod";
import {
  activityCountQuery,
  getActivityById,
  getActivityWDCConfig,
} from "./actions";

const router = Router();

router.post(
  "/",
  authorize({ activity: ["list"] }),
  validateRequest({ body: dataControllerSchema }),
  async (req, res) => {
    const dataDef = getActivityWDCConfig();

    const count = await withDataController(req.body, {
      queryBuilder: activityCountQuery,
      config: { ...dataDef.config, disabled: ["sorting", "pagination"] },
    }).executeTakeFirst();

    const data = await withDataController(req.body, dataDef).execute();

    return res.success({ count, data });
  },
);

router.post(
  "/me",
  authorize(),
  validateRequest({ body: dataControllerSchema }),
  async (req, res) =>
    res.success(await getActivityById(req.body, req.session!.user.id)),
);

router.post(
  "/:id",
  authorize({ activity: ["get"] }),
  validateRequest({
    params: z.object({ id: z.string() }),
    body: dataControllerSchema,
  }),
  async (req, res) =>
    res.success(await getActivityById(req.body, req.params.id)),
);

export { router };
