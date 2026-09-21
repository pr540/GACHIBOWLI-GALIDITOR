"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { Amount } from "../../../components/amount";
import { ExpenseModal } from "../../../components/edit-expense-modal";
import { MemberManagerModal, type ManagedMember } from "../../../components/member-manager-modal";
import { ThemeToggle } from "../../../components/theme-toggle";
import {
  getBalances,
  getExpenses,
  getGroup,
  recordSettlement,
} from "../../../lib/api";
import { exportGroupToExcel, type ExportExpense } from "../../../lib/excel-export";
import { useActiveUser } from "../../../lib/user-context";

// 15 Default Seed Members for SplitOps
const DEFAULT_SPLITOPS_MEMBERS: ManagedMember[] = [
  { id: "mem-zubair", displayName: "Zubair", role: "OWNER" },
  { id: "mem-pranu", displayName: "Pranu", role: "MEMBER" },
  { id: "mem-abhi", displayName: "Abhi Venkata Sai Samsani", role: "MEMBER" },
  { id: "mem-pavan", displayName: "Pavan (Kasula Pavan Sai)", role: "MEMBER" },
  { id: "mem-prasanth", displayName: "Prasanth", role: "MEMBER" },
  { id: "mem-ajay", displayName: "Ajay", role: "MEMBER" },
  { id: "mem-ajayk", displayName: "Ajay Kumar", role: "MEMBER" },
  { id: "mem-dlip", displayName: "Dlip", role: "MEMBER" },
  { id: "mem-mouni", displayName: "Mouni", role: "MEMBER" },
  { id: "mem-sameena", displayName: "Sameena Sultana", role: "MEMBER" },
  { id: "mem-tharun", displayName: "Tharun Reddy", role: "MEMBER" },
  { id: "mem-uday", displayName: "Uday", role: "MEMBER" },
  { id: "mem-devi", displayName: "Devi", role: "MEMBER" },
  { id: "mem-hassi", displayName: "Hassi", role: "MEMBER" },
  { id: "mem-prakash", displayName: "Prakash", role: "MEMBER" },
];

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const queryClient = useQueryClient();
  const isSplitOpsFallback = groupId === "splitops";
  const { currentUser } = useActiveUser();

  // Group Name & Inline Editing
  const [groupName, setGroupName] = useState("SplitOps");
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState("SplitOps");

  // Member Management State
  const [members, setMembers] = useState<ManagedMember[]>(DEFAULT_SPLITOPS_MEMBERS);
  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false);

  // Expense Modal State (Add & Edit)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [modalExpense, setModalExpense] = useState<ExportExpense | null>(null);

  // Delete Confirmation Modal State
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<ExportExpense | null>(null);

  // Search & Filter state for Expense History
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberFilter, setSelectedMemberFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");

  // Expenses state
  const [expensesList, setExpensesList] = useState<ExportExpense[]>([
    {
      id: "sample-exp-1",
      description: "Team Lunch at Gachibowli",
      amount: "3750.00",
      currency: "INR",
      payerName: "Zubair",
      payerId: "mem-zubair",
      splitMethod: "EQUAL",
      spentAt: new Date(Date.now() - 3600000).toISOString(),
      participants: DEFAULT_SPLITOPS_MEMBERS.map((m) => ({
        memberId: m.id,
        displayName: m.displayName,
        amount: (3750 / DEFAULT_SPLITOPS_MEMBERS.length).toFixed(2),
      })),
      lastEditedByName: "Zubair",
      lastEditedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: !isSplitOpsFallback,
    retry: false,
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: () => getExpenses(groupId),
    enabled: !isSplitOpsFallback && !groupQuery.error,
    retry: false,
  });

  const balancesQuery = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => getBalances(groupId),
    enabled: !isSplitOpsFallback && !groupQuery.error,
    retry: false,
  });

  // Sync API data if present
  useEffect(() => {
    if (groupQuery.data?.group?.name) {
      setGroupName(groupQuery.data.group.name);
      setEditGroupNameInput(groupQuery.data.group.name);
    }
    if (groupQuery.data?.members && groupQuery.data.members.length > 0) {
      setMembers(groupQuery.data.members);
    }
  }, [groupQuery.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
    void queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
  };

  const settle = useMutation({
    mutationFn: (body: unknown) => recordSettlement(groupId, body),
    onSuccess: refresh,
  });

  // Group Rename
  const handleSaveGroupName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editGroupNameInput.trim()) {
      setGroupName(editGroupNameInput.trim());
      setIsEditingGroupName(false);
    }
  };

  // Member Manager Handlers
  const handleAddMember = (newMem: ManagedMember) => {
    setMembers((prev) => [...prev, newMem]);
  };

  const handleUpdateMember = (id: string, updatedName: string, updatedTag?: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, displayName: updatedName, tag: updatedTag } : m))
    );
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Expense Handlers
  const handleSaveExpense = (saved: ExportExpense) => {
    setExpensesList((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      if (exists) {
        return prev.map((e) => (e.id === saved.id ? saved : e));
      }
      return [saved, ...prev];
    });
    refresh();
  };

  const handleConfirmDelete = () => {
    if (deleteExpenseTarget) {
      setExpensesList((prev) => prev.filter((e) => e.id !== deleteExpenseTarget.id));
      setDeleteExpenseTarget(null);
      refresh();
    }
  };

  // Dynamic Balances: Handles both single and multi-payer breakdowns
  const computedBalances = useMemo(() => {
    if (balancesQuery.data?.balances && balancesQuery.data.balances.length > 0) {
      return balancesQuery.data.balances;
    }
    const balanceMap = new Map<string, number>();
    members.forEach((m) => balanceMap.set(m.id, 0));

    expensesList.forEach((exp) => {
      // 1. Credit payers
      if (exp.payers && exp.payers.length > 0) {
        exp.payers.forEach((p) => {
          const amt = parseFloat(p.amount) || 0;
          const cur = balanceMap.get(p.memberId) ?? 0;
          balanceMap.set(p.memberId, cur + amt);
        });
      } else {
        const amt = parseFloat(exp.amount) || 0;
        const cur = balanceMap.get(exp.payerId) ?? 0;
        balanceMap.set(exp.payerId, cur + amt);
      }

      // 2. Debit participants
      exp.participants.forEach((part) => {
        const shareAmt =
          parseFloat(part.amount || "0") ||
          (parseFloat(exp.amount) || 0) / (exp.participants.length || 1);
        const cur = balanceMap.get(part.memberId) ?? 0;
        balanceMap.set(part.memberId, cur - shareAmt);
      });
    });

    return members.map((m) => {
      const net = balanceMap.get(m.id) ?? 0;
      return {
        memberId: m.id,
        displayName: m.displayName,
        amount: net.toFixed(2),
        currency: "INR",
      };
    });
  }, [members, expensesList, balancesQuery.data]);

  // Expense History Filter & Search
  const filteredExpenses = useMemo(() => {
    return expensesList.filter((e) => {
      // 1. Text Search (title, payer, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesPayer = e.payerName.toLowerCase().includes(q);
        const matchesParticipants = e.participants.some((p) =>
          p.displayName.toLowerCase().includes(q)
        );
        if (!matchesDesc && !matchesPayer && !matchesParticipants) return false;
      }

      // 2. Filter by Member
      if (selectedMemberFilter !== "ALL") {
        const isPayer = e.payerId === selectedMemberFilter || e.payers?.some((p) => p.memberId === selectedMemberFilter);
        const isPart = e.participants.some((p) => p.memberId === selectedMemberFilter);
        if (!isPayer && !isPart) return false;
      }

      // 3. Filter by Date
      if (dateFilter !== "ALL" && e.spentAt) {
        const expDate = new Date(e.spentAt);
        const now = new Date();

        if (dateFilter === "TODAY") {
          if (expDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "WEEK") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          if (expDate < weekAgo) return false;
        } else if (dateFilter === "MONTH") {
          if (expDate.getMonth() !== now.getMonth() || expDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [expensesList, searchQuery, selectedMemberFilter, dateFilter]);

  const handleExportExcel = () => {
    exportGroupToExcel({
      groupName,
      currency: "INR",
      members,
      expenses: filteredExpenses,
    });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-4 border-b border-[--color-line]">
        <div className="flex items-center gap-3">
          <Link
            href="/groups"
            className="text-xs font-semibold uppercase tracking-wider text-[--color-muted] hover:text-[--color-text] transition-colors"
          >
            ← Groups
          </Link>
          <span className="text-[--color-line-bright]">/</span>
          <span className="text-sm font-medium text-[--color-text] truncate max-w-[140px] sm:max-w-xs">
            {groupName}
          </span>
        </div>

        {/* User Identity & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            title="Click to switch active profile"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--color-surface] border border-[--color-brass]/40 hover:border-[--color-brass] text-xs text-[--color-text] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[--color-credit]" />
            <span className="truncate max-w-[100px]">{currentUser?.name || "Zubair"}</span>
            <span className="text-[10px] text-[--color-brass] underline font-mono">Switch</span>
          </Link>

          <button
            onClick={handleExportExcel}
            type="button"
            title="Export to Excel spreadsheet with live fraction formulas"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] hover:border-[--color-brass] text-xs font-medium text-[--color-text] hover:text-[--color-brass] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Group Title, Rename & Actions */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div>
          {isEditingGroupName ? (
            <form onSubmit={handleSaveGroupName} className="flex items-center gap-2">
              <input
                value={editGroupNameInput}
                onChange={(e) => setEditGroupNameInput(e.target.value)}
                autoFocus
                className="text-xl sm:text-2xl font-medium tracking-tight rounded border border-[--color-brass] bg-[--color-surface] px-2 py-1 text-[--color-text] outline-none"
              />
              <button
                type="submit"
                className="bg-[--color-brass] px-3 py-1 rounded text-xs font-semibold text-[#0b0e0d]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingGroupName(false)}
                className="text-xs text-[--color-muted] hover:text-[--color-text]"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[--color-text]">
                {groupName}
              </h1>
              <button
                onClick={() => setIsEditingGroupName(true)}
                title="Rename group (available to all members)"
                className="text-xs text-[--color-muted] hover:text-[--color-brass] p-1 rounded hover:bg-[--color-surface-raised]"
              >
                ✎ Rename
              </button>
            </div>
          )}

          <p className="text-xs text-[--color-muted] mt-1">
            Equal permissions for all members · Currency: <strong className="text-[--color-brass]">INR (₹)</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setModalExpense(null);
              setIsExpenseModalOpen(true);
            }}
            type="button"
            className="bg-[--color-brass] px-3.5 py-1.5 rounded-[--radius] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add Expense</span>
          </button>

          <button
            onClick={() => setIsMemberManagerOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] hover:border-[--color-brass] text-xs font-medium text-[--color-text] transition-colors"
          >
            <span>Members ({members.length})</span>
            <span>⚙</span>
          </button>
        </div>
      </div>

      {/* Members horizontal badge row */}
      <section className="mt-4 pb-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {members.map((m) => {
            const isOwner = m.role === "OWNER" || m.displayName.toLowerCase() === "zubair";
            return (
              <span
                key={m.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[--radius] text-xs border ${
                  isOwner
                    ? "border-[--color-brass] bg-[--color-brass-dim]/30 text-[--color-text] font-medium"
                    : "border-[--color-line] bg-[--color-surface] text-[--color-muted]"
                }`}
              >
                <span>{m.displayName}</span>
                {isOwner && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[--color-brass] text-[#0b0e0d]">
                    Owner
                  </span>
                )}
                {m.tag && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[--color-surface-raised] text-[--color-faint]">
                    #{m.tag}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </section>

      {/* Net Balances Section */}
      <section className="mt-8 border-t border-[--color-line] pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Net Balances (₹ INR)</h2>
          <span className="text-[--color-faint] text-xs font-mono">Simplified</span>
        </div>

        <div className="mt-2 divide-y divide-[--color-line]">
          {computedBalances.map((b) => (
            <div key={`${b.memberId}-${b.currency}`} className="ledger-row">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[--color-text]">{b.displayName}</span>
                {b.displayName.toLowerCase() === "zubair" && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[--color-brass] text-[#0b0e0d]">
                    Owner
                  </span>
                )}
              </div>
              <span className="ledger-leader" aria-hidden="true" />
              <div className="text-right">
                <Amount amount={b.amount} currency={b.currency} />
                <span className="text-[--color-faint] ml-2 text-xs">
                  {b.amount.startsWith("-") ? "owes" : parseFloat(b.amount) > 0 ? "is owed" : "settled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Settle Up Section */}
      {balancesQuery.data && balancesQuery.data.transfers.length > 0 && (
        <section className="border-[--color-brass-dim] bg-[--color-surface] mt-8 rounded-[--radius-lg] border p-4 sm:p-5">
          <h2 className="eyebrow text-[--color-brass]">Settle Up In One Payment</h2>
          <p className="text-[--color-muted] mt-1 text-xs sm:text-sm">
            {balancesQuery.data.transfers.length === 1
              ? "1 payment clears the entire group."
              : `${balancesQuery.data.transfers.length} payments clear the entire group.`}
          </p>
          <div className="mt-3 divide-y divide-[--color-line]">
            {balancesQuery.data.transfers.map((t, i) => (
              <div key={i} className="ledger-row py-2.5">
                <span className="text-sm">
                  <strong className="text-[--color-text]">{t.fromName}</strong>{" "}
                  <span className="text-[--color-faint]">pays</span>{" "}
                  <strong className="text-[--color-text]">{t.toName}</strong>
                </span>
                <span className="ledger-leader" aria-hidden="true" />
                <span className="flex items-center gap-2 sm:gap-3">
                  <Amount amount={t.amount} currency={t.currency} tone="neutral" />
                  <button
                    onClick={() =>
                      settle.mutate({
                        fromMemberId: t.fromMemberId,
                        toMemberId: t.toMemberId,
                        amount: t.amount,
                        currency: t.currency,
                        idempotencyKey: crypto.randomUUID(),
                      })
                    }
                    disabled={settle.isPending}
                    className="border border-[--color-line-bright] hover:border-[--color-brass] hover:text-[--color-brass] rounded-[--radius-sm] px-2.5 py-1 text-xs transition-colors disabled:opacity-40"
                  >
                    Record
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expense History with Search & Filter Section */}
      <section className="mt-10 border-t border-[--color-line] pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="eyebrow">Expense History</h2>
            <p className="text-xs text-[--color-muted]">
              Showing {filteredExpenses.length} of {expensesList.length} expenses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalExpense(null);
                setIsExpenseModalOpen(true);
              }}
              className="text-xs text-[--color-brass] hover:underline font-semibold"
            >
              + New Expense
            </button>
            <span className="text-[--color-line-bright]">|</span>
            <button
              onClick={handleExportExcel}
              className="text-xs text-[--color-muted] hover:text-[--color-text] flex items-center gap-1"
            >
              <span>Excel Export</span>
              <span>↓</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-3 p-3 rounded-[--radius-lg] border border-[--color-line] bg-[--color-surface] space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-[--color-muted]">🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses by title, payer or participant…"
              className="w-full pl-8 pr-8 py-2 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] text-xs text-[--color-text] outline-none focus:border-[--color-brass]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-[--color-muted] hover:text-[--color-text]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Member & Date Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[--color-muted] shrink-0">Member:</span>
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="flex-1 rounded border border-[--color-line] bg-[--color-canvas] px-2 py-1.5 text-xs text-[--color-text] outline-none"
              >
                <option value="ALL">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[--color-muted] shrink-0">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="flex-1 rounded border border-[--color-line] bg-[--color-canvas] px-2 py-1.5 text-xs text-[--color-text] outline-none"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MONTH">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="mt-4 divide-y divide-[--color-line]">
          {filteredExpenses.length === 0 && (
            <div className="py-8 text-center border border-dashed border-[--color-line] rounded-[--radius-lg] my-2">
              <p className="text-sm text-[--color-muted]">No matching expenses found.</p>
              {(searchQuery || selectedMemberFilter !== "ALL" || dateFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMemberFilter("ALL");
                    setDateFilter("ALL");
                  }}
                  className="mt-2 text-xs text-[--color-brass] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {filteredExpenses.map((e) => {
            const partCount = e.participants.length || members.length;
            const editor = e.lastEditedByName || e.payerName;
            const editTime = e.lastEditedAt
              ? new Date(e.lastEditedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "just now";
            const formattedDate = e.spentAt
              ? new Date(e.spentAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Today";

            const splitBadge = e.splitMethod || "EQUAL";

            return (
              <div key={e.id} className="py-3.5 space-y-1.5 hover:bg-[--color-surface]/50 -mx-2 px-2 rounded-[--radius] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[--color-text]">{e.description}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[--color-surface-raised] text-[--color-brass] border border-[--color-line]">
                        {splitBadge}
                      </span>
                    </div>

                    <div className="text-xs text-[--color-muted] mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{formattedDate}</span>
                      <span>·</span>
                      {e.payers && e.payers.length > 1 ? (
                        <span>
                          Paid by {e.payers.length} people (
                          {e.payers.map((p) => `${p.displayName}: ₹${p.amount}`).join(", ")})
                        </span>
                      ) : (
                        <span>Paid by {e.payerName}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2 shrink-0">
                    <Amount amount={e.amount} currency={e.currency} tone="neutral" className="text-base font-semibold" />
                    {/* Action buttons: Edit & Delete with Confirm */}
                    <button
                      onClick={() => {
                        setModalExpense(e);
                        setIsExpenseModalOpen(true);
                      }}
                      title="Edit expense (available to all members)"
                      className="text-xs text-[--color-muted] hover:text-[--color-brass] p-1.5 rounded hover:bg-[--color-surface-raised]"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setDeleteExpenseTarget(e)}
                      title="Delete expense (available to all members)"
                      className="text-xs text-[--color-debit] hover:opacity-80 p-1.5 rounded hover:bg-[--color-surface-raised]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[--color-faint] gap-1 pt-0.5">
                  <span>
                    Split among {partCount} participants ·{" "}
                    {splitBadge === "EQUAL" ? `1/${partCount} each (₹${(parseFloat(e.amount) / partCount).toFixed(2)})` : "Custom split shares"}
                  </span>
                  {/* User requirement: Show "last edited by <name> at <time>" on every expense */}
                  <span className="text-[11px] text-[--color-brass]/80 font-mono">
                    Last edited by {editor} at {editTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Member Manager Modal */}
      <MemberManagerModal
        isOpen={isMemberManagerOpen}
        onClose={() => setIsMemberManagerOpen(false)}
        members={members}
        onAddMember={handleAddMember}
        onUpdateMember={handleUpdateMember}
        onRemoveMember={handleRemoveMember}
      />

      {/* Add / Edit Expense Modal with 4 Split Types & Multi-Payer */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setModalExpense(null);
        }}
        expense={modalExpense}
        members={members}
        onSave={handleSaveExpense}
      />

      {/* Confirm Delete Modal */}
      {deleteExpenseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[--radius-lg] border border-[--color-debit-dim] bg-[--color-surface] p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[--color-text]">Delete Expense?</h3>
              <p className="text-xs text-[--color-muted] mt-1">
                Are you sure you want to remove &ldquo;{deleteExpenseTarget.description}&rdquo; (₹
                {deleteExpenseTarget.amount})? This will immediately recalculate all member balances.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteExpenseTarget(null)}
                className="px-3 py-1.5 rounded text-xs text-[--color-muted] hover:text-[--color-text]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-[--color-debit] px-4 py-1.5 rounded text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
