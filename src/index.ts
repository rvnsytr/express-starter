import express from "express";
import { apiResponse } from "./core/middleware/response";

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(express.json());
app.use(apiResponse);

app.get("/", (_, res) => res.api({ message: "Hello, Express Starter!" }));

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
