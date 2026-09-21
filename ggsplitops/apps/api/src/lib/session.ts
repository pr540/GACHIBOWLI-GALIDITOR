import type { Context, MiddlewareHandler } from "hono";

import { auth } from "../auth.ts";
import { unauthorized } from "./errors.ts";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
  };
};

/** Resolves the session for every request; does not reject anonymous callers. */
export const withSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ? (session.user as SessionUser) : null);
  await next();
};

/** Gate for routes that need a signed-in user. Mount after `withSession`. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("user")) throw unauthorized();
  await next();
};

/** Non-null accessor for handlers already behind `requireAuth`. */
export function currentUser(c: Context<AppEnv>): SessionUser {
  const user = c.get("user");
  if (!user) throw unauthorized();
  return user;
}
