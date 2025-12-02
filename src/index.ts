import express from "express";
import { apiResponse } from "./core/middlewares/response";

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(express.json());
app.use(apiResponse);

app.get("/api", (_, res) => res.api({ message: "Hello, Express Starter!" }));

app.all("*splat", (_, res) =>
  res.api({ code: 404, message: "Sumber daya yang diminta tidak ditemukan." }),
);

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
