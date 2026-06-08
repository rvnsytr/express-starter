import cors from "cors";
import "dotenv/config";
import express from "express";
import z from "zod";
import { id } from "zod/locales";
import { errorHandler, init, notFoundHandler } from "./core/middlewares";
import { appConfig } from "./shared/config";

import { router as activityRoutes } from "./modules/activity/routes";
import { router as authRoutes } from "./modules/auth/routes";
import { router as filesRoutes } from "./modules/files/routes";

const app = express();
const port = process.env.PORT ?? 8000;

z.config(id());

// app.use(delayHandler); // Testing Purpose
app.use(cors(appConfig.cors));
app.use(init);

app.use("/api/auth", authRoutes);

app.get("/api", (_, res) =>
  res.success({ code: 301, message: `Hello, ${appConfig.name}` }),
);
app.use("/api/files", filesRoutes);
app.use("/api/activities", activityRoutes);

app.all("/*splat", notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
