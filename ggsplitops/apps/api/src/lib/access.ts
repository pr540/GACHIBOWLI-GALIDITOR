import { and, db, eq, groupMembers, isNull } from "@splitbills/db";

import { forbidden, notFound } from "./errors.ts";

export type GroupRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

const RANK: Record<GroupRole, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export interface Membership {
  memberId: string;
  groupId: string;
  userId: string;
  role: GroupRole;
}

/**
 * The single row-level authorization gate for group data.
 *
 * Every route that touches a group must call this — there is no code path that
 * reads an expense without first proving the caller sits in that group. Keeping
 * it in one function is the whole point: a check duplicated across twenty
 * handlers is a check that will be missing from the twenty-first.
 *
 * Returns 404 rather than 403 when the caller is not a member, so the endpoint
 * cannot be used to probe which group ids exist.
 */
export async function requireMembership(
  groupId: string,
  userId: string,
  minimumRole: GroupRole = "MEMBER",
): Promise<Membership> {
  const [member] = await db
    .select({
      memberId: groupMembers.id,
      groupId: groupMembers.groupId,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        isNull(groupMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!member) throw notFound("Group");

  if (RANK[member.role] < RANK[minimumRole]) {
    throw forbidden(`This action requires the ${minimumRole.toLowerCase()} role`);
  }

  return { ...member, userId };
}

/**
 * Confirm a set of member ids all belong to the group being written to.
 *
 * Without this, a member of group A could name a member id from group B as a
 * payer and quietly move money across a boundary they cannot even read.
 */
export async function assertMembersInGroup(
  groupId: string,
  memberIds: readonly string[],
): Promise<void> {
  const unique = [...new Set(memberIds)];
  if (unique.length === 0) return;

  const rows = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.deletedAt)));

  const valid = new Set(rows.map((r) => r.id));
  const stranger = unique.find((id) => !valid.has(id));
  if (stranger) {
    throw forbidden(`Member ${stranger} is not part of this group`);
  }
}
