# Contributing to SplitBills

## Setup

Node 22.18+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:push
pnpm dev
```

## Before opening a PR

```bash
pnpm check     # typecheck + test + lint across the workspace
```

If it does not pass, the PR is not ready. If a check is failing for a reason
unrelated to your change, say so in the PR rather than skipping it.

## The rules that matter

Read [CLAUDE.md](CLAUDE.md) before touching anything under `packages/core`,
`apps/api/src/routes`, or the Drizzle schema. The short version:

- **Money is `bigint` minor units.** Never a float. Never `parseFloat`. An
  amount always travels with its currency code, and currency exponents are not
  all 2 — use `exponentOf()`, never a hardcoded `100`.
- **Splits go through `computeSplit`.** It is what guarantees
  `sum(shares) === total`. A split that loses a cent means the group's balances
  never reach zero and settle-up never finishes.
- **Balances are derived, never stored.** No `balance` column.
- **Every group route calls `requireMembership`.** It is the only row-level
  authorization gate. A handler without it is a data leak.
- **Writes across multiple tables use one transaction.**

These are not preferences. Each one has an [ADR](docs/adr/) explaining the
failure it prevents, and each failure is the kind that surfaces months later as
corrupt data rather than immediately as an error.

## Tests

`packages/core` uses plain `node --test` over TypeScript, relying on Node 22's
native type stripping. There is no test framework and we are not adding one
unless something concrete needs it.

Any change to money handling, splitting, or balance computation needs a test
that fails without the change. For rounding, prefer brute-forcing the invariant
across a range of inputs over a handful of hand-picked cases — see how
`allocate` is tested.

## Commits and PRs

- Small, focused PRs. One concern each.
- Explain *why* in the description; the diff already shows *what*.
- Comments in code explain why, never what. Match the surrounding density.
- Mark deliberate shortcuts with a `ponytail:` comment naming the ceiling and
  the upgrade path, so they can be found later instead of rotting.

## Dependencies

Say what a dependency replaces and why a few lines will not do. The stdlib and
native platform features come first. This project runs its test suite with no
test framework and formats money with no decimal library; that is intentional.

## Scope

Bug fixes and features on the [roadmap](docs/IMPLEMENTATION_PLAN.md#5-roadmap)
are welcome without asking. For anything larger, open an issue first — it is
cheaper than finding out after you have written it.
