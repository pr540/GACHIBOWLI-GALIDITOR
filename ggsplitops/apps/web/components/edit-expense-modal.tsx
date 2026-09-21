"use client";

import { useState } from "react";
import type { ExportExpense, ExportMember } from "../lib/excel-export";
import { useActiveUser } from "../lib/user-context";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExportExpense | null;
  members: ExportMember[];
  onSave: (updatedExpense: ExportExpense) => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  members,
  onSave,
}: EditExpenseModalProps) {
  const { currentUser } = useActiveUser();

  if (!isOpen || !expense) return null;

  return (
    <EditExpenseForm
      expense={expense}
      members={members}
      editorName={currentUser?.name || "Member"}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditExpenseForm({
  expense,
  members,
  editorName,
  onClose,
  onSave,
}: {
  expense: ExportExpense;
  members: ExportMember[];
  editorName: string;
  onClose: () => void;
  onSave: (updatedExpense: ExportExpense) => void;
}) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount);
  const [payerId, setPayerId] = useState(expense.payerId || members[0]?.id || "");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(expense.participants.map((p) => p.memberId))
  );

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

  const selectedCount = selectedMembers.size;
  const numAmount = parseFloat(amount) || 0;
  const perPersonShare = selectedCount > 0 ? (numAmount / selectedCount).toFixed(2) : "0.00";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || numAmount <= 0) return;

    const payer = members.find((m) => m.id === payerId);
    const participants = members
      .filter((m) => selectedMembers.has(m.id))
      .map((m) => ({ memberId: m.id, displayName: m.displayName }));

    onSave({
      ...expense,
      description: description.trim(),
      amount: numAmount.toFixed(2),
      payerId,
      payerName: payer?.displayName || expense.payerName,
      participants,
      lastEditedByName: editorName,
      lastEditedAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-[--radius-lg] border border-[--color-line] bg-[--color-surface] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-[--color-line]">
          <div>
            <h2 className="text-lg font-semibold text-[--color-text]">Edit Expense</h2>
            <p className="text-xs text-[--color-muted] mt-0.5">
              Editing as <strong className="text-[--color-brass]">{editorName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-[--color-muted] hover:text-[--color-text] text-sm p-1 rounded hover:bg-[--color-surface-raised]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          <div>
            <label className="block text-xs text-[--color-muted] mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[--color-muted] mb-1">Amount (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-[--color-faint] font-semibold">₹</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  required
                  className="w-full pl-7 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm tabular font-mono text-[--color-text] outline-none focus:border-[--color-brass]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[--color-muted] mb-1">Paid By</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-sm text-[--color-text] outline-none focus:border-[--color-brass]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Involved Participants */}
          <div className="border border-[--color-line] bg-[--color-surface-raised] rounded-[--radius] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[--color-text]">
                Involved in Split ({selectedCount} of {members.length})
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-[--color-brass] hover:underline"
              >
                Select All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
              {members.map((m) => {
                const isSelected = selectedMembers.has(m.id);
                return (
                  <label
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer text-xs select-none transition-colors ${
                      isSelected
                        ? "border-[--color-brass] bg-[--color-canvas] text-[--color-text]"
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

            <div className="mt-2.5 pt-2 border-t border-[--color-line] flex justify-between text-xs text-[--color-muted]">
              <span>Fraction: 1/{selectedCount}</span>
              <span className="font-semibold text-[--color-credit]">₹ {perPersonShare} / person</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[--color-muted] hover:text-[--color-text]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[--color-brass] px-5 py-2 rounded-[--radius] text-xs font-semibold text-[#0b0e0d]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
