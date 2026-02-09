import { allRoles } from "@/core/auth";
import { sharedSchemas } from "@/core/schema.zod";
import { transformKeys } from "@/core/utils/formaters";
import {
  accountSchema as betterAuthAccountSchema,
  sessionSchema as betterAuthSessionSchema,
  userSchema as betterAuthUserSchema,
  verificationSchema as betterAuthVerificationSchema,
} from "better-auth";
import z from "zod";

export const userSchema = betterAuthUserSchema.extend({
  email: sharedSchemas.email,
  name: sharedSchemas.string("Nama", { min: 1 }),
  image: z.string().optional().nullable(),
  role: z.enum(allRoles),
  banned: z.boolean().default(false),
  banReason: z.string().optional().nullable(),
  banExpires: z.date().optional().nullable(),
});

export const userTableSchema = userSchema.transform((v) =>
  transformKeys(v, "snake"),
);

export const accountTableSchema = betterAuthAccountSchema.transform((v) =>
  transformKeys(v, "snake"),
);

export const sessionSchema = betterAuthSessionSchema.extend({
  impersonatedBy: z.string().nullable().optional(),
});

export const sessionTableSchema = sessionSchema.transform((v) =>
  transformKeys(v, "snake"),
);

export const verificationTableSchema = betterAuthVerificationSchema.transform(
  (v) => transformKeys(v, "snake"),
);
