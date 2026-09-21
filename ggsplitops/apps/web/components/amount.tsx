/**
 * One place that decides how money looks.
 *
 * Amounts arrive as decimal strings and are rendered as-is — parsing them into
 * a JS number to format them would reintroduce exactly the float error the API
 * went out of its way to avoid.
 */
export function Amount({
  amount,
  currency,
  tone = "auto",
  className = "",
}: {
  amount: string;
  currency: string;
  /** "auto" colours by sign using accounting convention. */
  tone?: "auto" | "neutral" | "credit" | "debit";
  className?: string;
}) {
  const negative = amount.startsWith("-");
  const resolved = tone === "auto" ? (negative ? "debit" : "credit") : tone;

  const color =
    resolved === "credit"
      ? "text-[--color-credit]"
      : resolved === "debit"
        ? "text-[--color-debit]"
        : "text-[--color-text]";

  // The sign is carried by colour and by the words around it, so the minus
  // glyph would be redundant noise in a balance column.
  const display = negative ? amount.slice(1) : amount;

  return (
    <span className={`tabular ${color} ${className}`}>
      <span className="text-[--color-faint] mr-1 text-[0.85em]">{currency}</span>
      {display}
    </span>
  );
}
