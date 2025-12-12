import { Role } from "@/modules/auth";
import { fromNodeHeaders } from "better-auth/node";
import { ErrorRequestHandler, RequestHandler } from "express";
import z from "zod";
import { auth } from "./auth";
import { Permissions } from "./permission";
import { apiResponseSchema } from "./schemas.zod";
import { delay } from "./utils";

export type ApiResponse<T> = z.infer<typeof apiResponseSchema> & {
  data: T;
  [k: string]: unknown;
};

export const init: RequestHandler = (_req, res, next) => {
  res.api = <T>(payload: Partial<ApiResponse<T>>) => {
    const { code: pyCode, message: pyMessage, data: pyData, ...rest } = payload;
    const code = pyCode ?? 200;
    const success = code >= 200 && code < 300;
    const data = pyData ?? null;
    const message =
      pyMessage ??
      (success ? "Sukses" : "Terjadi kesalahan. Silakan coba lagi nanti.");
    return res.status(code).json({ code, success, message, data, ...rest });
  };

  next();
};

export const delayHandler: RequestHandler = async (_req, _res, next) => {
  await delay(3);
  next();
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  const message = "Sumber daya yang diminta tidak ditemukan.";
  return res.api({ code: 404, message });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const nodeEnv = process.env.NODE_ENV ?? "local";
  const isShowError = nodeEnv === "local" || nodeEnv === "development";

  const message = "Terjadi kesalahan pada server.";
  const errorMessage =
    err instanceof Error ? err.message : "Unknown error occurred";

  const error = isShowError ? errorMessage : undefined;

  console.error(err);
  return res.api({ code: 500, message, error });
};

export function authorize(permissions: Permissions) {
  const handler: RequestHandler = async (req, res, next) => {
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (!session) {
      const message = "Permintaan tidak terautentikasi!";
      return res.api({ code: 401, message });
    }

    req.session = session;
    if (!permissions) return next();

    const isAuthorized = await auth.api.userHasPermission({
      body: { role: session.user.role as Role, permissions },
    });

    return isAuthorized.success
      ? next()
      : res.api({ code: 403, message: "Permintaan tidak diperbolehkan!" });
  };

  return handler;
}
