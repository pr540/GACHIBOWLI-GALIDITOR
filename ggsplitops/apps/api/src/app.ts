import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { auth } from "./auth.ts";
import { env, features } from "./env.ts";
import { errorHandler } from "./lib/errors.ts";
import { requireAuth, withSession, type AppEnv } from "./lib/session.ts";
import { expenseRoutes } from "./routes/expenses.ts";
import { groupRoutes } from "./routes/groups.ts";
import { settlementRoutes } from "./routes/settlements.ts";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.onError(errorHandler);
  app.use("*", logger());
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: env.WEB_ORIGIN,
      // Cookie-based sessions are useless to the browser without this.
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  // Session cookies are same-site, so a cross-origin form post is always forged.
  app.use("*", csrf({ origin: env.WEB_ORIGIN }));

  app.get("/api/health", (c) =>
    c.json({
      status: "ok",
      version: "0.1.0",
      features,
    }),
  );

  // Better Auth owns every /api/auth/* path: sign-in, callbacks, sessions.
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.use("/api/*", withSession);

  const api = new Hono<AppEnv>()
    .use("*", requireAuth)
    .get("/me", (c) => c.json({ user: c.get("user") }))
    .route("/groups", groupRoutes)
    .route("/groups", expenseRoutes)
    .route("/groups", settlementRoutes);

  app.route("/api", api);

  return app;
}

/** Exported for Hono's RPC client, which gives the web app typed fetches. */
export type AppType = ReturnType<typeof createApp>;
