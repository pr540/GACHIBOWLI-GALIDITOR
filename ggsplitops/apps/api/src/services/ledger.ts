import {
  expenseEntries,
  netBalances,
  settlementEntries,
  simplifyDebts,
  type Balance,
  type LedgerEntry,
  type Transfer,
} from "@splitbills/core";
import {
  and,
  db,
  eq,
  expensePayers,
  expenses,
  expenseShares,
  groupMembers,
  groups,
  isNull,
  settlements,
} from "@splitbills/db";

import { notFound } from "../lib/errors.ts";

export interface MemberSummary {
  memberId: string;
  displayName: string;
  userId: string | null;
  /** True when nobody has claimed this seat yet. */
  placeholder: boolean;
}

export interface GroupBalances {
  groupId: string;
  simplifyDebts: boolean;
  members: MemberSummary[];
  balances: Balance[];
  /** Payments that would clear every balance. */
  transfers: Transfer[];
}

/**
 * Read every expense and settlement in a group and fold them into balances.
 *
 * This recomputes from scratch on each call rather than maintaining a running
 * total. That is deliberate: a cached balance that disagrees with the rows
 * behind it is the single worst bug this class of app can have, and there is no
 * way to notice it without recomputing anyway. The read is two indexed queries
 * over one group.
 *
 * ponytail: O(expenses in group) per read. Groups run to hundreds of expenses,
 * not millions, so this is milliseconds. When a group gets big enough to feel
 * it, add a `group_balance_snapshots` row written in the same transaction as
 * each expense and fold only the entries newer than the snapshot — same
 * function, smaller input. Do not add a cache before that point.
 */
export async function computeGroupBalances(groupId: string): Promise<GroupBalances> {
  const [group] = await db
    .select({ id: groups.id, simplifyDebts: groups.simplifyDebts })
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);
  if (!group) throw notFound("Group");

  const members = await db
    .select({
      memberId: groupMembers.id,
      displayName: groupMembers.displayName,
      userId: groupMembers.userId,
    })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.deletedAt)));

  const entries = await ledgerEntriesForGroup(groupId);
  const balances = netBalances(entries);

  return {
    groupId,
    simplifyDebts: group.simplifyDebts,
    members: members.map((m) => ({ ...m, placeholder: m.userId === null })),
    balances,
    transfers: simplifyDebts(balances),
  };
}

/**
 * Build the ledger for a group.
 *
 * Soft-deleted expenses are excluded here and nowhere else, so a deleted
 * expense stops affecting balances the instant it is deleted without any
 * compensating entry.
 */
export async function ledgerEntriesForGroup(groupId: string): Promise<LedgerEntry[]> {
  const rows = await db
    .select({
      expenseId: expenses.id,
      currency: expenses.currency,
      payerMemberId: expensePayers.memberId,
      payerAmount: expensePayers.amount,
    })
    .from(expenses)
    .innerJoin(expensePayers, eq(expensePayers.expenseId, expenses.id))
    .where(and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)));

  const shareRows = await db
    .select({
      expenseId: expenses.id,
      currency: expenses.currency,
      memberId: expenseShares.memberId,
      amount: expenseShares.amount,
    })
    .from(expenses)
    .innerJoin(expenseShares, eq(expenseShares.expenseId, expenses.id))
    .where(and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)));

  const entries: LedgerEntry[] = [];

  for (const row of rows) {
    entries.push({
      userId: row.payerMemberId,
      currency: row.currency.trim(),
      amount: row.payerAmount,
    });
  }
  for (const row of shareRows) {
    entries.push({
      userId: row.memberId,
      currency: row.currency.trim(),
      amount: -row.amount,
    });
  }

  const settlementRows = await db
    .select({
      fromMemberId: settlements.fromMemberId,
      toMemberId: settlements.toMemberId,
      amount: settlements.amount,
      currency: settlements.currency,
    })
    .from(settlements)
    .where(and(eq(settlements.groupId, groupId), isNull(settlements.deletedAt)));

  for (const s of settlementRows) {
    entries.push(
      ...settlementEntries(s.currency.trim(), s.fromMemberId, s.toMemberId, s.amount),
    );
  }

  return entries;
}

/** Re-export so callers building previews do not reach into @splitbills/core directly. */
export { expenseEntries, netBalances, simplifyDebts };
