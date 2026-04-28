import { AuthSession } from "@/core/auth";
import "express-serve-static-core";
import { ApiErrorPayload, ApiSuccessPayload } from "./src/core/types";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
      session?: AuthSession | null;
    }

    interface Response {
      success: <T>(payload?: ApiSuccessPayload<T>) => void;
      error: (payload?: ApiErrorPayload) => void;
    }
  }
}
