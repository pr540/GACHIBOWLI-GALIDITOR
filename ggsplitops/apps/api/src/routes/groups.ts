import { zValidator } from "@hono/zod-validator";
import {
  activityLog,
  and,
  db,
  desc,
  eq,
  groupMembers,
  groups,
  isNull,
} from "@splitbills/db";
import { Hono } from "hono";
import { z } from "zod";

import { requireMembership } from "../lib/access.ts";
import { notFound } from "../lib/errors.ts";
import { money } from "../lib/json.ts";
import { currentUser, type AppEnv } from "../lib/session.ts";
import { computeGroupBalances } from "../services/ledger.ts";

const currencyCode = z.string().length(3).regex(/^[A-Za-z]{3}$/).transform((s) => s.toUpperCase());

const createGroupSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  type: z
    .enum(["TRIP", "APARTMENT", "COUPLE", "FAMILY", "OFFICE", "PROJECT", "OTHER"])
    .default("OTHER"),
  defaultCurrency: currencyCode.default("INR"),
  simplifyDebts: z.boolean().default(true),
  /**
   * Seats to create alongside the group. A member with no email is a
   * placeholder you can split with before they ever sign up.
   */
  members: z
    .array(z.object({ displayName: z.string().min(1).max(120), email: z.string().email().optional() }))
    .max(100)
    .default([]),
});

export const groupRoutes = new Hono<AppEnv>()

  .get("/", async (c) => {
    const user = currentUser(c);
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        type: groups.type,
        defaultCurrency: groups.defaultCurrency,
        simplifyDebts: groups.simplifyDebts,
        memberId: groupMembers.id,
        role: groupMembers.role,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          isNull(groupMembers.deletedAt),
          isNull(groups.deletedAt),
        ),
      )
      .orderBy(desc(groups.createdAt));

    return c.json({ groups: rows });
  })

  .post("/", zValidator("json", createGroupSchema), async (c) => {
    const user = currentUser(c);
    const body = c.req.valid("json");

    const group = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(groups)
        .values({
          name: body.name,
          description: body.description ?? null,
          type: body.type,
          defaultCurrency: body.defaultCurrency,
          simplifyDebts: body.simplifyDebts,
          createdById: user.id,
        })
        .returning();
      if (!created) throw new Error("Failed to create group");

      // The creator always gets a seat, as owner.
      await tx.insert(groupMembers).values({
        groupId: created.id,
        userId: user.id,
        displayName: user.name,
        role: "OWNER",
      });

      if (body.members.length > 0) {
        await tx.insert(groupMembers).values(
          body.members.map((m) => ({
            groupId: created.id,
            userId: null,
            displayName: m.displayName,
            inviteEmail: m.email ?? null,
            role: "MEMBER" as const,
          })),
        );
      }

      await tx.insert(activityLog).values({
        groupId: created.id,
        actorId: user.id,
        type: "GROUP_CREATED",
        payload: { name: created.name },
      });

      return created;
    });

    return c.json({ group }, 201);
  })

  .get("/:groupId", async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    await requireMembership(groupId, user.id, "VIEWER");

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
      .limit(1);
    if (!group) throw notFound("Group");

    const members = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        displayName: groupMembers.displayName,
        role: groupMembers.role,
        defaultShareWeight: groupMembers.defaultShareWeight,
      })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.deletedAt)));

    return c.json({
      group,
      members: members.map((m) => ({ ...m, placeholder: m.userId === null })),
    });
  })

  .get("/:groupId/balances", async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    await requireMembership(groupId, user.id, "VIEWER");

    const result = await computeGroupBalances(groupId);
    const nameOf = new Map(result.members.map((m) => [m.memberId, m.displayName]));

    return c.json({
      groupId: result.groupId,
      simplifyDebts: result.simplifyDebts,
      members: result.members,
      balances: result.balances.map((b) => ({
        memberId: b.userId,
        displayName: nameOf.get(b.userId) ?? "Unknown",
        ...money(b.amount, b.currency),
      })),
      transfers: result.transfers.map((t) => ({
        fromMemberId: t.from,
        fromName: nameOf.get(t.from) ?? "Unknown",
        toMemberId: t.to,
        toName: nameOf.get(t.to) ?? "Unknown",
        ...money(t.amount, t.currency),
      })),
    });
  })

  .post(
    "/:groupId/members",
    zValidator(
      "json",
      z.object({
        displayName: z.string().min(1).max(120),
        email: z.string().email().optional(),
      }),
    ),
    async (c) => {
      const user = currentUser(c);
      const groupId = c.req.param("groupId");
      await requireMembership(groupId, user.id, "ADMIN");

      const body = c.req.valid("json");
      const [member] = await db
        .insert(groupMembers)
        .values({
          groupId,
          userId: null,
          displayName: body.displayName,
          inviteEmail: body.email ?? null,
          role: "MEMBER",
        })
        .returning();

      return c.json({ member }, 201);
    },
  )

  .delete("/:groupId", async (c) => {
    const user = currentUser(c);
    const groupId = c.req.param("groupId");
    const membership = await requireMembership(groupId, user.id, "OWNER");
    if (membership.role !== "OWNER") throw notFound("Group");

    await db
      .update(groups)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)));

    return c.body(null, 204);
  });
