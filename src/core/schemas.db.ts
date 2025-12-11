// Docs: https://www.kysely.dev/docs/getting-started

import { AuthSession } from "@/modules/auth";
import { Account, Verification } from "better-auth";
import { ColumnType, Selectable } from "kysely";
import z from "zod";
import { storageTableSchema } from "./schemas.zod";

export type Database = {
  user: AuthSession["user"];
  account: Account;
  session: AuthSession["session"];
  verification: Verification;
  storage: Omit<z.infer<typeof storageTableSchema>, "created_at"> & {
    created_at: ColumnType<Date, never, never>;
  };
};

export type StorageTable = Selectable<Database["storage"]>;
