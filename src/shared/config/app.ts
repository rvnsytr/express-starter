import { CorsOptions } from "cors";

export const appConfig = {
  name: process.env.APP_NAME ?? "Express Starter",

  baseUrl: "http://localhost:8000",

  cors: {
    origin: ["http://localhost:3000", "https://example.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  } satisfies CorsOptions,

  default: {
    language: "id",

    /** @see [excel.ts](../../core/excel.ts) */
    excelTmpDirectory: "tmp",

    /** @see [s3.ts](../../core/s3.ts) */
    fileDirectory: "tmp",
  },
} as const;
