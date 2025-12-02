import "dotenv/config";
import express from "express";
import { apiResponse } from "./core/middlewares/response";

const app = express();
const port = process.env.PORT ?? 5000;

app.use(express.json());
app.use(apiResponse);

app.get("/api", async (_, res) =>
  res.api({ message: "Hello, Express Starter!" }),
);

app.all("*splat", (_, res) =>
  res.api({ code: 404, message: "Sumber daya yang diminta tidak ditemukan." }),
);

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`),
);
