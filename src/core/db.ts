import { Kysely, MssqlDialect } from "kysely";
import * as tarn from "tarn";
import * as tedious from "tedious";
import { Database } from "./schemas.db";

export const dialect = new MssqlDialect({
  tarn: { ...tarn, options: { min: 0, max: 10 } },
  tedious: {
    ...tedious,
    connectionFactory: () =>
      new tedious.Connection({
        server: process.env.DB_HOST!,
        authentication: {
          type: "default",
          options: {
            userName: process.env.DB_USERNAME!,
            password: process.env.DB_PASSWORD!,
          },
        },
        options: {
          database: process.env.DB_NAME!,
          trustServerCertificate: true,
          port: 1433,
        },
      }),
  },
});

export const db = new Kysely<Database>({ dialect });
