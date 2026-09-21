# ggsplitops

Shared expenses, settled in one payment.

An open-source, self-hostable expense collaboration platform. Track who paid for
what, and get the smallest set of payments that squares everyone up — exact to
the paisa / cent, in any currency (default INR ₹).

MIT licensed. (Adapted from SplitBills by Aaron Sequeira).

---

## Why another one

Most expense splitters get the money wrong in a way you only notice months
later: a three-way split of $10.00 becomes 3.33 × 3, a cent evaporates, and the
group's balances can never reach zero again. SplitBills treats that as the
central engineering problem rather than an afterthought.

- **Amounts are `bigint` minor units end to end.** No floats, anywhere. Not in
  the database, not in the API, not in the UI.
- **Every split is proven to sum to its total.** `computeSplit` distributes the
  rounding remainder by largest-remainder, deterministically.
- **Currency exponents are respected.** JPY has no minor unit and KWD has three.
  Nothing in this codebase divides by a hardcoded 100.
- **Balances are derived, never stored.** They are a fold over immutable expense
  and settlement rows, so they cannot drift from the data behind them.

---

## Quick start

Requires Node 22.18+, pnpm 10+, and Docker.

```bash
git clone https://github.com/aaron-seq/SplitBills.git
cd SplitBills
pnpm install
cp .env.example .env          # works as-is for local dev

docker compose up -d          # postgres+pgvector, redis, minio, frankfurter
pnpm db:push                  # create the schema
pnpm dev                      # web :3000 · api :3001
```

Open http://localhost:3000, create an account, and add a group.

No API keys are needed for the core product. AI features stay switched off until
you set `AI_API_KEY`, and the app tells you which features are live at
`GET /api/health`.

---

## What works today

The vertical slice runs end to end: sign up → create a group → add members
(including people who have not signed up) → record an expense → see balances →
settle up.

| Area                                     | State                                                |
| ---------------------------------------- | ---------------------------------------------------- |
| Money engine                             | Done, 30 tests                                       |
| Splits: all five methods                 | Done — equal, exact, percentage, shares, adjustment |
| Multiple payers                          | Done                                                 |
| Balances + settle up                     | Done                                                 |
| Debt simplification                      | Done — greedy min-cash-flow, per currency           |
| Auth (email + OAuth)                     | Done — Better Auth                                  |
| Groups + placeholder members             | Done                                                 |
| Web UI                                   | Vertical slice — groups, expenses, balances, settle |
| Receipt OCR, AI chat, analytics, exports | Planned — see the roadmap                           |

Schema for the planned features is already in place, so those land as handlers
rather than migrations.

---

## Stack

| Layer    | Choice                              | Why                                                      |
| -------- | ----------------------------------- | -------------------------------------------------------- |
| Frontend | Next.js 16, React 19.2, Tailwind v4 | App Router, Turbopack default                            |
| API      | Hono                                | Web-standard, edge-capable, ~14KB, no decorator ceremony |
| Database | PostgreSQL 17 + pgvector            | One database for relational data*and* semantic search  |
| ORM      | Drizzle                             | SQL-first, native`vector` column and HNSW indexes      |
| Auth     | Better Auth                         | 2FA, passkeys, OAuth; mounts on Hono with no adapter     |
| Queue    | BullMQ + Redis                      | Self-hostable — a SaaS job runner would break that      |
| FX rates | Frankfurter (ECB)                   | Free, keyless, and runs in the compose file              |
| AI       | Provider-agnostic                   | Gemini by default; OpenAI, Anthropic, or local Ollama    |

Decisions with real trade-offs are written up in [`docs/adr/`](docs/adr/).

---

## Architecture

```
apps/web  ──http──>  apps/api  ──>  PostgreSQL 17 + pgvector
(Next 16)            (Hono)    ──>  Redis / BullMQ  ──>  apps/worker
                               ──>  S3 / R2 (receipts)

packages/core  Pure domain engine — money, splits, balances, simplification.
               No I/O, no database, no framework. Runs in a test in 1ms.
packages/db    Drizzle schema + client.
```

`packages/core` holds every rule about money and is deliberately free of I/O.
That is what makes the invariants testable without a database, and it is why the
test suite runs in about a second.

---

## Self-hosting

Everything runs from the compose file, including FX rates and object storage.
There is no required third-party service.

For a hosted deployment: web on Vercel, API on Railway/Fly.io, Postgres on Neon,
Redis on Upstash, storage on Cloudflare R2. All swappable by environment
variable.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: run `pnpm check`
before opening a PR, and read the money rules in [CLAUDE.md](CLAUDE.md) before
touching anything under `packages/core`.

## License

MIT see [LICENSE](LICENSE).

SplitBills is an independent project. It is not affiliated with, endorsed by, or
derived from Splitwise, and contains none of their code, assets, or branding.
