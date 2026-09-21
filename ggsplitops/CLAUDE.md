# SplitBills

Open-source collaborative expense platform. pnpm monorepo, TypeScript throughout.

## Commands

```bash
pnpm install
docker compose up -d          # postgres+pgvector, redis, minio, frankfurter
pnpm db:push                  # apply schema (dev)
pnpm dev                      # web :3000, api :3001

pnpm check                    # typecheck + test + lint — run before saying done
pnpm --filter @splitbills/core test    # money engine tests (fast, no DB)
```

Node 22.18+ is required: the core package's tests are plain `node --test` over
`.ts` files, relying on native type stripping. There is no test framework.

## Layout

| Path             | Holds                                                        |
| ---------------- | ------------------------------------------------------------ |
| `packages/core`  | Money, splits, balances, debt simplification. Pure, no I/O.  |
| `packages/db`    | Drizzle schema, client, migrations.                          |
| `apps/api`       | Hono HTTP API, Better Auth, services.                        |
| `apps/web`       | Next.js 16 App Router UI.                                     |

## Rules that are not negotiable

**Money is `bigint` minor units.** Never `number`, never `float`, never
`parseFloat`. An amount is meaningless without its currency code — they travel
together. Currency exponents are not all 2 (JPY is 0, KWD is 3); use
`exponentOf()`, never a hardcoded `100`.

**Money crosses HTTP as a decimal string** (`"12.34"`), paired with `currency`.
Not a JSON number — every client parses those as floats.

**Splits go through `computeSplit`.** It guarantees `sum(shares) === total`
exactly. Do not compute a share inline; a split that loses a cent means the
group's balances never reach zero and settle-up never finishes.

**Balances are derived, never stored.** They are a fold over expense and
settlement rows. If you find yourself adding a `balance` column, stop — a
cached total that disagrees with the rows behind it is the worst bug this app
can have. Snapshots for speed are fine; a snapshot as the source of truth is not.

**Every group route calls `requireMembership`.** It is the only row-level
authorization gate. Any handler reading group data without it is a data leak.
When accepting member ids in a body, also call `assertMembersInGroup` — a caller
can otherwise name a member of a group they cannot read.

**Never trust client-supplied split amounts.** The server recomputes them.

**Writes that create rows in more than one table use one transaction.** An
expense without its payer and share rows is corrupt data, not a partial success.

## Conventions

- Expenses always belong to a group. A 1:1 expense is a group of two. There is
  no separate friend-expense path — do not add one.
- Expenses reference `group_members`, not `users`. A member with `user_id = null`
  is a placeholder for someone who has not signed up. This is a feature.
- Soft delete via `deletedAt`. Every read filters `isNull(deletedAt)`.
- Mutations that a client could retry take an `idempotencyKey`.
- FX rates are snapshotted onto the expense at creation and never recomputed.
- Deliberate shortcuts are marked `ponytail:` with their ceiling and upgrade path.

## Style

Match the surrounding code. Comments explain *why*, never *what* — the existing
comments are the calibration. Prefer the stdlib and native platform features
over a new dependency; say what a dependency replaces before adding it.
