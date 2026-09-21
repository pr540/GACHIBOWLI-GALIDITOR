import { db } from "@splitbills/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env, features } from "./env.ts";

/**
 * Better Auth owns sessions, OAuth, and password hashing. We keep our own
 * groups tables rather than using the organization plugin: a splitting group is
 * not a tenant, it has placeholder members and no billing, and bending the
 * plugin to fit costs more than the table it saves.
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],

  database: drizzleAdapter(db, { provider: "pg" }),

  emailAndPassword: {
    enabled: true,
    // Requiring verification with no mail transport configured would lock a
    // self-hoster out of their own instance on first run.
    requireEmailVerification: features.email,
  },

  socialProviders: {
    ...(features.googleAuth && {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(features.githubAuth && {
      github: {
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
      },
    }),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  user: {
    additionalFields: {
      defaultCurrency: { type: "string", defaultValue: "USD", input: true },
      locale: { type: "string", defaultValue: "en", input: true },
      timezone: { type: "string", defaultValue: "UTC", input: true },
    },
  },

  advanced: {
    database: { generateId: false },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
