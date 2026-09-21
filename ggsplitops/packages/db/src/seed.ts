import { and, eq, isNull } from "drizzle-orm";
import { db, pool } from "./client.ts";
import { groupMembers, groups } from "./schema.ts";

export const SEED_MEMBERS = [
  { displayName: "Zubair", role: "OWNER" as const },
  { displayName: "Pranu", role: "MEMBER" as const },
  { displayName: "Abhi Venkata Sai Samsani", role: "MEMBER" as const },
  { displayName: "Pavan (Kasula Pavan Sai)", role: "MEMBER" as const },
  { displayName: "Prasanth", role: "MEMBER" as const },
  { displayName: "Ajay", role: "MEMBER" as const },
  { displayName: "Ajay Kumar", role: "MEMBER" as const },
  { displayName: "Dlip", role: "MEMBER" as const },
  { displayName: "Mouni", role: "MEMBER" as const },
  { displayName: "Sameena Sultana", role: "MEMBER" as const },
  { displayName: "Tharun Reddy", role: "MEMBER" as const },
  { displayName: "Uday", role: "MEMBER" as const },
  { displayName: "Devi", role: "MEMBER" as const },
  { displayName: "Hassi", role: "MEMBER" as const },
  { displayName: "Prakash", role: "MEMBER" as const },
];

export async function seed() {
  console.log("🌱 Seeding default group: SplitOps...");

  // Check if default SplitOps group already exists
  const [existingGroup] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.name, "SplitOps"), isNull(groups.deletedAt)))
    .limit(1);

  let groupId = existingGroup?.id;

  if (!existingGroup) {
    const [created] = await db
      .insert(groups)
      .values({
        name: "SplitOps",
        description: "Default operations and expense splitting group for SplitOps team.",
        type: "PROJECT",
        defaultCurrency: "INR",
        simplifyDebts: true,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create default group 'SplitOps'");
    }
    groupId = created.id;
    console.log(`✓ Created group 'SplitOps' (${groupId})`);
  } else {
    console.log(`ℹ Group 'SplitOps' already exists (${groupId})`);
  }

  // Seed members idempotently
  const existingMembers = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId!), isNull(groupMembers.deletedAt)));

  const existingNames = new Set(existingMembers.map((m) => m.displayName.toLowerCase()));

  for (const member of SEED_MEMBERS) {
    if (!existingNames.has(member.displayName.toLowerCase())) {
      await db.insert(groupMembers).values({
        groupId: groupId!,
        userId: null,
        displayName: member.displayName,
        role: member.role,
        defaultShareWeight: 1,
      });
      console.log(`  + Added member: ${member.displayName} [${member.role}]`);
    } else {
      console.log(`  · Member already present: ${member.displayName}`);
    }
  }

  console.log(`\n🎉 SplitOps seeded successfully with ${SEED_MEMBERS.length} members.`);
}

// Execute if run directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/") ?? "")) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Error during seed:", err);
      pool.end().finally(() => process.exit(1));
    });
}
