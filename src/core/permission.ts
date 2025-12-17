// * NOTE: Sync this file with frontend `@/src/core/permission.ts`
// https://www.better-auth.com/docs/plugins/admin#admin-roles

import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export type ACStatements = typeof ac.statements;
export type Permissions = {
  [K in keyof ACStatements]?: ACStatements[K][number][];
};

export const ac = createAccessControl({
  ...defaultStatements,
  storage: ["create", "list", "update", "delete"],
});

export const roles = {
  user: ac.newRole({
    storage: ["create", "list"],
  }),

  admin: ac.newRole({
    ...adminAc.statements,
    storage: ["create", "list", "update", "delete"],
  }),
};
