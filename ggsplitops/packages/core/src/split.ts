/**
 * Split methods. Every method reduces to the same guarantee:
 *
 *   sum(shares) === total, exactly, in minor units.
 *
 * That invariant is what makes balances trustworthy. If a split can lose a cent,
 * the group's balances never reach zero and "settle up" never finishes.
 */

import { allocate, MoneyError } from "./money.ts";

export type SplitMethod = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES" | "ADJUSTMENT";

/** Percentages are carried as basis points (1% = 100bp) to allow 2 decimals. */
export const BASIS_POINTS_TOTAL = 10_000n;

export interface SplitParticipant {
  userId: string;
  /** SHARES: share count. PERCENTAGE: basis points. EXACT: minor units. */
  value?: bigint;
  /** ADJUSTMENT only: minor units added to this person before the equal split. */
  adjustment?: bigint;
}

export interface SplitResult {
  userId: string;
  amount: bigint;
}

export class SplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitError";
  }
}

/**
 * Compute each participant's owed amount.
 *
 * `total` may be negative (a refund); every method handles the sign by
 * delegating to `allocate`, which keeps rounding symmetric.
 */
export function computeSplit(
  total: bigint,
  method: SplitMethod,
  participants: readonly SplitParticipant[],
): SplitResult[] {
  if (participants.length === 0) {
    throw new SplitError("An expense needs at least one participant");
  }
  const seen = new Set<string>();
  for (const p of participants) {
    if (seen.has(p.userId)) {
      throw new SplitError(`Duplicate participant: ${p.userId}`);
    }
    seen.add(p.userId);
  }

  const amounts = splitAmounts(total, method, participants);
  return participants.map((p, i) => ({ userId: p.userId, amount: amounts[i]! }));
}

function splitAmounts(
  total: bigint,
  method: SplitMethod,
  participants: readonly SplitParticipant[],
): bigint[] {
  switch (method) {
    case "EQUAL":
      return allocate(total, participants.map(() => 1n));

    case "SHARES": {
      const weights = participants.map((p, i) => {
        const shares = required(p.value, i, "share count");
        if (shares <= 0n) throw new SplitError(`Share count must be positive (participant ${i})`);
        return shares;
      });
      return allocate(total, weights);
    }

    case "PERCENTAGE": {
      const weights = participants.map((p, i) => {
        const bp = required(p.value, i, "percentage");
        if (bp < 0n) throw new SplitError(`Percentage must be non-negative (participant ${i})`);
        return bp;
      });
      const sum = weights.reduce((a, b) => a + b, 0n);
      if (sum !== BASIS_POINTS_TOTAL) {
        throw new SplitError(
          `Percentages must total 100% (got ${Number(sum) / 100}%)`,
        );
      }
      // Still routed through allocate: 3 people at 33.33/33.33/33.34 of an odd
      // total does not divide evenly either, and allocate absorbs the remainder.
      return allocate(total, weights);
    }

    case "EXACT": {
      const amounts = participants.map((p, i) => required(p.value, i, "exact amount"));
      const sum = amounts.reduce((a, b) => a + b, 0n);
      if (sum !== total) {
        throw new SplitError(
          `Exact amounts must total ${total} minor units (got ${sum}, off by ${sum - total})`,
        );
      }
      return amounts;
    }

    case "ADJUSTMENT": {
      // Everyone pays their adjustment, the rest is split equally.
      const adjustments = participants.map((p) => p.adjustment ?? 0n);
      const adjustmentTotal = adjustments.reduce((a, b) => a + b, 0n);
      const remainder = total - adjustmentTotal;
      const equal = allocate(remainder, participants.map(() => 1n));
      return adjustments.map((adj, i) => adj + equal[i]!);
    }

    default: {
      const exhaustive: never = method;
      throw new SplitError(`Unknown split method: ${String(exhaustive)}`);
    }
  }
}

function required(value: bigint | undefined, index: number, label: string): bigint {
  if (value === undefined) {
    throw new SplitError(`Missing ${label} for participant ${index}`);
  }
  return value;
}

/**
 * An expense can have several payers (two cards at dinner). Payers and
 * participants are independent lists: who fronted the money and who consumed it
 * are different questions, and modelling them separately is what lets one
 * person pay while three people owe.
 */
export interface Payer {
  userId: string;
  amount: bigint;
}

export function assertPayersCoverTotal(payers: readonly Payer[], total: bigint): void {
  if (payers.length === 0) throw new SplitError("An expense needs at least one payer");
  const paid = payers.reduce((sum, p) => sum + p.amount, 0n);
  if (paid !== total) {
    throw new SplitError(
      `Payers must cover the total of ${total} minor units (got ${paid}, off by ${paid - total})`,
    );
  }
}
