-- Runs once, on first boot of the postgres container.
--
-- `drizzle-kit push` applies the schema without running migration files, so the
-- vector extension has to already exist or the embeddings table fails to
-- create. The migration path handles this itself (see migrations/0000_init.sql);
-- this covers the local `pnpm db:push` flow.
CREATE EXTENSION IF NOT EXISTS vector;
