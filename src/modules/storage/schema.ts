import { sharedSchemas } from "@/core/schema.zod";
import z from "zod";

export const storageTableSchema = z.object({
  id: z.uuidv4(),

  file_name: sharedSchemas.string({ min: 1, max: 255 }),
  category: z.enum(["image"]),
  file_path: sharedSchemas.string({ min: 1, max: 500 }),
  mime_type: sharedSchemas.string({ max: 100 }),
  file_size: z.number(),

  deleted_at: z.date().nullable().default(null),
  deleted_by: z.string().nullable().default(null),
  updated_at: z.date().nullable().default(null),
  updated_by: z.string().nullable().default(null),
  created_at: z.date(),
  created_by: z.string(),
});
