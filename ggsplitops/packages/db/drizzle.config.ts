import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgresql://splitbills:splitbills@localhost:5432/splitbills",
  },
  // The `vector` extension must exist before the embeddings table is created.
  // `migrate` gets it from migrations/0000_init.sql; `push` gets it from
  // docker/init.sql, which the postgres container runs on first boot.
  verbose: true,
  strict: true,
});
