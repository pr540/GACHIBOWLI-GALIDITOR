import Link from "next/link";
import { ThemeToggle } from "../components/theme-toggle";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[--color-canvas] text-[--color-text]">
      {/* Visual Hero Header with Background Banner */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden border-b border-[--color-line] bg-[#070b09]">
        <img
          src="/dashboard_banner.jpg"
          alt="SplitOps Financial Banner"
          className="w-full h-full object-cover opacity-40 mix-blend-luminosity hover:opacity-50 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[--color-canvas] via-[--color-canvas]/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 mx-auto max-w-3xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[--color-brass] animate-pulse" />
            <span className="font-bold text-lg tracking-tight text-white">ggsplitops</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[--color-brass] font-mono border border-[--color-brass]/30 backdrop-blur-sm">
              ₹ INR
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-white/90 hover:text-[--color-brass] transition-colors"
            >
              Sign In
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="absolute bottom-6 inset-x-0 mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[--color-brass]">
            OPEN SOURCE · EXACT MONEY LEDGER · INR (₹)
          </p>
          <h1 className="mt-1 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Shared expenses, <br className="hidden sm:inline" />
            <span className="text-[--color-brass]">settled in one payment.</span>
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-[--color-muted] text-sm sm:text-base leading-relaxed max-w-xl">
          <strong className="text-[--color-text]">ggsplitops</strong> is a collaborative expense platform designed for the SplitOps crew. Exact to the paisa with mathematical debt simplification.
        </p>

        {/* Action CTAs: Google Sign In & Direct App Access */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2.5 bg-white text-gray-900 border border-gray-200 px-5 py-2.5 rounded-[--radius] text-xs sm:text-sm font-semibold shadow-sm hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </Link>

          <Link
            href="/groups/splitops"
            className="bg-[--color-brass] px-5 py-2.5 rounded-[--radius] text-xs sm:text-sm font-semibold text-[#0b0e0d] transition-all hover:opacity-90 active:scale-95"
          >
            Open SplitOps Group →
          </Link>

          <Link
            href="/groups"
            className="border border-[--color-line] hover:border-[--color-brass] bg-[--color-surface] px-4 py-2.5 rounded-[--radius] text-xs sm:text-sm font-medium text-[--color-text] transition-colors"
          >
            All Groups
          </Link>
        </div>

        {/* Live Ledger Simplification Demo */}
        <section
          aria-label="Example: debts becoming one payment"
          className="border border-[--color-line-bright] bg-[--color-surface] mt-10 rounded-[--radius-lg] p-5 sm:p-7 shadow-sm"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[--color-line]">
            <p className="eyebrow text-xs">Example: SplitOps Dinner</p>
            <span className="text-xs text-[--color-brass] font-mono">Simplified</span>
          </div>

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

          <div className="border-[--color-line] mt-5 border-t pt-5">
            <p className="eyebrow text-[--color-brass]">After Simplification</p>
            <div className="mt-3">
              <div className="ledger-row">
                <span className="text-sm font-medium">Zubair pays Pavan</span>
                <span className="ledger-leader" aria-hidden="true" />
                <span className="tabular text-[--color-credit] text-sm font-medium">₹ 450.00</span>
              </div>
            </div>
            <p className="text-[--color-faint] mt-3 text-xs sm:text-sm">
              Three circular payments collapse into one. Nobody&rsquo;s net balance changes by a single rupee.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
