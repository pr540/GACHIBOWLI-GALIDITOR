import { parseAmount } from "@splitbills/core";
import { zValidator } from "@hono/zod-validator";
import {
  activityLog,
  and,
  db,
  desc,
  eq,
  groupMembers,
  isNull,
  settlements,
} from "@splitbills/db";
import { Hono } from "hono";
import { z } from "zod";

import { assertMembersInGroup, requireMembership } from "../lib/access.ts";
import { conflict } from "../lib/errors.ts";
import { money } from "../lib/json.ts";
import { currentUser, type AppEnv } from "../lib/session.ts";

const recordSettlementSchema = z
  .object({
    fromMemberId: z.string().uuid(),
    toMemberId: z.string().uuid(),
    amount: z.string().regex(/^\d{1,15}(\.\d{1,4})?$/, "Settlement amount must be positive"),
    currency: z.string().length(3).regex(/^[A-Za-z]{3}$/),
    method: z.string().max(40).optional(),
    notes: z.string().max(2000).optional(),
    settledAt: z.coerce.date().optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export const settlementRoutes = new Hono<AppEnv>()

  .get("/:groupId/settlements", async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    await requireMembership(groupId, user.id, "VIEWER");

    const rows = await db
      .select({
        id: settlements.id,
        fromMemberId: settlements.fromMemberId,
        toMemberId: settlements.toMemberId,
        amount: settlements.amount,
        currency: settlements.currency,
        method: settlements.method,
        settledAt: settlements.settledAt,
      })
      .from(settlements)
      .where(and(eq(settlements.groupId, groupId), isNull(settlements.deletedAt)))
      .orderBy(desc(settlements.settledAt))
      .limit(100);

    return c.json({
      settlements: rows.map((s) => ({
        id: s.id,
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        ...money(s.amount, s.currency),
        method: s.method,
        settledAt: s.settledAt,
      })),
    });
  })

  /**
   * Record that a payment happened. SplitBills does not move money — it records
   * that money moved elsewhere (cash, UPI, bank transfer). Keeping real payment
   * rails out of scope is what lets this stay self-hostable without becoming a
   * regulated money transmitter.
   */
  .post("/:groupId/settlements", zValidator("json", recordSettlementSchema), async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    await requireMembership(groupId, user.id, "MEMBER");

    const body = c.req.valid("json");
    if (body.fromMemberId === body.toMemberId) {
      throw conflict("A settlement needs two different members");
    }
    await assertMembersInGroup(groupId, [body.fromMemberId, body.toMemberId]);

    const currency = body.currency.toUpperCase();
    const amount = parseAmount(body.amount, currency);
    if (amount <= 0n) throw conflict("Settlement amount must be greater than zero");

    if (body.idempotencyKey) {
      const [existing] = await db
        .select()
        .from(settlements)
        .where(
          and(
            eq(settlements.groupId, groupId),
            eq(settlements.idempotencyKey, body.idempotencyKey),
            isNull(settlements.deletedAt),
          ),
        )
        .limit(1);
      if (existing) {
        return c.json({ settlement: { ...existing, ...money(existing.amount, currency) } }, 200);
      }
    }

    const settlement = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(settlements)
        .values({
          groupId,
          fromMemberId: body.fromMemberId,
          toMemberId: body.toMemberId,
          amount,
          currency,
          method: body.method ?? null,
          notes: body.notes ?? null,
          settledAt: body.settledAt ?? new Date(),
          recordedById: user.id,
          idempotencyKey: body.idempotencyKey ?? null,
        })
        .returning();
      if (!created) throw new Error("Failed to record settlement");

      const [from] = await tx
        .select({ displayName: groupMembers.displayName })
        .from(groupMembers)
        .where(eq(groupMembers.id, body.fromMemberId))
        .limit(1);

      await tx.insert(activityLog).values({
        groupId,
        actorId: user.id,
        type: "SETTLEMENT_RECORDED",
        payload: {
          from: from?.displayName ?? "Someone",
          amount: amount.toString(),
          currency,
        },
      });

      return created;
    });

    return c.json({ settlement: { ...settlement, ...money(settlement.amount, currency) } }, 201);
  });
