import { messages } from "@/core/messages";
import z from "zod";
import { userSchema } from "../auth/schema";
import { allActivityTypes } from "./config";

export const activityTableSchema = z.object({
  id: z.uuidv4(),
  user_id: userSchema.shape.id,

  type: z.enum(allActivityTypes, { error: messages.invalid("Event type") }),
  entity_id: z.uuidv4().nullable().default(null),
  data: z.string().nullable().default(null),

  created_at: z.date(),
});
