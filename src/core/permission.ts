// https://www.better-auth.com/docs/plugins/admin#admin-roles

import {
  Role as BetterAuthRole,
  createAccessControl,
} from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import { Role } from "./auth";

export type ACStatements = typeof ac.statements;
export type Permissions = {
  [K in keyof ACStatements]?: ACStatements[K][number][];
};

export const ac = createAccessControl({
  ...defaultStatements,
  storage: ["create", "list", "get", "delete"],
  event_log: ["list", "list:own", "list:user"],
});

export const roles: Record<Role, BetterAuthRole> = {
  user: ac.newRole({
    storage: ["create", "get", "delete"],
    event_log: ["list:own"],
  }),

  admin: ac.newRole({
    ...adminAc.statements,
    storage: ["create", "list", "get", "delete"],
    event_log: ["list", "list:own", "list:user"],
  }),
};
