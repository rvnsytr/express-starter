import { CorsOptions } from "cors";

export const appMeta = {
  name: process.env.APP_NAME ?? "Express Starter",
  lang: "id",

  baseUrl: "http://localhost:8000",

  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  } satisfies CorsOptions,
};
