import { sharedSchemas } from "@/core/schema.zod";
import z from "zod";

export const storageTableSchema = z.object({
  id: z.uuidv4(),

  file_name: sharedSchemas.string("Nama file", { min: 1, max: 255 }),
  category: z.enum(["image"]),
  file_path: sharedSchemas.string("File path", { min: 1, max: 500 }),
  mime_type: sharedSchemas.string("Tipe file", { max: 100 }),
  file_size: sharedSchemas.number("Ukuran file"),

  deleted_at: sharedSchemas.date("deleted_at").nullable().default(null),
  deleted_by: sharedSchemas.string("deleted_by").nullable().default(null),
  updated_at: sharedSchemas.date("updated_at").nullable().default(null),
  updated_by: sharedSchemas.string("updated_by").nullable().default(null),
  created_at: sharedSchemas.date("created_at"),
  created_by: sharedSchemas.string("created_by"),
});
