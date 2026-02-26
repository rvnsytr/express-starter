import { messages } from "@/core/constants/messages";
import { sharedSchemas } from "@/core/schema.zod";
import z from "zod";
import { userSchema } from "../auth/schema";
import { allEventLogType } from "./constants";

export const eventLogTableSchema = z.object({
  id: z.uuidv4(),
  user_id: userSchema.shape.id,

  type: z.enum(allEventLogType, { error: messages.invalid("Event type") }),
  entity_id: z.uuidv4().nullable().default(null),
  data: sharedSchemas.string({ max: 255 }).nullable().default(null),

  created_at: z.date(),
});
