import { BalanceError, MoneyError, SplitError } from "@splitbills/core";
import type { Context, ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export class ApiError extends HTTPException {
  constructor(status: 400 | 401 | 403 | 404 | 409 | 422 | 429, message: string) {
    super(status, { message });
  }
}

export const notFound = (what: string) => new ApiError(404, `${what} not found`);
export const forbidden = (why = "You do not have access to this resource") =>
  new ApiError(403, why);
export const unauthorized = () => new ApiError(401, "Sign in to continue");
export const conflict = (why: string) => new ApiError(409, why);

/**
 * One place that turns any thrown value into a JSON body.
 *
 * Domain errors from @splitbills/core are user-facing validation failures
 * ("percentages must total 100%"), so they map to 422 with their real message.
 * Anything unrecognised is logged in full and reported as a bare 500 — internal
 * messages have leaked connection strings in enough postmortems already.
 */
export const errorHandler: ErrorHandler = (err, c: Context) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message, status: err.status }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Validation failed",
        status: 422,
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      422,
    );
  }

  if (err instanceof SplitError || err instanceof MoneyError || err instanceof BalanceError) {
    return c.json({ error: err.message, status: 422 }, 422);
  }

  console.error("[unhandled]", err);
  return c.json({ error: "Internal server error", status: 500 }, 500);
};
