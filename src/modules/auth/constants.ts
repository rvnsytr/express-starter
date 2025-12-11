import { auth } from "@/core/auth";
import { roles } from "@/core/permission";

export type AuthSession = typeof auth.$Infer.Session;
export type Role = keyof typeof roles;
export const allRoles = Object.keys(roles) as Role[];
