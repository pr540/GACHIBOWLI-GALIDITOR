# ADR 0003 — Balances are derived from the ledger, never stored

**Status:** Accepted · 2026-07-31

## Context

"What do I owe?" is the question the app exists to answer, and it is on the hot
path of every screen. The obvious optimisation is a `balance` column on
`group_members`, updated whenever an expense changes.

The obvious optimisation is also the single worst bug this class of application
can have. A stored balance that disagrees with the expense rows behind it is
undetectable without recomputing — and if you are recomputing to check it, you
did not need the column. Every way an expense can change is a way the cache can
go stale: edits, soft deletes, version restores, a failed transaction, a
concurrent write, a bug in one of the six places that maintains the column.

## Decision

A balance is a **fold over immutable ledger entries** and is computed on read.

Expenses and settlements produce signed entries:

- a payer's contribution is `+amount` (they are owed it back)
- a participant's share is `−amount` (they consumed it)
- a settlement is `+amount` to the payer, `−amount` to the recipient

Because payers cover the total and shares sum to the total, the entries for any
single expense net to zero. It follows that a whole group's balances always sum
to zero — a property `simplifyDebts` asserts before it will produce a transfer
plan, and refuses to proceed if violated.

There is no `balance` column. There is no cache. `computeGroupBalances` runs two
indexed queries and folds the result.

## Consequences

**Good.** A balance cannot be wrong without the underlying rows being wrong.
Editing, deleting, or restoring an expense needs no compensating entry — change
the rows and refold. Soft deletes work by exclusion at read time. The engine is
a pure function, tested without a database.

**Bad.** Reads are O(expenses in the group). For a group with 500 expenses this
is a couple of milliseconds; it is not free at 100,000.

**Upgrade path, when the cost is measured and not before.** Write a
`group_balance_snapshots` row in the same transaction as each expense, then fold
only the entries newer than the most recent snapshot. Same function, smaller
input, and the snapshot remains an optimisation that can be deleted and rebuilt
at any time — never the source of truth. This is marked with a `ponytail:`
comment at the function it applies to.

The rule that survives any optimisation: **if the snapshot and the rows
disagree, the rows are right.**
