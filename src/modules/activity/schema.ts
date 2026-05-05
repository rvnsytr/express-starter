import { messages } from "@/core/messages";
import z from "zod";
import { userSchema } from "../auth/schema";

export type ActivityType = (typeof allActivityTypes)[number];
export const allActivityTypes = [
  "user-registered",
  "user-created",
  // "user-imported",
  // "user-activated",
  "user-verified",
  "user-role-updated",
  "user-banned",
  "user-unbanned",
  // "user-deleted",

  "profile-updated",
  "profile-image-updated",

  "password-reset",
  "password-changed",

  "admin-user-create",
  // "admin-user-import",
  "admin-user-update-role",
  "admin-user-ban",
  "admin-user-unban",
  "admin-user-delete",
  "admin-users-delete",
] as const;

export const activityTableSchema = z.object({
  id: z.uuidv4(),
  user_id: userSchema.shape.id,

  type: z.enum(allActivityTypes, { error: messages.invalid("Event type") }),
  entity_id: z.uuidv4().nullable().default(null),
  data: z.string().nullable().default(null),

  created_at: z.date(),
});
