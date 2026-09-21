import { formatAmount } from "@splitbills/core";

/**
 * Money crosses the API boundary as a decimal *string* ("12.34"), never a
 * number and never a raw bigint count of cents.
 *
 * A JSON number would silently lose precision in any client that parses it as a
 * float, which is all of them. A raw minor-unit integer would force every
 * consumer to know each currency's exponent to display it. A decimal string is
 * unambiguous, and the paired `currency` field says how to interpret it.
 */
export interface MoneyJson {
  amount: string;
  currency: string;
}

export function money(minor: bigint, currency: string): MoneyJson {
  const code = currency.trim().toUpperCase();
  return { amount: formatAmount(minor, code), currency: code };
}
