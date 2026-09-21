"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";

import { Amount } from "../../../components/amount";
import {
  createExpense,
  getBalances,
  getExpenses,
  getGroup,
  recordSettlement,
} from "../../../lib/api";

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const queryClient = useQueryClient();

  const group = useQuery({ queryKey: ["group", groupId], queryFn: () => getGroup(groupId) });
  const expenses = useQuery({ queryKey: ["expenses", groupId], queryFn: () => getExpenses(groupId) });
  const balances = useQuery({ queryKey: ["balances", groupId], queryFn: () => getBalances(groupId) });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
    void queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
  };

  const settle = useMutation({
    mutationFn: (body: unknown) => recordSettlement(groupId, body),
    onSuccess: refresh,
  });

  if (group.error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p role="alert" className="text-[--color-debit] text-sm">
          {(group.error as Error).message}
        </p>
        <Link href="/groups" className="text-[--color-muted] mt-4 inline-block text-sm underline">
          Back to groups
        </Link>
      </main>
    );
  }

  const members = group.data?.members ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/groups" className="eyebrow hover:text-[--color-muted] transition-colors">
        ← Groups
      </Link>
      <h1 className="mt-4 text-2xl font-medium tracking-tight">
        {group.data?.group.name ?? "…"}
      </h1>

      {/* Balances first. "What do I owe" is why anyone opens this screen. */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Balances</h2>
          {balances.data?.simplifyDebts && (
            <span className="text-[--color-faint] text-xs">simplified</span>
          )}
        </div>

        <div className="mt-2">
          {balances.data?.balances.length === 0 && (
            <p className="text-[--color-faint] py-4 text-sm">
              Everyone&rsquo;s square. Add an expense to change that.
            </p>
          )}
          {balances.data?.balances.map((b) => (
            <div key={`${b.memberId}-${b.currency}`} className="ledger-row">
              <span className="text-sm">{b.displayName}</span>
              <span className="ledger-leader" aria-hidden="true" />
              <span className="text-right">
                <Amount amount={b.amount} currency={b.currency} />
                <span className="text-[--color-faint] ml-2 text-xs">
                  {b.amount.startsWith("-") ? "owes" : "is owed"}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {balances.data && balances.data.transfers.length > 0 && (
        <section className="border-[--color-brass-dim] bg-[--color-surface] mt-8 rounded-[--radius-lg] border p-5">
          <h2 className="eyebrow text-[--color-brass]">Settle up</h2>
          <p className="text-[--color-muted] mt-2 text-sm">
            {balances.data.transfers.length === 1
              ? "One payment clears the group."
              : `${balances.data.transfers.length} payments clear the group.`}
          </p>
          <div className="mt-3">
            {balances.data.transfers.map((t, i) => (
              <div key={i} className="ledger-row">
                <span className="text-sm">
                  {t.fromName} <span className="text-[--color-faint]">pays</span> {t.toName}
                </span>
                <span className="ledger-leader" aria-hidden="true" />
                <span className="flex items-center gap-3">
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
                    className="border-[--color-line-bright] hover:border-[--color-brass] hover:text-[--color-brass] rounded-[--radius-sm] border px-2 py-1 text-xs transition-colors disabled:opacity-40"
                  >
                    Record
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <AddExpense groupId={groupId} members={members} onAdded={refresh} />

      <section className="mt-12">
        <h2 className="eyebrow">Expenses</h2>
        <div className="mt-2">
          {expenses.data?.expenses.length === 0 && (
            <p className="text-[--color-faint] py-4 text-sm">Nothing recorded yet.</p>
          )}
          {expenses.data?.expenses.map((e) => (
            <div key={e.id} className="ledger-row">
              <span className="text-sm">{e.description}</span>
              <span className="ledger-leader" aria-hidden="true" />
              <Amount amount={e.amount} currency={e.currency} tone="neutral" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/** Equal split only in this slice; the other four methods use the same endpoint. */
function AddExpense({
  groupId,
  members,
  onAdded,
}: {
  groupId: string;
  members: { id: string; displayName: string }[];
  onAdded: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");

  const add = useMutation({
    mutationFn: () =>
      createExpense(groupId, {
        description,
        amount,
        currency: "USD",
        splitMethod: "EQUAL",
        payers: [{ memberId: payerId || members[0]?.id, amount }],
        participants: members.map((m) => ({ memberId: m.id })),
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      setDescription("");
      setAmount("");
      onAdded();
    },
  });

  if (members.length === 0) return null;

  return (
    <section className="border-[--color-line] mt-10 border-t pt-8">
      <h2 className="eyebrow">Add an expense</h2>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dinner"
          required
          className={fieldClass + " flex-1 min-w-40"}
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="42.00"
          inputMode="decimal"
          required
          className={fieldClass + " tabular w-28"}
        />
        <select
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          className={fieldClass}
          aria-label="Who paid"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} paid
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={add.isPending}
          className="border-[--color-line-bright] hover:border-[--color-brass] hover:text-[--color-brass] rounded-[--radius] border px-4 py-2 text-sm transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {add.error && (
        <p role="alert" className="text-[--color-debit] mt-2 text-sm">
          {(add.error as Error).message}
        </p>
      )}
      <p className="text-[--color-faint] mt-2 text-xs">
        Split equally between all {members.length} members.
      </p>
    </section>
  );
}

const fieldClass =
  "rounded-[--radius] border border-[--color-line] bg-[--color-surface] px-3 py-2 text-sm outline-none transition-colors focus:border-[--color-line-bright]";
