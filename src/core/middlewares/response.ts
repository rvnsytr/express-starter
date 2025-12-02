import { NextFunction, Request, Response } from "express";
import z from "zod";
import { apiResponseSchema } from "../schemas.zod";

export type ApiResponse<T> = z.infer<typeof apiResponseSchema> & { data: T };

export function apiResponse(_: Request, res: Response, next: NextFunction) {
  res.api = <T>(payload: Partial<ApiResponse<T>>) => {
    const code = payload.code ?? 200;
    const success = code >= 200 && code < 300;
    const data = payload.data ?? null;
    const message =
      payload.message ??
      (success ? "Sukses" : "Terjadi kesalahan. Silakan coba lagi nanti.");
    return res.status(code).json({ code, success, message, data });
  };

  next();
}
