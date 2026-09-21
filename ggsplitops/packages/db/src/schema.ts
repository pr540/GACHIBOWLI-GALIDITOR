/**
 * SplitBills schema.
 *
 * Two decisions shape everything below; both are written up in docs/adr.
 *
 * 1. Every expense belongs to a group. A one-on-one expense with a friend is a
 *    group of two. This removes an entire parallel code path (friend-expenses
 *    vs group-expenses) that would otherwise need its own balance logic.
 *
 * 2. Expenses reference `group_members`, not `users`. A member row may have a
 *    null `user_id` — that is a placeholder for someone who has not signed up
 *    yet ("Dad", "Alex from work"). You can split with them on day one and claim
 *    the row later when they join, without rewriting a single expense.
 */

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Soft delete. Every read path filters on `isNull(deletedAt)`. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/** Minor units (cents/fils/yen). Never a float. See packages/core/money.ts. */
const money = (name: string) => bigint(name, { mode: "bigint" });

/** ISO 4217 alpha code. */
const currency = (name: string) => char(name, { length: 3 });

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const groupTypeEnum = pgEnum("group_type", [
  "TRIP",
  "APARTMENT",
  "COUPLE",
  "FAMILY",
  "OFFICE",
  "PROJECT",
  "OTHER",
]);

export const groupRoleEnum = pgEnum("group_role", ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

export const splitMethodEnum = pgEnum("split_method", [
  "EQUAL",
  "EXACT",
  "PERCENTAGE",
  "SHARES",
  "ADJUSTMENT",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "REVOKED",
  "EXPIRED",
]);

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "PENDING",
  "ACCEPTED",
  "BLOCKED",
]);

export const receiptStatusEnum = pgEnum("receipt_status", [
  "UPLOADED",
  "PROCESSING",
  "PARSED",
  "FAILED",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "EXPENSE_CREATED",
  "EXPENSE_UPDATED",
  "EXPENSE_DELETED",
  "SETTLEMENT_RECORDED",
  "MEMBER_JOINED",
  "MEMBER_LEFT",
  "GROUP_CREATED",
  "GROUP_UPDATED",
  "COMMENT_ADDED",
  "RECEIPT_PARSED",
]);

// ---------------------------------------------------------------------------
// Auth — table and column names are dictated by Better Auth's core adapter.
// ---------------------------------------------------------------------------

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // App-owned columns. Better Auth ignores extra columns.
  defaultCurrency: currency("default_currency").notNull().default("INR"),
  locale: text("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("PENDING"),
    ...timestamps,
  },
  (t) => [
    // One row per pair. Application code always stores the lexicographically
    // smaller id as requester on accept, so the pair cannot be duplicated.
    uniqueIndex("friendships_pair_idx").on(t.requesterId, t.addresseeId),
    index("friendships_addressee_idx").on(t.addresseeId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    type: groupTypeEnum("type").notNull().default("OTHER"),
    /** Display currency for group totals. Expenses keep their own currency. */
    defaultCurrency: currency("default_currency").notNull().default("INR"),
    /** When true, balances are shown as an optimised transfer plan. */
    simplifyDebts: boolean("simplify_debts").notNull().default(true),
    imageUrl: text("image_url"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("groups_created_by_idx").on(t.createdById)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    /**
     * Null for a placeholder member who has not signed up yet. Claiming the
     * seat later is a single UPDATE — no expense rows move.
     */
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Shown when userId is null, or to override the user's name in this group. */
    displayName: text("display_name").notNull(),
    /** Set on placeholder members so an invite can be matched to the seat. */
    inviteEmail: text("invite_email"),
    role: groupRoleEnum("role").notNull().default("MEMBER"),
    /** Default share weight, used to pre-fill new expenses. */
    defaultShareWeight: integer("default_share_weight").notNull().default(1),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("group_members_group_idx").on(t.groupId),
    index("group_members_user_idx").on(t.userId),
    // A real user occupies at most one seat per group. Placeholder rows
    // (user_id null) are exempt, which is exactly what we want.
    uniqueIndex("group_members_unique_user_idx")
      .on(t.groupId, t.userId)
      .where(sql`${t.userId} is not null and ${t.deletedAt} is null`),
  ],
);

export const groupInvitations = pgTable(
  "group_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    /** Random URL-safe token for shareable invite links. */
    token: text("token").notNull().unique(),
    email: text("email"),
    /** Seat this invite claims, when inviting someone into a placeholder. */
    memberId: uuid("member_id").references(() => groupMembers.id, { onDelete: "set null" }),
    invitedById: text("invited_by_id").references(() => users.id, { onDelete: "set null" }),
    status: invitationStatusEnum("status").notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("group_invitations_group_idx").on(t.groupId, t.status)],
);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    icon: text("icon"),
    parentId: uuid("parent_id").references((): any => categories.id, { onDelete: "set null" }),
    /** Null for the built-in set; set for a group's custom categories. */
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("categories_group_idx").on(t.groupId)],
);

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    notes: text("notes"),
    /** Total in minor units of `currency`. Payers and shares must both match it. */
    amount: money("amount").notNull(),
    currency: currency("currency").notNull(),
    /**
     * FX rate to the group's default currency, captured when the expense was
     * created and never recalculated. Re-converting settled history at today's
     * rate would silently change what people already agreed on.
     */
    exchangeRate: numeric("exchange_rate", { precision: 20, scale: 10 }),
    splitMethod: splitMethodEnum("split_method").notNull().default("EQUAL"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    /** When the money was actually spent, which is not when the row was written. */
    spentAt: timestamp("spent_at", { withTimezone: true }).notNull().defaultNow(),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    /** Bumped on every edit; expense_versions holds the prior snapshots. */
    version: integer("version").notNull().default(1),
    /**
     * Client-supplied key that makes create-expense safe to retry. A flaky
     * connection replaying the same request must not produce two dinners.
     */
    idempotencyKey: text("idempotency_key"),
    recurringExpenseId: uuid("recurring_expense_id"),
    receiptId: uuid("receipt_id"),
    ...timestamps,
  },
  (t) => [
    index("expenses_group_spent_idx").on(t.groupId, t.spentAt),
    index("expenses_category_idx").on(t.categoryId),
    uniqueIndex("expenses_idempotency_idx")
      .on(t.groupId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);

/** Who fronted the money. Sum of `amount` must equal the expense total. */
export const expensePayers = pgTable(
  "expense_payers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
  },
  (t) => [
    index("expense_payers_expense_idx").on(t.expenseId),
    uniqueIndex("expense_payers_unique_idx").on(t.expenseId, t.memberId),
  ],
);

