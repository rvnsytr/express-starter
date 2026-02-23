import { APIError } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { ErrorRequestHandler, json, RequestHandler } from "express";
import z from "zod";
import { auth } from "./auth";
import { messages } from "./constants/messages";
import { ApiPayload, RequestPart } from "./constants/types";
import { Permissions } from "./permission";
import { formatZodError } from "./utils/formaters";
import { delay } from "./utils/helpers";

export const init: RequestHandler = (_req, res, next) => {
  const nodeEnv = process.env.NODE_ENV ?? "local";
  const isShowError = nodeEnv === "local" || nodeEnv === "development";

  res.api = <T>(payload?: ApiPayload<T>) => {
    const code = payload?.code ?? 200;
    const success = code >= 200 && code < 300;
    const count = payload?.count;
    const message = payload?.message ?? (success ? "Sukses" : messages.error);
    const data = payload?.data ?? null;
    const error = isShowError ? payload?.error : undefined;
    return res.status(code).json({ success, message, count, data, error });
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
  console.error(err);
  if (err instanceof APIError)
    return res.api({ code: err.statusCode, error: err.body ?? undefined });
  return res.api({ code: 500, error: err?.message });
};

export function authorize(permissions?: Permissions): RequestHandler {
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

export function validateRequest<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
>(schema: {
  params?: z.ZodType<TParams>;
  query?: z.ZodType<TQuery>;
  body?: z.ZodType<TBody>;
}): RequestHandler<TParams, unknown, TBody, TQuery> {
  const jsonParser = json();
  return (req, res, next) =>
    jsonParser(req, res, (err) => {
      if (err) return next(err);

      const sendError = (zodError: z.ZodError, part: RequestPart) =>
        res.api(formatZodError(zodError, { part, withPath: true }));

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
