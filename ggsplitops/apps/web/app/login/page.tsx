"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "../../components/theme-toggle";
import { useActiveUser, type ActiveUser } from "../../lib/user-context";

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
  { id: "mem-sameena", name: "Sameena Sultana", role: "MEMBER" },
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
    }, 600);
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
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#080d0b] overflow-hidden">
      {/* Visual Background Image with dark blur overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/dashboard_banner.jpg"
          alt="SplitOps Hero"
          className="w-full h-full object-cover opacity-30 mix-blend-luminosity scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d0b] via-[#080d0b]/80 to-[#080d0b]/60 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[--color-line-bright] bg-[--color-surface]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[--color-line]">
          <Link href="/" className="font-bold text-lg tracking-tight text-[--color-text] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[--color-brass]" />
            <span>ggsplitops</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[--color-text]">
            Welcome to SplitOps
          </h1>
          <p className="text-xs sm:text-sm text-[--color-muted] mt-1.5 max-w-sm mx-auto">
            Collaborative expense sharing with exact money math & debt simplification.
          </p>
        </div>

        {/* 1. Official Google Sign-In Button */}
        <div className="mt-6">
          <button
            onClick={() => setShowGoogleModal(true)}
            type="button"
            disabled={isGoogleSigningIn}
            className="w-full py-3 px-4 rounded-[--radius] border border-[--color-line-bright] bg-[--color-surface-raised] hover:border-[--color-brass] hover:bg-[--color-surface] text-sm font-semibold text-[--color-text] flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
          >
            {isGoogleSigningIn ? (
              <span className="flex items-center gap-2 text-xs font-medium">
                <span className="w-4 h-4 rounded-full border-2 border-[--color-brass] border-t-transparent animate-spin" />
                Connecting with Google…
              </span>
            ) : (
              <>
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
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[--color-line]" />
          </div>
          <span className="relative px-3 text-[11px] uppercase tracking-wider bg-[--color-surface] text-[--color-muted]">
            or select your SplitOps profile
          </span>
        </div>

        {/* Search SplitOps Roster */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-2.5 text-xs text-[--color-muted]">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roster (Zubair, Pranu, Abhi…)"
            className="w-full pl-8 pr-3 py-2 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] text-xs text-[--color-text] outline-none focus:border-[--color-brass]"
          />
        </div>

        {/* 1-Tap Member Selection */}
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredMembers.map((member) => {
            const isSelected = currentUser?.name.toLowerCase() === member.name.toLowerCase();
            const isOwner = member.role === "OWNER" || member.name === "Zubair";

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelectMember(member)}
                className={`p-2.5 rounded-[--radius] border text-left transition-all text-xs flex items-center justify-between ${
                  isSelected
                    ? "border-[--color-brass] bg-[--color-surface-raised] font-semibold text-[--color-brass]"
                    : "border-[--color-line] bg-[--color-canvas] text-[--color-text] hover:border-[--color-brass]/50"
                }`}
              >
                <span className="truncate">{member.name}</span>
                {isOwner ? (
                  <span className="text-[9px] uppercase px-1 rounded bg-[--color-brass] text-[#0b0e0d] font-bold">
                    Owner
                  </span>
                ) : isSelected ? (
                  <span className="text-[10px] text-[--color-credit]">✓</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Custom Nickname Login */}
        <form onSubmit={handleCustomLogin} className="mt-5 pt-4 border-t border-[--color-line] flex gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter custom guest name"
            className="flex-1 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-1.5 text-xs text-[--color-text] outline-none focus:border-[--color-brass]"
          />
          <button
            type="submit"
            disabled={!customName.trim()}
            className="px-3 py-1.5 rounded-[--radius] bg-[--color-brass] text-xs font-semibold text-[#0b0e0d] disabled:opacity-40"
          >
            Enter →
          </button>
        </form>
      </div>

      {/* Google Sign-In Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[--color-line-bright] bg-[--color-surface] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[--color-line]">
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
                <span className="font-semibold text-sm text-[--color-text]">Google Account Sign-In</span>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-xs text-[--color-muted] hover:text-[--color-text]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[--color-muted]">
              Sign in with your Google Account to access your shared splitops groups.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleGoogleSignIn("praneethssr.2002@gmail.com")}
                className="w-full p-2.5 rounded-[--radius] border border-[--color-line] hover:border-[--color-brass] bg-[--color-surface-raised] text-left text-xs flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-[--color-text]">Praneeth S</p>
                  <p className="text-[11px] text-[--color-muted]">praneethssr.2002@gmail.com</p>
                </div>
                <span className="text-[11px] text-[--color-brass] font-medium">Continue →</span>
              </button>

              <div className="pt-2">
                <input
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="Or enter any google email address"
                  className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-xs text-[--color-text] outline-none focus:border-[--color-brass]"
                />
                <button
                  onClick={() => handleGoogleSignIn(googleEmail)}
                  disabled={!googleEmail.trim()}
                  className="w-full mt-2 py-2 rounded-[--radius] bg-[--color-brass] text-xs font-semibold text-[#0b0e0d] disabled:opacity-40"
                >
                  Sign In with this Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
