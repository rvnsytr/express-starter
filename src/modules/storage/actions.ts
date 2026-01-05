import { fileMeta, FileType } from "@/core/constants";
import { db } from "@/core/db";
import { Database, StorageTable } from "@/core/schema.db";
import { sharedSchemas, storageTableSchema } from "@/core/schema.zod";
import { formatZodError } from "@/core/utils";
import { Request } from "express";
import { Kysely } from "kysely";
import { Client } from "minio";
import z from "zod";

const bucket = process.env.AWS_BUCKET!;
const defaultDirectory = process.env.AWS_DIRECTORY ?? "tmp";

const s3 = new Client({
  endPoint: process.env.AWS_ENDPOINT!,
  port: process.env.AWS_PORT ? parseInt(process.env.AWS_PORT) : 443,
  useSSL: process.env.AWS_USE_SSL ? process.env.AWS_USE_SSL === "true" : true,
  accessKey: process.env.AWS_ACCESS_KEY_ID!,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

export type UploadFilesOptions = {
  type?: FileType;
  userId?: string;
  db?: Kysely<Database>;
  min?: number;
  max?: number;
  maxFileSize?: number;
  unique?: boolean;
  prefix?: string;
  suffix?: string;
  fileName?: string;
  fileCategory?: StorageTable["category"];
  overwriteByQuery?: boolean;
  directory?: string;
  disabled?: boolean;
};

export type RemoveFilesOptions = {
  by?: "id" | "file_path";
  db?: Kysely<Database>;
  disabled?: boolean;
};

export async function uploadFiles(req: Request, options?: UploadFilesOptions) {
  try {
    const type = options?.type ?? "file";

    const parsed = sharedSchemas.files(type, options).safeParse(req.files);
    if (!parsed.success) throw new Error(formatZodError(parsed.error));

    const queryParsed = z
      .object({
        url: z.coerce.boolean().optional().default(false),
        fileName: z.string().optional(),
      })
      .safeParse(req.query);
    if (!queryParsed.success)
      throw new Error(formatZodError(queryParsed.error));

    const userSchema = sharedSchemas
      .string("Used ID", { min: 1 })
      .safeParse(options?.userId ?? req.session?.user.id);
    if (!userSchema.success) throw new Error(formatZodError(userSchema.error));

    const { url: withUrl, fileName: fileNameInQuery } = queryParsed.data;

    const overwriteByQuery = options?.overwriteByQuery ?? false;
    const database = options?.db ?? db;
    const isDisabled = options?.disabled ?? false;
    const createdBy = userSchema.data;

    const fileNameOption = overwriteByQuery
      ? (fileNameInQuery ?? options?.fileName)
      : options?.fileName;

    const data = await Promise.all(
      parsed.data.map(async (file) => {
        const {
          fieldname,
          originalname,
          mimetype: mimeType,
          size,
          buffer,
        } = file;

        const categoryParse = storageTableSchema
          .pick({ category: true })
          .safeParse({ category: options?.fileCategory ?? fieldname });

        if (!categoryParse.success) {
          const { displayName } = fileMeta[type];
          const message = `Kategori ${displayName} tidak valid pada field '${fieldname}'.`;
          throw new Error(message);
        }

        const id = crypto.randomUUID().toUpperCase();
        const extension = originalname.split(".").pop();

        const now = options?.unique ? Date.now().toString() : "";
        const prefix = options?.prefix ?? "";
        const suffix = options?.suffix ?? "";
        const fileName = fileNameOption
          ? `${fileNameOption}${now}${suffix}.${extension}`
          : `${originalname}${now}${suffix}`;

        const directory = options?.directory ?? defaultDirectory;
        const category = categoryParse.data.category;
        const filePath = `${directory}/${category}/${prefix}${fileName}`;

        let fileUrl = undefined;

        if (!isDisabled) {
          await database
            .insertInto("storage")
            .values({
              id,
              file_name: fileName,
              category: category,
              file_path: filePath,
              mime_type: mimeType,
              file_size: size,
              created_by: createdBy,
            })
            .executeTakeFirst();

          await s3.putObject(bucket, filePath, buffer, size, {
            "Content-Type": mimeType,
          });

          if (withUrl) fileUrl = await getPresignedUrl(filePath, { fileName });
        }

        return {
          id,
          fileName,
          category,
          filePath,
          mimeType,
          fileSize: size,
          fileUrl,
        };
      }),
    );

    return { data, error: null };
  } catch (e) {
    const error =
      e instanceof Error
        ? e.message
        : "Terjadi kesalahan saat mengunggah file.";
    return { data: null, error };
  }
}

export async function getPresignedUrl(
  filePath: string,
  options?: { fileName?: string; duration?: number },
) {
  const fileName = options?.fileName;
  const duration = options?.duration ? 1000 * 60 * options.duration : 5;
  const reqParams = fileName
    ? { "response-content-disposition": `attachment; filename="${fileName}"` }
    : undefined;
  return await s3.presignedUrl("GET", bucket, filePath, duration, reqParams);
}

export async function removeFiles(
  keys: string[],
  userId: string,
  options?: RemoveFilesOptions,
) {
  try {
    const userSchema = sharedSchemas
      .string("Used ID", { min: 1 })
      .safeParse(userId);
    if (!userSchema.success) throw new Error(formatZodError(userSchema.error));

    const deletedBy = userSchema.data;
    const searchBy = options?.by ?? "id";
    const database = options?.db ?? db;
    const isDisabled = options?.disabled ?? false;

    let count = 0;

    if (!isDisabled) {
      const { numUpdatedRows } = await database
        .updateTable("storage")
        .set({ deleted_by: deletedBy, deleted_at: new Date() })
        .where(searchBy, "in", keys)
        .executeTakeFirst();
      count = Number(numUpdatedRows);
    }

    return { count, error: null };
  } catch (e) {
    const error =
      e instanceof Error ? e.message : "Terjadi kesalahan saat menghapus file.";
    return { count: null, error };
  }
}
