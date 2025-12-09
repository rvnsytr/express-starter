import { ErrorRequestHandler, RequestHandler } from "express";
import z from "zod";
import { apiResponseSchema } from "./schemas.zod";

export type ApiResponse<T> = z.infer<typeof apiResponseSchema> & {
  data: T;
  [k: string]: unknown;
};

export const apiResponse: RequestHandler = (_req, res, next) => {
  res.api = <T>(payload: Partial<ApiResponse<T>>) => {
    const code = payload.code ?? 200;
    const success = code >= 200 && code < 300;
    const data = payload.data ?? null;
    const message =
      payload.message ??
      (success ? "Sukses" : "Terjadi kesalahan. Silakan coba lagi nanti.");

    return res.status(code).json({ code, success, message, data, ...payload });
  };
  next();
};

export const delayHandler: RequestHandler = async (_req, _res, next) => {
  await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
  next();
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  const message = "Sumber daya yang diminta tidak ditemukan.";
  return res.api({ code: 404, message });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const nodeEnv = process.env.NODE_ENV ?? "local";
  const showError = nodeEnv === "local" || nodeEnv === "development";

  const message = "Terjadi kesalahan pada server.";
  const errorMessage =
    err instanceof Error ? err.message : "Unknown error occurred";

  const error = showError ? errorMessage : undefined;

  console.error(err);
  return res.api({ code: 500, message, error });
};
