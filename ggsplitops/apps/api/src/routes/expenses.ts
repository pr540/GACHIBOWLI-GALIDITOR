import { parseAmount } from "@splitbills/core";
import {
  and,
  db,
  desc,
  eq,
  expensePayers,
  expenses,
  expenseShares,
  groupMembers,
  isNull,
  lt,
} from "@splitbills/db";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { requireMembership } from "../lib/access.ts";
import { notFound } from "../lib/errors.ts";
import { money } from "../lib/json.ts";
import { currentUser, type AppEnv } from "../lib/session.ts";
import { createExpense, deleteExpense } from "../services/expenses.ts";

/** Decimal string, e.g. "12.34". Parsed against the expense currency server-side. */
const decimal = z.string().regex(/^-?\d{1,15}(\.\d{1,4})?$/, "Expected a decimal amount");

const createExpenseSchema = z
  .object({
    description: z.string().min(1).max(200),
    notes: z.string().max(4000).optional(),
    amount: decimal,
    currency: z.string().length(3).regex(/^[A-Za-z]{3}$/),
    splitMethod: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES", "ADJUSTMENT"]).default("EQUAL"),
    categoryId: z.string().uuid().optional(),
    spentAt: z.coerce.date().optional(),
    payers: z
      .array(z.object({ memberId: z.string().uuid(), amount: decimal }))
      .min(1, "At least one payer is required"),
    participants: z
      .array(
        z.object({
          memberId: z.string().uuid(),
          /** Shares: count. Percentage: percent as a decimal string. Exact: amount. */
          value: z.string().optional(),
          adjustment: decimal.optional(),
        }),
      )
      .min(1, "At least one participant is required"),
    /** Client-generated UUID; makes a retried create return the original expense. */
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export const expenseRoutes = new Hono<AppEnv>()

  .get("/:groupId/expenses", async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    await requireMembership(groupId, user.id, "VIEWER");

    // Cursor pagination on spentAt: offset pagination drifts when rows are
    // inserted mid-scroll, which is exactly what an active group does.
    const cursor = c.req.query("cursor");
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);

    const rows = await db
      .select({
        id: expenses.id,
        description: expenses.description,
        amount: expenses.amount,
        currency: expenses.currency,
        splitMethod: expenses.splitMethod,
        spentAt: expenses.spentAt,
        categoryId: expenses.categoryId,
        version: expenses.version,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, groupId),
          isNull(expenses.deletedAt),
          cursor ? lt(expenses.spentAt, new Date(cursor)) : undefined,
        ),
      )
      .orderBy(desc(expenses.spentAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return c.json({
      expenses: page.map((e) => ({
        id: e.id,
        description: e.description,
        ...money(e.amount, e.currency),
        splitMethod: e.splitMethod,
        spentAt: e.spentAt,
        categoryId: e.categoryId,
        version: e.version,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.spentAt.toISOString() : null,
    });
  })

  .post("/:groupId/expenses", zValidator("json", createExpenseSchema), async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    await requireMembership(groupId, user.id, "MEMBER");

    const body = c.req.valid("json");
    const currency = body.currency.toUpperCase();
    const amount = parseAmount(body.amount, currency);

    const expense = await createExpense({
      groupId,
      description: body.description,
      notes: body.notes,
      amount,
      currency,
      splitMethod: body.splitMethod,
      categoryId: body.categoryId,
      spentAt: body.spentAt,
      payers: body.payers.map((p) => ({
        memberId: p.memberId,
        amount: parseAmount(p.amount, currency),
      })),
      participants: body.participants.map((p) => ({
        memberId: p.memberId,
        value: p.value === undefined ? undefined : parseSplitValue(p.value, body.splitMethod, currency),
        adjustment: p.adjustment === undefined ? undefined : parseAmount(p.adjustment, currency),
      })),
      idempotencyKey: body.idempotencyKey,
      createdById: user.id,
    });

    return c.json(
      {
        expense: {
          id: expense.id,
          description: expense.description,
          ...money(expense.amount, expense.currency),
          splitMethod: expense.splitMethod,
          spentAt: expense.spentAt,
        },
        shares: expense.shares.map((s) => ({
          memberId: s.userId,
          ...money(s.amount, currency),
        })),
      },
      201,
    );
  })

  .get("/:groupId/expenses/:expenseId", async (c) => {
    const user = currentUser(c);
    const { groupId, expenseId } = c.req.param();
    await requireMembership(groupId, user.id, "VIEWER");

    const [expense] = await db
      .select()
      .from(expenses)
      .where(
        and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId), isNull(expenses.deletedAt)),
      )
      .limit(1);
    if (!expense) throw notFound("Expense");

    const payers = await db
      .select({
        memberId: expensePayers.memberId,
        displayName: groupMembers.displayName,
        amount: expensePayers.amount,
      })
      .from(expensePayers)
      .innerJoin(groupMembers, eq(groupMembers.id, expensePayers.memberId))
      .where(eq(expensePayers.expenseId, expenseId));

    const shares = await db
      .select({
        memberId: expenseShares.memberId,
        displayName: groupMembers.displayName,
        amount: expenseShares.amount,
        inputValue: expenseShares.inputValue,
      })
      .from(expenseShares)
      .innerJoin(groupMembers, eq(groupMembers.id, expenseShares.memberId))
      .where(eq(expenseShares.expenseId, expenseId));

    return c.json({
      expense: {
        ...expense,
        ...money(expense.amount, expense.currency),
      },
      payers: payers.map((p) => ({
        memberId: p.memberId,
        displayName: p.displayName,
        ...money(p.amount, expense.currency),
      })),
      shares: shares.map((s) => ({
        memberId: s.memberId,
        displayName: s.displayName,
        ...money(s.amount, expense.currency),
        inputValue: s.inputValue?.toString() ?? null,
      })),
    });
  })

  .delete("/:groupId/expenses/:expenseId", async (c) => {
    const user = currentUser(c);
    const { groupId, expenseId } = c.req.param();
    await requireMembership(groupId, user.id, "MEMBER");

    await deleteExpense(expenseId, user.id);
    return c.json({ deleted: true });
  });

/**
 * Split inputs are not all money, so they cannot all be parsed the same way.
 * Shares are plain counts, percentages become basis points, and only EXACT
 * amounts are actual currency.
 */
function parseSplitValue(value: string, method: string, currency: string): bigint {
  switch (method) {
    case "SHARES":
      if (!/^\d+$/.test(value)) throw new Error(`Share count must be a whole number: ${value}`);
      return BigInt(value);
    case "PERCENTAGE": {
      // "33.33" -> 3333 basis points. Two decimal places, same as the UI allows.
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) {
        throw new Error(`Percentage must be between 0 and 100 with up to 2 decimals: ${value}`);
      }
      const [whole = "0", fraction = ""] = value.split(".");
      return BigInt(whole + fraction.padEnd(2, "0"));
    }
    case "EXACT":
      return parseAmount(value, currency);
    default:
      return parseAmount(value, currency);
  }
}
