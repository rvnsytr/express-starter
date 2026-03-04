import Excel from "exceljs";
import { promises } from "fs";
import path from "path";
import z, { ZodType } from "zod";
import { ActionResponse } from "./constants/types";
import { sharedSchemas } from "./schema.zod";
import { formatZodError } from "./utils/formaters";

type ReadExcelSheetMode = (typeof allReadExcelSheetModes)[number];
const allReadExcelSheetModes = ["include", "exclude"] as const;

export async function readExcelSheet<S extends ZodType>(
  files: Pick<Express.Multer.File, "originalname" | "buffer">[],
  config: {
    schema: S;
    source: Record<keyof z.infer<S>, number>;
    reqBody?: Record<string, unknown>;
    sheet?: string;
    mode?: ReadExcelSheetMode;
    rows?: number[];
  },
): Promise<ActionResponse<z.infer<S>[]>> {
  const parsedConfig = z
    .object({
      sheet: sharedSchemas.string().optional(),
      mode: z.enum(allReadExcelSheetModes).default(config.mode ?? "include"),
      rows: sharedSchemas
        .jsonString(z.number().array().optional())
        .optional()
        .default(config.rows ?? []),
      source: sharedSchemas
        .jsonString(
          z.object(
            Object.fromEntries(
              Object.keys(config.source).map((k) => {
                const v = config.source[k as keyof typeof config.source];
                return [k, z.number().default(v)];
              }),
            ),
          ),
        )
        .default(config.source),
    })
    .safeParse(config.reqBody);

  if (!parsedConfig.success)
    return formatZodError(parsedConfig.error, { withPath: true });

  const { sheet: rawSheet, mode, rows, source } = parsedConfig.data;
  const sheet = !!rawSheet ? rawSheet : "Sheet1";

  const tmpDir = path.join(process.cwd(), "tmp");
  await promises.mkdir(tmpDir, { recursive: true });

  const data: z.infer<S>[] = [];
  let error: Extract<ActionResponse, { success: false }> | null = null;
  const excelTmpDir: string[] = [];

  try {
    for (const file of files) {
      const inputPath = path.join(tmpDir, `${Date.now()}-${file.originalname}`);
      excelTmpDir.push(inputPath);
      await promises.writeFile(inputPath, file.buffer);

      const workbook = new Excel.Workbook();
      await workbook.xlsx.readFile(inputPath);
      const worksheet = workbook.getWorksheet(sheet);

      if (!worksheet) {
        const message = `Worksheet '${sheet}' tidak ditemukan.`;
        return { success: false, message };
      }

      worksheet.eachRow((row, rowNumber) => {
        const isRowSkip =
          mode === "include"
            ? !rows.includes(rowNumber)
            : rows.includes(rowNumber);
        if (!Array.isArray(row.values) || isRowSkip || !!error) return;

        const parsedRow = config.schema.safeParse(
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
          const { message, ...restError } = formatZodError(parsedRow.error);
          const errorMessage = `Baris ke ${rowNumber}: ${message}`;
          return (error = { message: errorMessage, ...restError });
        }

        data.push(parsedRow.data);
      });

      promises.unlink(inputPath);
      if (error) return error;
    }

    return { success: true, data };
  } catch (e) {
    excelTmpDir.forEach((p) => promises.unlink(p));
    return {
      success: false,
      message:
        e instanceof Error
          ? e.message
          : "Terjadi kesalahan saat memproses file.",
    };
  }
}
