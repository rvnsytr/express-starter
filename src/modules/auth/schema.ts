import { sharedSchemas } from "@/core/schema";
import { transformKeys } from "@/core/utils";
import { allRoles } from "@/shared/permission";
import {
  accountSchema as betterAuthAccountSchema,
  sessionSchema as betterAuthSessionSchema,
  userSchema as betterAuthUserSchema,
  verificationSchema as betterAuthVerificationSchema,
} from "better-auth";
import z from "zod";

export const userSchema = betterAuthUserSchema.extend({
  email: sharedSchemas.email,
  name: sharedSchemas.string({ min: 1 }),
  image: z.string().nullish(),
  role: z.lazy(() => z.enum(allRoles)),
  banned: z.boolean().default(false),
  banReason: z.string().nullish(),
  banExpires: z.date().nullish(),
});

export const userTableSchema = userSchema.transform((v) =>
  transformKeys(v, "snake"),
);

export const accountTableSchema = betterAuthAccountSchema.transform((v) =>
  transformKeys(v, "snake"),
);

export const sessionSchema = betterAuthSessionSchema.extend({
  impersonatedBy: z.string().nullish(),
});

export const sessionTableSchema = sessionSchema.transform((v) =>
  transformKeys(v, "snake"),
);

export const verificationTableSchema = betterAuthVerificationSchema.transform(
  (v) => transformKeys(v, "snake"),
);
