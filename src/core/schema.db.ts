// Docs: https://www.kysely.dev/docs/getting-started

import { ColumnType, Generated, Selectable } from "kysely";
import z from "zod";
import { Override } from "./constants/types";

import {
  accountTableSchema,
  sessionTableSchema,
  userTableSchema,
  verificationTableSchema,
} from "@/modules/auth/schema";
import { eventLogTableSchema } from "@/modules/event-log/schema";
import { storageTableSchema } from "@/modules/storage/schema";

export type Database = {
  user: Override<
    z.infer<typeof userTableSchema>,
    {
      banned: ColumnType<boolean, never, boolean>;
      updated_at: ColumnType<Date, never, Date>;
      created_at: Generated<Date>;
    }
  >;

  account: Override<
    z.infer<typeof accountTableSchema>,
    {
      updated_at: ColumnType<Date, never, Date>;
      created_at: Generated<Date>;
    }
  >;

  session: Override<
    z.infer<typeof sessionTableSchema>,
    {
      updated_at: ColumnType<Date, never, Date>;
      created_at: Generated<Date>;
    }
  >;

  verification: Override<
    z.infer<typeof verificationTableSchema>,
    {
      updated_at: ColumnType<Date, never, Date>;
      created_at: Generated<Date>;
    }
  >;

  storage: Override<
    z.infer<typeof storageTableSchema>,
    {
      updated_at: ColumnType<Date, never, Date>;
      created_at: Generated<Date>;
    }
  >;

  event_log: Override<
    z.infer<typeof eventLogTableSchema>,
    {
      id: Generated<string>;
      created_at: Generated<Date>;
    }
  >;
};

export type StorageTable = Selectable<Database["storage"]>;
