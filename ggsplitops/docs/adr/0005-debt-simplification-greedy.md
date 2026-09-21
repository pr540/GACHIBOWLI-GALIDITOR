# ADR 0005 — Debt simplification is greedy min-cash-flow, not optimal

**Status:** Accepted · 2026-07-31

## Context

After a trip, a group holds a tangle of pairwise debts. Everyone wants the
smallest number of payments that clears them.

Minimising the number of transfers is **NP-hard** — it contains subset-sum. Any
implementation claiming an exact minimum is either exponential or wrong.

Options considered:

- **Pay every pairwise debt directly.** Up to n(n−1)/2 payments. Correct but
  useless at scale: 6 people can owe each other 15 separate amounts.
- **Max-flow / min-cost-flow.** The academically respectable answer, and what
  the published analyses of this problem reach for. Handles the general case but
  is substantial machinery, and max-flow alone still needs greedy heuristics on
  top to actually reduce the edge count.
- **Greedy: repeatedly settle the largest debtor against the largest creditor.**
  O(n log n). Produces at most n−1 transfers. Optimal unless some proper subset
  of participants happens to net to zero on its own.
- **Exhaustive subset partitioning.** Finds the true minimum by locating
  zero-sum subgroups. Exponential; unusable past roughly 15 people.

## Decision

**Greedy min-cash-flow**, applied independently per currency.

Sort debtors and creditors by magnitude, match the largest against the largest,
and repeat. Ties break by user id so the plan is reproducible run to run.

Currencies are never netted against each other. Each currency's balances must
sum to zero independently, and `simplifyDebts` throws if they do not — a
nonzero sum means the ledger is corrupt, and inventing a transfer to make the
numbers look tidy would hide the corruption rather than surface it.

Simplification is a **per-group toggle** (`groups.simplify_debts`). Some groups
want the optimised plan; others want to see who actually owes whom, because the
social meaning of "you owe Priya" differs from "you owe the group".

## Consequences

**Good.** At most n−1 payments instead of up to n(n−1)/2. Runs in microseconds.
Small enough to read in one sitting, which matters for code that tells people
how much money to hand each other.

**Critically — every participant's net balance is exactly preserved.** Nobody
pays a cent more or less than they owed; only the counterparty changes. This is
the property that is actually load-bearing, and it is what the tests assert:
replaying the generated transfers as settlements must zero every balance. That
holds regardless of whether the transfer count is optimal.

**Bad.** Occasionally produces one more transfer than strictly necessary. If a
subset of the group nets to zero among themselves, the optimum would settle them
internally and greedy may not spot it.

**Bad, socially.** Simplification can route a payment between two people who
never transacted directly, which surprises people the first time. Hence the
per-group toggle and the UI showing the plan before anything is recorded.

**Upgrade path.** Add subset-partition search for groups under ~15 members,
falling back to greedy above that. Worth doing only if users complain about
transfer counts, which no comparable product appears to see.
