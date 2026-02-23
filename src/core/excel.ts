import Excel from "exceljs";
import { promises } from "fs";
import path from "path";
import z, { ZodType } from "zod";
import { ActionResponse } from "./constants/types";
import { sharedSchemas } from "./schema.zod";
import { formatZodError } from "./utils/formaters";

export async function readExcelSheet<S extends ZodType>(
  file: Pick<Express.Multer.File, "originalname" | "buffer">,
  config: {
    schema: S;
    source: Record<keyof z.infer<S>, number>;
    reqBody?: Record<string, unknown>;
    sheet?: string;
    skipRows?: number[];
  },
): Promise<ActionResponse<z.infer<S>[]>> {
  const parsedConfig = z
    .object({
      sheet: sharedSchemas.string("Worksheet").optional(),
      skipRows: sharedSchemas
        .jsonString(z.number().array().optional())
        .optional()
        .default(config.skipRows ?? []),
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

  const { sheet: rawSheet, skipRows, source } = parsedConfig.data;
  const sheet = !!rawSheet ? rawSheet : "Sheet1";

  const tmpDir = path.join(process.cwd(), "tmp");
  await promises.mkdir(tmpDir, { recursive: true });
  const inputPath = path.join(tmpDir, `${Date.now()}-${file.originalname}`);
  await promises.writeFile(inputPath, file.buffer);

  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const worksheet = workbook.getWorksheet(sheet);
  if (!worksheet)
    return { success: false, message: `Worksheet '${sheet}' tidak ditemukan.` };

  let errorMessage: string | null = null;
  const data: z.infer<S>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (
      !Array.isArray(row.values) ||
      skipRows.includes(rowNumber) ||
      !!errorMessage
    )
      return;

    const parsedRow = config.schema.safeParse(
      Object.fromEntries(
        Object.entries(source)
          .map(([k, i]) =>
            !Array.isArray(row.values) || typeof i !== "number"
              ? null
              : [k, row.values[i] ?? null],
          )
          .filter((v) => !!v),
      ),
    );

    if (!parsedRow.success)
      return (errorMessage = `Baris ke ${rowNumber}: ${formatZodError(parsedRow.error).message}`);

    data.push(parsedRow.data);
  });

  promises.unlink(inputPath);

  if (errorMessage) return { success: false, message: errorMessage };
  return { success: true, data };
}
