"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "../../components/theme-toggle";
import { api, getGroups } from "../../lib/api";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    splitops: true,
  });

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ggsplitops_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("ggsplitops_favorites", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

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

  return (
    <main className="min-h-screen bg-[--color-canvas]">
      {/* Visual Hero / OG Header Banner */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden border-b border-[--color-line] bg-[#070b09]">
        <img
          src="/dashboard_banner.jpg"
          alt="SplitOps Background"
          className="w-full h-full object-cover opacity-45 mix-blend-luminosity hover:opacity-60 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[--color-canvas] via-[--color-canvas]/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 mx-auto max-w-3xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[--color-brass] animate-pulse" />
              <span>ggsplitops</span>
            </Link>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[--color-brass] font-mono border border-[--color-brass]/30 backdrop-blur-sm">
              ₹ INR
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Workspace
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="absolute bottom-4 inset-x-0 mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[--color-brass]">
            COLLABORATIVE FINANCE
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[--color-text]">
            Your Expense Groups
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Create Group Card */}
        <section className="rounded-[--radius-lg] border border-[--color-line-bright] bg-[--color-surface] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[--color-line]">
            <div>
              <h2 className="text-sm font-semibold text-[--color-text]">Create New Group</h2>
              <p className="text-xs text-[--color-muted]">
                Track shared expenses with exact paisa ledger and debt simplification.
              </p>
            </div>
            <span className="text-xs font-mono text-[--color-brass]">₹ INR Default</span>
          </div>

          <form
            className="mt-4 flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createGroup.mutate(name.trim());
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip, Flat 4B, Friday Dinner…"
              className="flex-1 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3.5 py-2.5 text-xs sm:text-sm text-[--color-text] outline-none transition-colors focus:border-[--color-brass]"
            />
            <button
              type="submit"
              disabled={createGroup.isPending || !name.trim()}
              className="bg-[--color-brass] rounded-[--radius] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#0b0e0d] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              + Create Group
            </button>
          </form>

          {createGroup.error && (
            <p role="alert" className="text-[--color-debit] mt-2.5 text-xs">
              {(createGroup.error as Error).message}
            </p>
          )}
        </section>

        {/* Active Groups Section */}
        <section className="mt-8">
          <div className="flex items-center justify-between pb-3">
            <h2 className="eyebrow">Active Groups</h2>
            <span className="text-xs text-[--color-muted]">
              Click ⭐ to mark your favorite groups
            </span>
          </div>

          {isPending && (
            <div className="p-8 text-center text-xs text-[--color-muted]">
              Loading your groups…
            </div>
          )}

          {/* Featured Default SplitOps Group Card */}
          <div className="relative group mb-4">
            <Link
              href="/groups/splitops"
              className="block rounded-[--radius-lg] border border-[--color-brass]/50 hover:border-[--color-brass] bg-[--color-surface] p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-[--radius] bg-[--color-brass-dim]/40 border border-[--color-brass]/40 flex items-center justify-center text-xl shrink-0">
                    💰
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base sm:text-lg text-[--color-text] tracking-tight">
                        SplitOps
                      </span>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[--color-brass] text-[#0b0e0d]">
                        DEFAULT
                      </span>
                    </div>

                    <p className="text-xs text-[--color-muted] mt-1 line-clamp-1">
                      15 members · Zubair (Owner), Pranu, Abhi, Pavan, Prasanth &amp; 10 more
                    </p>

                    <div className="flex items-center gap-3 mt-3 text-[11px] text-[--color-faint]">
                      <span>👥 15 Members</span>
                      <span>·</span>
                      <span className="text-[--color-brass] font-medium font-mono">₹ INR Enabled</span>
                      <span>·</span>
                      <span>Exact paisa splits</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Favorite Like Star Button */}
                  <button
                    onClick={(e) => toggleFavorite(e, "splitops")}
                    type="button"
                    title={favorites["splitops"] ? "Starred Favorite" : "Add to Favorites"}
                    className="p-1.5 rounded-full hover:bg-[--color-surface-raised] transition-transform active:scale-90"
                  >
                    <span className="text-lg">
                      {favorites["splitops"] ? "⭐" : "☆"}
                    </span>
                  </button>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[--color-brass] hover:underline mt-2">
                    Open Group →
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* User created groups list */}
          {data?.groups
            .filter((g) => g.name.toLowerCase() !== "splitops")
            .map((group) => {
              const isFav = !!favorites[group.id];
              return (
                <div key={group.id} className="relative mb-3">
                  <Link
                    href={`/groups/${group.id}`}
                    className="block rounded-[--radius] border border-[--color-line] hover:border-[--color-brass] bg-[--color-surface] p-4 transition-all hover:bg-[--color-surface-raised]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📁</span>
                        <div>
                          <span className="text-sm font-semibold text-[--color-text]">
                            {group.name}
                          </span>
                          <span className="text-xs text-[--color-muted] block mt-0.5">
                            Currency: {group.defaultCurrency}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleFavorite(e, group.id)}
                          type="button"
                          title={isFav ? "Starred Favorite" : "Add to Favorites"}
                          className="p-1 text-base hover:scale-110 transition-transform"
                        >
                          {isFav ? "⭐" : "☆"}
                        </button>
                        <span className="text-xs text-[--color-muted]">Open →</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
        </section>
      </div>
    </main>
  );
}
