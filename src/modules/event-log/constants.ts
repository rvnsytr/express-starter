export type EventLogType = (typeof allEventLogType)[number];
export const allEventLogType = [
  "user-registered",
  "user-created",
  // "user-imported",
  // "user-activated",
  "user-verified",
  "user-banned",
  "user-unbanned",
  // "user-removed",

  "profile-updated",
  "profile-image-updated",

  "password-reset",
  "password-changed",

  "admin-user-create",
  // "admin-user-import",
  "admin-user-update-role",
  "admin-user-ban",
  "admin-user-unban",
  "admin-user-remove",
] as const;
