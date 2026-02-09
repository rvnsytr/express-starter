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
  example: ["create", "update", "delete"],
});

export const roles: Record<Role, BetterAuthRole> = {
  user: ac.newRole({
    example: ["create"],
  }),

  admin: ac.newRole({
    ...adminAc.statements,
    example: ["create", "update", "delete"],
  }),
};
