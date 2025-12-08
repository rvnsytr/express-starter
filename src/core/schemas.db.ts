import { Session } from "@/modules/auth";
import { Account, Verification } from "better-auth";

export type Database = {
  user: Session["user"];
  account: Account;
  session: Session["session"];
  verification: Verification;
};
