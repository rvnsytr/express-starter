import { AuthSession } from "@/core/auth";
import "express-serve-static-core";
import { ApiPayload } from "./src/core/constants/types";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
      session?: AuthSession | null;
    }

    interface Response {
      api: <T>(payload?: ApiPayload<T>) => void;
    }
  }
}
