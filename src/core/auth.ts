import { APIError, betterAuth } from "better-auth";
import { admin, createAuthMiddleware, openAPI } from "better-auth/plugins";
import { appMeta } from "./constants/app";
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

  databaseHooks: {
    user: {
      delete: {
        before: async (_user, ctx) => {
          const session = ctx?.context.session;
          if (!session || !ctx.headers) throw new APIError("UNAUTHORIZED");

          // if (user.image) {
          //   db.updateTable("storage")
          //     .set("deleted_by", session.user.id)
          //     .where("id", "=", user.image)
          //     .execute();

          //   auth.api.adminUpdateUser({
          //     headers: ctx.headers,
          //     body: { userId: user.id, data: { image: null } },
          //   });
          // }

          return false;
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
        const oldImgId = session?.user.image;
        const newImgId = newSession?.user.image;

        if (oldImgId && oldImgId !== newImgId)
          removeFiles([oldImgId], session?.user.id);
      }
    }),
  },
});
