"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { Amount } from "../../../components/amount";
import { ExpenseModal } from "../../../components/edit-expense-modal";
import { MemberManagerModal, type ManagedMember } from "../../../components/member-manager-modal";
import { MonthDashboard } from "../../../components/month-dashboard";
import { ThemeToggle } from "../../../components/theme-toggle";
import {
  deleteGroup,
  getBalances,
  getExpenses,
  getGroup,
  recordSettlement,
} from "../../../lib/api";
import { exportGroupToExcel, exportGroupToJson, type ExportExpense } from "../../../lib/excel-export";
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
  { id: "mem-sameena", displayName: "Sameena Sultan", role: "MEMBER" },
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
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);

  // Personal View scoping (when enabled, filters to active member's activities)
  const [personalOnly, setPersonalOnly] = useState(false);

  // Search & Filter state for Expense History
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberFilter, setSelectedMemberFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");

  // Expenses state (starts empty; expenses appear only when a user adds a split)
  const [expensesList, setExpensesList] = useState<ExportExpense[]>([]);

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

  // On-device groups (created while the backend was unreachable) carry
  // their name in localStorage until the backend syncs.
  useEffect(() => {
    if (isSplitOpsFallback) return;
    try {
      const raw = localStorage.getItem("ggsplitops_custom_groups");
      const list = raw ? (JSON.parse(raw) as { id: string; name: string }[]) : [];
      const found = list.find((g) => g.id === groupId);
      if (found) {
        setGroupName(found.name);
        setEditGroupNameInput(found.name);
      }
    } catch {
      // Ignore
    }
  }, [groupId, isSplitOpsFallback]);

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
      // 0. Personal View Scoping
      if (personalOnly && currentUser?.id) {
        const isPayer = e.payerId === currentUser.id || e.payers?.some((p) => p.memberId === currentUser.id);
        const isPart = e.participants.some((p) => p.memberId === currentUser.id);
        if (!isPayer && !isPart) return false;
      }

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

  const handleDeleteGroup = async () => {
    if (!window.confirm(`Delete “${groupName}” and remove it for all members?`)) return;
    try {
      await deleteGroup(groupId);
      window.location.assign("/groups");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete this group.");
    }
  };

  const handleExportJson = () => {
    exportGroupToJson({ groupId, groupName, currency: "INR", members, expenses: filteredExpenses }, `${groupName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`);
  };

  const handleWhatsAppShare = () => {
    const text = `SplitOps group: ${groupName}\nMembers: ${members.map((member) => member.displayName).join(", ")}\nOpen the ledger: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
        <div className="flex items-center gap-3">
          <Link
            href="/groups"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← Groups
          </Link>
          <span className="text-[var(--color-line-bright)]">/</span>
          <span className="text-sm font-medium text-[var(--color-text)] truncate max-w-[140px] sm:max-w-xs">
            {groupName}
          </span>
        </div>

        {/* User Identity & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            title="Click to switch active profile"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-brass)]/40 hover:border-[var(--color-brass)] text-xs text-[var(--color-text)] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-credit)]" />
            <span className="truncate max-w-[100px]">{currentUser?.name || "Zubair"}</span>
            <span className="text-[10px] text-[var(--color-brass)] underline font-mono">Switch</span>
          </Link>

          <button
            onClick={handleExportExcel}
            type="button"
            title="Export to Excel spreadsheet with live fraction formulas"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] bg-[var(--color-surface-raised)] border border-[var(--color-line)] hover:border-[var(--color-brass)] text-xs font-medium text-[var(--color-text)] hover:text-[var(--color-brass)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button type="button" onClick={handleExportJson} title="Download group data as JSON" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] bg-[var(--color-surface-raised)] border border-[var(--color-line)] text-xs font-medium text-[var(--color-text)]">JSON</button>
          <button type="button" onClick={handleWhatsAppShare} title="Share group on WhatsApp" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] bg-[var(--color-surface-raised)] border border-[var(--color-line)] text-xs font-medium text-[var(--color-text)]">WhatsApp</button>

          <button type="button" onClick={handleDeleteGroup} title="Delete this group for all members" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] border border-[var(--color-debit)]/40 text-xs font-medium text-[var(--color-debit)] hover:bg-[var(--color-debit)]/10">Delete group</button>

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
                className="text-xl sm:text-2xl font-medium tracking-tight rounded border border-[var(--color-brass)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)] outline-none"
              />
              <button
                type="submit"
                className="bg-[var(--color-brass)] px-3 py-1 rounded text-xs font-semibold text-[#0b0e0d]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingGroupName(false)}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--color-text)]">
                {groupName}
              </h1>
              <button
                onClick={() => setIsEditingGroupName(true)}
                title="Rename group (available to all members)"
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brass)] p-1 rounded hover:bg-[var(--color-surface-raised)]"
              >
                ✎ Rename
              </button>
            </div>
          )}

          <p className="text-xs text-[var(--color-muted)] mt-1">
            Equal permissions for all members · Currency: <strong className="text-[var(--color-brass)]">INR (₹)</strong>
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
            className="bg-[var(--color-brass)] px-3.5 py-1.5 rounded-[var(--radius)] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 active:scale-95 flex items-center gap-1.5"
          >
            <span>+ Add Expense</span>
          </button>

          <button
            onClick={() => setIsMemberManagerOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--color-surface-raised)] border border-[var(--color-line)] hover:border-[var(--color-brass)] text-xs font-medium text-[var(--color-text)] transition-colors"
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius)] text-xs border ${
                  isOwner
                    ? "border-[var(--color-brass)] bg-[var(--color-brass-dim)]/30 text-[var(--color-text)] font-medium"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                }`}
              >
                <span>{m.displayName}</span>
                {isOwner && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[var(--color-brass)] text-[#0b0e0d]">
                    Owner
                  </span>
                )}
                {m.tag && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--color-surface-raised)] text-[var(--color-faint)]">
                    #{m.tag}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </section>

      {/* Dynamic This Month Dashboard */}
      <div className="mt-6">
        <MonthDashboard
          expenses={expensesList}
          members={members}
          personalOnly={personalOnly}
          onTogglePersonalOnly={setPersonalOnly}
          onSelectMonthFilter={() => setDateFilter("MONTH")}
          onSelectDateFilter={(dateStr) => {
            setSearchQuery(dateStr);
          }}
        />
      </div>

      {/* Net Balances Section */}
      <section className="mt-8 border-t border-[var(--color-line)] pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Net Balances (₹ INR)</h2>
          <span className="text-[var(--color-faint)] text-xs font-mono">Simplified</span>
        </div>

        <div className="mt-2 divide-y divide-[var(--color-line)]">
          {computedBalances.map((b) => (
            <div key={`${b.memberId}-${b.currency}`} className="ledger-row">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text)]">{b.displayName}</span>
                {b.displayName.toLowerCase() === "zubair" && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[var(--color-brass)] text-[#0b0e0d]">
                    Owner
                  </span>
                )}
              </div>
              <span className="ledger-leader" aria-hidden="true" />
              <div className="text-right">
                <Amount amount={b.amount} currency={b.currency} />
                <span className="text-[var(--color-faint)] ml-2 text-xs">
                  {b.amount.startsWith("-") ? "owes" : parseFloat(b.amount) > 0 ? "is owed" : "settled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Settle Up Section */}
      {balancesQuery.data && balancesQuery.data.transfers.length > 0 && (
        <section className="border-[var(--color-brass-dim)] bg-[var(--color-surface)] mt-8 rounded-[var(--radius-lg)] border p-4 sm:p-5">
          <h2 className="eyebrow text-[var(--color-brass)]">Settle Up In One Payment</h2>
          <p className="text-[var(--color-muted)] mt-1 text-xs sm:text-sm">
            {balancesQuery.data.transfers.length === 1
              ? "1 payment clears the entire group."
              : `${balancesQuery.data.transfers.length} payments clear the entire group.`}
          </p>
          <div className="mt-3 divide-y divide-[var(--color-line)]">
            {balancesQuery.data.transfers.map((t, i) => (
              <div key={i} className="ledger-row py-2.5">
                <span className="text-sm">
                  <strong className="text-[var(--color-text)]">{t.fromName}</strong>{" "}
                  <span className="text-[var(--color-faint)]">pays</span>{" "}
                  <strong className="text-[var(--color-text)]">{t.toName}</strong>
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
                    className="border border-[var(--color-line-bright)] hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs transition-colors disabled:opacity-40"
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
      <section className="mt-10 border-t border-[var(--color-line)] pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="eyebrow">Expense History</h2>
            <p className="text-xs text-[var(--color-muted)]">
              Showing {filteredExpenses.length} of {expensesList.length} expenses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClearHistoryModalOpen(true)}
              type="button"
              disabled={expensesList.length === 0}
              className="text-xs text-[var(--color-debit)] hover:underline font-medium disabled:opacity-40"
            >
              🗑 Clear History
            </button>
            <span className="text-[var(--color-line-bright)]">|</span>
            <button
              onClick={() => {
                setModalExpense(null);
                setIsExpenseModalOpen(true);
              }}
              className="text-xs text-[var(--color-brass)] hover:underline font-semibold"
            >
              + New Expense
            </button>
            <span className="text-[var(--color-line-bright)]">|</span>
            <button
              onClick={handleExportExcel}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1"
            >
              <span>Excel Export</span>
              <span>↓</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-3 p-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-[var(--color-muted)]">🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses by title, payer or participant…"
              className="w-full pl-8 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-canvas)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brass)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Member & Date Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--color-muted)] shrink-0">Member:</span>
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="flex-1 rounded border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none"
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
              <span className="text-[var(--color-muted)] shrink-0">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as "ALL" | "TODAY" | "WEEK" | "MONTH")}
                className="flex-1 rounded border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none"
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
        <div className="mt-4 divide-y divide-[var(--color-line)]">
          {filteredExpenses.length === 0 && (
            <div className="py-8 text-center border border-dashed border-[var(--color-line)] rounded-[var(--radius-lg)] my-2">
              <p className="text-sm text-[var(--color-muted)]">No matching expenses found.</p>
              {(searchQuery || selectedMemberFilter !== "ALL" || dateFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMemberFilter("ALL");
                    setDateFilter("ALL");
                  }}
                  className="mt-2 text-xs text-[var(--color-brass)] hover:underline"
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

            const splitMethod = e.splitMethod || "EQUAL";
            const splitLabel: Record<string, string> = {
              EQUAL: "Equal Split",
              EXACT: "Exact Amount",
              PERCENTAGE: "Percentage",
              SHARES: "Shares",
            };
            const splitBadge = splitLabel[splitMethod] || splitMethod;

            return (
              <div key={e.id} className="py-3.5 space-y-1.5 hover:bg-[var(--color-surface)]/50 -mx-2 px-2 rounded-[var(--radius)] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text)]">{e.description}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[var(--color-surface-raised)] text-[var(--color-brass)] border border-[var(--color-line)]">
                        {splitBadge}
                      </span>
                      {e.transport && (
                        <span
                          className="text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-[var(--color-surface-raised)] text-[var(--color-credit)] border border-[var(--color-line)]"
                          data-testid={`expense-transport-${e.id}`}
                        >
                          {e.transport.mode === "CAB" ? "🚕" : "🏍️"} +₹{e.transport.fare}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[var(--color-muted)] mt-0.5 flex flex-wrap items-center gap-2">
                      <span suppressHydrationWarning>{formattedDate}</span>
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
                      data-testid={`expense-edit-${e.id}`}
                      className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-brass)] px-2 py-1 rounded border border-[var(--color-line)] hover:border-[var(--color-brass)] transition-colors"
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => setDeleteExpenseTarget(e)}
                      title="Delete expense (available to all members)"
                      className="text-xs text-[var(--color-debit)] hover:opacity-80 p-1.5 rounded hover:bg-[var(--color-surface-raised)]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[var(--color-faint)] gap-1 pt-0.5">
                  <span>
                    Split among {partCount} participants ·{" "}
                    {splitMethod === "EQUAL" ? `1/${partCount} each (₹${(parseFloat(e.amount) / partCount).toFixed(2)})` : "Custom split shares"}
                  </span>
                  {/* User requirement: Show "last edited by <name> at <time>" on every expense */}
                  <span suppressHydrationWarning className="text-[11px] text-[var(--color-brass)]/80 font-mono">
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
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-debit-dim)] bg-[var(--color-surface)] p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text)]">Delete Expense?</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Are you sure you want to remove &ldquo;{deleteExpenseTarget.description}&rdquo; (₹
                {deleteExpenseTarget.amount})? This will immediately recalculate all member balances.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteExpenseTarget(null)}
                className="px-3 py-1.5 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-[var(--color-debit)] px-4 py-1.5 rounded text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear All History Modal */}
      {isClearHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-debit-dim)] bg-[var(--color-surface)] p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text)]">Clear All Expense History?</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Are you sure you want to remove all {expensesList.length} expenses? All member balances will be reset to zero.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearHistoryModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpensesList([]);
                  setIsClearHistoryModalOpen(false);
                  refresh();
                }}
                className="bg-[var(--color-debit)] px-4 py-1.5 rounded text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
