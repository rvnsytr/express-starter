import { messages } from "@/core/constants/messages";
import z from "zod";
import { userSchema } from "../auth/schema";
import { allEventLogType } from "./constants";

export const eventLogTableSchema = z.object({
  id: z.uuidv4(),
  user_id: userSchema.shape.id,

  type: z.enum(allEventLogType, { error: messages.invalid("Event type") }),
  entity_id: z.uuidv4().nullable().default(null),
  data: z.string().nullable().default(null),

  created_at: z.date(),
});
