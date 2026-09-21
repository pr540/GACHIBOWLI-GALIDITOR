import test from "node:test";
import assert from "node:assert/strict";

import {
  allocate,
  convert,
  displayAmount,
  exponentOf,
  formatAmount,
  MoneyError,
  parseAmount,
} from "./money.ts";
import { assertPayersCoverTotal, computeSplit, SplitError } from "./split.ts";
import {
  expenseEntries,
  netBalances,
  settlementEntries,
  simplifyDebts,
  BalanceError,
  type Balance,
} from "./balance.ts";

// ---------------------------------------------------------------------------
// money
// ---------------------------------------------------------------------------

test("exponentOf knows non-decimal currencies", () => {
  assert.equal(exponentOf("USD"), 2);
  assert.equal(exponentOf("qar"), 2);
  assert.equal(exponentOf("JPY"), 0);
  assert.equal(exponentOf("KWD"), 3);
  assert.throws(() => exponentOf("US"), MoneyError);
});

test("parseAmount converts decimal strings to minor units", () => {
  assert.equal(parseAmount("12.34", "USD"), 1234n);
  assert.equal(parseAmount("12", "USD"), 1200n);
  assert.equal(parseAmount("12.3", "USD"), 1230n);
  assert.equal(parseAmount("-0.05", "USD"), -5n);
  assert.equal(parseAmount("1,234.56", "USD"), 123456n);
  assert.equal(parseAmount(".5", "USD"), 50n);
  // Currency-aware, not hardcoded to cents.
  assert.equal(parseAmount("500", "JPY"), 500n);
  assert.equal(parseAmount("1.500", "KWD"), 1500n);
});

test("parseAmount rejects precision the currency cannot hold", () => {
  assert.throws(() => parseAmount("1.005", "USD"), SplitOrMoney);
  assert.throws(() => parseAmount("1.5", "JPY"), SplitOrMoney);
  assert.throws(() => parseAmount("abc", "USD"), SplitOrMoney);
  assert.throws(() => parseAmount("", "USD"), SplitOrMoney);
});

test("parseAmount survives amounts beyond float precision", () => {
  // 2^53 cents would be lossy as a JS number; bigint holds it exactly.
  const huge = "90071992547409.91";
  assert.equal(formatAmount(parseAmount(huge, "USD"), "USD"), huge);
});

test("formatAmount round-trips parseAmount", () => {
  for (const [value, currency] of [
    ["12.34", "USD"],
    ["0.00", "USD"],
    ["-7.05", "EUR"],
    ["500", "JPY"],
    ["1.500", "KWD"],
  ] as const) {
    assert.equal(formatAmount(parseAmount(value, currency), currency), value);
  }
});

test("displayAmount renders the currency for humans", () => {
  assert.equal(displayAmount(1234n, "USD"), "$12.34");
  assert.match(displayAmount(500n, "JPY"), /500/);
});

test("allocate always sums back to the total", () => {
  // The invariant that makes settle-up terminate. Brute-forced over awkward
  // totals and party sizes rather than a couple of hand-picked cases.
  for (let total = -50n; total <= 50n; total++) {
    for (let people = 1; people <= 7; people++) {
      const parts = allocate(total, Array.from({ length: people }, () => 1n));
      assert.equal(parts.length, people);
      assert.equal(
        parts.reduce((a, b) => a + b, 0n),
        total,
        `equal split of ${total} across ${people}`,
      );
    }
  }
});

test("allocate distributes the remainder by largest weight, deterministically", () => {
  // 100 across 3 -> 34/33/33, not 33/33/33 with a cent evaporated.
  assert.deepEqual(allocate(100n, [1n, 1n, 1n]), [34n, 33n, 33n]);
  // Ties break by position, so repeated runs agree.
  assert.deepEqual(allocate(100n, [1n, 1n, 1n]), allocate(100n, [1n, 1n, 1n]));
  // Weighted: 10 across shares 1:2 -> 3.33/6.67
  assert.deepEqual(allocate(1000n, [1n, 2n]), [333n, 667n]);
});

