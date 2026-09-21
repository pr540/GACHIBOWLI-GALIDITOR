"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "../../components/theme-toggle";
import { api, getGroups } from "../../lib/api";
import { useActiveUser } from "../../lib/user-context";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const { currentUser } = useActiveUser();
  const [name, setName] = useState("");
  const [filterFavOnly, setFilterFavOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  const { data, isPending } = useQuery({
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

  const curatedGroups = [
    {
      id: "gachibowli-flat-4b",
      name: "Gachibowli Flat 4B",
      icon: "🏠",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      tag: "APARTMENT",
      desc: "5 members · Rent, Wifi, Groceries & Cook expenses",
      members: 5,
    },
    {
      id: "goa-trip-2026",
      name: "Goa Trip 2026",
      icon: "🏖️",
      badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      tag: "VACATION",
      desc: "8 members · Beach Villa, Car Rental, Food & Activities",
      members: 8,
    },
    {
      id: "weekend-cricket",
      name: "Weekend Cricket Club",
      icon: "🏏",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      tag: "SPORTS",
      desc: "12 members · Turf Booking, Match Balls & Refreshments",
      members: 12,
    },
  ];

  return (
    <main className="min-h-screen bg-[--color-canvas] text-[--color-text]">
      {/* Header Banner */}
      <header className="relative w-full overflow-hidden border-b border-[--color-line] bg-[#070b09]">
        <div className="absolute inset-0 z-0">
          <img
            src="/splitops_banner.jpg"
            alt="SplitOps Background"
            className="w-full h-full object-cover opacity-35 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b09]/80 via-[--color-canvas]/60 to-[--color-canvas]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="font-bold text-lg tracking-tight text-white flex items-center gap-2 hover:opacity-90 transition-opacity">
                <span className="w-2.5 h-2.5 rounded-full bg-[--color-brass] shadow-[0_0_8px_rgba(232,180,74,0.8)]" />
                <span>ggsplitops</span>
              </Link>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[--color-brass] font-mono border border-[--color-brass]/30 backdrop-blur-sm">
                ₹ INR
              </span>
            </div>

            <div className="flex items-center gap-3">
              {currentUser && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs text-white/90 border border-white/15">
                  <span>👤</span>
                  <span className="font-medium">{currentUser.name}</span>
                </div>
              )}
              <Link
                href="/login"
                className="text-xs font-medium text-white/80 hover:text-[--color-brass] transition-colors"
              >
                Switch Account
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-6 mb-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[--color-brass]">
              COLLABORATIVE EXPENSE WORKSPACE
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Expense Groups
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-lg">
              Manage shared ledgers with exact mathematical debt simplification and zero negative rounding error.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {/* Create Group Card */}
        <section className="rounded-xl border border-[--color-line] bg-[--color-surface] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[--color-line]">
            <div>
              <h2 className="text-sm font-semibold text-[--color-text]">Create New Group</h2>
              <p className="text-xs text-[--color-muted]">
                Spin up a new shared ledger with instant paisa-accurate settlement.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[--color-brass-dim] text-[--color-brass] border border-[--color-brass]/30">
              ₹ INR Default
            </span>
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
              placeholder="e.g. Hyderabad Roadtrip, Office Lunch, Hackathon Team…"
              className="flex-1 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3.5 py-2.5 text-xs sm:text-sm text-[--color-text] outline-none transition-colors focus:border-[--color-brass]"
            />
            <button
              type="submit"
              disabled={createGroup.isPending || !name.trim()}
              className="bg-[--color-brass] rounded-[--radius] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0b0e0d] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 cursor-pointer"
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

        {/* Groups Controls: Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-base font-bold text-[--color-text]">Active Groups</h2>
            <p className="text-xs text-[--color-muted]">
              Select a group to enter the dynamic ledger and monthly dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search filter */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search groups…"
                className="rounded-[--radius] border border-[--color-line] bg-[--color-surface] px-3 py-1.5 text-xs text-[--color-text] outline-none focus:border-[--color-brass] w-36 sm:w-44"
              />
            </div>

            {/* Favorite filter toggle */}
            <button
              onClick={() => setFilterFavOnly(!filterFavOnly)}
              type="button"
              className={`px-3 py-1.5 rounded-[--radius] text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                filterFavOnly
                  ? "bg-[--color-brass] text-[#0b0e0d] border-[--color-brass]"
                  : "bg-[--color-surface] text-[--color-muted] hover:text-[--color-text] border-[--color-line]"
              }`}
            >
              <span>⭐</span>
              <span>{filterFavOnly ? "Favorites" : "Favorites Only"}</span>
            </button>
          </div>
        </div>

        {/* Primary Group: SplitOps (Our GG Group) - SINGLE CARD, NO DUPLICATE */}
        {(!filterFavOnly || favorites["splitops"]) &&
          (!searchTerm || "splitops our gg group".includes(searchTerm.toLowerCase())) && (
            <div className="relative group">
              <Link
                href="/groups/splitops"
                className="block rounded-2xl border-2 border-[--color-brass]/70 hover:border-[--color-brass] bg-gradient-to-r from-[--color-surface] via-[--color-surface-raised] to-[--color-surface] p-5 sm:p-6 shadow-md transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[--color-brass] to-[#b88014] text-[#0b0e0d] flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm">
                      💰
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base sm:text-xl text-[--color-text] tracking-tight">
                          SplitOps (Our GG Group)
                        </span>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[--color-brass] text-[#0b0e0d]">
                          PRIMARY WORKSPACE
                        </span>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[--color-credit]/20 text-[--color-credit] border border-[--color-credit]/30">
                          ACTIVE LEDGER
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-[--color-muted] mt-1.5">
                        <strong className="text-[--color-text]">15 members:</strong> Zubair (Owner), Pranu, Abhi, Pavan, Prasanth &amp; 10 more
                      </p>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 text-[11px] text-[--color-faint]">
                        <span className="px-2 py-0.5 rounded bg-[--color-canvas] border border-[--color-line]">
                          👥 15 Members
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[--color-brass-dim]/60 text-[--color-brass] font-mono font-semibold border border-[--color-brass]/30">
                          ₹ INR Enabled
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[--color-canvas] border border-[--color-line]">
                          Exact Paisa Splits
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[--color-canvas] border border-[--color-line]">
                          Month Dashboard
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button
                      onClick={(e) => toggleFavorite(e, "splitops")}
                      type="button"
                      title={favorites["splitops"] ? "Starred Favorite" : "Add to Favorites"}
                      className="p-1.5 rounded-full hover:bg-[--color-surface-raised] transition-transform active:scale-90 cursor-pointer"
                    >
                      <span className="text-xl">
                        {favorites["splitops"] ? "⭐" : "☆"}
                      </span>
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[--color-brass] group-hover:underline">
                      Open Group →
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

        {/* Curated Groups */}
        <div className="space-y-3">
          {curatedGroups
            .filter((g) => {
              if (filterFavOnly && !favorites[g.id]) return false;
              if (searchTerm && !g.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
              return true;
            })
            .map((extra) => {
              const isFav = !!favorites[extra.id];
              return (
                <div key={extra.id} className="relative">
                  <Link
                    href="/groups/splitops"
                    className="block rounded-xl border border-[--color-line] hover:border-[--color-brass]/50 bg-[--color-surface] p-4 transition-all hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[--color-surface-raised] border border-[--color-line] flex items-center justify-center text-xl shrink-0">
                          {extra.icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[--color-text]">
                              {extra.name}
                            </span>
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold border ${extra.badgeColor}`}>
                              {extra.tag}
                            </span>
                          </div>
                          <p className="text-xs text-[--color-muted] mt-0.5">
                            {extra.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={(e) => toggleFavorite(e, extra.id)}
                          type="button"
                          title={isFav ? "Starred Favorite" : "Add to Favorites"}
                          className="p-1 text-lg hover:scale-110 transition-transform active:scale-90 cursor-pointer"
                        >
                          {isFav ? "⭐" : "☆"}
                        </button>
                        <span className="text-xs font-medium text-[--color-muted] hover:text-[--color-brass] transition-colors">
                          Open →
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}

          {/* User Created Custom Groups */}
          {data?.groups
            .filter((g) => g.name.toLowerCase() !== "splitops")
            .filter((g) => {
              if (filterFavOnly && !favorites[g.id]) return false;
              if (searchTerm && !g.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
              return true;
            })
            .map((group) => {
              const isFav = !!favorites[group.id];
              return (
                <div key={group.id} className="relative">
                  <Link
                    href={`/groups/${group.id}`}
                    className="block rounded-xl border border-[--color-line] hover:border-[--color-brass]/50 bg-[--color-surface] p-4 transition-all hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[--color-surface-raised] border border-[--color-line] flex items-center justify-center text-lg shrink-0">
                          📁
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-[--color-text]">
                            {group.name}
                          </span>
                          <span className="text-xs text-[--color-muted] block mt-0.5">
                            Currency: {group.defaultCurrency} · Custom Group
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleFavorite(e, group.id)}
                          type="button"
                          title={isFav ? "Starred Favorite" : "Add to Favorites"}
                          className="p-1 text-lg hover:scale-110 transition-transform active:scale-90 cursor-pointer"
                        >
                          {isFav ? "⭐" : "☆"}
                        </button>
                        <span className="text-xs font-medium text-[--color-muted]">Open →</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
        </div>

        {isPending && (
          <div className="p-8 text-center text-xs text-[--color-muted]">
            Loading your groups…
          </div>
        )}
      </div>
    </main>
  );
}
