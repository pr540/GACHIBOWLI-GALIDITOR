import Link from "next/link";
import { ThemeToggle } from "../components/theme-toggle";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-24">
      {/* Mobile-first top header with brand and theme toggle */}
      <header className="flex items-center justify-between pb-6 border-b border-[--color-line]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg tracking-tight text-[--color-text]">ggsplitops</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[--color-surface-raised] text-[--color-brass] font-mono">₹ INR</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/groups"
            className="text-sm font-medium text-[--color-muted] hover:text-[--color-text] transition-colors"
          >
            Groups
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mt-8">
        <p className="eyebrow">Open source · self-hostable · MIT</p>

        <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl leading-[1.08] font-medium tracking-tight">
          Shared expenses,
          <br />
          <span className="text-[--color-brass]">settled in one payment.</span>
        </h1>

        <p className="text-[--color-muted] mt-4 max-w-lg text-base sm:text-lg leading-relaxed">
          <strong className="text-[--color-text] font-medium">ggsplitops</strong> tracks who paid for what, then works out the smallest set of
          payments that squares everyone up. Amounts are exact to the paisa, in INR (₹).
        </p>
      </div>

      {/* The signature moment: a real ledger, mid-simplification */}
      <section
        aria-label="Example: three debts becoming one payment"
        className="border-[--color-line] bg-[--color-surface] mt-10 rounded-[--radius-lg] border p-5 sm:p-7 md:p-8"
      >
        <p className="eyebrow">Before · SplitOps Dinner</p>
        <div className="mt-3">
          {[
            ["Zubair owes Pranu", "450.00"],
            ["Pranu owes Abhi", "450.00"],
            ["Abhi owes Pavan", "450.00"],
          ].map(([label, amount]) => (
            <div key={label} className="ledger-row">
              <span className="text-[--color-muted] text-sm">{label}</span>
              <span className="ledger-leader" aria-hidden="true" />
              <span className="tabular text-[--color-debit] text-sm font-medium">₹ {amount}</span>
            </div>
          ))}
        </div>

        <div className="border-[--color-line] mt-6 border-t pt-6">
          <p className="eyebrow text-[--color-brass]">After Simplification</p>
          <div className="mt-3">
            <div className="ledger-row">
              <span className="text-sm font-medium">Zubair pays Pavan</span>
              <span className="ledger-leader" aria-hidden="true" />
              <span className="tabular text-[--color-credit] text-sm font-medium">₹ 450.00</span>
            </div>
          </div>
          <p className="text-[--color-faint] mt-4 text-xs sm:text-sm">
            Three payments collapse into one. Nobody&rsquo;s net balance changes by a single rupee.
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/groups"
          className="bg-[--color-brass] rounded-[--radius] px-5 py-2.5 text-sm font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 active:scale-95"
        >
          Open SplitOps
        </Link>
        <Link
          href="/login"
          className="border border-[--color-line] hover:border-[--color-line-bright] rounded-[--radius] px-4 py-2 text-sm text-[--color-muted] hover:text-[--color-text] transition-colors"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
