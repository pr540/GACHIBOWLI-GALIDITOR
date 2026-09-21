---
description: Change the Drizzle schema in packages/db safely — column conventions for money and currency, soft deletes, partial unique indexes, pgvector operator classes, and the generate/review/apply migration flow. Use when adding or altering a table, column, index, or enum in SplitBills.
---

# Changing the SplitBills schema

$ARGUMENTS

Schema lives in one file: `packages/db/src/schema.ts`. Keep it that way.

## Column conventions

| Kind | Type | Notes |
| --- | --- | --- |
| Money | `bigint({ mode: "bigint" })` | Minor units. Use the local `money()` helper. Never `integer` — it caps around $21.5M in cents. Never `numeric` for an amount. |
| Currency | `char(3)` | Use the local `currency()` helper. Every money column needs one adjacent. |
| Exchange rate | `numeric(20, 10)` | A ratio, not an amount — the one place `numeric` is right. |
| Ids | `uuid().defaultRandom()` | Except Better Auth's tables, which use `text` and are dictated by its adapter. |
| Timestamps | `timestamp({ withTimezone: true })` | Spread the `timestamps` helper for `createdAt`/`updatedAt`/`deletedAt`. |

A money column without a currency column beside it is a bug. JPY has 0 decimal
places and KWD has 3, so the number alone does not determine the amount.

## Rules

**Soft delete.** New entity tables spread `...timestamps`, which includes
`deletedAt`. Every read path filters `isNull(deletedAt)`.

**No balance columns.** Balances are derived from the ledger — see
[ADR 0003](../../../docs/adr/0003-balances-are-derived.md). A snapshot table for
speed is acceptable; a stored balance treated as truth is not.

**Reference `group_members`, not `user`,** for anything expense-related. That is
what makes placeholder members work — see
[ADR 0004](../../../docs/adr/0004-expenses-reference-group-members.md).

**Idempotency keys** get a partial unique index:

```ts
uniqueIndex("x_idempotency_idx")
  .on(t.groupId, t.idempotencyKey)
  .where(sql`${t.idempotencyKey} is not null`)
```

**pgvector indexes must declare an operator class.** pgvector has no default,
and `drizzle-kit push` has shipped bugs emitting HNSW DDL without one:

```ts
index("x_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops"))
```

Changing embedding dimensions is a migration and a backfill, not a config
change — the `vector` type is fixed-width.

**Enums** are `pgEnum`. Adding a value is cheap; removing or reordering is not.

## Migration flow

```bash
pnpm db:generate     # emit SQL into packages/db/migrations
```

**Read the generated SQL before applying it.** Drizzle infers intent from a
diff and sometimes infers a drop-and-recreate where you meant a rename. On a
table holding money, that is data loss.

```bash
pnpm db:push         # dev only — no migration file, straight to the database
pnpm db:migrate      # apply migration files (this is the one that runs in prod)
```

`db:push` is for local iteration. Anything that will reach a real database goes
through `db:generate` plus a reviewed migration file, committed.

## After changing the schema

```bash
pnpm --filter @splitbills/db typecheck
pnpm --filter @splitbills/api typecheck   # inferred row types propagate here
```

Update the table list in `docs/IMPLEMENTATION_PLAN.md` §4 if you added a table.
