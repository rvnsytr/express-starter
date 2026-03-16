import { APIError } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { ErrorRequestHandler, json, RequestHandler } from "express";
import z from "zod";
import { auth } from "./auth";
import { messages } from "./constants/messages";
import {
  ApiErrorPayload,
  ApiSuccessPayload,
  RequestPart,
} from "./constants/types";
import { Permissions } from "./permission";
import { formatZodError } from "./utils/formaters";
import { delay } from "./utils/helpers";

export const init: RequestHandler = (_req, res, next) => {
  const nodeEnv = process.env.NODE_ENV ?? "local";
  const isShowError = nodeEnv === "local" || nodeEnv === "development";

  res.success = <T>(payload?: ApiSuccessPayload<T>) => {
    const code =
      payload?.code && payload.code >= 200 && payload.code < 300
        ? payload.code
        : 200;

    return res.status(code).json({
      code,
      success: true,
      message: payload?.message ?? "Success",
      count: payload?.count,
      data: payload?.data ?? null,
    });
  };

  res.error = (payload?: ApiErrorPayload) => {
    const code =
      payload?.code && payload.code >= 400 && payload.code < 600
        ? payload.code
        : 500;

    return res.status(code).json({
      code,
      success: false,
      message: payload?.message ?? messages.error,
      error: isShowError ? payload?.error : undefined,
    });
  };

  next();
};

export const delayHandler: RequestHandler = async (_req, _res, next) => {
  await delay(3);
  next();
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  return res.error({ code: 404, message: messages.notFound });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  if (err instanceof APIError)
    return res.error({ code: err.statusCode, error: err.body });
  return res.error({ error: err?.message });
};

export function authorize(permissions?: Permissions): RequestHandler {
  return async (req, res, next) => {
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (!session)
      return res.error({ code: 401, message: messages.unauthorized });

    req.session = session;
    if (!permissions) return next();

    const isAuthorized = await auth.api.userHasPermission({
      body: { role: session.user.role, permissions },
    });

    return isAuthorized.success
      ? next()
      : res.error({ code: 403, message: messages.forbidden });
  };
}

export function validateRequest<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
>(
  schema: {
    params?: z.ZodType<TParams>;
    query?: z.ZodType<TQuery>;
    body?: z.ZodType<TBody>;
  },
  options?: { withPath?: boolean },
): RequestHandler<TParams, unknown, TBody, TQuery> {
  const jsonParser = json();
  const withPath = options?.withPath ?? true;

  return (req, res, next) =>
    jsonParser(req, res, (err) => {
      if (err) return next(err);

      const sendError = (zodError: z.ZodError, part: RequestPart) => {
        const error = formatZodError(zodError, { part, withPath });
        return res.error({ code: 400, ...error });
      };

      if (schema.params) {
        const parsed = schema.params.safeParse(req.params);
        if (!parsed.success) return sendError(parsed.error, "params");
        req.params = parsed.data;
      }

      if (schema.query) {
        const parsed = schema.query.safeParse(req.query);
        if (!parsed.success) return sendError(parsed.error, "query");
        req.query = parsed.data;
      }

      if (schema.body) {
        const parsed = schema.body.safeParse(req.body);
        if (!parsed.success) return sendError(parsed.error, "body");
        req.body = parsed.data;
      }

      return next();
    });
}
