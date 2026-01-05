import { getPresignedUrl, removeFiles } from "@/modules/storage";
import { APIError, betterAuth } from "better-auth";
import { admin, createAuthMiddleware, openAPI } from "better-auth/plugins";
import { appMeta } from "./constants";
import { createDialect, db } from "./db";
import { ac, roles } from "./permission";

export type AuthSession = typeof auth.$Infer.Session;
export type Role = keyof typeof roles;

export const allRoles = Object.keys(roles) as Role[];
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
    autoSignIn: false,
    // sendResetPassword: async ({ user, url, token }) => {
    //   novu.trigger({
    //     to: {
    //       subscriberId: "subscriber_unique_identifier",
    //       firstName: "Albert",
    //       lastName: "Einstein",
    //       email: "albert@einstein.com",
    //       phone: "+1234567890",
    //     },
    //     workflowId: "workflow_identifier",
    //     payload: {
    //       comment_id: "string",
    //       post: {
    //         text: "string",
    //       },
    //     },
    //   });
    // },
  },
  emailVerification: {
    sendOnSignUp: true,
    // sendVerificationEmail: async ({ user, url, token }) => {},
  },

  user: {
    additionalFields: {
      role: { type: allRoles, input: false, defaultValue: defaultRole },
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
      // impersonatedBy: "impersonated_by",
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
        before: async (user, ctx) => {
          const session = ctx?.context.session;
          if (!session || !ctx.headers) throw new APIError("UNAUTHORIZED");

          if (user.image)
            db.updateTable("storage")
              .set("deleted_by", session.user.id)
              .where("id", "=", user.image)
              .execute();

          auth.api.adminUpdateUser({
            headers: ctx.headers,
            body: {
              userId: user.id,
              data: { image: null, deletedBy: session.user.id },
            },
          });

          return false;
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const { session, newSession } = ctx.context;

      if (ctx.path === "/get-session") {
        if (!session) return ctx.json(null);

        const { session: sessionData, user: userData } = session;
        if (!userData.image) return ctx.json({ ...session, imageId: null });

        const imageId = userData.image;

        const file = await db
          .selectFrom("storage")
          .select("file_path")
          .where("id", "=", imageId)
          .executeTakeFirst();

        if (!file) return ctx.json(session);
        const image = await getPresignedUrl(file.file_path);

        return ctx.json({
          session: sessionData,
          user: { ...userData, image },
          imageId,
        });
      }

      if (ctx.path === "/update-user") {
        const oldImageId = session?.user.image;
        const newImageId = newSession?.user.image;

        if (oldImageId && oldImageId !== newImageId)
          removeFiles([oldImageId], session?.user.id);
      }
    }),
  },
});
