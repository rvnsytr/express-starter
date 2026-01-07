// Docs: https://www.kysely.dev/docs/getting-started

import { ColumnType, Selectable } from "kysely";
import z from "zod";
import {
  accountTableSchema,
  sessionTableSchema,
  storageTableSchema,
  userTableSchema,
  verificationTableSchema,
} from "./schema.zod";

type WithCreatedAt<T> = Omit<T, "created_at"> & {
  created_at: ColumnType<Date, never, never>;
};

export type Database = {
  user: WithCreatedAt<z.infer<typeof userTableSchema>>;
  account: WithCreatedAt<z.infer<typeof accountTableSchema>>;
  session: WithCreatedAt<z.infer<typeof sessionTableSchema>>;
  verification: WithCreatedAt<z.infer<typeof verificationTableSchema>>;
  storage: WithCreatedAt<z.infer<typeof storageTableSchema>>;
};

export type StorageTable = Selectable<Database["storage"]>;
