# ADR 0004 — Expenses reference `group_members`, not `users`

**Status:** Accepted · 2026-07-31

## Context

Two modelling questions, usually answered separately and both answered wrong:

1. **Splitting with someone who has no account.** You are on a trip with three
   friends and one of them will never install the app. The naive schema points
   expense shares at `users.id`, so that person cannot be in a split until they
   sign up — and if they sign up later, there is no way to attach their history.

2. **One-on-one expenses.** A friend-to-friend expense looks different from a
   group expense, so it grows its own table, its own balance computation, its
   own settle-up path, and its own bugs. Two implementations of debt, forever
   drifting apart.

## Decision

**Every expense belongs to a group**, and expense rows reference
`group_members.id` rather than `users.id`.

A one-on-one expense is a group of two. There is no friend-expense code path.

`group_members.user_id` is **nullable**. A member row with a null `user_id` is a
placeholder — a seat at the table with a display name and optionally an invite
email. You can split with a placeholder from the moment the group exists.

When that person signs up and accepts their invite, claiming the seat is a
single `UPDATE group_members SET user_id = ...`. Not one expense row moves,
because no expense row ever referenced a user.

## Consequences

**Good.** One balance engine, one settle-up flow, one set of tests. Placeholder
members work by construction rather than as a special case. Claiming a seat is
atomic and rewrites no history. A member's display name can differ per group,
which people actually want.

**Bad.** Every query that wants a real person joins `group_members → users`, and
that join is nullable. "Which groups am I in" goes through `group_members`
rather than reading a column off the user.

**Guarded.** Since member ids are supplied in request bodies, a caller could
name a member id belonging to a group they cannot read.
`assertMembersInGroup` runs on every write that accepts member ids and is not
optional. Partial uniqueness on `(group_id, user_id) WHERE user_id IS NOT NULL`
stops a real user occupying two seats while leaving placeholders unconstrained.

**Consequence worth stating plainly.** A placeholder member can hold a nonzero
balance indefinitely. That is correct — the debt is real whether or not the
debtor has an account.
