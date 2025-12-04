import { roles } from "@/core/permission";

export type Role = keyof typeof roles;
export const defaultRole: Role = "user";

export const allRoles = Object.keys(roles) as Role[];
export const adminRoles: Role[] = ["admin"];
export const userRoles: Role[] = allRoles.filter(
  (role) => !adminRoles.includes(role),
);
