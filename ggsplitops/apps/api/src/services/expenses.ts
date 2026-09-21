import { assertPayersCoverTotal, computeSplit, type SplitMethod } from "@splitbills/core";
import {
  activityLog,
  and,
  db,
  eq,
  expensePayers,
  expenses,
  expenseShares,
  expenseVersions,
  isNull,
} from "@splitbills/db";

import { assertMembersInGroup } from "../lib/access.ts";
import { notFound } from "../lib/errors.ts";

export interface CreateExpenseInput {
  groupId: string;
  description: string;
  notes?: string | undefined;
  amount: bigint;
  currency: string;
  splitMethod: SplitMethod;
  categoryId?: string | undefined;
  spentAt?: Date | undefined;
  payers: { memberId: string; amount: bigint }[];
  participants: { memberId: string; value?: bigint | undefined; adjustment?: bigint | undefined }[];
  idempotencyKey?: string | undefined;
  createdById: string;
}

/**
 * Create an expense.
 *
 * The split is computed here, in the API, and the resolved per-member amounts
 * are stored. The client's proposed numbers are never trusted — a client that
 * sends shares totalling less than the expense would otherwise create a group
 * whose balances can never reach zero.
 *
 * Everything lands in one transaction so an expense can never exist without the
 * payer and share rows that give it meaning.
 */
export async function createExpense(input: CreateExpenseInput) {
  if (input.amount === 0n) {
    throw new Error("An expense cannot be for zero");
  }

  // Replaying a request must return the original, not create a second expense.
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(input.groupId, input.idempotencyKey);
    if (existing) return existing;
  }

  const memberIds = [
    ...input.payers.map((p) => p.memberId),
    ...input.participants.map((p) => p.memberId),
  ];
  await assertMembersInGroup(input.groupId, memberIds);

  assertPayersCoverTotal(
    input.payers.map((p) => ({ userId: p.memberId, amount: p.amount })),
    input.amount,
  );

  const shares = computeSplit(
    input.amount,
    input.splitMethod,
    input.participants.map((p) => ({
      userId: p.memberId,
      value: p.value,
      adjustment: p.adjustment,
    })),
  );

  return db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        groupId: input.groupId,
        description: input.description,
        notes: input.notes ?? null,
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        splitMethod: input.splitMethod,
        categoryId: input.categoryId ?? null,
        spentAt: input.spentAt ?? new Date(),
        createdById: input.createdById,
        idempotencyKey: input.idempotencyKey ?? null,
      })
      .returning();

    if (!expense) throw new Error("Failed to insert expense");

    await tx.insert(expensePayers).values(
      input.payers.map((p) => ({
        expenseId: expense.id,
        memberId: p.memberId,
        amount: p.amount,
      })),
    );

    await tx.insert(expenseShares).values(
      shares.map((s, i) => ({
        expenseId: expense.id,
        memberId: s.userId,
        amount: s.amount,
        inputValue: input.participants[i]?.value ?? input.participants[i]?.adjustment ?? null,
      })),
    );

    await tx.insert(activityLog).values({
      groupId: input.groupId,
      actorId: input.createdById,
      type: "EXPENSE_CREATED",
      expenseId: expense.id,
      payload: {
        description: expense.description,
        amount: expense.amount.toString(),
        currency: expense.currency,
      },
    });

    return { ...expense, payers: input.payers, shares };
  });
}

async function findByIdempotencyKey(groupId: string, key: string) {
  const [row] = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        eq(expenses.idempotencyKey, key),
        isNull(expenses.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { ...row, payers: [], shares: [] };
}

/**
 * Soft-delete an expense and snapshot it first.
 *
 * The snapshot is what makes the delete undoable and what keeps the audit trail
 * honest — the row stops counting toward balances immediately, but nothing
 * about it is actually destroyed.
 */
export async function deleteExpense(expenseId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [expense] = await tx
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)))
      .limit(1);
    if (!expense) throw notFound("Expense");

    const payers = await tx.select().from(expensePayers).where(eq(expensePayers.expenseId, expenseId));
    const shares = await tx.select().from(expenseShares).where(eq(expenseShares.expenseId, expenseId));

    await tx.insert(expenseVersions).values({
      expenseId,
      version: expense.version,
      changedById: actorId,
      snapshot: {
        expense: { ...expense, amount: expense.amount.toString() },
        payers: payers.map((p) => ({ ...p, amount: p.amount.toString() })),
        shares: shares.map((s) => ({
          ...s,
          amount: s.amount.toString(),
          inputValue: s.inputValue?.toString() ?? null,
        })),
      },
    });

    await tx
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(expenses.id, expenseId));

    await tx.insert(activityLog).values({
      groupId: expense.groupId,
      actorId,
      type: "EXPENSE_DELETED",
      expenseId,
      payload: { description: expense.description },
    });

    return expense;
  });
}
