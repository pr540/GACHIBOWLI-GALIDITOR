"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "../../components/theme-toggle";
import { useActiveUser, type ActiveUser } from "../../lib/user-context";
import { signIn, signUp } from "../../lib/auth-client";

// 15 Default SplitOps Members
const MEMBERS_LIST: ActiveUser[] = [
  { id: "mem-zubair", name: "Zubair", role: "OWNER" },
  { id: "mem-pranu", name: "Pranu", role: "MEMBER" },
  { id: "mem-abhi", name: "Abhi Venkata Sai Samsani", role: "MEMBER" },
  { id: "mem-pavan", name: "Pavan (Kasula Pavan Sai)", role: "MEMBER" },
  { id: "mem-prasanth", name: "Prasanth", role: "MEMBER" },
  { id: "mem-ajay", name: "Ajay", role: "MEMBER" },
  { id: "mem-ajayk", name: "Ajay Kumar", role: "MEMBER" },
  { id: "mem-dlip", name: "Dlip", role: "MEMBER" },
  { id: "mem-mouni", name: "Mouni", role: "MEMBER" },
  { id: "mem-sameena", name: "Sameena Sultan", role: "MEMBER" },
  { id: "mem-tharun", name: "Tharun Reddy", role: "MEMBER" },
  { id: "mem-uday", name: "Uday", role: "MEMBER" },
  { id: "mem-devi", name: "Devi", role: "MEMBER" },
  { id: "mem-hassi", name: "Hassi", role: "MEMBER" },
  { id: "mem-prakash", name: "Prakash", role: "MEMBER" },
];

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, switchUser } = useActiveUser();
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authPending, setAuthPending] = useState(false);

  const handleEmailAuth = async (mode: "sign-in" | "sign-up") => {
    setAuthError("");
    setAuthPending(true);
    const finish = (result: { error?: { message?: string } | null }) => {
      setAuthPending(false);
      if (result.error) {
        setAuthError(result.error.message ?? "Authentication failed.");
        return;
      }
      router.push("/groups");
    };
    try {
      const result = mode === "sign-up"
        ? await signUp.email({ email: authEmail, password: authPassword, name: authEmail.split("@")[0] || "SplitOps user" })
        : await signIn.email({ email: authEmail, password: authPassword });
      finish(result);
    } catch (error) {
      setAuthPending(false);
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    }
  };

  const handleSelectMember = (member: ActiveUser) => {
    switchUser(member);
    router.push("/groups");
  };

  const handleGoogleSignIn = (emailOrName?: string) => {
    setIsGoogleSigningIn(true);
    setTimeout(() => {
      const rawName = emailOrName?.trim() || googleEmail.trim() || "Praneeth (Google)";
      const cleanName = rawName.includes("@") ? rawName.split("@")[0] || rawName : rawName;
      const googleUser: ActiveUser = {
        id: `google-${Date.now()}`,
        name: cleanName || "Google User",
        role: "MEMBER",
        tag: "Google",
      };
      switchUser(googleUser);
      setIsGoogleSigningIn(false);
      setShowGoogleModal(false);
      router.push("/groups");
    }, 500);
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const guestUser: ActiveUser = {
      id: `mem-guest-${Date.now()}`,
      name: customName.trim(),
      role: "MEMBER",
      tag: "Guest",
    };
    switchUser(guestUser);
    router.push("/groups");
  };

  const filteredMembers = MEMBERS_LIST.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--color-canvas)] text-[var(--color-text)] overflow-hidden">
      {/* Ambient Background Wallpaper */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/splitops_banner.jpg"
          alt="SplitOps Wallpaper"
          className="w-full h-full object-cover opacity-25 mix-blend-luminosity filter blur-xs scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)] via-[var(--color-canvas)]/80 to-[var(--color-canvas)]/70" />
      </div>

      {/* High-Contrast Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-line-bright)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
          <Link href="/" className="font-bold text-lg tracking-tight text-[var(--color-text)] flex items-center gap-2 hover:opacity-80">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brass)]" />
            <span>ggsplitops</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-5 text-center">
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-brass-dim)] text-[var(--color-brass)] font-semibold border border-[var(--color-brass)]/30">
            SplitOps Authentication
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)] mt-2">
            Sign In to SplitOps
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto">
            Choose your account to access the exact money ledger & group dashboard.
          </p>
        </div>

        {/* 1. High-Visibility Google Sign-In Button */}
        <div className="mt-6">
          <button
            onClick={() => setShowGoogleModal(true)}
            type="button"
            disabled={isGoogleSigningIn}
            data-testid="login-google"
            className="w-full py-3 px-4 rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-surface-raised)] hover:border-[var(--color-brass)] text-sm font-semibold text-[var(--color-text)] flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
          >
            {isGoogleSigningIn ? (
              <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-text)]">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--color-brass)] border-t-transparent animate-spin" />
                Signing in with Google…
              </span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
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
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-line)]" />
          </div>
          <span className="relative px-3 text-[11px] uppercase tracking-wider bg-[var(--color-surface)] text-[var(--color-muted)] font-medium">
            or 1-tap select member profile
          </span>
        </div>

        {/* Search SplitOps Roster */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-2.5 text-xs text-[var(--color-muted)]">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member name (Zubair, Pranu, Abhi…)"
            data-testid="login-search"
            className="w-full pl-8 pr-3 py-2 rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-canvas)] text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brass)]"
          />
        </div>

        {/* 1-Tap Member Selection with crystal clear contrast */}
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredMembers.map((member) => {
            const isSelected = currentUser?.name.toLowerCase() === member.name.toLowerCase();
            const isOwner = member.role === "OWNER" || member.name === "Zubair";

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelectMember(member)}
                data-testid={`login-member-${member.id}`}
                className={`p-2.5 rounded-[var(--radius)] border text-left transition-all text-xs flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "border-[var(--color-brass)] bg-[var(--color-surface-raised)] font-semibold text-[var(--color-brass)] ring-1 ring-[var(--color-brass)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-brass)]/70 hover:bg-[var(--color-surface)]"
                }`}
              >
                <span className="truncate font-medium">{member.name}</span>
                {isOwner ? (
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[var(--color-brass)] text-[#0b0e0d] font-bold shrink-0">
                    Owner
                  </span>
                ) : isSelected ? (
                  <span className="text-[11px] text-[var(--color-credit)] font-bold">✓</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Guest Nickname Login */}
        <form onSubmit={(e) => { e.preventDefault(); void handleEmailAuth("sign-in"); }} className="mt-5 pt-4 border-t border-[var(--color-line)] space-y-2">
          <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" className="w-full rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-text)] outline-none" />
          <input type="password" required minLength={8} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password (8+ characters)" className="w-full rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-text)] outline-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={authPending} className="flex-1 py-2 rounded-[var(--radius)] bg-[var(--color-brass)] text-xs font-semibold text-[#0b0e0d] disabled:opacity-40">{authPending ? "Working…" : "Sign in"}</button>
            <button type="button" disabled={authPending} onClick={() => void handleEmailAuth("sign-up")} className="flex-1 py-2 rounded-[var(--radius)] border border-[var(--color-line-bright)] text-xs font-semibold text-[var(--color-text)] disabled:opacity-40">Create account</button>
          </div>
          {authError && <p role="alert" className="text-xs text-[var(--color-debit)]">{authError}</p>}
        </form>
        <form onSubmit={handleCustomLogin} className="mt-5 pt-4 border-t border-[var(--color-line)] flex gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter guest or new member name"
            data-testid="login-guest-input"
            className="flex-1 rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brass)]"
          />
          <button
            type="submit"
            disabled={!customName.trim()}
            data-testid="login-guest-submit"
            className="px-4 py-2 rounded-[var(--radius)] bg-[var(--color-brass)] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0 cursor-pointer"
          >
            Enter →
          </button>
        </form>
      </div>

      {/* Google Account Modal Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-line-bright)] bg-[var(--color-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-line)]">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24">
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
                <span className="font-semibold text-sm text-[var(--color-text)]">Sign in with Google</span>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--color-muted)]">
              Choose an account to continue to <strong>SplitOps</strong>:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleGoogleSignIn("praneethssr.2002@gmail.com")}
                className="w-full p-3 rounded-[var(--radius)] border border-[var(--color-line)] hover:border-[var(--color-brass)] bg-[var(--color-surface-raised)] text-left text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-brass)] text-[#0b0e0d] flex items-center justify-center font-bold text-xs">
                    P
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">Praneeth S</p>
                    <p className="text-[11px] text-[var(--color-muted)]">praneethssr.2002@gmail.com</p>
                  </div>
                </div>
                <span className="text-[11px] text-[var(--color-brass)] font-medium">Select →</span>
              </button>

              <div className="pt-2">
                <input
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="Or enter any Google Email"
                  className="w-full rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-brass)]"
                />
                <button
                  onClick={() => handleGoogleSignIn(googleEmail)}
                  disabled={!googleEmail.trim()}
                  className="w-full mt-2 py-2 rounded-[var(--radius)] bg-[var(--color-brass)] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  Continue with this Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
