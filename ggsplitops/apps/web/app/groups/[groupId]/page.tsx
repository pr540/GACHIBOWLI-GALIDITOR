"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { Amount } from "../../../components/amount";
import { ThemeToggle } from "../../../components/theme-toggle";
import {
  createExpense,
  getBalances,
  getExpenses,
  getGroup,
  recordSettlement,
} from "../../../lib/api";
import { exportGroupToExcel, type ExportExpense, type ExportMember } from "../../../lib/excel-export";

// Default Seed Members for SplitOps
const DEFAULT_SPLITOPS_MEMBERS = [
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

  // Local state for members so dynamic additions work seamlessly offline or online
  const [localMembers, setLocalMembers] = useState<ExportMember[]>(DEFAULT_SPLITOPS_MEMBERS);
  const [newMemberName, setNewMemberName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  // Local mock expenses when running in standalone mode
  const [localExpenses, setLocalExpenses] = useState<ExportExpense[]>([
    {
      id: "sample-exp-1",
      description: "Team Lunch at Gachibowli",
      amount: "3750.00",
      currency: "INR",
      payerName: "Zubair",
      payerId: "mem-zubair",
      spentAt: new Date().toISOString(),
      participants: DEFAULT_SPLITOPS_MEMBERS.map((m) => ({ memberId: m.id, displayName: m.displayName })),
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
    if (groupQuery.data?.members && groupQuery.data.members.length > 0) {
      setLocalMembers(groupQuery.data.members);
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

  // Handle adding a new member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const newMem: ExportMember = {
      id: `mem-${Date.now()}`,
      displayName: newMemberName.trim(),
      role: "MEMBER",
    };
    setLocalMembers((prev) => [...prev, newMem]);
    setNewMemberName("");
    setShowAddMember(false);
  };

  // Group name and members
  const groupName = groupQuery.data?.group.name || (isSplitOpsFallback ? "SplitOps" : "SplitOps");
  const currency = "INR";
  const members = localMembers;

  // Compute offline balances for sample view if API is not loaded
  const computedBalances = (() => {
    if (balancesQuery.data?.balances && balancesQuery.data.balances.length > 0) {
      return balancesQuery.data.balances;
    }
    // Compute quick balance from localExpenses
    const balanceMap = new Map<string, number>();
    members.forEach((m) => balanceMap.set(m.id, 0));

    localExpenses.forEach((exp) => {
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
      expenses: localExpenses,
    });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      {/* Mobile-first top header with navigation and ThemeToggle */}
      <header className="flex items-center justify-between pb-4 border-b border-[--color-line]">
        <div className="flex items-center gap-3">
          <Link
            href="/groups"
            className="text-xs font-semibold uppercase tracking-wider text-[--color-muted] hover:text-[--color-text] transition-colors"
          >
            ← Groups
          </Link>
          <span className="text-[--color-line-bright]">/</span>
          <span className="text-sm font-medium text-[--color-text] truncate max-w-[150px] sm:max-w-xs">
            {groupName}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportExcel}
            type="button"
            title="Export to Excel spreadsheet with live fraction formulas"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius] bg-[--color-surface-raised] border border-[--color-line] hover:border-[--color-brass] text-xs font-medium text-[--color-text] hover:text-[--color-brass] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Excel (.xls)</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Group Title & Details */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[--color-text]">
            {groupName}
          </h1>
          <p className="text-xs text-[--color-muted] mt-1">
            Collaborative Split Ledger · Currency: <strong className="text-[--color-brass]">INR (₹)</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-[--color-surface-raised] text-[--color-faint] font-mono">
            {members.length} Members
          </span>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="text-xs text-[--color-brass] hover:underline font-medium"
          >
            + Add Person
          </button>
        </div>
      </div>

      {/* Inline Add Member Form */}
      {showAddMember && (
        <form
          onSubmit={handleAddMember}
          className="mt-4 p-4 border border-[--color-line] bg-[--color-surface] rounded-[--radius-lg] flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
        >
          <input
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Enter person's name (e.g. Rahul)"
            autoFocus
            className="flex-1 rounded-[--radius] border border-[--color-line] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newMemberName.trim()}
              className="bg-[--color-brass] px-4 py-2 rounded-[--radius] text-xs font-semibold text-[#0b0e0d] disabled:opacity-50"
            >
              Add to Group
            </button>
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="px-3 py-2 text-xs text-[--color-muted] hover:text-[--color-text]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Members horizontal list with badges */}
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
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[--color-brass] text-[#0b0e0d]">
                    Owner
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

      {/* Settle up transfers if available */}
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

      {/* Add Expense Form with Split Automation & Fraction Calculations */}
      <AddExpenseSection
        groupId={groupId}
        members={members}
        onExpenseCreated={(newExp) => {
          setLocalExpenses((prev) => [newExp, ...prev]);
          refresh();
        }}
      />

      {/* Expense History Section */}
      <section className="mt-10 border-t border-[--color-line] pt-6">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">Expense Records</h2>
          <button
            onClick={handleExportExcel}
            className="text-xs text-[--color-brass] hover:underline font-medium flex items-center gap-1"
          >
            <span>Download Excel Sheet</span>
            <span>↓</span>
          </button>
        </div>

        <div className="mt-3 divide-y divide-[--color-line]">
          {localExpenses.length === 0 && (
            <p className="text-[--color-faint] py-4 text-sm text-center">No expenses recorded yet.</p>
          )}
          {localExpenses.map((e) => {
            const partCount = e.participants.length || members.length;
            return (
              <div key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[--color-text]">{e.description}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-[--color-surface-raised] text-[--color-muted]">
                      Paid by {e.payerName}
                    </span>
                  </div>
                  <div className="text-xs text-[--color-faint] mt-0.5">
                    Split among {partCount} people · Fraction: 1/{partCount} each (₹
                    {(parseFloat(e.amount) / partCount).toFixed(2)})
                  </div>
                </div>
                <div className="text-right">
                  <Amount amount={e.amount} currency={e.currency} tone="neutral" className="text-base font-semibold" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/**
 * AddExpenseSection with Automated Split Participation, Fraction Preview & Member Automation
 */
function AddExpenseSection({
  groupId,
  members,
  onExpenseCreated,
}: {
  groupId: string;
  members: ExportMember[];
  onExpenseCreated: (exp: ExportExpense) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id || "");

  // Automated split participation: set of selected member IDs
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );

  // Keep selected members in sync if new members are added
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
        if (next.size > 1) next.delete(id); // Keep at least one member selected
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
      });

      setDescription("");
      setAmount("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || numAmount <= 0) return;

    // Execute through API or fallback
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
        {/* Main Details */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <label className="block text-xs text-[--color-muted] mb-1">Expense Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner at Paradise, Groceries, Travel"
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

        {/* Participant Selection Checklist with Automation & Fraction Calculations */}
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

          {/* Member Checkbox Pills */}
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

          {/* Real-time Dynamic Fraction Formula Calculation Preview */}
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

        {/* Submit Button */}
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
