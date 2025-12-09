import cors from "cors";
import "dotenv/config";
import express from "express";
import { appMeta } from "./core/constants";
import { apiResponse, errorHandler, notFoundHandler } from "./core/middlewares";

import authRoutes from "./modules/auth/routes";

const app = express();
const port = process.env.PORT ?? 8000;

// app.use(delayHandler); // Testing Purpose
app.use(cors(appMeta.cors));
app.use(apiResponse);

app.use("/api/auth", authRoutes);

app.use(express.json());

app.get("/api", (_, res) => res.api({ message: `Hello, ${appMeta.name}` }));

app.all("*splat", notFoundHandler);
app.use(errorHandler);

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`),
);
