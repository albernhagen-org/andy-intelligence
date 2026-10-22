import {
  type AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Postgres schema for ARCHITECTURE §5. Enum values mirror @andy/contracts.
 * Postgres is the system of record for tickets and their history (ADR-0016).
 */

export const stage = pgEnum("stage", [
  "backlog",
  "ready",
  "in_progress",
  "ready_for_review",
  "monitoring",
  "done",
]);
export const ticketType = pgEnum("ticket_type", ["epic", "story", "task", "bug"]);
export const size = pgEnum("size", ["S", "M", "L"]);
export const tierKey = pgEnum("tier_key", ["frontier", "strong", "fast", "cheap"]);
export const providerKey = pgEnum("provider_key", ["claude-sub", "google-sub", "openrouter"]);
export const harnessKey = pgEnum("harness_key", ["claude-code", "jules", "opencode", "direct"]);
export const runStep = pgEnum("run_step", ["refine", "plan", "build", "review", "verify", "scout"]);
export const runStatus = pgEnum("run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export const runOutcome = pgEnum("run_outcome", ["merged_clean", "reworked", "reverted", "failed"]);
export const policyScope = pgEnum("policy_scope", ["global", "project", "epic", "ticket"]);
export const actor = pgEnum("actor", ["andy", "ui", "agent", "scout"]);
export const configChangeStatus = pgEnum("config_change_status", [
  "pending",
  "applied",
  "reverted",
  "rejected",
]);

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const projects = pgTable("projects", {
  id: id(),
  name: text("name").notNull().unique(),
  /** Ticket key prefix, e.g. "AI" → AI-42. */
  key: text("key").notNull().unique(),
  nextTicketNumber: integer("next_ticket_number").notNull().default(1),
  repos: jsonb("repos").$type<string[]>().notNull().default([]),
  gcpDevProjectId: text("gcp_dev_project_id"),
  gcpProdProjectId: text("gcp_prod_project_id"),
  autonomy: text("autonomy").notNull().default("gated"),
  monthlyBudgetUsd: doublePrecision("monthly_budget_usd"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: createdAt(),
});

export const tickets = pgTable(
  "tickets",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    number: integer("number").notNull(),
    type: ticketType("type").notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => tickets.id),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    acceptanceCriteria: jsonb("acceptance_criteria").$type<string[]>().notNull().default([]),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    stage: stage("stage").notNull().default("backlog"),
    /** Fractional-index string for ordering within a stage column. */
    rank: text("rank").notNull(),
    size: size("size"),
    tier: tierKey("tier"),
    overrides: jsonb("overrides").notNull().default({}),
    needsYou: boolean("needs_you").notNull().default(false),
    dorMet: boolean("dor_met").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tickets_project_number_uq").on(t.projectId, t.number),
    index("tickets_project_stage_rank_idx").on(t.projectId, t.stage, t.rank),
    index("tickets_parent_idx").on(t.parentId),
  ],
);

export const ticketDependencies = pgTable(
  "ticket_dependencies",
  {
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    blockedById: text("blocked_by_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.ticketId, t.blockedById] })],
);

/** Append-only history: comments and every change, with who made it (ADR-0016). */
export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: id(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** "andy" | "system" | "agent:<runId>" */
    actor: text("actor").notNull(),
    runId: text("run_id"),
    body: text("body"),
    data: jsonb("data").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("ticket_events_ticket_created_idx").on(t.ticketId, t.createdAt)],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    suggestedAnswer: text("suggested_answer"),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    urgency: text("urgency").notNull().default("normal"),
    status: text("status").notNull().default("open"),
    answer: text("answer"),
    answeredVia: text("answered_via"),
    createdAt: createdAt(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (t) => [index("questions_open_idx").on(t.status, t.projectId)],
);

export const runs = pgTable(
  "runs",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    ticketId: text("ticket_id").references(() => tickets.id),
    step: runStep("step").notNull(),
    harness: harnessKey("harness").notNull(),
    provider: providerKey("provider").notNull(),
    model: text("model").notNull(),
    tier: tierKey("tier"),
    status: runStatus("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    costUsd: doublePrecision("cost_usd"),
    costIsEstimate: boolean("cost_is_estimate").notNull().default(false),
    quotaSnapshot: jsonb("quota_snapshot"),
    links: jsonb("links").notNull().default({}),
    outcome: runOutcome("outcome"),
    wouldAutoMerge: boolean("would_auto_merge"),
    createdAt: createdAt(),
  },
  (t) => [index("runs_project_created_idx").on(t.projectId, t.createdAt)],
);

export const providers = pgTable("providers", {
  key: providerKey("key").primaryKey(),
  billingType: text("billing_type").notNull(),
  credentialSecretRef: text("credential_secret_ref").notNull(),
  quotaSource: text("quota_source"),
  reservePct: doublePrecision("reserve_pct").notNull().default(20),
  warnPct: doublePrecision("warn_pct").notNull().default(70),
  pausePct: doublePrecision("pause_pct").notNull().default(80),
  dailyCapUsd: doublePrecision("daily_cap_usd"),
  monthlyCapUsd: doublePrecision("monthly_cap_usd"),
  enabled: boolean("enabled").notNull().default(true),
});

export const harnesses = pgTable("harnesses", {
  key: harnessKey("key").primaryKey(),
  runtime: text("runtime").notNull(),
  compatibleProviders: jsonb("compatible_providers").$type<string[]>().notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
});

export const models = pgTable("models", {
  id: text("id").primaryKey(),
  provider: providerKey("provider").notNull(),
  priceInPerMTokUsd: doublePrecision("price_in_per_mtok_usd"),
  priceOutPerMTokUsd: doublePrecision("price_out_per_mtok_usd"),
  contextTokens: integer("context_tokens"),
  metadata: jsonb("metadata").notNull().default({}),
  lastScoutedAt: timestamp("last_scouted_at", { withTimezone: true }),
});

export const tiers = pgTable("tiers", {
  key: tierKey("key").primaryKey(),
  routes: jsonb("routes").notNull(),
});

export const policies = pgTable(
  "policies",
  {
    id: id(),
    scope: policyScope("scope").notNull(),
    scopeId: text("scope_id"),
    settings: jsonb("settings").notNull().default({}),
  },
  (t) => [uniqueIndex("policies_scope_uq").on(t.scope, t.scopeId)],
);

export const quotaReadings = pgTable(
  "quota_readings",
  {
    id: id(),
    provider: providerKey("provider").notNull(),
    window: text("window").notNull(),
    usedPct: doublePrecision("used_pct").notNull(),
    resetsAt: timestamp("resets_at", { withTimezone: true }),
    source: text("source").notNull(),
    confidence: text("confidence").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("quota_latest_idx").on(t.provider, t.window, t.takenAt)],
);

export const configChanges = pgTable(
  "config_changes",
  {
    id: id(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    diff: jsonb("diff").notNull(),
    actor: actor("actor").notNull(),
    reason: text("reason").notNull().default(""),
    status: configChangeStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (t) => [index("config_changes_status_idx").on(t.status)],
);

export const releases = pgTable("releases", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  imageDigest: text("image_digest").notNull(),
  ticketIds: jsonb("ticket_ids").$type<string[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: createdAt(),
});
