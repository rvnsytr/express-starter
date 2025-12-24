import { Kysely, MssqlDialect } from "kysely";
import * as tarn from "tarn";
import * as tedious from "tedious";
import { Database } from "./schema.db";

export type DBConfig = {
  host?: string;
  username?: string;
  password?: string;
  database?: string;
};

export function createDialect(config?: DBConfig) {
  const host = config?.host ?? process.env.DB_HOST!;
  const userName = config?.username ?? process.env.DB_USERNAME!;
  const password = config?.password ?? process.env.DB_PASSWORD!;
  const database = config?.database ?? process.env.DB_NAME!;

  return new MssqlDialect({
    tarn: { ...tarn, options: { min: 0, max: 10 } },
    tedious: {
      ...tedious,
      connectionFactory: () =>
        new tedious.Connection({
          server: host,
          authentication: { type: "default", options: { userName, password } },
          options: { database, trustServerCertificate: true, port: 1433 },
        }),
    },
  });
}

export const db = new Kysely<Database>({ dialect: createDialect() });
