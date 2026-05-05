import { userSchema } from "@/modules/auth/schema";
import { appConfig } from "@/shared/config/app";
import { ac, allRoles, defaultRole, roles } from "@/shared/permission";
import { APIError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, openAPI } from "better-auth/plugins";
import z from "zod";
import { createDialect, db } from "./db";
import { messages } from "./messages";
import { getPresignedUrl, removeFiles } from "./s3";

export type ACStatements = typeof ac.statements;
export type Permissions = {
  [K in keyof ACStatements]?: ACStatements[K][number][];
};

export type AuthSession = typeof auth.$Infer.Session;
export type Session = AuthSession["session"];
export type User = AuthSession["user"];

export const auth = betterAuth({
  appName: appConfig.name,

  // secret: process.env.APP_KEY,
  // baseURL: process.env.APP_URL,
  trustedOrigins: [appConfig.cors.origin],

  database: { dialect: createDialect(), type: "mssql", casing: "snake" },
  experimental: { joins: true },

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
    autoSignIn: false,
    requireEmailVerification: true,
    // sendResetPassword: async ({ user, token }) => {
    //   const { name, email } = user;
    //   const url = `${appConfig.cors.origin}/reset-password?token=${token}`;
    //   void novu.trigger("purnaku-reset-password", {
    //     to: { subscriberId: email, email },
    //     payload: { name, url },
    //   });
    // },
    onPasswordReset: async ({ user }) => {
      await db
        .insertInto("activity")
        .values({ type: "password-reset", user_id: user.id })
        .execute();
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // sendVerificationEmail: async ({ user, token }) => {
    //   const { name, email } = user;
    //   const url = `${appConfig.cors.origin}/verify-user?token=${token}`;
    //   void novu.trigger("purnaku-verification", {
    //     to: { subscriberId: email, email },
    //     payload: { name, url },
    //   });
    // },
    afterEmailVerification: async (user) => {
      await db
        .insertInto("activity")
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
                .insertInto("activity")
                .values({
                  type: "admin-user-create",
                  user_id: session.user.id,
                  entity_id: user.id,
                })
                .execute();

            await trx
              .insertInto("activity")
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
                .updateTable("files")
                .set("deleted_by", session.user.id)
                .where("id", "=", user.image)
                .execute();

            await trx
              .insertInto("activity")
              .values([
                {
                  type: "admin-user-delete",
                  user_id: session.user.id,
                  data: user.name,
                },
                // { type: "user-removed", user_id: user.id },
              ])
              .execute();

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
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/update-user" && ctx.body.image) {
        const res = await db
          .selectFrom("files")
          .select(["updated_at"])
          .where("id", "=", ctx.body.image)
          .executeTakeFirst();
        const updatedAt = res?.updated_at ? res.updated_at.getTime() : null;
        if (updatedAt)
          return { context: { ...ctx, body: { ...ctx.body, updatedAt } } };
      }

      return ctx;
    }),

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
          .selectFrom("files")
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

        const currentImageId = user.image;
        const newImageId = newSession?.user.image;
        const imageId = newImageId ?? currentImageId;
        let isImageSame = currentImageId === newImageId;

        if (imageId && isImageSame && ctx.body.updatedAt) {
          const res = await db
            .selectFrom("files")
            .select(["updated_at"])
            .where("id", "=", imageId)
            .executeTakeFirst();
          if (res?.updated_at)
            isImageSame = res.updated_at.getTime() !== ctx.body.updatedAt;
        }

        const res = await db.transaction().execute(async (trx) => {
          await trx
            .insertInto("activity")
            .values({
              type: isImageSame ? "profile-updated" : "profile-image-updated",
              user_id: user.id,
            })
            .execute();

          if (currentImageId && !newImageId)
            return await removeFiles([currentImageId], user.id, { db: trx });
        });

        if (res && !res.success)
          throw new APIError("INTERNAL_SERVER_ERROR", { message: res.message });
      }

      if (ctx.path === "/change-password") {
        const user = getUser();
        await db
          .insertInto("activity")
          .values({ type: "password-changed", user_id: user.id })
          .execute();
      }

      // TODO
      if (ctx.path === "/admin/set-role") {
        // const user = getUser();
        console.log(ctx.body);
      }

      if (ctx.path === "/admin/ban-user" || ctx.path === "/admin/unban-user") {
        if (!session?.user.id) throw new Error(messages.unauthorized);

        const parsedBody = z
          .object({ userId: userSchema.shape.id })
          .parse(ctx.body);

        const isBan = ctx.path === "/admin/ban-user";

        await db.transaction().execute(async (trx) => {
          await trx
            .insertInto("activity")
            .values([
              {
                type: isBan ? "user-banned" : "user-unbanned",
                user_id: parsedBody.userId,
              },
              {
                type: isBan ? "admin-user-ban" : "admin-user-unban",
                user_id: session.user.id,
                entity_id: parsedBody.userId,
              },
            ])
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
