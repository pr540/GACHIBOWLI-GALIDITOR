"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { api, getGroups } from "../../lib/api";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });

  const createGroup = useMutation({
    mutationFn: (groupName: string) =>
      api("/groups", { method: "POST", body: JSON.stringify({ name: groupName }) }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-medium tracking-tight">Groups</h1>
        <Link href="/" className="eyebrow hover:text-[--color-muted] transition-colors">
          SplitBills
        </Link>
      </header>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createGroup.mutate(name.trim());
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Goa trip, Flat 4B, Sunday football…"
          className="border-[--color-line] bg-[--color-surface] focus:border-[--color-line-bright] flex-1 rounded-[--radius] border px-3 py-2 text-sm outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={createGroup.isPending || !name.trim()}
          className="bg-[--color-brass] rounded-[--radius] px-4 text-sm font-medium text-[#0b0e0d] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Create group
        </button>
      </form>

      {createGroup.error && (
        <p role="alert" className="text-[--color-debit] mt-3 text-sm">
          {(createGroup.error as Error).message}
        </p>
      )}

      <section className="mt-10">
        {isPending && <p className="text-[--color-faint] text-sm">Loading your groups…</p>}

        {error && (
          <p role="alert" className="text-[--color-debit] text-sm">
            {(error as Error).message} —{" "}
            <Link href="/login" className="underline">
              sign in
            </Link>
          </p>
        )}

        {data?.groups.length === 0 && (
          <div className="border-[--color-line] rounded-[--radius-lg] border border-dashed px-6 py-12 text-center">
            <p className="text-[--color-muted] text-sm">
              No groups yet. Create one above and add the people you split with —
              they don&rsquo;t need an account for you to start.
            </p>
          </div>
        )}

        {data?.groups.map((group) => (
          <Link key={group.id} href={`/groups/${group.id}`} className="block">
            <div className="ledger-row hover:bg-[--color-surface] -mx-3 px-3 transition-colors">
              <span className="text-sm">{group.name}</span>
              <span className="ledger-leader" aria-hidden="true" />
              <span className="eyebrow">{group.defaultCurrency}</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
