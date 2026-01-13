import cors from "cors";
import "dotenv/config";
import express from "express";
import z from "zod";
import { id } from "zod/locales";
import { appMeta } from "./core/constants";
import { errorHandler, init, notFoundHandler } from "./core/middlewares";

import { router as authRoutes } from "./modules/auth";
import { router as storageRoutes } from "./modules/storage";

const app = express();
const port = process.env.PORT ?? 8000;

z.config(id());

// app.use(delayHandler); // Testing Purpose
app.use(cors(appMeta.cors));
app.use(init);

app.use("/api/auth", authRoutes);

app.use(express.json());

app.get("/api", (_, res) => res.api({ message: `Hello, ${appMeta.name}` }));
app.use("/api/storage", storageRoutes);

app.all("/*splat", notFoundHandler);
app.use(errorHandler);

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`),
);
