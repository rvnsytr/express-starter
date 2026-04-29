import { CorsOptions } from "cors";

export const appConfig = {
  name: process.env.APP_NAME ?? "Express Starter",
  defaultLanguage: "id",

  baseUrl: "http://localhost:8000",
  defaultFilesDirectory: "tmp",

  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  } satisfies CorsOptions,
};
