import { AuthSession } from "@/core/auth";
import "express-serve-static-core";
import { ApiResponse } from "./src/core/middlewares";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
      session?: AuthSession | null;
    }

    interface Response {
      api: <T>(payload?: Partial<ApiResponse<T>>) => void;
    }
  }
}
