import Excel from "exceljs";
import { promises } from "node:fs";
import path from "node:path";
import z, { ZodType } from "zod";
import { sharedSchemas } from "./schema";
import { ActionResponse } from "./types";
import { formatZodError } from "./utils";

type RowFilterMode = (typeof allRowFilterModes)[number];
const allRowFilterModes = ["include", "exclude"] as const;

const defaultSheets = ["Sheet1"];
const defaultTmpDir = "tmp";
const defaultRowFilterMode: RowFilterMode = "include";

export type ReadExcelSheetOptions<S> = {
  /**
   * Zod schema used to validate and parse each row from the Excel sheet.
   *
   * Schema keys represent field names, and their values define the expected data types.
   *
   * @example
   * const userSchema = z.object({
   *   name: z.string(),
   *   age: z.number(),
   * });
   */
  schema: S;

  /**
   * Maps schema fields to Excel column indices (1-based).
   *
   * @example
   * {
   *   name: 1, // Column: A
   *   age: 2,  // Column: B
   * }
   */
  source: Record<keyof z.infer<S>, number>;

  /**
   * Sheet names to read from.
   *
   * @default ["Sheet1"]
   *
   * @example
   * ["Sheet1", "Sheet2"]
   */
  sheets?: string[];

  /**
   * Filters rows by their Excel row numbers.
   *
   * @example
   * // Read only rows 2, 3, and 5
   * {
   *   mode: "include",
   *   rows: [2, 3, 5],
   * }
   *
   * // Skip rows 1 and 4
   * {
   *   mode: "exclude",
   *   rows: [1, 4],
   * }
   */
  rowFilter?: {
    mode?: RowFilterMode;
    rows: number[];
  };

  /**
   * Additional context or configuration values available during processing.
   *
   *  Useful for passing request data or runtime-specific values.
   */
  overrides?: Record<string, unknown>;
};

/** Reads data from an Excel sheet and validates it against a Zod schema. */
export async function readExcelSheet<S extends ZodType>(
  files: Pick<Express.Multer.File, "originalname" | "buffer">[],
  options: ReadExcelSheetOptions<S>,
): Promise<ActionResponse<z.infer<S>[]>> {
  const parsedConfig = z
    .object({
      source: sharedSchemas
        .jsonString(
          z.object(
            Object.fromEntries(
              Object.keys(options.source).map((k) => {
                const v = options.source[k as keyof typeof options.source];
                return [k, z.number().default(v)];
              }),
            ),
          ),
        )
        .default(options.source),
      sheets: sharedSchemas.string().array().optional().default(defaultSheets),
      rowFilter: z
        .object({
          mode: z
            .enum(allRowFilterModes)
            .default(options.rowFilter?.mode ?? defaultRowFilterMode),
          rows: sharedSchemas
            .jsonString(z.number().array().optional())
            .optional()
            .default(options.rowFilter?.rows ?? []),
        })
        .optional()
        .default({ mode: defaultRowFilterMode, rows: [] }),
    })
    .safeParse(options.overrides);

  if (!parsedConfig.success)
    return formatZodError(parsedConfig.error, { withPath: true });

  const { source, sheets, rowFilter } = parsedConfig.data;

  const tmpDir = path.join(process.cwd(), defaultTmpDir);
  await promises.mkdir(tmpDir, { recursive: true });

  const data: z.infer<S>[] = [];
  const tmpExcelFiles: string[] = [];

  try {
    for (const file of files) {
      const tmpFileName = `${Date.now()}-${file.originalname}`;
      const tmpFilePath = path.join(tmpDir, tmpFileName);

      tmpExcelFiles.push(tmpFilePath);
      await promises.writeFile(tmpFilePath, file.buffer);

      const workbook = new Excel.Workbook();
      await workbook.xlsx.readFile(tmpFilePath);

      for (const sheet of sheets) {
        const worksheet = workbook.getWorksheet(sheet);

        if (!worksheet) {
          await promises.unlink(tmpFilePath);
          const message = `Worksheet '${sheet}' tidak ditemukan dalam file '${file.originalname}'.`;
          throw new Error(message);
        }

        let errorMessage: string | null = null;

        worksheet.eachRow((row, rowNumber) => {
          if (!!errorMessage) return;

          const isRowSkip =
            rowFilter.mode === "include"
              ? !rowFilter.rows.includes(rowNumber)
              : rowFilter.rows.includes(rowNumber);

          if (!Array.isArray(row.values) || isRowSkip) return;

          const parsedRow = options.schema.safeParse(
            Object.fromEntries(
              Object.entries(source)
                .map(([k, i]) => {
                  if (!Array.isArray(row.values) || typeof i !== "number")
                    return null;
                  return [k, row.values[i] ?? null];
                })
                .filter((v) => !!v),
            ),
          );

          if (!parsedRow.success) {
            const { message } = formatZodError(parsedRow.error);
            errorMessage = `File '${file.originalname}', Sheet '${sheet}', Baris ke ${rowNumber}: ${message}`;
            return;
          }

          data.push(parsedRow.data);
        });

        if (errorMessage) {
          await promises.unlink(tmpFilePath);
          throw new Error(errorMessage);
        }
      }

      await promises.unlink(tmpFilePath);
    }

    return { success: true, data };
  } catch (e) {
    await Promise.all(tmpExcelFiles.map((p) => promises.unlink(p)));
    return {
      success: false,
      message:
        e instanceof Error
          ? e.message
          : "Terjadi kesalahan saat memproses file.",
    };
  }
}
