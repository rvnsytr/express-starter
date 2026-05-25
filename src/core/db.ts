import { Database } from "@/shared/db/schema";
import {
  Expression,
  Kysely,
  MssqlDialect,
  ParseJSONResultsPlugin,
  sql,
} from "kysely";
import * as tarn from "tarn";
import * as tedious from "tedious";

export type DBConfig = {
  host?: string;
  username?: string;
  password?: string;
  database?: string;
  port?: string;
};

export function createDialect(config?: DBConfig) {
  const host = config?.host ?? process.env.DB_HOST!;
  const userName = config?.username ?? process.env.DB_USERNAME!;
  const password = config?.password ?? process.env.DB_PASSWORD!;
  const database = config?.database ?? process.env.DB_NAME!;
  const port = Number(config?.port ?? process.env.DB_PORT!);

  return new MssqlDialect({
    tarn: { ...tarn, options: { min: 0, max: 10 } },
    tedious: {
      ...tedious,
      connectionFactory: () =>
        new tedious.Connection({
          server: host,
          authentication: { type: "default", options: { userName, password } },
          options: { database, trustServerCertificate: true, port },
        }),
    },
  });
}

export const db = new Kysely<Database>({
  dialect: createDialect(),
  plugins: [new ParseJSONResultsPlugin()],
});

export const countWhere = <T>(condition: Expression<T>) =>
  sql<number>`COALESCE(SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END),0)`;