/** Who owes what. Sum of `amount` must equal the expense total. */
export const expenseShares = pgTable(
  "expense_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    /** Resolved owed amount in the expense's currency. */
    amount: money("amount").notNull(),
    /**
     * The input that produced `amount`: share count, basis points, or a
     * per-person adjustment. Kept so an expense can be re-opened for editing
     * showing what the user actually typed, not the computed result.
     */
    inputValue: bigint("input_value", { mode: "bigint" }),
  },
  (t) => [
    index("expense_shares_expense_idx").on(t.expenseId),
    index("expense_shares_member_idx").on(t.memberId),
    uniqueIndex("expense_shares_unique_idx").on(t.expenseId, t.memberId),
  ],
);

/** Immutable snapshot of an expense before each edit. Powers undo and history. */
export const expenseVersions = pgTable(
  "expense_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Full expense + payers + shares as they were. */
    snapshot: jsonb("snapshot").notNull(),
    changedById: text("changed_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("expense_versions_unique_idx").on(t.expenseId, t.version)],
);

export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    /** Template used to mint each occurrence: description, amount, split, members. */
    template: jsonb("template").notNull(),
    /** Standard 5-field cron expression, evaluated in `timezone`. */
    cron: text("cron").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("recurring_next_run_idx").on(t.nextRunAt).where(sql`${t.active}`)],
);

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromMemberId: uuid("from_member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    toMemberId: uuid("to_member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
    currency: currency("currency").notNull(),
    /** "cash", "upi", "paypal", "wise", ... Free text; no payment rails here. */
    method: text("method"),
    notes: text("notes"),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
    recordedById: text("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key"),
    ...timestamps,
  },
  (t) => [
    index("settlements_group_idx").on(t.groupId, t.settledAt),
    uniqueIndex("settlements_idempotency_idx")
      .on(t.groupId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);

// ---------------------------------------------------------------------------
// Attachments, receipts, comments
// ---------------------------------------------------------------------------

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "cascade" }),
    /** Object key in R2/S3. Files are served through signed URLs, never public. */
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("attachments_expense_idx").on(t.expenseId)],
);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    attachmentId: uuid("attachment_id").references(() => attachments.id, { onDelete: "set null" }),
    status: receiptStatusEnum("status").notNull().default("UPLOADED"),
    merchantName: text("merchant_name"),
    merchantCategory: text("merchant_category"),
    total: money("total"),
    currency: currency("currency"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    /** Raw structured output from the vision model, kept for debugging and re-parse. */
    rawExtraction: jsonb("raw_extraction"),
    /** Model's own confidence, used to decide whether to ask the user to confirm. */
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    failureReason: text("failure_reason"),
    ...timestamps,
  },
  (t) => [index("receipts_group_idx").on(t.groupId, t.status)],
);

