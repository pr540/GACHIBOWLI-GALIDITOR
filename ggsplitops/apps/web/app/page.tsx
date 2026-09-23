import Link from "next/link";
import { ThemeToggle } from "../components/theme-toggle";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] flex flex-col selection:bg-[var(--color-brass)] selection:text-black">
      {/* Immersive Hero Header with Ambient Background */}
      <header className="relative w-full overflow-hidden border-b border-[var(--color-line)] bg-[#070b09]">
        {/* Background Visual Art with Gradient Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src="/splitops_banner.jpg"
            alt="SplitOps Financial Network"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b09]/80 via-[var(--color-canvas)]/60 to-[var(--color-canvas)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-brass)]/10 via-transparent to-transparent" />
        </div>

        {/* Top Navigation Bar */}
        <nav className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-3 h-3 rounded-full bg-[var(--color-brass)] shadow-[0_0_12px_rgba(232,180,74,0.8)] animate-pulse" />
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-[var(--color-brass)] transition-colors">
                ggsplitops
              </span>
            </Link>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-[var(--color-brass)] font-mono border border-[var(--color-brass)]/30 backdrop-blur-md">
              ₹ INR Paisa Ledger
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/groups"
              className="text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors hidden sm:inline-block"
            >
              Expense Groups
            </Link>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-white/90 hover:text-[var(--color-brass)] transition-colors"
            >
              Sign In
            </Link>
            <ThemeToggle />
          </div>
        </nav>

        {/* Hero Headline & Primary CTA */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 pt-10 pb-16 sm:pt-16 sm:pb-24 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[var(--color-brass)]/30 backdrop-blur-md mb-6">
            <span className="text-xs">✨</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-brass)] font-semibold">
              SplitOps Collaborative Financial Platform
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Shared expenses, <br />
            <span className="bg-gradient-to-r from-[var(--color-brass)] via-[#f7d27e] to-[#6ee7a8] bg-clip-text text-transparent">
              settled with precision.
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            The collaborative expense platform designed for the SplitOps crew. Exact to the paisa with mathematical debt simplification, multi-payer contributions, and live monthly analytics.
          </p>

          {/* Action CTAs: Google Sign In & Direct App Access */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/login"
              className="flex items-center gap-2.5 bg-white text-gray-900 border border-white/20 px-6 py-3 rounded-[var(--radius)] text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all hover:scale-[1.03] active:scale-95"
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
              className="flex items-center gap-2 bg-[var(--color-brass)] hover:brightness-110 px-6 py-3 rounded-[var(--radius)] text-xs sm:text-sm font-semibold text-[#0b0e0d] transition-all hover:scale-[1.03] active:scale-95 shadow-lg shadow-[var(--color-brass)]/20"
            >
              <span>Open SplitOps Group</span>
              <span>→</span>
            </Link>

            <Link
              href="/groups"
              className="border border-white/20 hover:border-[var(--color-brass)] bg-black/40 hover:bg-black/60 backdrop-blur-md px-5 py-3 rounded-[var(--radius)] text-xs sm:text-sm font-medium text-white transition-all hover:scale-[1.02]"
            >
              Browse All Groups
            </Link>
          </div>

          {/* Quick trust metrics */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] font-mono text-white/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-credit)]">✓</span>
              <span>₹0.00 Default Ledger</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-credit)]">✓</span>
              <span>15 Members Roster</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-credit)]">✓</span>
              <span>Dynamic Month Dashboard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-credit)]">✓</span>
              <span>100% Paisa Accurate</span>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Feature Showcase Section */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16 sm:px-6 w-full">
        <div className="text-center mb-10">
          <p className="eyebrow text-xs text-[var(--color-brass)]">Architected for SplitOps</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)] mt-1">
            Engineered for Total Financial Clarity
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 max-w-lg mx-auto">
            Everything your group needs to split bills, track shared expenses, and settle instantly without round-off discrepancies.
          </p>
        </div>

        {/* Feature Grid with Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-[var(--color-brass)]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brass-dim)]/60 border border-[var(--color-brass)]/30 flex items-center justify-center text-xl mb-3.5">
              🧮
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">4 Precision Split Modes</h3>
            <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">
              Equal, Exact rupee, Percentage, or custom Shares. Strict 2-decimal money arithmetic ensures zero paise drift.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-[var(--color-brass)]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#1c3a2c]/60 border border-[var(--color-credit)]/30 flex items-center justify-center text-xl mb-3.5">
              👥
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">15 SplitOps Roster</h3>
            <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">
              Zubair (Owner), Pranu, Abhi, Pavan, Prasanth & team pre-loaded and ready for 1-tap member switching.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-[var(--color-brass)]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-line-bright)] flex items-center justify-center text-xl mb-3.5">
              📅
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">Dynamic Month Calendar</h3>
            <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">
              Interactive calendar heatmap with daily spending badges, month selector, top spender tracker, and KPI cards.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-[var(--color-brass)]/50 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brass-dim)]/60 border border-[var(--color-brass)]/30 flex items-center justify-center text-xl mb-3.5">
              🛡️
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">Pristine Zero-Ledger</h3>
            <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">
              Starts clean at ₹0.00. History only populates when you add real expenses. With 1-click Clear History reset.
            </p>
          </div>
        </div>

        {/* Quick Launch Card */}
        <div className="mt-10 rounded-2xl border border-[var(--color-brass)]/40 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-raised)] to-[var(--color-surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-brass)] text-[#0b0e0d] font-bold">
              PRIMARY WORKSPACE
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)] mt-2">
              SplitOps (Our GG Group)
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
              Active ledger with 15 crew members, multi-payer splits, and exact ₹ INR settlements.
            </p>
          </div>

          <Link
            href="/groups/splitops"
            className="shrink-0 bg-[var(--color-brass)] px-6 py-3 rounded-[var(--radius)] text-xs sm:text-sm font-bold text-[#0b0e0d] hover:brightness-110 transition-all shadow-md active:scale-95"
          >
            Launch Group Ledger →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--color-line)] bg-[var(--color-surface)] py-6 text-center text-xs text-[var(--color-muted)]">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            ggsplitops · Based on SplitBills by{" "}
            <a
              href="https://github.com/aaron-sequeira/splitbills"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--color-brass)]"
            >
              Aaron Sequeira
            </a>{" "}
            (MIT License).
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-[var(--color-brass)]">SplitOps Gachibowli</span>
            <span>·</span>
            <span>Exact Paisa Arithmetic</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
