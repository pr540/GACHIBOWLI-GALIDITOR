"use client";

import { useEffect, useState } from "react";
import type { ExportExpense, ExportMember } from "../lib/excel-export";
import {
  calculateAndValidateSplits,
  round2,
  validatePayers,
  type ParticipantShareInput,
  type PayerShare,
  type SplitMethod,
} from "../lib/split-calculator";
import { useActiveUser } from "../lib/user-context";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: ExportExpense | null; // null/undefined for Add Mode, object for Edit Mode
  members: ExportMember[];
  onSave: (expense: ExportExpense) => void;
}

export function ExpenseModal({
  isOpen,
  onClose,
  expense,
  members,
  onSave,
}: ExpenseModalProps) {
  const { currentUser } = useActiveUser();

  if (!isOpen) return null;

  return (
    <ExpenseForm
      key={expense?.id || "new-expense"}
      expense={expense}
      members={members}
      editorName={currentUser?.name || "Member"}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ExpenseForm({
  expense,
  members,
  editorName,
  onClose,
  onSave,
}: {
  expense?: ExportExpense | null;
  members: ExportMember[];
  editorName: string;
  onClose: () => void;
  onSave: (savedExpense: ExportExpense) => void;
}) {
  const isEditMode = !!expense;

  // Title, Amount, Date
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(expense?.amount || "");
  const [spentAt, setSpentAt] = useState(
    expense?.spentAt ? expense.spentAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  // Paid By: Single vs Multiple
  const [isMultiPayer, setIsMultiPayer] = useState(
    !!expense?.payers && expense.payers.length > 1
  );
  const [singlePayerId, setSinglePayerId] = useState(
    expense?.payerId || members[0]?.id || "mem-zubair"
  );
  const [multiPayerAmounts, setMultiPayerAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (expense?.payers && expense.payers.length > 0) {
      expense.payers.forEach((p) => {
        map[p.memberId] = p.amount;
      });
    } else if (members[0]) {
      map[members[0].id] = expense?.amount || "";
    }
    return map;
  });

  // Split Type: EQUAL, EXACT, PERCENTAGE, SHARES
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    expense?.splitMethod || "EQUAL"
  );

  // Participants & custom split inputs
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(() => {
    if (expense?.participants && expense.participants.length > 0) {
      return new Set(expense.participants.map((p) => p.memberId));
    }
    return new Set(members.map((m) => m.id));
  });

  const [splitInputs, setSplitInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (expense?.participants) {
      expense.participants.forEach((p) => {
        if (p.value !== undefined) {
          map[p.memberId] = p.value;
        }
      });
    }
    return map;
  });

  const numAmount = parseFloat(amount) || 0;

  // Real-time calculation & validation of payers
  const currentPayers: PayerShare[] = isMultiPayer
    ? members
        .filter((m) => (parseFloat(multiPayerAmounts[m.id] || "0") || 0) > 0)
        .map((m) => ({
          memberId: m.id,
          displayName: m.displayName,
          amount: multiPayerAmounts[m.id] || "0",
        }))
    : [
        {
          memberId: singlePayerId,
          displayName: members.find((m) => m.id === singlePayerId)?.displayName || "Payer",
          amount: numAmount.toFixed(2),
        },
      ];

  const payerValidation = validatePayers(numAmount, currentPayers);

  // Participant Inputs preparation
  const participantShareInputs: ParticipantShareInput[] = members
    .filter((m) => selectedParticipants.has(m.id))
    .map((m) => ({
      memberId: m.id,
      displayName: m.displayName,
      value: splitInputs[m.id] || (splitMethod === "SHARES" ? "1" : "0"),
    }));

  const splitValidation = calculateAndValidateSplits(
    numAmount,
    splitMethod,
    participantShareInputs
  );

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) => {
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
    setSelectedParticipants(new Set(members.map((m) => m.id)));
  };

  const clearAll = () => {
    if (members[0]) {
      setSelectedParticipants(new Set([members[0].id]));
    }
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || numAmount <= 0) return;
    if (!payerValidation.valid || !splitValidation.valid) return;

    // Compile participants with their calculated amounts and input values
    const finalParticipants = splitValidation.shares.map((sh) => ({
      memberId: sh.memberId,
      displayName: sh.displayName,
      value: splitInputs[sh.memberId],
      amount: sh.amount.toFixed(2),
    }));

    const primaryPayer = currentPayers[0] || {
      memberId: singlePayerId,
      displayName: members.find((m) => m.id === singlePayerId)?.displayName || "Payer",
      amount: numAmount.toFixed(2),
    };

    onSave({
      id: expense?.id || `exp-${Date.now()}`,
      description: description.trim(),
      amount: numAmount.toFixed(2),
      currency: "INR",
      payerId: primaryPayer.memberId,
      payerName: isMultiPayer ? `${currentPayers.length} People` : primaryPayer.displayName,
      payers: currentPayers,
      splitMethod,
      spentAt: new Date(spentAt).toISOString(),
      participants: finalParticipants,
      lastEditedByName: editorName,
      lastEditedAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-[--radius-lg] border border-[--color-line] bg-[--color-surface] p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[--color-line]">
          <div>
            <h2 className="text-lg font-semibold text-[--color-text]">
              {isEditMode ? "Edit Expense" : "Add Expense"}
            </h2>
            <p className="text-xs text-[--color-muted] mt-0.5">
              Acting as <strong className="text-[--color-brass]">{editorName}</strong> · Currency: INR (₹)
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-[--color-muted] hover:text-[--color-text] text-sm p-1.5 rounded hover:bg-[--color-surface-raised]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Title & Amount & Date */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[--color-muted] mb-1">
                Title / Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner at Paradise, Groceries, Fuel"
                required
                autoFocus
                className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[--color-muted] mb-1">
                  Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-[--color-faint] font-semibold">₹</span>
                  <input
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // No negative sign allowed
                      if (!val.startsWith("-")) {
                        setAmount(val);
                      }
                    }}
                    placeholder="0.00"
                    inputMode="decimal"
                    required
                    className="w-full pl-7 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm tabular font-mono text-[--color-text] outline-none focus:border-[--color-brass]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--color-muted] mb-1">
                  Date of Expense
                </label>
                <input
                  type="date"
                  value={spentAt}
                  onChange={(e) => setSpentAt(e.target.value)}
                  required
                  className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
                />
              </div>
            </div>
          </div>

          {/* Paid By: One or Many */}
          <div className="border border-[--color-line] bg-[--color-surface-raised] rounded-[--radius] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[--color-text]">Paid By</span>
              <div className="flex rounded border border-[--color-line] p-0.5 bg-[--color-canvas] text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsMultiPayer(false)}
                  className={`px-2.5 py-0.5 rounded ${
                    !isMultiPayer ? "bg-[--color-brass] text-[#0b0e0d] font-semibold" : "text-[--color-muted]"
                  }`}
                >
                  Single Payer
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiPayer(true)}
                  className={`px-2.5 py-0.5 rounded ${
                    isMultiPayer ? "bg-[--color-brass] text-[#0b0e0d] font-semibold" : "text-[--color-muted]"
                  }`}
                >
                  Multiple Payers
                </button>
              </div>
            </div>

            {!isMultiPayer ? (
              <select
                value={singlePayerId}
                onChange={(e) => setSinglePayerId(e.target.value)}
                className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-[--color-muted]">
                  Enter the specific ₹ amount paid by each person. Must total exactly ₹{numAmount.toFixed(2)}.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <span className="truncate flex-1 text-[--color-text]">{m.displayName}</span>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1 text-[11px] text-[--color-faint]">₹</span>
                        <input
                          value={multiPayerAmounts[m.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val.startsWith("-")) {
                              setMultiPayerAmounts((prev) => ({ ...prev, [m.id]: val }));
                            }
                          }}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="w-full pl-5 pr-1 py-1 rounded border border-[--color-line] bg-[--color-canvas] text-xs tabular font-mono text-[--color-text] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi-Payer Validation Alert */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[--color-line]">
                  <span className="text-[--color-faint]">
                    Payers sum: <strong className="text-[--color-text]">₹{payerValidation.sum.toFixed(2)}</strong>
                  </span>
                  {payerValidation.valid ? (
                    <span className="text-[--color-credit] font-medium">✓ Payers match exactly</span>
                  ) : (
                    <span className="text-[--color-debit] font-medium">
                      Remaining: ₹{payerValidation.diff.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Split Type Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[--color-muted]">Split Method</label>
              <span className="text-[11px] text-[--color-faint]">Exact to 2 decimals</span>
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-[--radius] border border-[--color-line] p-1 bg-[--color-canvas] text-xs">
              {(
                [
                  ["EQUAL", "Equal"],
                  ["EXACT", "Exact (₹)"],
                  ["PERCENTAGE", "Percent (%)"],
                  ["SHARES", "Shares"],
                ] as const
              ).map(([method, label]) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSplitMethod(method)}
                  className={`py-1.5 rounded font-medium transition-colors ${
                    splitMethod === method
                      ? "bg-[--color-brass] text-[#0b0e0d]"
                      : "text-[--color-muted] hover:text-[--color-text]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants & Inputs Checklist */}
          <div className="border border-[--color-line] bg-[--color-surface-raised] rounded-[--radius] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[--color-text]">
                Participants ({selectedParticipants.size} of {members.length})
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={selectAll} className="text-[--color-brass] hover:underline">
                  Select All
                </button>
                <span className="text-[--color-line-bright]">|</span>
                <button type="button" onClick={clearAll} className="text-[--color-muted] hover:text-[--color-text]">
                  Clear
                </button>
              </div>
            </div>

            {/* Participants list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => {
                const isSelected = selectedParticipants.has(m.id);
                const calculatedShare = splitValidation.shares.find((s) => s.memberId === m.id);

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded border text-xs transition-colors ${
                      isSelected
                        ? "border-[--color-brass]/50 bg-[--color-canvas]"
                        : "border-[--color-line] bg-transparent opacity-50"
                    }`}
                  >
                    <label
                      onClick={() => toggleParticipant(m.id)}
                      className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="accent-[#e8b44a] rounded"
                      />
                      <span className="truncate font-medium text-[--color-text]">{m.displayName}</span>
                    </label>

                    {/* Dynamic input depending on split type */}
                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        {splitMethod === "EXACT" && (
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1 text-[11px] text-[--color-faint]">₹</span>
                            <input
                              value={splitInputs[m.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val.startsWith("-")) {
                                  setSplitInputs((prev) => ({ ...prev, [m.id]: val }));
                                }
                              }}
                              placeholder="0.00"
                              inputMode="decimal"
                              className="w-full pl-5 pr-1 py-1 rounded border border-[--color-line] bg-[--color-surface] text-xs tabular font-mono text-[--color-text] outline-none"
                            />
                          </div>
                        )}

                        {splitMethod === "PERCENTAGE" && (
                          <div className="relative w-20">
                            <input
                              value={splitInputs[m.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val.startsWith("-")) {
                                  setSplitInputs((prev) => ({ ...prev, [m.id]: val }));
                                }
                              }}
                              placeholder="0"
                              inputMode="decimal"
                              className="w-full pl-2 pr-5 py-1 rounded border border-[--color-line] bg-[--color-surface] text-xs tabular font-mono text-[--color-text] outline-none"
                            />
                            <span className="absolute right-2 top-1 text-[11px] text-[--color-faint]">%</span>
                          </div>
                        )}

                        {splitMethod === "SHARES" && (
                          <div className="flex items-center gap-1">
                            <input
                              value={splitInputs[m.id] || "1"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val.startsWith("-")) {
                                  setSplitInputs((prev) => ({ ...prev, [m.id]: val }));
                                }
                              }}
                              placeholder="1"
                              inputMode="numeric"
                              className="w-14 px-2 py-1 rounded border border-[--color-line] bg-[--color-surface] text-xs tabular font-mono text-center text-[--color-text] outline-none"
                            />
                            <span className="text-[10px] text-[--color-faint]">sh</span>
                          </div>
                        )}

                        {/* Computed ₹ share preview */}
                        {calculatedShare && (
                          <span className="tabular font-mono font-medium text-[--color-credit] min-w-[70px] text-right">
                            ₹ {calculatedShare.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split Validation Alert */}
            <div className="pt-2 border-t border-[--color-line] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
              <div>
                {splitMethod === "EQUAL" && (
                  <span className="text-[--color-faint]">
                    Equal split: 1/{selectedParticipants.size} each (₹
                    {selectedParticipants.size > 0 ? (numAmount / selectedParticipants.size).toFixed(2) : "0.00"}
                    /person)
                  </span>
                )}
                {splitMethod === "PERCENTAGE" && (
                  <span className="text-[--color-faint]">
                    Total Percentage: <strong className="text-[--color-text]">{splitValidation.sum.toFixed(1)}%</strong>
                  </span>
                )}
                {splitMethod === "EXACT" && (
                  <span className="text-[--color-faint]">
                    Sum of exact shares:{" "}
                    <strong className="text-[--color-text]">₹{splitValidation.sum.toFixed(2)}</strong>
                  </span>
                )}
                {splitMethod === "SHARES" && (
                  <span className="text-[--color-faint]">Weighted proportional distribution</span>
                )}
              </div>

              <div>
                {splitValidation.valid ? (
                  <span className="text-[--color-credit] font-medium">✓ Splits balance exactly</span>
                ) : (
                  <span className="text-[--color-debit] font-medium">
                    {splitValidation.error || "Split values must balance"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[--color-line] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[--color-muted] hover:text-[--color-text]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !description.trim() ||
                numAmount <= 0 ||
                !payerValidation.valid ||
                !splitValidation.valid
              }
              className="bg-[--color-brass] px-6 py-2.5 rounded-[--radius] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isEditMode ? "Save Changes" : `Add Expense (₹${numAmount.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