test("allocate rounds refunds symmetrically with charges", () => {
  const charge = allocate(100n, [1n, 1n, 1n]);
  const refund = allocate(-100n, [1n, 1n, 1n]);
  assert.deepEqual(refund, charge.map((c) => -c));
  assert.equal(refund.reduce((a, b) => a + b, 0n), -100n);
});

test("allocate rejects degenerate weights", () => {
  assert.throws(() => allocate(100n, []), MoneyError);
  assert.throws(() => allocate(100n, [0n, 0n]), MoneyError);
  assert.throws(() => allocate(100n, [1n, -1n]), MoneyError);
});

test("convert applies the snapshotted rate and re-scales minor units", () => {
  // 10.00 USD at 3.6725 -> 36.73 QAR (both 2-decimal).
  assert.equal(convert(1000n, "USD", "QAR", "3.6725"), 3673n);
  // Same currency is a no-op regardless of the rate passed.
  assert.equal(convert(1000n, "USD", "USD", "999"), 1000n);
  // 10.00 USD at 150 -> 1500 JPY, and JPY has no minor unit.
  assert.equal(convert(1000n, "USD", "JPY", "150"), 1500n);
  // Back the other way: 1500 JPY at 0.00667 -> 10.01 USD.
  assert.equal(convert(1500n, "JPY", "USD", "0.00667"), 1001n);
  assert.throws(() => convert(100n, "USD", "EUR", "0"), MoneyError);
});

// ---------------------------------------------------------------------------
// split
// ---------------------------------------------------------------------------

const people = (...ids: string[]) => ids.map((userId) => ({ userId }));
const sum = (rows: { amount: bigint }[]) => rows.reduce((a, r) => a + r.amount, 0n);

test("EQUAL split covers the total exactly", () => {
  const result = computeSplit(1000n, "EQUAL", people("a", "b", "c"));
  assert.equal(sum(result), 1000n);
  assert.deepEqual(result.map((r) => r.amount), [334n, 333n, 333n]);
});

test("SHARES split weights by share count", () => {
  const result = computeSplit(
    1200n,
    "SHARES",
    [
      { userId: "a", value: 2n },
      { userId: "b", value: 1n },
      { userId: "c", value: 1n },
    ],
  );
  assert.deepEqual(result.map((r) => r.amount), [600n, 300n, 300n]);
  assert.equal(sum(result), 1200n);
});

test("PERCENTAGE split uses basis points and must total 100%", () => {
  const result = computeSplit(
    1000n,
    "PERCENTAGE",
    [
      { userId: "a", value: 5000n },
      { userId: "b", value: 2500n },
      { userId: "c", value: 2500n },
    ],
  );
  assert.deepEqual(result.map((r) => r.amount), [500n, 250n, 250n]);
  assert.throws(
    () =>
      computeSplit(1000n, "PERCENTAGE", [
        { userId: "a", value: 5000n },
        { userId: "b", value: 4000n },
      ]),
    SplitError,
  );
});

test("PERCENTAGE split still sums exactly when percentages do not divide evenly", () => {
  // 33.33 / 33.33 / 33.34 of 10.00 -- the classic place a cent goes missing.
  const result = computeSplit(1000n, "PERCENTAGE", [
    { userId: "a", value: 3333n },
    { userId: "b", value: 3333n },
    { userId: "c", value: 3334n },
  ]);
  assert.equal(sum(result), 1000n);
});

test("EXACT split must add up to the total", () => {
  const ok = computeSplit(1000n, "EXACT", [
    { userId: "a", value: 700n },
    { userId: "b", value: 300n },
  ]);
  assert.equal(sum(ok), 1000n);
  assert.throws(
    () =>
      computeSplit(1000n, "EXACT", [
        { userId: "a", value: 700n },
        { userId: "b", value: 200n },
      ]),
    SplitError,
  );
});