/** One line off a parsed receipt, so "who ordered the burger" is answerable. */
export const receiptItems = pgTable(
  "receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull().default("1"),
    unitPrice: money("unit_price"),
    total: money("total").notNull(),
    /** "item" | "tax" | "tip" | "service" | "discount" — drives proportional allocation. */
    kind: text("kind").notNull().default("item"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("receipt_items_receipt_idx").on(t.receiptId)],
);

/** Which members are splitting a given receipt line. */
export const receiptItemMembers = pgTable(
  "receipt_item_members",
  {
    receiptItemId: uuid("receipt_item_id")
      .notNull()
      .references(() => receiptItems.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.receiptItemId, t.memberId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    parentId: uuid("parent_id").references((): any => comments.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("comments_expense_idx").on(t.expenseId)],
);

// ---------------------------------------------------------------------------
// Activity, notifications, audit
// ---------------------------------------------------------------------------

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: activityTypeEnum("type").notNull(),
    /** Denormalised summary so the feed renders without joining deleted rows. */
    payload: jsonb("payload").notNull().default({}),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_group_created_idx").on(t.groupId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

/** Append-only. Nothing in the app is permitted to UPDATE or DELETE this table. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** JSON diff of before/after. */
    diff: jsonb("diff"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)],
);

// ---------------------------------------------------------------------------
// Financial reference data
// ---------------------------------------------------------------------------

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    baseCurrency: currency("base_currency").notNull(),
    quoteCurrency: currency("quote_currency").notNull(),
    rateDate: timestamp("rate_date", { withTimezone: false, mode: "string" }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),
    source: text("source").notNull().default("frankfurter"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.baseCurrency, t.quoteCurrency, t.rateDate] })],
);

// ---------------------------------------------------------------------------
// AI / search
// ---------------------------------------------------------------------------

/**
 * Embeddings for semantic search, AI chat retrieval, and duplicate detection.
 *
 * Dimension is pinned at 768 (Gemini text-embedding-004). Changing embedding
 * models means a new column and a backfill — the vector type is fixed-width, so
 * this is a migration, not a config change.
 */
export const expenseEmbeddings = pgTable(
  "expense_embeddings",
  {
    expenseId: uuid("expense_id")
      .primaryKey()
      .references(() => expenses.id, { onDelete: "cascade" }),
    /** Text that was embedded, kept so we can tell why a match happened. */
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Operator class is required: pgvector has no default for HNSW.
    index("expense_embeddings_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    /** Expense ids the answer was grounded in, so the UI can cite them. */
    citations: jsonb("citations").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_chat_user_idx").on(t.userId, t.createdAt)],
);

/** Merchant name -> category, learned once and reused to avoid re-billing the LLM. */
export const merchantCache = pgTable(
  "merchant_cache",
  {
    normalizedName: text("normalized_name").primaryKey(),
    displayName: text("display_name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    logoUrl: text("logo_url"),
    hitCount: integer("hit_count").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
}));

export const groupMembersRelations = relations(groupMembers, ({ one, many }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
  payments: many(expensePayers),
  shares: many(expenseShares),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  category: one(categories, { fields: [expenses.categoryId], references: [categories.id] }),
  payers: many(expensePayers),
  shares: many(expenseShares),
  comments: many(comments),
  attachments: many(attachments),
  versions: many(expenseVersions),
}));

export const expensePayersRelations = relations(expensePayers, ({ one }) => ({
  expense: one(expenses, { fields: [expensePayers.expenseId], references: [expenses.id] }),
  member: one(groupMembers, { fields: [expensePayers.memberId], references: [groupMembers.id] }),
}));

export const expenseSharesRelations = relations(expenseShares, ({ one }) => ({
  expense: one(expenses, { fields: [expenseShares.expenseId], references: [expenses.id] }),
  member: one(groupMembers, { fields: [expenseShares.memberId], references: [groupMembers.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, { fields: [settlements.groupId], references: [groups.id] }),
  from: one(groupMembers, { fields: [settlements.fromMemberId], references: [groupMembers.id] }),
  to: one(groupMembers, { fields: [settlements.toMemberId], references: [groupMembers.id] }),
}));
