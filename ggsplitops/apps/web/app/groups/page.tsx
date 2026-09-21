"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "../../components/theme-toggle";
import { api, getGroups } from "../../lib/api";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });

  const createGroup = useMutation({
    mutationFn: (groupName: string) =>
      api("/groups", { method: "POST", body: JSON.stringify({ name: groupName, defaultCurrency: "INR" }) }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  // Check if SplitOps is already in user groups
  const hasSplitOps = data?.groups.some((g) => g.name.toLowerCase() === "splitops");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
      {/* Mobile-first top header with brand and theme toggle */}
      <header className="flex items-center justify-between pb-4 border-b border-[--color-line]">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-semibold text-lg tracking-tight text-[--color-text] hover:opacity-80">
            ggsplitops
          </Link>
          <span className="text-xs px-2 py-0.5 rounded bg-[--color-surface-raised] text-[--color-brass] font-mono">₹ INR</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/groups" className="text-sm font-medium text-[--color-text]">
            Groups
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="mt-8">
        <h1 className="text-2xl font-medium tracking-tight">Your Groups</h1>
        <p className="text-[--color-muted] mt-1 text-sm">
          Collaborative expense groups with exact paisa ledger and debt simplification.
        </p>

        <form
          className="mt-6 flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createGroup.mutate(name.trim());
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Goa trip, Flat 4B, SplitOps team…"
            className="border-[--color-line] bg-[--color-surface] focus:border-[--color-line-bright] flex-1 rounded-[--radius] border px-3 py-2.5 text-sm outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={createGroup.isPending || !name.trim()}
            className="bg-[--color-brass] rounded-[--radius] px-5 py-2.5 text-sm font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Create group
          </button>
        </form>

        {createGroup.error && (
          <p role="alert" className="text-[--color-debit] mt-3 text-sm">
            {(createGroup.error as Error).message}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">Active Groups</h2>

        {isPending && <p className="text-[--color-faint] text-sm py-4">Loading your groups…</p>}

        {/* Featured Default SplitOps Group Card */}
        <div className="mb-4">
          <Link
            href="/groups/splitops"
            className="block border border-[--color-line] hover:border-[--color-brass] bg-[--color-surface] rounded-[--radius-lg] p-4 transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base text-[--color-text]">SplitOps</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[--color-brass-dim] text-[--color-brass]">
                    Default Group
                  </span>
                </div>
                <p className="text-xs text-[--color-muted] mt-1">
                  15 members · Zubair (Owner), Pranu, Abhi, Pavan, Prasanth &amp; 10 more
                </p>
              </div>
              <div className="text-right">
                <span className="tabular font-mono text-xs text-[--color-brass]">₹ INR</span>
                <span className="text-[--color-muted] block text-xs mt-0.5">Open →</span>
              </div>
            </div>
          </Link>
        </div>

        {/* User created groups */}
        {data?.groups
          .filter((g) => g.name.toLowerCase() !== "splitops")
          .map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="block">
              <div className="ledger-row hover:bg-[--color-surface] -mx-3 px-3 py-3 transition-colors rounded-[--radius]">
                <span className="text-sm font-medium">{group.name}</span>
                <span className="ledger-leader" aria-hidden="true" />
                <span className="eyebrow">{group.defaultCurrency}</span>
              </div>
            </Link>
          ))}
      </section>
    </main>
  );
}
