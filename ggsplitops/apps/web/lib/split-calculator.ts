/**
 * Split Calculator & Validator for ggsplitops
 *
 * Enforces:
 * - No negative amounts
 * - Splits must add up exactly to total (or 100% for percentage)
 * - Round to 2 decimal places with deterministic remainder absorption
 * - Multi-payer reconciliation
 */

export type SplitMethod = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface PayerShare {
  memberId: string;
  displayName: string;
  amount: string;
}

export interface ParticipantShareInput {
  memberId: string;
  displayName: string;
  value?: string; // EXACT amount, PERCENTAGE %, or SHARES count
}

export interface CalculatedSplitResult {
  memberId: string;
  displayName: string;
  amount: number;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Validates single or multiple payers against total expense amount.
 */
export function validatePayers(
  totalAmount: number,
  payers: PayerShare[]
): { valid: boolean; error?: string; sum: number; diff: number } {
  if (totalAmount <= 0) {
    return { valid: false, error: "Total amount must be greater than 0", sum: 0, diff: 0 };
  }
  if (payers.length === 0) {
    return { valid: false, error: "At least one payer is required", sum: 0, diff: totalAmount };
  }

  let sum = 0;
  for (const p of payers) {
    const amt = parseFloat(p.amount) || 0;
    if (amt < 0) {
      return { valid: false, error: `Payer ${p.displayName} has negative amount`, sum, diff: round2(totalAmount - sum) };
    }
    sum += amt;
  }

  sum = round2(sum);
  const diff = round2(totalAmount - sum);

  if (Math.abs(diff) > 0.01) {
    return {
      valid: false,
      error: `Payer total (₹${sum.toFixed(2)}) must equal expense amount (₹${totalAmount.toFixed(2)}). Diff: ₹${Math.abs(diff).toFixed(2)}`,
      sum,
      diff,
    };
  }

  return { valid: true, sum, diff: 0 };
}

/**
 * Calculates and validates participant shares according to split method.
 */
export function calculateAndValidateSplits(
  totalAmount: number,
  method: SplitMethod,
  participants: ParticipantShareInput[]
): {
  valid: boolean;
  error?: string;
  shares: CalculatedSplitResult[];
  sum: number;
  diff: number;
} {
  if (totalAmount <= 0) {
    return { valid: false, error: "Total amount must be greater than 0", shares: [], sum: 0, diff: 0 };
  }
  if (participants.length === 0) {
    return { valid: false, error: "At least one participant must be selected", shares: [], sum: 0, diff: totalAmount };
  }

  const count = participants.length;

  switch (method) {
    case "EQUAL": {
      // Allocate equally to 2 decimal places, distributing remainder cents deterministically
      const totalCents = Math.round(totalAmount * 100);
      const baseCents = Math.floor(totalCents / count);
      let remainderCents = totalCents % count;

      const shares: CalculatedSplitResult[] = participants.map((p) => {
        let cents = baseCents;
        if (remainderCents > 0) {
          cents += 1;
          remainderCents -= 1;
        }
        return {
          memberId: p.memberId,
          displayName: p.displayName,
          amount: cents / 100,
        };
      });

      return { valid: true, shares, sum: totalAmount, diff: 0 };
    }

    case "EXACT": {
      let sum = 0;
      const shares: CalculatedSplitResult[] = [];

      for (const p of participants) {
        const amt = parseFloat(p.value || "0") || 0;
        if (amt < 0) {
          return {
            valid: false,
            error: `Negative amount entered for ${p.displayName}`,
            shares: [],
            sum,
            diff: round2(totalAmount - sum),
          };
        }
        const roundedAmt = round2(amt);
        sum += roundedAmt;
        shares.push({
          memberId: p.memberId,
          displayName: p.displayName,
          amount: roundedAmt,
        });
      }

      sum = round2(sum);
      const diff = round2(totalAmount - sum);

      if (Math.abs(diff) > 0.01) {
        return {
          valid: false,
          error: `Exact split sum (₹${sum.toFixed(2)}) must equal total (₹${totalAmount.toFixed(2)}). Diff: ₹${Math.abs(diff).toFixed(2)}`,
          shares,
          sum,
          diff,
        };
      }

      return { valid: true, shares, sum, diff: 0 };
    }

    case "PERCENTAGE": {
      let totalPercent = 0;
      for (const p of participants) {
        const pct = parseFloat(p.value || "0") || 0;
        if (pct < 0) {
          return {
            valid: false,
            error: `Negative percentage entered for ${p.displayName}`,
            shares: [],
            sum: 0,
            diff: 0,
          };
        }
        totalPercent += pct;
      }

      totalPercent = round2(totalPercent);
      const percentDiff = round2(100 - totalPercent);

      if (Math.abs(percentDiff) > 0.01) {
        return {
          valid: false,
          error: `Percentages must total 100% (currently ${totalPercent.toFixed(1)}%). Diff: ${percentDiff.toFixed(1)}%`,
          shares: [],
          sum: totalPercent,
          diff: percentDiff,
        };
      }

      // Compute 2-decimal rounded shares with remainder absorption
      let allocatedCents = 0;
      const totalCents = Math.round(totalAmount * 100);
      const shares: CalculatedSplitResult[] = participants.map((p, idx) => {
        const pct = parseFloat(p.value || "0") || 0;
        if (idx === count - 1) {
          // Last participant absorbs remainder to guarantee exact sum
          const lastCents = totalCents - allocatedCents;
          return {
            memberId: p.memberId,
            displayName: p.displayName,
            amount: lastCents / 100,
          };
        }
        const cents = Math.round((totalCents * pct) / 100);
        allocatedCents += cents;
        return {
          memberId: p.memberId,
          displayName: p.displayName,
          amount: cents / 100,
        };
      });

      return { valid: true, shares, sum: totalAmount, diff: 0 };
    }

    case "SHARES": {
      let totalShares = 0;
      for (const p of participants) {
        const sh = parseFloat(p.value || "1") || 0;
        if (sh < 0) {
          return {
            valid: false,
            error: `Negative share count entered for ${p.displayName}`,
            shares: [],
            sum: 0,
            diff: 0,
          };
        }
        totalShares += sh;
      }

      if (totalShares <= 0) {
        return { valid: false, error: "Total shares must be greater than 0", shares: [], sum: 0, diff: 0 };
      }

      let allocatedCents = 0;
      const totalCents = Math.round(totalAmount * 100);
      const shares: CalculatedSplitResult[] = participants.map((p, idx) => {
        const sh = parseFloat(p.value || "1") || 0;
        if (idx === count - 1) {
          const lastCents = totalCents - allocatedCents;
          return {
            memberId: p.memberId,
            displayName: p.displayName,
            amount: lastCents / 100,
          };
        }
        const cents = Math.round((totalCents * sh) / totalShares);
        allocatedCents += cents;
        return {
          memberId: p.memberId,
          displayName: p.displayName,
          amount: cents / 100,
        };
      });

      return { valid: true, shares, sum: totalAmount, diff: 0 };
    }
  }
}
