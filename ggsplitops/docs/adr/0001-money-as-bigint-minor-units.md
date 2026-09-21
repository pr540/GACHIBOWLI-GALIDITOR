# ADR 0001 — Money is a `bigint` count of minor units

**Status:** Accepted · 2026-07-31

## Context

Every amount in SplitBills is money. Getting the representation wrong is not a
performance problem or a style problem — it silently produces balances that
never reach zero, and users discover it months later when settle-up refuses to
finish.

Three representations were on the table:

- **IEEE-754 float / JS `number`.** Cannot represent `0.10` exactly. `0.1 + 0.2`
  is famously not `0.3`. Also caps exact integers at 2^53.
- **`numeric` / arbitrary-precision decimal.** Exact, and the conventional
  Postgres answer for money. Needs a decimal library in JS (`decimal.js`,
  `big.js`) because there is no native decimal type.
- **Integer count of minor units.** Store 1234 for `$12.34`. Exact, native, and
  the representation payment processors already use.

## Decision

Money is a **`bigint` count of the currency's minor unit**, paired with an ISO
4217 currency code. `bigint` is native, arbitrary-precision, and exact.

An amount is never valid on its own. It travels with its currency, because the
number of minor units per major unit is currency-dependent: JPY has 0 decimal
places, most currencies have 2, KWD and BHD have 3, CLF has 4. Code asks
`exponentOf(currency)` and never divides by a literal `100`.

Across HTTP, money is a **decimal string** (`"12.34"`) plus a `currency` field —
not a JSON number, because every client parses those as floats, and not a raw
minor-unit integer, because that forces every consumer to know the exponent
table.

In Postgres, money columns are `bigint`. Only exchange rates are `numeric`
(`20,10`), since a rate is a ratio rather than an amount.

## Consequences

**Good.** No rounding class of bug is reachable. No decimal dependency. Exact up
to 2^63 minor units, which is more money than exists. `bigint` arithmetic is
native and fast.

**Bad.** `bigint` does not serialize to JSON — every boundary needs an explicit
conversion, which is why `lib/json.ts` exists and is the only place that formats
an amount. Mixing `bigint` and `number` in arithmetic is a `TypeError`; that is
noisy in development and exactly the guardrail we want.

**Accepted risk.** Division is not closed over integers, so any split has a
remainder. That is handled deliberately in [ADR 0002](0002-split-remainder-allocation.md)
rather than being papered over with rounding.