test("ADJUSTMENT split applies extras then splits the rest equally", () => {
  // Dinner is 30.00; b had a 6.00 cocktail nobody else shared.
  const result = computeSplit(3000n, "ADJUSTMENT", [
    { userId: "a", adjustment: 0n },
    { userId: "b", adjustment: 600n },
    { userId: "c", adjustment: 0n },
  ]);
  assert.deepEqual(result.map((r) => r.amount), [800n, 1400n, 800n]);
  assert.equal(sum(result), 3000n);
});

test("computeSplit rejects empty and duplicate participants", () => {
  assert.throws(() => computeSplit(100n, "EQUAL", []), SplitError);
  assert.throws(() => computeSplit(100n, "EQUAL", people("a", "a")), SplitError);
});

test("payers must cover the total", () => {
  assert.doesNotThrow(() =>
    assertPayersCoverTotal([{ userId: "a", amount: 600n }, { userId: "b", amount: 400n }], 1000n),
  );
  assert.throws(() => assertPayersCoverTotal([{ userId: "a", amount: 900n }], 1000n), SplitError);
  assert.throws(() => assertPayersCoverTotal([], 1000n), SplitError);
});

// ---------------------------------------------------------------------------
// balance
// ---------------------------------------------------------------------------

test("a single expense nets to zero across the group", () => {
  const shares = computeSplit(3000n, "EQUAL", people("a", "b", "c"));
  const entries = expenseEntries("USD", [{ userId: "a", amount: 3000n }], shares);
  assert.equal(entries.reduce((acc, e) => acc + e.amount, 0n), 0n);

  const balances = netBalances(entries);
  assert.deepEqual(balances, [
    { userId: "a", currency: "USD", amount: 2000n },
    { userId: "b", currency: "USD", amount: -1000n },
    { userId: "c", currency: "USD", amount: -1000n },
  ]);
});

test("multiple payers are tracked independently of who owes", () => {
  const shares = computeSplit(1000n, "EQUAL", people("a", "b"));
  const entries = expenseEntries(
    "USD",
    [{ userId: "a", amount: 400n }, { userId: "c", amount: 600n }],
    shares,
  );
  const balances = netBalances(entries);
  // c paid but consumed nothing, so c is owed the full 600.
  assert.deepEqual(balances, [
    { userId: "a", currency: "USD", amount: -100n },
    { userId: "b", currency: "USD", amount: -500n },
    { userId: "c", currency: "USD", amount: 600n },
  ]);
});

test("settling clears the balance it pays off", () => {
  const shares = computeSplit(1000n, "EQUAL", people("a", "b"));
  const entries = [
    ...expenseEntries("USD", [{ userId: "a", amount: 1000n }], shares),
    ...settlementEntries("USD", "b", "a", 500n),
  ];
  assert.deepEqual(netBalances(entries), []);
});

test("partial settlement leaves the remainder outstanding", () => {
  const shares = computeSplit(1000n, "EQUAL", people("a", "b"));
  const entries = [
    ...expenseEntries("USD", [{ userId: "a", amount: 1000n }], shares),
    ...settlementEntries("USD", "b", "a", 200n),
  ];
  assert.deepEqual(netBalances(entries), [
    { userId: "a", currency: "USD", amount: 300n },
    { userId: "b", currency: "USD", amount: -300n },
  ]);
});

test("settlementEntries rejects nonsense payments", () => {
  assert.throws(() => settlementEntries("USD", "a", "a", 100n), BalanceError);
  assert.throws(() => settlementEntries("USD", "a", "b", 0n), BalanceError);
  assert.throws(() => settlementEntries("USD", "a", "b", -100n), BalanceError);
});

test("currencies never net against each other", () => {
  const entries = [
    ...expenseEntries("USD", [{ userId: "a", amount: 1000n }], [{ userId: "b", amount: 1000n }]),
    ...expenseEntries("EUR", [{ userId: "b", amount: 1000n }], [{ userId: "a", amount: 1000n }]),
  ];
  const balances = netBalances(entries);
  assert.equal(balances.length, 4);
  assert.equal(new Set(balances.map((b) => b.currency)).size, 2);
});

