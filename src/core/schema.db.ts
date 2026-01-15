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

// type WithId<T> = Omit<T, "id"> & {
//   id: ColumnType<string, never, never>;
// };

// type WithCreatedAt<T> = Omit<T, "created_at"> & {
//   created_at: ColumnType<Date, never, Date>;
// };

type WithUCAudit<T> = Omit<T, "updated_at" | "created_at"> & {
  updated_at: ColumnType<Date, never, Date>;
  created_at: ColumnType<Date, never, never>;
};

export type Database = {
  user: WithUCAudit<z.infer<typeof userTableSchema>>;
  account: WithUCAudit<z.infer<typeof accountTableSchema>>;
  session: WithUCAudit<z.infer<typeof sessionTableSchema>>;
  verification: WithUCAudit<z.infer<typeof verificationTableSchema>>;

  storage: WithUCAudit<z.infer<typeof storageTableSchema>>;
};

export type StorageTable = Selectable<Database["storage"]>;
