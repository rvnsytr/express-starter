import z from "zod";
import { sharedSchemas } from "./schema";

export type Override<T, U> = Omit<T, keyof U> & U;

export type OmitByType<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

export type Count = ({ total: number } & Record<string, number>) | undefined;

export type ActionResponse<T = unknown> = {
  message?: string;
} & (
  | { success: true; count?: Count; data: T }
  | { success: false; error?: unknown }
);

export type ActionSuccess<T = unknown> = Extract<
  ActionResponse<T>,
  { success: true }
>;

export type ActionError = Extract<ActionResponse, { success: false }>;

export type StringCase =
  | "kebab"
  | "snake"
  | "camel"
  | "pascal"
  | "constant"
  | "title";

export type TransformableStringCase = Extract<
  StringCase,
  "snake" | "kebab" | "camel"
>;

export type SnakeCase<S extends string> = S extends `${infer A}${infer B}`
  ? B extends Uncapitalize<B>
    ? `${Lowercase<A>}${SnakeCase<B>}`
    : `${Lowercase<A>}_${SnakeCase<B>}`
  : S;

export type KebabCase<S extends string> =
  SnakeCase<S> extends `${infer A}_${infer B}`
    ? `${A}-${KebabCase<B>}`
    : SnakeCase<S>;

export type CamelCase<S extends string> = S extends `${infer A}_${infer B}`
  ? `${A}${Capitalize<CamelCase<B>>}`
  : S;

export type TransformKeys<
  T,
  C extends TransformableStringCase,
> = T extends readonly (infer U)[]
  ? readonly TransformKeys<U, C>[]
  : T extends Date | RegExp
    ? T
    : T extends object
      ? {
          [K in keyof T as K extends string
            ? C extends "snake"
              ? SnakeCase<K>
              : C extends "kebab"
                ? KebabCase<K>
                : CamelCase<K>
            : K]: TransformKeys<T[K], C>;
        }
      : T;

export type FileMetadata = z.infer<typeof sharedSchemas.fileMetadata>;
export type FileWithPreview = z.infer<
  ReturnType<typeof sharedSchemas.fileWithPreview>
>;

export type ApiSuccessPayload<T = null> = {
  code?: number;
  message?: string;
  count?: Count;
  data?: T;
};

export type ApiErrorPayload = {
  code?: number;
  message?: string;
  error?: unknown;
};

export type RequestPart =
  | "params"
  | "query"
  | "body"
  | "headers"
  | "cookies"
  | "files";
