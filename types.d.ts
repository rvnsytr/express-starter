import "express-serve-static-core";
import { ApiResponse } from "./src/core/middlewares/response";

declare module "express-serve-static-core" {
  interface Response {
    api: <T>(payload: Partial<ApiResponse<T>>) => void;
  }
}
