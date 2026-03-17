import z from "zod";
import { allStorageCategories } from "./constants";

export const storageTableSchema = z.object({
  id: z.uuidv4(),

  file_name: z.string(),
  category: z.enum(allStorageCategories),
  file_path: z.string(),
  mime_type: z.string(),
  file_size: z.number(),

  deleted_at: z.date().nullable().default(null),
  deleted_by: z.string().nullable().default(null),
  updated_at: z.date().nullable().default(null),
  updated_by: z.string().nullable().default(null),
  created_at: z.date(),
  created_by: z.string(),
});
