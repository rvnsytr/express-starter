import { appMeta } from "@/core/constants/app";
import { allFileTypes, fileMeta } from "@/core/constants/file";
import { ActionResponse } from "@/core/constants/types";
import { db } from "@/core/db";
import { Database, StorageTable } from "@/core/schema.db";
import { sharedSchemas } from "@/core/schema.zod";
import { formatZodError } from "@/core/utils/formaters";
import { getFileParts } from "@/core/utils/helpers";
import { storageTableSchema } from "@/modules/storage/schema";
import { Request } from "express";
import { Kysely } from "kysely";
import { Client } from "minio";
import z from "zod";
import { messages } from "./constants/messages";

const bucket = process.env.AWS_BUCKET!;
const defaultDirectory =
  process.env.AWS_DIRECTORY ?? appMeta.defaultStorageDirectory;

const s3 = new Client({
  endPoint: process.env.AWS_ENDPOINT!,
  port: process.env.AWS_PORT ? parseInt(process.env.AWS_PORT) : 443,
  useSSL: process.env.AWS_USE_SSL ? process.env.AWS_USE_SSL === "true" : true,
  accessKey: process.env.AWS_ACCESS_KEY_ID!,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

type UploadFilesData = {
  id: string;
  fileName: string;
  category: StorageTable["category"];
  filePath: string;
  mimeType: string;
  fileSize: number;
  fileUrl?: string;
}[];

const baseOptionSchema = z.object({
  fileType: z.enum(allFileTypes).default("file"),
  fileName: z.string().min(1).optional(),

  unique: sharedSchemas.boolean().default(false),
  prefix: z.string().default(""),
  suffix: z.string().default(""),

  min: z.coerce.number().catch(0),
  max: z.coerce.number().catch(0),
  maxFileSize: z.coerce.number().catch(0),

  url: sharedSchemas.boolean().default(false),
  withExtension: sharedSchemas.boolean().default(true),
});

type BaseUploadFilesOption = z.infer<typeof baseOptionSchema>;

export type UploadFilesOptions = Partial<BaseUploadFilesOption> & {
  userId?: string;

  db?: Kysely<Database>;
  category?: StorageTable["category"];
  directory?: string;

  allowBodyOverride?: boolean;
  enabled?: boolean;
};

export type RemoveFilesOptions = {
  by?: "id" | "file_path";
  db?: Kysely<Database>;
  disabled?: boolean;
};

// TODO : Validate Request
export async function uploadFiles(
  req: Request,
  options?: UploadFilesOptions,
): Promise<ActionResponse<UploadFilesData>> {
  if (!req.body || !req.files)
    return { success: false, message: `[req] ${messages.invalid("Request")}` };

  const rawBaseOptions = Object.fromEntries(
    Object.keys(baseOptionSchema.shape).map((k) => {
      const optionValue = options?.[k as keyof UploadFilesOptions];
      const value = options?.allowBodyOverride
        ? (req.body[k] ?? optionValue)
        : optionValue;
      return [k, value];
    }),
  );

  const parsedBaseOptions = baseOptionSchema.safeParse(rawBaseOptions);
  if (!parsedBaseOptions.success)
    return formatZodError(parsedBaseOptions.error, { withPath: true });

  const resolvedOptions = { ...options, ...parsedBaseOptions.data };

  const parsedUserId = sharedSchemas
    .string("Used ID", { min: 1 })
    .safeParse(options?.userId ?? req.session?.user.id);
  if (!parsedUserId.success) return formatZodError(parsedUserId.error);

  const parsedFile = sharedSchemas
    .files(resolvedOptions.fileType, resolvedOptions)
    .safeParse(req.files);
  if (!parsedFile.success)
    return formatZodError(parsedFile.error, { part: "files", withPath: true });

  const userId = parsedUserId.data;
  const database = options?.db ?? db;
  const isEnabled = options?.enabled ?? true;

  const data = await Promise.all(
    parsedFile.data.map(async (file) => {
      const {
        fieldname,
        originalname,
        mimetype: mimeType,
        size: fileSize,
        buffer,
      } = file;

      const categoryParse = storageTableSchema
        .pick({ category: true })
        .safeParse({ category: resolvedOptions.category ?? fieldname });

      if (!categoryParse.success) {
        const { displayName } = fileMeta[resolvedOptions.fileType];
        const message = `Kategori ${displayName} tidak valid pada field '${fieldname}'.`;
        throw new Error(message);
      }

      let id = crypto.randomUUID().toUpperCase();
      const { fileName: originalFileName, extension } =
        getFileParts(originalname);

      const now = resolvedOptions.unique ? Date.now().toString() : "";
      const prefix = resolvedOptions.prefix;
      const suffix = resolvedOptions.suffix;
      const fileName = resolvedOptions.fileName
        ? `${prefix}${resolvedOptions.fileName}${now}${suffix}`
        : `${prefix}${originalFileName}${now}${suffix}`;

      const directory = resolvedOptions.directory ?? defaultDirectory;
      const category = categoryParse.data.category;
      const filePath = `${directory}/${category}/${fileName}${resolvedOptions.withExtension ? `.${extension}` : ""}`;

      if (isEnabled) {
        const exists = await database
          .selectFrom("storage")
          .select("id")
          .where("file_path", "=", filePath)
          .executeTakeFirst();

        if (exists) {
          id = exists.id;
          await database
            .updateTable("storage")
            .set("file_size", fileSize)
            .set("deleted_by", null)
            .set("deleted_at", null)
            .set("updated_by", userId)
            .set("updated_at", new Date())
            .where("id", "=", id)
            .executeTakeFirst();
        } else {
          await database
            .insertInto("storage")
            .values({
              id,
              file_name: fileName,
              category: category,
              file_path: filePath,
              mime_type: mimeType,
              file_size: fileSize,
              created_by: userId,
            })
            .executeTakeFirst();
        }

        await s3.putObject(bucket, filePath, buffer, fileSize, {
          "Content-Type": mimeType,
        });
      }

      const fileUrl = resolvedOptions.url
        ? await getPresignedUrl(filePath, { fileName })
        : undefined;

      return {
        id,
        fileName,
        category,
        filePath,
        mimeType,
        fileSize,
        ...(fileUrl ? { fileUrl } : {}),
      };
    }),
  );

  try {
    return { success: true, count: { total: data.length }, data };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Terjadi kesalahan saat mengunggah file.";
    return { success: false, message, error: e };
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
): Promise<ActionResponse> {
  try {
    const searchBy = options?.by ?? "id";
    const database = options?.db ?? db;
    const isDisabled = options?.disabled ?? false;

    let total = 0;
    if (!isDisabled) {
      const { numUpdatedRows } = await database
        .updateTable("storage")
        .set({ deleted_by: userId, deleted_at: new Date() })
        .where(searchBy, "in", keys)
        .executeTakeFirst();
      total = Number(numUpdatedRows);
    }

    return { success: true, count: { total }, data: null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Terjadi kesalahan saat menghapus file.";
    return { success: false, count: { total: 0 }, message, error: e };
  }
}
