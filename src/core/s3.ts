import {
  allFileCategories,
  FileCategory,
  filesTableSchema,
} from "@/modules/files/schema";
import { appConfig } from "@/shared/config";
import { Database } from "@/shared/db/schema";
import { allFileTypes, fileTypeConfig } from "@/shared/file-type";
import { Request } from "express";
import { Kysely } from "kysely";
import { Client } from "minio";
import z from "zod";
import { db } from "./db";
import { messages } from "./messages";
import { sharedSchemas } from "./schema";
import { ActionResponse } from "./types";
import { formatZodError, getFileNameParts } from "./utils";

const bucket = process.env.AWS_BUCKET!;
const defaultDirectory =
  process.env.AWS_DIRECTORY ?? appConfig.defaultFilesDirectory;

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
  category: FileCategory;
  filePath: string;
  mimeType: string;
  fileSize: number;
  fileUrl?: string;
};

const baseOptionSchema = z.object({
  fileType: z.enum(allFileTypes).default("file"),
  fileName: z.string().min(1).optional(),

  unique: sharedSchemas.boolean().default(false),
  prefix: z.string().default(""),
  suffix: z.string().default(""),

  minFiles: z.coerce.number().catch(0),
  maxFiles: z.coerce.number().catch(0),
  maxSize: z.coerce.number().catch(0),

  url: sharedSchemas.boolean().default(false),
  withExtension: sharedSchemas.boolean().default(true),
});

export type UploadFilesOptions = Partial<z.infer<typeof baseOptionSchema>> & {
  userId?: string;

  db?: Kysely<Database>;
  category?: FileCategory;
  allowedCategories?: FileCategory[];
  directory?: string;

  allowBodyOverride?: boolean;
  enabled?: boolean;
};

export type RemoveFilesOptions = {
  by?: "id" | "file_path";
  db?: Kysely<Database>;
  disabled?: boolean;
};

export async function uploadFiles(
  req: Request,
  options?: UploadFilesOptions,
): Promise<ActionResponse<UploadFilesData[]>> {
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
    .string({ min: 1 })
    .safeParse(resolvedOptions?.userId ?? req.session?.user.id);
  if (!parsedUserId.success)
    return { success: false, message: `[userId]: ${messages.unauthorized}` };

  const parsedFiles = sharedSchemas
    .files(resolvedOptions.fileType, resolvedOptions)
    .safeParse(req.files);
  if (!parsedFiles.success)
    return formatZodError(parsedFiles.error, { part: "files", withPath: true });

  const userId = parsedUserId.data;
  const database = resolvedOptions?.db ?? db;
  const isEnabled = resolvedOptions?.enabled ?? true;
  const allowedCategories =
    resolvedOptions?.allowedCategories ?? allFileCategories;

  const data: UploadFilesData[] = [];

  for (const file of parsedFiles.data) {
    const {
      fieldname,
      originalname,
      mimetype: mimeType,
      size: fileSize,
      buffer,
    } = file;

    const categoryParse = filesTableSchema
      .pick({ category: true })
      .refine((v) => allowedCategories.includes(v.category))
      .safeParse({ category: resolvedOptions.category ?? fieldname });

    if (!categoryParse.success) {
      const { displayName } = fileTypeConfig[resolvedOptions.fileType];
      const message = `Kategori ${displayName} tidak valid pada field '${fieldname}'.`;
      return { ...formatZodError(categoryParse.error), message };
    }

    let id = crypto.randomUUID().toUpperCase();
    const { fileName: originalFileName, extension } =
      getFileNameParts(originalname);

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
        .selectFrom("files")
        .select("id")
        .where("file_path", "=", filePath)
        .executeTakeFirst();

      if (exists) {
        id = exists.id;
        await database
          .updateTable("files")
          .set("file_size", fileSize)
          .set("deleted_by", null)
          .set("deleted_at", null)
          .set("updated_by", userId)
          .set("updated_at", new Date())
          .where("id", "=", id)
          .executeTakeFirst();
      } else {
        await database
          .insertInto("files")
          .values({
            id,
            category: category,
            file_name: fileName,
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

    data.push({
      id,
      fileName,
      category,
      filePath,
      mimeType,
      fileSize,
      ...(fileUrl ? { fileUrl } : {}),
    });
  }

  return { success: true, count: { total: data.length }, data };
}

export async function getPresignedUrl(
  filePath: string,
  options?: { fileName?: string; duration?: number },
) {
  const fileName = options?.fileName;
  const duration = 1000 * 60 * (options?.duration ?? 5);
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
        .updateTable("files")
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
