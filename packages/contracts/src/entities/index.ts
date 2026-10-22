import { z } from "zod";
import {
  Actor,
  HarnessKey,
  Id,
  PolicyScope,
  ProviderKey,
  Route,
  RunStep,
  Size,
  Stage,
  TicketType,
  TierKey,
  Timestamp,
  Urgency,
} from "./common";

export * from "./common";

/** ARCHITECTURE §5 — domain model. Vendor concepts must not appear here. */

export const AutonomyLevel = z.enum(["autonomous", "gated", "manual"]);
export type AutonomyLevel = z.infer<typeof AutonomyLevel>;

export const Project = z.object({
  id: Id,
  name: z.string().min(1),
  repos: z.array(z.string().min(1)),
  boardRef: z.string().nullable(),
  gcpDevProjectId: z.string().nullable(),
  gcpProdProjectId: z.string().nullable(),
  autonomy: AutonomyLevel,
  monthlyBudgetUsd: z.number().nonnegative().nullable(),
  enabled: z.boolean(),
});
export type Project = z.infer<typeof Project>;

export const TicketOverrides = z.object({
  assignee: z.union([z.literal("me"), HarnessKey]).optional(),
  tier: TierKey.optional(),
  modelPin: Route.optional(),
  autonomy: AutonomyLevel.optional(),
  targetEnv: z.enum(["dev", "prod"]).optional(),
});
export type TicketOverrides = z.infer<typeof TicketOverrides>;

export const DorStatus = z.enum(["not_met", "met"]);

export const Ticket = z.object({
  id: Id,
  projectId: Id,
  externalRef: z.string().min(1),
  type: TicketType,
  parentId: Id.nullable(),
  title: z.string().min(1),
  stage: Stage,
  size: Size.nullable(),
  tier: TierKey.nullable(),
  overrides: TicketOverrides,
  needsYou: z.boolean(),
  dorStatus: DorStatus,
});
export type Ticket = z.infer<typeof Ticket>;

export const QuestionStatus = z.enum(["open", "answered", "withdrawn"]);
export const AnsweredVia = z.enum(["ui", "board", "mcp"]);

export const Question = z.object({
  id: Id,
  projectId: Id,
  ticketId: Id,
  text: z.string().min(1),
  options: z.array(z.string()),
  suggestedAnswer: z.string().nullable(),
  assumptions: z.array(z.string()),
  urgency: Urgency,
  status: QuestionStatus,
  answer: z.string().nullable(),
  answeredVia: AnsweredVia.nullable(),
  createdAt: Timestamp,
  answeredAt: Timestamp.nullable(),
});
export type Question = z.infer<typeof Question>;

export const RunStatus = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const RunOutcome = z.enum(["merged_clean", "reworked", "reverted", "failed"]);
export type RunOutcome = z.infer<typeof RunOutcome>;

export const RunLinks = z.object({
  executorRun: z.url().optional(),
  pullRequest: z.url().optional(),
});

export const Run = z.object({
  id: Id,
  projectId: Id,
  ticketId: Id.nullable(),
  step: RunStep,
  route: Route,
  tier: TierKey.nullable(),
  status: RunStatus,
  startedAt: Timestamp.nullable(),
  endedAt: Timestamp.nullable(),
  tokensIn: z.number().int().nonnegative().nullable(),
  tokensOut: z.number().int().nonnegative().nullable(),
  costUsd: z.number().nonnegative().nullable(),
  costIsEstimate: z.boolean(),
  quotaSnapshot: z.record(z.string(), z.unknown()).nullable(),
  links: RunLinks,
  outcome: RunOutcome.nullable(),
  wouldAutoMerge: z.boolean().nullable(),
});
export type Run = z.infer<typeof Run>;

export const BillingType = z.enum(["subscription", "pay_per_use"]);

export const Provider = z.object({
  key: ProviderKey,
  billingType: BillingType,
  credentialSecretRef: z.string().min(1),
  quotaSource: z.string().nullable(),
  reservePct: z.number().min(0).max(100),
  warnPct: z.number().min(0).max(100),
  pausePct: z.number().min(0).max(100),
  dailyCapUsd: z.number().nonnegative().nullable(),
  monthlyCapUsd: z.number().nonnegative().nullable(),
  enabled: z.boolean(),
});
export type Provider = z.infer<typeof Provider>;

export const Harness = z.object({
  key: HarnessKey,
  runtime: z.enum(["actions", "api", "in-process"]),
  compatibleProviders: z.array(ProviderKey),
  capabilities: z.array(z.enum(["agentic", "skills", "subagents"])),
});
export type Harness = z.infer<typeof Harness>;

export const Model = z.object({
  id: z.string().min(1),
  provider: ProviderKey,
  priceInPerMTokUsd: z.number().nonnegative().nullable(),
  priceOutPerMTokUsd: z.number().nonnegative().nullable(),
  contextTokens: z.number().int().positive().nullable(),
  lastScoutedAt: Timestamp.nullable(),
});
export type Model = z.infer<typeof Model>;

export const Tier = z.object({
  key: TierKey,
  routes: z.array(Route).min(1),
});
export type Tier = z.infer<typeof Tier>;

export const Policy = z.object({
  id: Id,
  scope: PolicyScope,
  scopeId: Id.nullable(),
  /** Partial settings; resolved by override precedence ticket → epic → project → global. */
  settings: z.record(z.string(), z.unknown()),
});
export type Policy = z.infer<typeof Policy>;

export const QuotaWindow = z.enum(["5h", "weekly", "daily_tasks"]);
export type QuotaWindow = z.infer<typeof QuotaWindow>;

export const QuotaReading = z.object({
  provider: ProviderKey,
  window: QuotaWindow,
  usedPct: z.number().min(0).max(100),
  resetsAt: Timestamp.nullable(),
  source: z.string().min(1),
  takenAt: Timestamp,
  confidence: z.enum(["high", "low"]),
});
export type QuotaReading = z.infer<typeof QuotaReading>;

export const ConfigChangeStatus = z.enum(["pending", "applied", "reverted", "rejected"]);

export const ConfigChange = z.object({
  id: Id,
  entity: z.string().min(1),
  entityId: z.string().min(1),
  diff: z.record(z.string(), z.unknown()),
  actor: Actor,
  reason: z.string(),
  status: ConfigChangeStatus,
  createdAt: Timestamp,
  appliedAt: Timestamp.nullable(),
});
export type ConfigChange = z.infer<typeof ConfigChange>;

export const Release = z.object({
  id: Id,
  projectId: Id,
  imageDigest: z.string().min(1),
  ticketIds: z.array(Id),
  notes: z.string(),
  status: z.enum([
    "pending",
    "deployed_dev",
    "awaiting_approval",
    "deployed_prod",
    "rolled_back",
    "failed",
  ]),
});
export type Release = z.infer<typeof Release>;