test("simplifyDebts collapses a chain into one transfer", () => {
  // The canonical case: A owes B 40, B owes C 40  =>  A pays C 40.
  const balances: Balance[] = [
    { userId: "a", currency: "USD", amount: -4000n },
    { userId: "b", currency: "USD", amount: 0n },
    { userId: "c", currency: "USD", amount: 4000n },
  ];
  assert.deepEqual(simplifyDebts(balances), [
    { from: "a", to: "c", currency: "USD", amount: 4000n },
  ]);
});

test("simplifyDebts preserves every net balance and uses at most n-1 transfers", () => {
  const balances: Balance[] = [
    { userId: "a", currency: "USD", amount: -5000n },
    { userId: "b", currency: "USD", amount: -3000n },
    { userId: "c", currency: "USD", amount: 2000n },
    { userId: "d", currency: "USD", amount: 6000n },
  ];
  const transfers = simplifyDebts(balances);

  assert.ok(
    transfers.length <= balances.length - 1,
    `expected <= 3 transfers, got ${transfers.length}`,
  );

  // Replaying the transfers as settlements must zero everyone out — that is
  // the only property that actually has to hold.
  const replay = netBalances([
    ...balances.map((b) => ({ userId: b.userId, currency: b.currency, amount: b.amount })),
    ...transfers.flatMap((t) => settlementEntries(t.currency, t.from, t.to, t.amount)),
  ]);
  assert.deepEqual(replay, []);
});

test("simplifyDebts handles each currency separately", () => {
  const transfers = simplifyDebts([
    { userId: "a", currency: "USD", amount: -1000n },
    { userId: "b", currency: "USD", amount: 1000n },
    { userId: "a", currency: "EUR", amount: 500n },
    { userId: "b", currency: "EUR", amount: -500n },
  ]);
  assert.equal(transfers.length, 2);
  // Opposite directions in the two currencies; no cross-currency netting.
  assert.deepEqual(transfers, [
    { from: "b", to: "a", currency: "EUR", amount: 500n },
    { from: "a", to: "b", currency: "USD", amount: 1000n },
  ]);
});

test("simplifyDebts refuses to invent money when the ledger is corrupt", () => {
  assert.throws(
    () =>
      simplifyDebts([
        { userId: "a", currency: "USD", amount: -1000n },
        { userId: "b", currency: "USD", amount: 900n },
      ]),
    BalanceError,
  );
});

test("end to end: a trip settles to zero", () => {
  // Three people, four expenses, mixed split methods, then settle up.
  const entries = [
    ...expenseEntries(
      "USD",
      [{ userId: "aaron", amount: 12000n }],
      computeSplit(12000n, "EQUAL", people("aaron", "john", "alex")),
    ),
    ...expenseEntries(
      "USD",
      [{ userId: "john", amount: 4500n }],
      computeSplit(4500n, "SHARES", [
        { userId: "aaron", value: 1n },
        { userId: "john", value: 2n },
        { userId: "alex", value: 1n },
      ]),
    ),
    ...expenseEntries(
      "USD",
      [{ userId: "alex", amount: 999n }],
      computeSplit(999n, "EQUAL", people("aaron", "john", "alex")),
    ),
    ...expenseEntries(
      "USD",
      [
        { userId: "aaron", amount: 2000n },
        { userId: "alex", amount: 3000n },
      ],
      computeSplit(5000n, "PERCENTAGE", [
        { userId: "aaron", value: 3333n },
        { userId: "john", value: 3333n },
        { userId: "alex", value: 3334n },
      ]),
    ),
  ];

  const balances = netBalances(entries);
  assert.equal(balances.reduce((acc, b) => acc + b.amount, 0n), 0n);

  const transfers = simplifyDebts(balances);
  const afterSettling = netBalances([
    ...entries,
    ...transfers.flatMap((t) => settlementEntries(t.currency, t.from, t.to, t.amount)),
  ]);
  assert.deepEqual(afterSettling, [], "everyone should be square after settling");
});

/** Both error classes are acceptable for parse failures; keep assertions honest. */
function SplitOrMoney(err: unknown): boolean {
  return err instanceof MoneyError || err instanceof SplitError;
}
