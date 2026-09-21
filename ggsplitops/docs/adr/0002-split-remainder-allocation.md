# ADR 0002 — Split remainders use largest-remainder, allocated deterministically

**Status:** Accepted · 2026-07-31

## Context

$10.00 split three ways is $3.3333…. In integer minor units, 1000 / 3 = 333
with a remainder of 1. Something has to happen to that cent.

What most implementations do, and why each is wrong:

- **Round each share and hope.** 333 × 3 = 999. One cent vanishes. The group's
  balances now sum to −1 instead of 0, and settle-up can never complete.
- **Round each share up.** 334 × 3 = 1002. Two cents invented from nothing.
- **Give the remainder to the payer.** Works, but the payer is silently
  penalised on every uneven split, which compounds across a trip.
- **Randomise it.** Now the same expense produces different rows on retry,
  which breaks idempotent replay and makes tests non-deterministic.

## Decision

All splits route through a single function, `allocate(total, weights)`, which
uses the **largest-remainder method**:

1. Give each participant `floor(total × weight / totalWeight)`.
2. Rank participants by the fractional part they lost.
3. Hand one extra minor unit to each of the top-ranked participants until the
   remainder is exhausted.

Ties break by **position in the participant list**, which makes the output a
pure function of the input — the same expense split twice produces byte-identical
rows.

Negative totals (refunds) are computed on the magnitude and negated, so a refund
rounds as the exact mirror of the charge it reverses.

Every split method — equal, exact, percentage, shares, adjustment — reduces to
`allocate`. `EXACT` is the one that validates rather than distributes, because
the user supplied the amounts and being off by a cent there is a mistake to
surface, not a remainder to absorb.

## Consequences

**Good.** `sum(shares) === total` holds by construction, for every method, for
every input. This is asserted directly in the test suite by brute-forcing all
totals from −50 to 50 across 1–7 participants. Determinism makes idempotent
retries safe.

**Bad.** Participants earlier in the list absorb the extra cent slightly more
often. Over a long-running group this is a rounding bias of at most one cent per
expense against whoever is listed first. The UI surfaces who absorbed it.

**Rejected.** Rotating the tie-break by expense id would spread the bias
fairly, but it makes the split depend on a value that does not exist until after
the row is inserted, which breaks the split preview shown before saving.
