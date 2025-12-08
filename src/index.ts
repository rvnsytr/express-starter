import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { auth } from "./core/auth";
import { appMeta } from "./core/constants";
import { apiResponse } from "./core/middlewares";

const app = express();
const port = process.env.PORT ?? 8000;

app.use(cors(appMeta.cors));
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(apiResponse);

app.get("/api", (_, res) => res.api({ message: `Hello, ${appMeta.name}` }));

app.all("*splat", (_, res) =>
  res.api({ code: 404, message: "Sumber daya yang diminta tidak ditemukan." }),
);

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`),
);
