import { userSchema } from "@/modules/auth/schema";
import { APIError, betterAuth } from "better-auth";
import { admin, createAuthMiddleware, openAPI } from "better-auth/plugins";
import z from "zod";
import { appMeta } from "./constants/app";
import { messages } from "./constants/messages";
import { createDialect, db } from "./db";
import { novu } from "./novu";
import { ac, roles } from "./permission";
import { getPresignedUrl, removeFiles } from "./storage";

export type AuthSession = typeof auth.$Infer.Session;

export type Role = (typeof allRoles)[number];
export const allRoles = ["user", "admin"] as const;

export const defaultRole: Role = "user";

export const auth = betterAuth({
  appName: appMeta.name,

  database: { dialect: createDialect(), type: "mssql", casing: "snake" },
  experimental: { joins: true },

  trustedOrigins: [appMeta.cors.origin],

  plugins: [
    openAPI(),
    admin({
      ac,
      roles,
      defaultRole,
      schema: {
        user: {
          fields: {
            banReason: "ban_reason",
            banExpires: "ban_expires",
          },
        },
      },
    }),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const { name, email } = user;
      const url = `${appMeta.cors.origin}/reset-password?token=${token}`;
      void novu.trigger("purnaku-reset-password", {
        to: { subscriberId: email, email },
        payload: { name, url },
      });
    },
    onPasswordReset: async ({ user }) => {
      await db
        .insertInto("event_log")
        .values({ type: "password-reset", user_id: user.id })
        .execute();
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, token }) => {
      const { name, email } = user;
      const url = `${appMeta.cors.origin}/verify-user?token=${token}`;
      void novu.trigger("purnaku-verification", {
        to: { subscriberId: email, email },
        payload: { name, url },
      });
    },
    afterEmailVerification: async (user) => {
      await db
        .insertInto("event_log")
        .values({ type: "user-verified", user_id: user.id })
        .execute();
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          const session = ctx?.context.session;

          await db.transaction().execute(async (trx) => {
            if (session)
              await trx
                .insertInto("event_log")
                .values({
                  type: "admin-user-create",
                  user_id: session.user.id,
                  entity_id: user.id,
                })
                .execute();

            await trx
              .insertInto("event_log")
              .values({
                type: session ? "user-created" : "user-registered",
                user_id: user.id,
                entity_id: session ? session.user.id : null,
              })
              .execute();
          });
        },
      },
      delete: {
        before: async (user, ctx) => {
          const session = ctx?.context.session;
          if (!session) throw new APIError("UNAUTHORIZED");

          await db.transaction().execute(async (trx) => {
            if (user.image)
              await trx
                .updateTable("storage")
                .set("deleted_by", session.user.id)
                .where("id", "=", user.image)
                .execute();

            await trx
              .insertInto("event_log")
              .values({
                type: "admin-user-remove",
                user_id: session.user.id,
                data: user.name,
              })
              .execute();

            // await trx
            //   .insertInto("event_log")
            //   .values({ type: "user-removed", user_id: user.id })
            //   .execute();

            // auth.api.adminUpdateUser({
            //   headers: ctx.headers,
            //   body: { userId: user.id, data: { image: null } },
            // });
          });

          // return false;
        },
      },
    },
  },

  hooks: {
    // before: createAuthMiddleware(async (ctx) => {
    //   if (ctx.path === "/sign-up/email")
    //     throw new APIError("BAD_REQUEST", { message: "BAD" });
    // }),

    after: createAuthMiddleware(async (ctx) => {
      const { session, newSession } = ctx.context;

      const getUser = () => {
        if (!session) throw new Error(messages.unauthorized);
        return session.user;
      };

      if (ctx.path === "/get-session") {
        if (!session) return ctx.json(null);

        const { session: sessionData, user: userData } = session;
        if (!userData.image) return ctx.json(session);

        const data = await db
          .selectFrom("storage")
          .select("file_path")
          .where("id", "=", userData.image)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (!data) return ctx.json(session);

        return ctx.json({
          session: sessionData,
          user: { ...userData, image: await getPresignedUrl(data.file_path) },
        });
      }

      if (ctx.path === "/update-user") {
        const user = getUser();

        const oldImgId = user.image;
        const newImgId = newSession?.user.image;
        const isImgChange = oldImgId !== newImgId;

        const res = await db.transaction().execute(async (trx) => {
          await trx
            .insertInto("event_log")
            .values({
              type: isImgChange ? "profile-image-updated" : "profile-updated",
              user_id: user.id,
            })
            .execute();

          if (oldImgId && isImgChange)
            return await removeFiles([oldImgId], user.id, { db: trx });
        });

        if (res?.error)
          throw new APIError("INTERNAL_SERVER_ERROR", { message: res.error });
      }

      if (ctx.path === "/change-password") {
        const user = getUser();
        await db
          .insertInto("event_log")
          .values({ type: "password-changed", user_id: user.id })
          .execute();
      }

      if (ctx.path === "/admin/ban-user" || ctx.path === "/admin/unban-user") {
        if (!session?.user.id) throw new Error(messages.unauthorized);

        const parsedBody = z
          .object({ userId: userSchema.shape.id })
          .parse(ctx.body);

        const isBan = ctx.path === "/admin/ban-user";

        await db.transaction().execute(async (trx) => {
          await trx
            .insertInto("event_log")
            .values({
              type: isBan ? "admin-user-ban" : "admin-user-unban",
              user_id: session.user.id,
              entity_id: parsedBody.userId,
            })
            .execute();
          await trx
            .insertInto("event_log")
            .values({
              type: isBan ? "user-banned" : "user-unbanned",
              user_id: parsedBody.userId,
            })
            .execute();
        });
      }
    }),
  },

  user: {
    additionalFields: {
      role: { type: [...allRoles], input: false, defaultValue: defaultRole },
    },
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
      impersonatedBy: "impersonated_by",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});
