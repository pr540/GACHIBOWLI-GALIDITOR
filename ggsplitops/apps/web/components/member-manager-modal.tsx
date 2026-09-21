"use client";

import { useState } from "react";
import type { ExportMember } from "../lib/excel-export";

export interface ManagedMember extends ExportMember {
  tag?: string;
  isGuest?: boolean;
}

interface MemberManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: ManagedMember[];
  onAddMember: (newMember: ManagedMember) => void;
  onUpdateMember: (id: string, updatedName: string, updatedTag?: string) => void;
  onRemoveMember: (id: string) => void;
}

export function MemberManagerModal({
  isOpen,
  onClose,
  members,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}: MemberManagerModalProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [isGuest, setIsGuest] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTag, setEditTag] = useState("");

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddMember({
      id: `mem-${Date.now()}`,
      displayName: name.trim(),
      role: isGuest ? "GUEST" : "MEMBER",
      tag: tag.trim() || undefined,
      isGuest,
    });

    setName("");
    setTag("");
    setIsGuest(false);
  };

  const startEdit = (m: ManagedMember) => {
    setEditingId(m.id);
    setEditName(m.displayName);
    setEditTag(m.tag || "");
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateMember(id, editName.trim(), editTag.trim() || undefined);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-[--radius-lg] border border-[--color-line] bg-[--color-surface] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[--color-line]">
          <div>
            <h2 className="text-lg font-semibold text-[--color-text]">Member Manager</h2>
            <p className="text-xs text-[--color-muted] mt-0.5">
              Manage team members, tags, and guest participants ({members.length} total)
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

        {/* Add Member / Guest Form */}
        <form onSubmit={handleAdd} className="py-4 border-b border-[--color-line] space-y-3">
          <span className="eyebrow">Add Member or Guest</span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (e.g. Rahul Sharma)"
                required
                className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-xs text-[--color-text] outline-none focus:border-[--color-brass]"
              />
            </div>
            <div className="sm:col-span-6">
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Optional tag (e.g. Dev, Roomie)"
                className="w-full rounded-[--radius] border border-[--color-line] bg-[--color-canvas] px-3 py-2 text-xs text-[--color-text] outline-none focus:border-[--color-brass]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-[--color-muted] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isGuest}
                onChange={(e) => setIsGuest(e.target.checked)}
                className="accent-[#e8b44a] rounded"
              />
              <span>Add as Guest member</span>
            </label>

            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-[--color-brass] px-4 py-1.5 rounded-[--radius] text-xs font-semibold text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              + Add to Group
            </button>
          </div>
        </form>

        {/* Members Roster */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {members.map((m) => {
            const isOwner = m.role === "OWNER" || m.displayName.toLowerCase() === "zubair";
            const isEditing = editingId === m.id;

            if (isEditing) {
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-[--radius] border border-[--color-brass] bg-[--color-canvas] space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Display Name"
                      className="rounded border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-xs text-[--color-text] outline-none"
                    />
                    <input
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      placeholder="Free-text Tag"
                      className="rounded border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-xs text-[--color-text] outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => saveEdit(m.id)}
                      className="bg-[--color-brass] px-3 py-1 rounded text-xs font-semibold text-[#0b0e0d]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-[--color-muted] hover:text-[--color-text] px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-[--radius] border border-[--color-line] bg-[--color-canvas] text-xs hover:border-[--color-line-bright]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-[--color-text] truncate">
                    {m.displayName}
                  </span>
                  {isOwner && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[--color-brass-dim] text-[--color-brass]">
                      Owner
                    </span>
                  )}
                  {m.isGuest && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[--color-surface-raised] text-[--color-faint]">
                      Guest
                    </span>
                  )}
                  {m.tag && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--color-surface-raised] text-[--color-muted] border border-[--color-line]">
                      #{m.tag}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="text-[--color-muted] hover:text-[--color-brass] transition-colors"
                    title="Rename or update tag"
                  >
                    Rename
                  </button>
                  <span className="text-[--color-line-bright]">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove ${m.displayName} from this group?`)) {
                        onRemoveMember(m.id);
                      }
                    }}
                    className="text-[--color-debit] hover:opacity-80 transition-opacity"
                    title="Remove member"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[--color-line] flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="bg-[--color-surface-raised] border border-[--color-line] hover:border-[--color-line-bright] text-[--color-text] px-4 py-2 rounded-[--radius] text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
