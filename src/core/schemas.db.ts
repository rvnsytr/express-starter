import { Account, Verification } from "better-auth";
import { SessionWithImpersonatedBy, UserWithRole } from "better-auth/plugins";

export type Database = {
  user: UserWithRole;
  account: Account;
  session: SessionWithImpersonatedBy;
  verification: Verification;
};
