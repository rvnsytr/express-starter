import { fileMeta, FileType } from "@/core/constants";
import { db } from "@/core/db";
import { Database, StorageTable } from "@/core/schemas.db";
import { sharedSchemas, storageTableSchema } from "@/core/schemas.zod";
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
  directory?: string;
  disabled?: boolean;
};

export type RemoveFilesOptions = {
  by?: "id" | "file_path";
  db?: Kysely<Database>;
};

export async function uploadFiles(req: Request, options?: UploadFilesOptions) {
  try {
    const type = options?.type ?? "file";

    const parsed = sharedSchemas.files(type, options).safeParse(req.files);
    if (!parsed.success) throw new Error(formatZodError(parsed.error));

    const queryParsed = z
      .object({ url: z.coerce.boolean().optional().default(false) })
      .safeParse(req.query);
    if (!queryParsed.success)
      throw new Error(formatZodError(queryParsed.error));

    const userSchema = sharedSchemas
      .string("Used ID", { min: 1 })
      .safeParse(options?.userId ?? req.session?.user.id);
    if (!userSchema.success) throw new Error(formatZodError(userSchema.error));

    const database = options?.db ?? db;
    const withUrl = queryParsed.data.url;
    const createdBy = userSchema.data;
    const fileTypeSchema = storageTableSchema.pick({ category: true });

    const data = await Promise.all(
      parsed.data.map(async (file) => {
        const { fieldname, originalname, mimetype, size, buffer } = file;

        const categoryParse = fileTypeSchema.safeParse({
          category: options?.fileCategory ?? fieldname,
        });

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
        const fileName = options?.fileName
          ? `${options.fileName}${now}${suffix}.${extension}`
          : `${originalname}${now}${suffix}`;

        const directory = options?.directory ?? defaultDirectory;
        const category = categoryParse.data.category;
        const filePath = `${directory}/${category}/${prefix}${fileName}`;

        let fileUrl = undefined;

        if (!(options?.disabled ?? false)) {
          await database
            .insertInto("storage")
            .values({
              id,
              file_name: fileName,
              category: category,
              file_path: filePath,
              mime_type: mimetype,
              file_size: size,
              created_by: createdBy,
            })
            .executeTakeFirst();

          await s3.putObject(bucket, filePath, buffer, size, {
            "Content-Type": mimetype,
          });

          if (withUrl) fileUrl = await getPresignedUrl(filePath, { fileName });
        }

        return {
          id,
          fileName,
          category,
          filePath,
          mimetype,
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

export async function getFiles(req: Request) {
  try {
    const parsed = z
      .object({
        url: z.coerce.boolean().optional().default(false),
        category: storageTableSchema.shape.category.optional(),
      })
      .safeParse(req.query);
    if (!parsed.success) throw new Error(formatZodError(parsed.error));

    const { url: withUrl, category } = parsed.data;

    let query = db.selectFrom("storage").selectAll();
    if (category) query = query.where("category", "=", category);

    let data = await query.orderBy("created_at", (ob) => ob.desc()).execute();

    if (withUrl) {
      data = await Promise.all(
        data.map(async (f) => {
          const fileName = f.file_name;
          const file_url = await getPresignedUrl(f.file_path, { fileName });
          return { ...f, file_url };
        }),
      );
    }

    return { data, error: null };
  } catch (e) {
    const error =
      e instanceof Error ? e.message : "Terjadi kesalahan saat mengambil file.";
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

    const { numUpdatedRows } = await database
      .updateTable("storage")
      .set({ deleted_by: deletedBy, deleted_at: new Date() })
      .where(searchBy, "in", keys)
      .executeTakeFirst();

    return { count: Number(numUpdatedRows), error: null };
  } catch (e) {
    const error =
      e instanceof Error ? e.message : "Terjadi kesalahan saat menghapus file.";
    return { count: null, error };
  }
}
