import Link from "next/link";

/**
 * The hero is a worked example, not a value proposition.
 *
 * The single most characteristic thing this product does is collapse a tangle
 * of debts into one payment. Showing that happening — three obligations
 * becoming one line — argues for the product better than any headline about
 * "effortless expense management" could.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 md:py-32">
      <p className="eyebrow">Open source · self-hostable · MIT</p>

      <h1 className="mt-6 text-4xl leading-[1.05] font-medium tracking-tight md:text-6xl">
        Shared expenses,
        <br />
        <span className="text-[--color-brass]">settled in one payment.</span>
      </h1>

      <p className="text-[--color-muted] mt-6 max-w-lg text-lg leading-relaxed">
        SplitBills tracks who paid for what, then works out the smallest set of
        payments that squares everyone up. Amounts are exact to the cent, in any
        currency.
      </p>

      {/* The signature moment: a real ledger, mid-simplification. */}
      <section
        aria-label="Example: three debts becoming one payment"
        className="border-[--color-line] bg-[--color-surface] mt-14 rounded-[--radius-lg] border p-6 md:p-8"
      >
        <p className="eyebrow">Before · Goa trip</p>
        <div className="mt-3">
          {[
            ["Aaron owes John", "40.00"],
            ["John owes Alex", "40.00"],
            ["Alex owes Priya", "40.00"],
          ].map(([label, amount]) => (
            <div key={label} className="ledger-row">
              <span className="text-[--color-muted] text-sm">{label}</span>
              <span className="ledger-leader" aria-hidden="true" />
              <span className="tabular text-[--color-debit] text-sm">INR {amount}</span>
            </div>
          ))}
        </div>

        <div className="border-[--color-line] mt-6 border-t pt-6">
          <p className="eyebrow">After</p>
          <div className="mt-3">
            <div className="ledger-row">
              <span className="text-sm">Aaron pays Priya</span>
              <span className="ledger-leader" aria-hidden="true" />
              <span className="tabular text-[--color-credit]">INR 40.00</span>
            </div>
          </div>
          <p className="text-[--color-faint] mt-4 text-sm">
            Three payments become one. Nobody&rsquo;s net balance changes by a cent.
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/login"
          className="bg-[--color-brass] rounded-[--radius] px-5 py-2.5 text-sm font-medium text-[#0b0e0d] transition-opacity hover:opacity-90"
        >
          Start splitting
        </Link>
        <a
          href="https://github.com/aaron-seq/SplitBills"
          className="text-[--color-muted] hover:text-[--color-text] text-sm transition-colors"
        >
          Read the source
        </a>
      </div>
    </main>
  );
}
