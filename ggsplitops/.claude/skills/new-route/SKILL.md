---
description: Add a group-scoped API route to apps/api following the established pattern — Zod validation, requireMembership, member-id assertion, transactional write, decimal-string money. Use when adding any endpoint under /api/groups, or when asked to add an endpoint, handler, or route to the SplitBills API.
---

# Adding a route to apps/api

Follow the existing routes exactly. `src/routes/expenses.ts` is the reference
for reads and writes; `src/routes/settlements.ts` for a simpler write.

$ARGUMENTS

## Order of operations in every group-scoped handler

```ts
const user = currentUser(c);                       // behind requireAuth already
const groupId = c.req.param("groupId");
await requireMembership(groupId, user.id, "MEMBER");   // VIEWER to read, ADMIN to administer
const body = c.req.valid("json");                   // zValidator ran before this
await assertMembersInGroup(groupId, [...memberIds]); // only if the body names members
```

`requireMembership` is not optional and is not something to reimplement. It is
the only row-level gate in the codebase. It throws 404 rather than 403 so group
ids cannot be probed.

`assertMembersInGroup` is the check people forget. Any body field holding a
member id needs it — otherwise a caller names a member of a group they cannot
read, and money moves across a boundary they never had access to.

## Money in and out

- **In:** a decimal string validated by regex, then `parseAmount(value, currency)`.
  Never accept a JSON number. Never `parseFloat`.
- **Out:** `money(minorUnits, currency)` from `lib/json.ts`, which returns
  `{ amount: "12.34", currency: "USD" }`. Never return a raw `bigint` (it does
  not serialize) and never a number.
- Percentages are basis points, share counts are plain integers. Only `EXACT`
  values are actual currency. See `parseSplitValue` in `routes/expenses.ts`.

## Writes

Anything touching more than one table goes in `db.transaction`. An expense
without its payer and share rows is corrupt data, not a partial success.

Anything a client could retry takes an optional `idempotencyKey` (uuid). Check
for an existing row by `(groupId, idempotencyKey)` *before* inserting and return
it if found. There is a partial unique index backing this.

Write an `activity_log` row in the same transaction for anything a group member
would want to see in the feed.

## Validation

Zod schema at the top of the route file, `.strict()` on write bodies so unknown
fields are rejected rather than ignored. Domain errors thrown by
`@splitbills/core` are already mapped to 422 by the global error handler — let
them propagate rather than catching and rewrapping.

## Reads

Every read filters `isNull(deletedAt)`.

Lists use cursor pagination on a timestamp, not offset — offset pagination
drifts when rows are inserted mid-scroll, which is what an active group does.
Return `nextCursor: null` when exhausted.

## Wiring up

Add the route to `src/app.ts` under the authenticated `api` sub-app. Routes
mount on `/groups` and declare their own `/:groupId/...` paths.

## Before saying done

```bash
pnpm --filter @splitbills/api typecheck
```

Then check your handler against the list in `.claude/agents/ledger-auditor.md`,
or run that agent on the diff.
