# ADR 0006 — Stack: Hono, Drizzle, Better Auth, BullMQ

**Status:** Accepted · 2026-07-31

## Context

The original plan specified NestJS, Prisma, and Auth.js v5. Each was revisited
against the constraint that actually governs this project: **it must be
genuinely self-hostable by one person on cheap infrastructure**, and it must
support pgvector for the AI features.

## Decisions

### Hono over NestJS

NestJS is the safer default for a team of five and a long-lived backend, and it
has the larger enterprise track record. This is a solo open-source project where
low-friction self-hosting is a feature, and NestJS's decorator/reflection model
plus its cold-start profile work against that.

Hono is built on web-standard `Request`/`Response`, runs on Node, Bun, Deno, and
edge runtimes, and its core is ~14KB. As of mid-2026 it also out-downloads
`@nestjs/core` on npm by roughly 4×, so "smaller ecosystem" no longer means
"niche". Clean architecture is enforced by directory structure and the
`requireMembership` gate rather than by a framework's module system.

### Drizzle over Prisma

The deciding factor is **native pgvector support**: a real `vector` column type
and HNSW index definitions in the schema. Prisma requires `Unsupported()` plus
raw SQL, which puts the AI feature set outside the type system permanently.

Drizzle is also SQL-first, which is what we want for financial queries, has no
codegen step, and is ~7KB against Prisma's ~1.6MB.

Known sharp edge: `drizzle-kit push` has had bugs emitting HNSW index DDL
without the operator class, which pgvector requires. The schema declares
`vector_cosine_ops` explicitly, and generated migrations are reviewed before
being applied.

### Better Auth over Auth.js v5

Better Auth mounts on Hono with no adapter at all — Hono passes `c.req.raw`
straight to `auth.handler` — and ships 2FA, passkeys, and RBAC as first-party
plugins. Lucia is deprecated and was not considered.

**We do not use its organization plugin.** A splitting group is not a tenant: it
has placeholder members, no billing, and no seat management. Our own `groups`
tables cost one table and avoid bending a plugin to a shape it was not built for.
See [ADR 0004](0004-expenses-reference-group-members.md).

### BullMQ over Inngest / Trigger.dev

Inngest is the better serverless default and Trigger.dev handles long-running AI
work more gracefully. Both are hosted services.

A self-hosted SplitBills that silently depends on someone's SaaS to process
receipts is not self-hosted. BullMQ needs Redis, which is already in the compose
file for caching, and it runs anywhere. The cost is operating our own workers,
which is accepted.

### Frankfurter for FX

Free, no API key, ECB-sourced, open source, and **runs in the compose file**.
Coverage is ~30 major currencies at daily reference rates, which is right for
splitting dinner and wrong for trading. `FX_API_URL` points elsewhere for anyone
needing broader coverage.

### Provider-agnostic AI

One `AIProvider` interface behind an env var. Gemini by default for its free
tier and strong document/layout handling; OpenAI and Anthropic supported; Ollama
for people who want no third party at all.

**Receipt processing is one call, not a pipeline.** The original plan had
OCR → LLM → item extraction → merchant detection as separate stages. Modern
vision models take the image and return structured JSON directly, so the
pipeline collapses into a single request with a schema. Tesseract remains
available as a local-only fallback for self-hosters without an API key.

## Consequences

Smaller dependency surface, edge-deployable API, and pgvector inside the type
system. In exchange we hand-roll what NestJS would provide: dependency wiring,
module boundaries, and OpenAPI generation. The `requireMembership` gate is the
one piece of that where a mistake is a security bug rather than an
inconvenience, which is why it is a single function every route must call.
