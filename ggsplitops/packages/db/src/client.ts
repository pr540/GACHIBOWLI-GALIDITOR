import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

/**
 * Single pool per process. Serverless deployments should point DATABASE_URL at
 * a pooled endpoint (Neon's -pooler host, PgBouncer) rather than raising max.
 */
export const pool = new Pool({
  connectionString,
  max: Number(process.env["DATABASE_POOL_MAX"] ?? 10),
});

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
export { schema };
