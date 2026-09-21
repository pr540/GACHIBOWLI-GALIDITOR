"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { Amount } from "../../../components/amount";
import { EditExpenseModal } from "../../../components/edit-expense-modal";
import { MemberManagerModal, type ManagedMember } from "../../../components/member-manager-modal";
import { ThemeToggle } from "../../../components/theme-toggle";
import {
  createExpense,
  getBalances,
  getExpenses,
  getGroup,
  recordSettlement,
} from "../../../lib/api";
import { exportGroupToExcel, type ExportExpense } from "../../../lib/excel-export";
import { useActiveUser } from "../../../lib/user-context";

// Default Seed Members for SplitOps
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

  // Expense Editing State
  const [editingExpense, setEditingExpense] = useState<ExportExpense | null>(null);

  // Local expenses list
  const [expensesList, setExpensesList] = useState<ExportExpense[]>([
    {
      id: "sample-exp-1",
      description: "Team Lunch at Gachibowli",
      amount: "3750.00",
      currency: "INR",
      payerName: "Zubair",
      payerId: "mem-zubair",
      spentAt: new Date(Date.now() - 3600000).toISOString(),
      participants: DEFAULT_SPLITOPS_MEMBERS.map((m) => ({ memberId: m.id, displayName: m.displayName })),
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

  // Sync API members if available
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
  const handleCreateExpense = (newExp: ExportExpense) => {
    setExpensesList((prev) => [newExp, ...prev]);
    refresh();
  };

  const handleUpdateExpense = (updatedExp: ExportExpense) => {
    setExpensesList((prev) => prev.map((e) => (e.id === updatedExp.id ? updatedExp : e)));
    refresh();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      setExpensesList((prev) => prev.filter((e) => e.id !== id));
      refresh();
    }
  };

  // Dynamic calculation of balances
  const computedBalances = (() => {
    if (balancesQuery.data?.balances && balancesQuery.data.balances.length > 0) {
      return balancesQuery.data.balances;
    }
    const balanceMap = new Map<string, number>();
    members.forEach((m) => balanceMap.set(m.id, 0));

    expensesList.forEach((exp) => {
      const amt = parseFloat(exp.amount) || 0;
      const curPayer = balanceMap.get(exp.payerId) ?? 0;
      balanceMap.set(exp.payerId, curPayer + amt);

      const partCount = exp.participants.length || members.length;
      const share = amt / partCount;
      exp.participants.forEach((p) => {
        const curOwe = balanceMap.get(p.memberId) ?? 0;
        balanceMap.set(p.memberId, curOwe - share);
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
  })();

  const handleExportExcel = () => {
    exportGroupToExcel({
      groupName,
      currency: "INR",
      members,
      expenses: expensesList,
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
          {/* Active Profile Pill */}
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

      {/* Group Title, Rename & Member Manager Action */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
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

        {/* Member Manager Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMemberManagerOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius] bg-[--color-brass-dim]/40 border border-[--color-brass]/40 hover:border-[--color-brass] text-xs font-semibold text-[--color-brass] transition-colors"
          >
            <span>Manage Members ({members.length})</span>
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

      {/* Balances Section */}
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

      {/* Add Expense Form with Split Automation */}
      <AddExpenseSection
        groupId={groupId}
        members={members}
        activeUserName={currentUser?.name || "Zubair"}
        onExpenseCreated={handleCreateExpense}
      />

      {/* Expense History Section with Edit / Delete & "Last edited by" metadata */}
      <section className="mt-10 border-t border-[--color-line] pt-6">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">Expense Records ({expensesList.length})</h2>
          <button
            onClick={handleExportExcel}
            className="text-xs text-[--color-brass] hover:underline font-medium flex items-center gap-1"
          >
            <span>Download Excel (.xls)</span>
            <span>↓</span>
          </button>
        </div>

        <div className="mt-3 divide-y divide-[--color-line]">
          {expensesList.length === 0 && (
            <p className="text-[--color-faint] py-6 text-sm text-center">No expenses recorded yet.</p>
          )}

          {expensesList.map((e) => {
            const partCount = e.participants.length || members.length;
            const editor = e.lastEditedByName || e.payerName;
            const editTime = e.lastEditedAt
              ? new Date(e.lastEditedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "just now";

            return (
              <div key={e.id} className="py-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium text-[--color-text]">{e.description}</span>
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-[--color-surface-raised] text-[--color-muted]">
                      Paid by {e.payerName}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <Amount amount={e.amount} currency={e.currency} tone="neutral" className="text-base font-semibold" />
                    {/* Action buttons: Edit & Delete */}
                    <button
                      onClick={() => setEditingExpense(e)}
                      title="Edit expense (available to all members)"
                      className="text-xs text-[--color-muted] hover:text-[--color-brass] p-1"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(e.id)}
                      title="Delete expense (available to all members)"
                      className="text-xs text-[--color-debit] hover:opacity-80 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[--color-faint] gap-1">
                  <span>
                    Split among {partCount} people · Fraction: 1/{partCount} each (₹
                    {(parseFloat(e.amount) / partCount).toFixed(2)})
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

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        members={members}
        onSave={handleUpdateExpense}
      />
    </main>
  );
}

/**
 * AddExpenseSection with Automated Split Participation, Fraction Preview & Stamping Editor Name
 */
function AddExpenseSection({
  groupId,
  members,
  activeUserName,
  onExpenseCreated,
}: {
  groupId: string;
  members: ManagedMember[];
  activeUserName: string;
  onExpenseCreated: (exp: ExportExpense) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id || "");

  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );

  useEffect(() => {
    setSelectedMembers(new Set(members.map((m) => m.id)));
    if (!payerId && members[0]) {
      setPayerId(members[0].id);
    }
  }, [members.length]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedMembers(new Set(members.map((m) => m.id)));
  };

  const clearAll = () => {
    if (members[0]) {
      setSelectedMembers(new Set([members[0].id]));
    }
  };

  const selectedCount = selectedMembers.size;
  const numAmount = parseFloat(amount) || 0;
  const perPersonShare = selectedCount > 0 ? (numAmount / selectedCount).toFixed(2) : "0.00";
  const fractionFormulaText = `1/${selectedCount}`;

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      const activePayerId = payerId || members[0]?.id || "mem-zubair";
      return createExpense(groupId, {
        description,
        amount,
        currency: "INR",
        splitMethod: "EQUAL",
        payers: [{ memberId: activePayerId, amount }],
        participants: Array.from(selectedMembers).map((mId) => ({ memberId: mId })),
        idempotencyKey: crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      const activePayerId = payerId || members[0]?.id || "mem-zubair";
      const payerName = members.find((m) => m.id === activePayerId)?.displayName || "Payer";
      const participants = members
        .filter((m) => selectedMembers.has(m.id))
        .map((m) => ({ memberId: m.id, displayName: m.displayName }));

      onExpenseCreated({
        id: `exp-${Date.now()}`,
        description,
        amount,
        currency: "INR",
        payerId: activePayerId,
        payerName,
        spentAt: new Date().toISOString(),
        participants,
        lastEditedByName: activeUserName,
        lastEditedAt: new Date().toISOString(),
      });

      setDescription("");
      setAmount("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || numAmount <= 0) return;

    if (groupId === "splitops") {
      const activePayerId = payerId || members[0]?.id || "mem-zubair";
      const payerName = members.find((m) => m.id === activePayerId)?.displayName || "Payer";
      const participants = members
        .filter((m) => selectedMembers.has(m.id))
        .map((m) => ({ memberId: m.id, displayName: m.displayName }));

      onExpenseCreated({
        id: `exp-${Date.now()}`,
        description,
        amount,
        currency: "INR",
        payerId: activePayerId,
        payerName,
        spentAt: new Date().toISOString(),
        participants,
        lastEditedByName: activeUserName,
        lastEditedAt: new Date().toISOString(),
      });

      setDescription("");
      setAmount("");
    } else {
      addExpenseMutation.mutate();
    }
  };

  return (
    <section className="border border-[--color-line] bg-[--color-surface] mt-8 rounded-[--radius-lg] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow text-[--color-brass]">Add New Expense (₹ INR)</h2>
        <span className="text-xs font-mono text-[--color-faint]">Auto Split</span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <label className="block text-xs text-[--color-muted] mb-1">Expense Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner at Paradise, Groceries, Fuel"
              required
              className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs text-[--color-muted] mb-1">Amount (₹ INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-[--color-faint] font-semibold">₹</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500.00"
                inputMode="decimal"
                required
                className="w-full pl-7 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm tabular font-mono text-[--color-text] outline-none focus:border-[--color-brass]"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs text-[--color-muted] mb-1">Paid By</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} {m.role === "OWNER" || m.displayName.toLowerCase() === "zubair" ? "(Owner)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Participant Selection Checklist */}
        <div className="border border-[--color-line] bg-[--color-surface-raised] rounded-[--radius] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[--color-text]">Who is involved in this split?</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[--color-canvas] text-[--color-brass] font-mono">
                {selectedCount} of {members.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-[--color-brass] hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-[--color-line-bright]">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[--color-muted] hover:text-[--color-text]"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3 max-h-48 overflow-y-auto pr-1">
            {members.map((m) => {
              const isSelected = selectedMembers.has(m.id);
              return (
                <label
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[--radius] border cursor-pointer select-none transition-colors text-xs ${
                    isSelected
                      ? "border-[--color-brass] bg-[--color-canvas] text-[--color-text] font-medium"
                      : "border-[--color-line] bg-transparent text-[--color-faint] opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="accent-[#e8b44a] rounded"
                  />
                  <span className="truncate">{m.displayName}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-[--color-line] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[--color-muted] gap-1">
            <div>
              <span className="text-[--color-faint]">Formula: </span>
              <span className="font-mono text-[--color-brass]">
                ₹{numAmount > 0 ? numAmount.toFixed(2) : "0.00"} ÷ {selectedCount} = {fractionFormulaText} share
              </span>
            </div>
            <div>
              <span className="text-[--color-faint]">Per Person: </span>
              <span className="font-mono font-semibold text-[--color-credit] text-sm">
                ₹ {perPersonShare}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            disabled={addExpenseMutation.isPending || !description.trim() || numAmount <= 0}
            className="w-full sm:w-auto bg-[--color-brass] rounded-[--radius] px-6 py-2.5 text-sm font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
          >
            {addExpenseMutation.isPending ? "Recording…" : `Split ₹${numAmount > 0 ? numAmount.toFixed(2) : "0.00"} Now`}
          </button>
        </div>
      </form>
    </section>
  );
}
