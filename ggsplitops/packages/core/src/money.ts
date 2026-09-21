/**
 * Money in SplitBills is always an integer count of a currency's *minor unit*
 * (cents, fils, yen) held in a `bigint`. Floating point never touches an amount.
 *
 * The minor unit is currency-dependent: 100 USD-cents is 1 USD, but JPY has no
 * minor unit at all and KWD has 1000. Getting this wrong silently misprices
 * every expense in that currency, so the exponent table is authoritative.
 */

/** ISO 4217 minor-unit exponents that are not the default of 2. */
const EXPONENT_OVERRIDES: Readonly<Record<string, number>> = {
  // Zero-decimal currencies.
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  // Three-decimal currencies.
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  // Four-decimal.
  CLF: 4,
};

const DEFAULT_EXPONENT = 2;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Number of decimal places the currency subdivides into. */
export function exponentOf(currency: string): number {
  const code = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new MoneyError(`Not an ISO 4217 currency code: ${currency}`);
  }
  return EXPONENT_OVERRIDES[code] ?? DEFAULT_EXPONENT;
}

/**
 * Parse a human-entered decimal string ("12.34", "-0.5") into minor units.
 *
 * Takes a string rather than a number on purpose: `0.1 + 0.2` is already wrong
 * before it reaches us, and a float cannot represent every cent above 2^53.
 * Extra precision is rejected instead of rounded, so "1.005" in USD is an error
 * the user resolves rather than a silent half-cent we invented.
 */
export function parseAmount(input: string, currency: string): bigint {
  const exponent = exponentOf(currency);
  const trimmed = input.trim().replace(/[\s,_]/g, "");
  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(trimmed);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) {
    throw new MoneyError(`Cannot parse amount: ${JSON.stringify(input)}`);
  }
  const [, sign, whole = "", fraction = ""] = match;
  if (fraction.length > exponent) {
    throw new MoneyError(
      `${currency} has ${exponent} decimal place(s); got ${fraction.length} in ${JSON.stringify(input)}`,
    );
  }
  const padded = fraction.padEnd(exponent, "0");
  const magnitude = BigInt((whole === "" ? "0" : whole) + padded);
  return sign === "-" ? -magnitude : magnitude;
}

/** Render minor units as a plain decimal string, e.g. 1234n USD -> "12.34". */
export function formatAmount(minor: bigint, currency: string): string {
  const exponent = exponentOf(currency);
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(exponent + 1, "0");
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = exponent === 0 ? "" : `.${digits.slice(digits.length - exponent)}`;
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

/** Locale-aware display string. Presentation only — never parse this back. */
export function displayAmount(minor: bigint, currency: string, locale = "en-US"): string {
  const exponent = exponentOf(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(Number(formatAmount(minor, currency)));
}

/**
 * Split `total` across `weights` so the parts sum to exactly `total`.
 *
 * Integer division leaves a remainder of at most `weights.length - 1` minor
 * units. We hand those out by the largest-remainder method, breaking ties by
 * position, which makes the result deterministic — the same expense split twice
 * produces byte-identical rows, so replays and idempotent retries stay stable.
 *
 * Rounding always favours the earliest participants in the tie order. That is
 * arbitrary but consistent; the UI surfaces who absorbed the extra cent.
 */
export function allocate(total: bigint, weights: readonly bigint[]): bigint[] {
  if (weights.length === 0) {
    throw new MoneyError("Cannot allocate across zero participants");
  }
  if (weights.some((w) => w < 0n)) {
    throw new MoneyError("Allocation weights must be non-negative");
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0n);
  if (totalWeight === 0n) {
    throw new MoneyError("Allocation weights must not sum to zero");
  }

  // Work on the magnitude so bigint's truncate-toward-zero division cannot
  // flip the direction of rounding on refunds (negative totals).
  const negative = total < 0n;
  const magnitude = negative ? -total : total;

  const parts: bigint[] = [];
  const remainders: { index: number; remainder: bigint }[] = [];
  let distributed = 0n;

  for (let i = 0; i < weights.length; i++) {
    const numerator = magnitude * weights[i]!;
    const base = numerator / totalWeight;
    parts.push(base);
    remainders.push({ index: i, remainder: numerator % totalWeight });
    distributed += base;
  }

  let leftover = magnitude - distributed;
  remainders.sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (let i = 0; leftover > 0n; i++, leftover--) {
    const target = remainders[i % remainders.length]!.index;
    parts[target] = parts[target]! + 1n;
  }

  return negative ? parts.map((p) => -p) : parts;
}

/**
 * Convert between currencies using a rate snapshotted at expense time.
 *
 * `rate` is a decimal string of target-per-source units (e.g. "3.6725" for
 * USD->QAR) carried at up to 10 decimal places. Historical expenses keep the
 * rate they were created with forever — re-converting old expenses at today's
 * rate would silently rewrite what people already settled.
 */
export function convert(
  minor: bigint,
  from: string,
  to: string,
  rate: string,
): bigint {
  if (from.toUpperCase() === to.toUpperCase()) return minor;

  const rateMatch = /^(\d*)(?:\.(\d*))?$/.exec(rate.trim());
  if (!rateMatch || rate.trim() === "") {
    throw new MoneyError(`Cannot parse exchange rate: ${JSON.stringify(rate)}`);
  }
  const [, whole = "", fraction = ""] = rateMatch;
  const scaled = BigInt((whole === "" ? "0" : whole) + fraction);
  if (scaled === 0n) throw new MoneyError("Exchange rate must be greater than zero");
  const rateDenominator = 10n ** BigInt(fraction.length);

  // Re-scale between the two currencies' minor units as well as applying the
  // rate: 1 JPY (exponent 0) is not 1 USD-cent (exponent 2).
  const exponentDelta = exponentOf(to) - exponentOf(from);
  let numerator = minor * scaled;
  let denominator = rateDenominator;
  if (exponentDelta > 0) numerator *= 10n ** BigInt(exponentDelta);
  else if (exponentDelta < 0) denominator *= 10n ** BigInt(-exponentDelta);

  return divideRoundHalfUp(numerator, denominator);
}

/** Round-half-away-from-zero division, so conversions do not drift downward. */
function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const quotient = magnitude / denominator;
  const rounded = magnitude % denominator * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}
