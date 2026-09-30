"use client";

import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { useActiveUser } from "../../lib/user-context";

export default function ProfilePage() {
  const { currentUser, switchUser } = useActiveUser();

  const user = currentUser ?? {
    id: "mem-zubair",
    name: "Zubair",
    role: "OWNER",
    email: "zubair@splitops.in",
    avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Zubair",
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/groups" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-text)]">
              ← Groups
            </Link>
            <span className="text-[var(--color-line-bright)]">/</span>
            <span className="text-sm font-medium">Profile</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <img
              src={user.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.email ?? user.name)}`}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-[var(--color-brass)] object-cover shadow-lg"
            />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">{user.name}</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{user.role}</p>
            {user.email && (
              <p className="mt-2 rounded-full border border-[var(--color-line-bright)] bg-[var(--color-canvas)] px-3 py-1 text-xs text-[var(--color-text)]">
                {user.email}
              </p>
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href={{ pathname: "/login" }}
              className="rounded-[var(--radius)] border border-[var(--color-line-bright)] bg-[var(--color-surface-raised)] px-4 py-3 text-center text-sm font-semibold hover:border-[var(--color-brass)]"
            >
              Switch Account
            </Link>
            <button
              type="button"
              onClick={() => switchUser({ ...user, id: `mem-local-${Date.now()}`, name: user.name, email: user.email ?? "guest@splitops.local" })}
              className="rounded-[var(--radius)] bg-[var(--color-brass)] px-4 py-3 text-sm font-bold text-[#0b0e0d]"
            >
              Refresh Profile
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
