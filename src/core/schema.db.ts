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

type WithAudit<T> = Omit<T, "updated_at" | "created_at"> & {
  updated_at: ColumnType<Date, never, never>;
  created_at: ColumnType<Date, never, never>;
};

export type Database = {
  user: WithAudit<z.infer<typeof userTableSchema>>;
  account: WithAudit<z.infer<typeof accountTableSchema>>;
  session: WithAudit<z.infer<typeof sessionTableSchema>>;
  verification: WithAudit<z.infer<typeof verificationTableSchema>>;

  storage: WithAudit<z.infer<typeof storageTableSchema>>;
};

export type StorageTable = Selectable<Database["storage"]>;
