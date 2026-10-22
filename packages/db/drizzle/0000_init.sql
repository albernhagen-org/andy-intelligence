CREATE TYPE "public"."actor" AS ENUM('andy', 'ui', 'agent', 'scout');--> statement-breakpoint
CREATE TYPE "public"."config_change_status" AS ENUM('pending', 'applied', 'reverted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."harness_key" AS ENUM('claude-code', 'jules', 'opencode', 'direct');--> statement-breakpoint
CREATE TYPE "public"."policy_scope" AS ENUM('global', 'project', 'epic', 'ticket');--> statement-breakpoint
CREATE TYPE "public"."provider_key" AS ENUM('claude-sub', 'google-sub', 'openrouter');--> statement-breakpoint
CREATE TYPE "public"."run_outcome" AS ENUM('merged_clean', 'reworked', 'reverted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."run_step" AS ENUM('refine', 'plan', 'build', 'review', 'verify', 'scout');--> statement-breakpoint
CREATE TYPE "public"."size" AS ENUM('S', 'M', 'L');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('backlog', 'ready', 'in_progress', 'ready_for_review', 'monitoring', 'done');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('epic', 'story', 'task', 'bug');--> statement-breakpoint
CREATE TYPE "public"."tier_key" AS ENUM('frontier', 'strong', 'fast', 'cheap');--> statement-breakpoint
CREATE TABLE "config_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"diff" jsonb NOT NULL,
	"actor" "actor" NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" "config_change_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "harnesses" (
	"key" "harness_key" PRIMARY KEY NOT NULL,
	"runtime" text NOT NULL,
	"compatible_providers" jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "provider_key" NOT NULL,
	"price_in_per_mtok_usd" double precision,
	"price_out_per_mtok_usd" double precision,
	"context_tokens" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_scouted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" "policy_scope" NOT NULL,
	"scope_id" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"repos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"board_ref" text,
	"gcp_dev_project_id" text,
	"gcp_prod_project_id" text,
	"autonomy" text DEFAULT 'gated' NOT NULL,
	"monthly_budget_usd" double precision,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"key" "provider_key" PRIMARY KEY NOT NULL,
	"billing_type" text NOT NULL,
	"credential_secret_ref" text NOT NULL,
	"quota_source" text,
	"reserve_pct" double precision DEFAULT 20 NOT NULL,
	"warn_pct" double precision DEFAULT 70 NOT NULL,
	"pause_pct" double precision DEFAULT 80 NOT NULL,
	"daily_cap_usd" double precision,
	"monthly_cap_usd" double precision,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"ticket_id" text NOT NULL,
	"text" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_answer" text,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"answer" text,
	"answered_via" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quota_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "provider_key" NOT NULL,
	"window" text NOT NULL,
	"used_pct" double precision NOT NULL,
	"resets_at" timestamp with time zone,
	"source" text NOT NULL,
	"confidence" text NOT NULL,
	"taken_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"image_digest" text NOT NULL,
	"ticket_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"ticket_id" text,
	"step" "run_step" NOT NULL,
	"harness" "harness_key" NOT NULL,
	"provider" "provider_key" NOT NULL,
	"model" text NOT NULL,
	"tier" "tier_key",
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" double precision,
	"cost_is_estimate" boolean DEFAULT false NOT NULL,
	"quota_snapshot" jsonb,
	"links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome" "run_outcome",
	"would_auto_merge" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"external_ref" text NOT NULL,
	"type" "ticket_type" NOT NULL,
	"parent_id" text,
	"title" text NOT NULL,
	"stage" "stage" DEFAULT 'backlog' NOT NULL,
	"size" "size",
	"tier" "tier_key",
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"needs_you" boolean DEFAULT false NOT NULL,
	"dor_met" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"key" "tier_key" PRIMARY KEY NOT NULL,
	"routes" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "config_changes_status_idx" ON "config_changes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "policies_scope_uq" ON "policies" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "questions_open_idx" ON "questions" USING btree ("status","project_id");--> statement-breakpoint
CREATE INDEX "quota_latest_idx" ON "quota_readings" USING btree ("provider","window","taken_at");--> statement-breakpoint
CREATE INDEX "runs_project_created_idx" ON "runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_external_ref_uq" ON "tickets" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "tickets_project_stage_idx" ON "tickets" USING btree ("project_id","stage");