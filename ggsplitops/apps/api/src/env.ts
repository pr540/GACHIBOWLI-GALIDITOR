import { z } from "zod";

/**
 * Fail at boot, not at the first request that happens to need a missing key.
 * Optional integrations stay optional: a blank AI_API_KEY disables AI routes
 * rather than crashing a self-hoster who only wants expense splitting.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  FX_API_URL: z.string().url().default("https://api.frankfurter.dev/v1"),

  AI_PROVIDER: z.enum(["google", "openai", "anthropic", "ollama"]).default("google"),
  AI_MODEL: z.string().default("gemini-2.5-flash"),
  AI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("SplitBills <noreply@localhost>"),
  SMTP_URL: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment:\n${issues}\n\nCopy .env.example to .env and fill it in.`);
}

export const env = parsed.data;

/** Feature flags derived from what is actually configured. */
export const features = {
  ai: Boolean(env.AI_API_KEY) || env.AI_PROVIDER === "ollama",
  email: Boolean(env.RESEND_API_KEY || env.SMTP_URL),
  googleAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  githubAuth: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
} as const;
