import { APIError } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { ErrorRequestHandler, RequestHandler } from "express";
import z from "zod";
import { auth } from "./auth";
import { messages } from "./constants";
import { Permissions } from "./permission";
import { apiResponseSchema } from "./schema.zod";
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
    const message = pyMessage ?? (success ? messages.success : messages.error);
    return res.status(code).json({ code, success, message, data, ...rest });
  };

  next();
};

export const delayHandler: RequestHandler = async (_req, _res, next) => {
  await delay(3);
  next();
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  return res.api({ code: 404, message: messages.notFound });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const nodeEnv = process.env.NODE_ENV ?? "local";
  const isShowError = nodeEnv === "local" || nodeEnv === "development";

  console.error(err);

  if (err instanceof APIError) {
    const { statusCode, body } = err;
    const error = isShowError ? body : undefined;
    return res.api({ code: statusCode, message: messages.error, error });
  }

  const error = isShowError ? (err.message ?? undefined) : undefined;
  return res.api({ code: 500, message: messages.error, error });
};

export function authorize(permissions: Permissions): RequestHandler {
  return async (req, res, next) => {
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (!session) return res.api({ code: 401, message: messages.unauthorized });

    req.session = session;
    if (!permissions) return next();

    const isAuthorized = await auth.api.userHasPermission({
      body: { role: session.user.role, permissions },
    });

    return isAuthorized.success
      ? next()
      : res.api({ code: 403, message: messages.forbidden });
  };
}
