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

  const handleSelectMember = (member: ActiveUser) => {
    switchUser(member);
    router.push("/groups/splitops");
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
    router.push("/groups/splitops");
  };

  const filteredMembers = MEMBERS_LIST.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 md:py-16">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-6 border-b border-[--color-line]">
        <Link href="/" className="font-semibold text-lg tracking-tight text-[--color-text] hover:opacity-80">
          ← ggsplitops
        </Link>
        <ThemeToggle />
      </div>

      <div className="mt-8">
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[--color-text]">
          Who are you?
        </h1>
        <p className="text-[--color-muted] mt-1.5 text-sm leading-relaxed">
          Pick your name from the roster below to log in instantly. No passwords needed—your selection is remembered on this device.
        </p>

        {currentUser && (
          <div className="mt-4 p-3 rounded-[--radius] bg-[--color-surface] border border-[--color-brass]/30 flex items-center justify-between text-xs">
            <span className="text-[--color-muted]">
              Current active device profile: <strong className="text-[--color-brass]">{currentUser.name}</strong>
            </span>
            <Link
              href="/groups/splitops"
              className="text-[--color-brass] font-medium underline ml-2"
            >
              Continue →
            </Link>
          </div>
        )}
      </div>

      {/* Search Filter */}
      <div className="mt-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name (e.g. Zubair, Pranu, Abhi…)"
          className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-surface] px-3.5 py-2.5 text-sm text-[--color-text] outline-none transition-colors focus:border-[--color-brass]"
        />
      </div>

      {/* 1-Tap Member List */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
        {filteredMembers.map((member) => {
          const isSelected = currentUser?.name.toLowerCase() === member.name.toLowerCase();
          const isOwner = member.role === "OWNER" || member.name === "Zubair";
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => handleSelectMember(member)}
              className={`flex items-center gap-3 p-3 rounded-[--radius-lg] border text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? "border-[--color-brass] bg-[--color-surface-raised] shadow-sm"
                  : "border-[--color-line] bg-[--color-surface] hover:border-[--color-brass]/50 hover:bg-[--color-surface-raised]"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-semibold shrink-0 ${
                  isOwner
                    ? "bg-[--color-brass] text-[#0b0e0d]"
                    : "bg-[--color-canvas] text-[--color-muted] border border-[--color-line]"
                }`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[--color-text] truncate">
                    {member.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isOwner ? (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[--color-brass-dim] text-[--color-brass]">
                      Owner
                    </span>
                  ) : (
                    <span className="text-[10px] text-[--color-faint]">Member</span>
                  )}
                  {isSelected && (
                    <span className="text-[10px] text-[--color-credit] font-medium">✓ Active</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Or Add Custom / Guest Profile */}
      <div className="mt-8 border-t border-[--color-line] pt-6">
        <p className="eyebrow mb-2">Or enter your name (Guest / New Person)</p>
        <form onSubmit={handleCustomLogin} className="flex gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Your name or guest nickname"
            className="flex-1 rounded-[--radius] border border-[--color-line] bg-[--color-surface] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
          />
          <button
            type="submit"
            disabled={!customName.trim()}
            className="bg-[--color-brass] px-4 py-2 rounded-[--radius] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
          >
            Enter →
          </button>
        </form>
      </div>
    </main>
  );
}
