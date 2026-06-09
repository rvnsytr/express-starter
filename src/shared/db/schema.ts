// Docs: https://www.kysely.dev/docs/getting-started

import { Override } from "@/core/types";
import { ColumnType, Generated } from "kysely";
import z from "zod";

import { activityTableSchema } from "@/modules/activity/schema";
import {
  accountTableSchema,
  sessionTableSchema,
  userTableSchema,
  verificationTableSchema,
} from "@/modules/auth/schema";
import { fileTableSchema } from "@/modules/file/schema";

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

  file: Override<
    z.infer<typeof fileTableSchema>,
    {
      updated_at: ColumnType<Date, never, Date>;
      created_at: Generated<Date>;
    }
  >;

  activity: Override<
    z.infer<typeof activityTableSchema>,
    {
      id: Generated<string>;
      created_at: Generated<Date>;
    }
  >;
};
