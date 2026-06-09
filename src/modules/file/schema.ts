import z from "zod";
import { allFileCategories } from "./config";

export const fileTableSchema = z.object({
  id: z.uuidv4(),

  category: z.enum(allFileCategories),
  file_path: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  file_size: z.number(),

  deleted_at: z.date().nullable().default(null),
  deleted_by: z.string().nullable().default(null),
  updated_at: z.date().nullable().default(null),
  updated_by: z.string().nullable().default(null),
  created_at: z.date(),
  created_by: z.string(),
});
