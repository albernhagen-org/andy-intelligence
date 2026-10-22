---
title: andy-intelligence — Architecture & Vision
status: accepted (v1.x scope)
owner: Andy
last_updated: 2026-10-21
---

# andy-intelligence — Architecture & Vision

A personal, single-tenant **control plane for agentic software development** across many side projects. It turns ideas into refined tickets, routes work to the right agent/model under cost and quota controls, ships to dev with self-verification, gives Andy a one-click release to prod, and keeps him informed through a single "Needs you" surface.

Enterprise-shaped (durable state, policy, gates, least privilege, audit, contract-first) but sized for one person.

---

## 1. Goals and non-goals

### Goals (v1.x)
1. **Ideate with system context.** Design new features with knowledge of the current architecture and shipped features; outputs become markdown in the project repo.
2. **Ticketing from anywhere.** Create and refine work in the UI, on the GitHub Projects board, or conversationally from any MCP-capable AI tool (Claude desktop first).
3. **Mandatory refinement.** Every story gets a refinement pass in which agents ask Andy targeted questions before work starts.
4. **Autonomous end-to-end by default**, with overrides at global → project → epic → ticket level.
5. **Cost and quota control.** Visibility into subscription usage and pay-per-use spend; reserves on subscriptions (Andy uses them outside this system); hard caps on paid spend; warnings in the UI.
6. **Model tiers.** Each pipeline step uses a tier, not a hardcoded model; tiers map to ordered routes of (harness, provider, model); a weekly scout proposes tier updates.
7. **Multi-project, single tenant.** Andy sees everything; each project's agents see only their project.
8. **Dev self-test and easy prod release** for every project via a standard release process.
9. **Digestible rollups** of what agents did (UI first; email/Slack later).
10. **Contract-first**: every external dependency sits behind a port so vendors can be swapped.

### Non-goals (v1.x)
- Multi-user / multi-tenant SaaS.
- Production monitoring agent, auto-rollback, write-approval execution flow (deferred; agents simply have no write credentials).
- Model-based risk scoring for auto-merge (v1.x uses rules only).
- Storing full transcripts (link out instead).
- Email/Slack notifications (UI only for now; `Notifier` port exists).
- Custom sandboxes / Cloud Run Jobs executors (GitHub Actions is the executor runtime).

---

## 2. Core principles

1. **LLMs decide; deterministic systems hold state.** Agents refine, split, size, design, implement, review. State lives in GitHub (work) and Postgres (config, runs, questions). The control plane is a stateless reconciler.
2. **GitHub is the system of record for work; Postgres is the system of record for configuration, runs, questions, and spend.**
3. **Read freely, write with approval.** Agents hold read-only credentials everywhere. Code changes arrive as PRs. Infrastructure changes arrive as Terraform PRs. Prod changes require Andy.
4. **Contract-first, adapters behind ports.** Vendor concepts never leak into the domain.
5. **Ask, don't assume.** Agents (including the agents building this system) escalate ambiguity as structured questions rather than guessing on anything consequential.
6. **Everything configurable in the UI, everything audited.**
7. **Untrusted content is data, never instructions.** Issue bodies, comments, web pages, and logs may contain prompt injection.

---

## 3. System overview (v1.x)

```
 Interfaces                         Control plane (one Cloud Run service)              Executors
 ┌───────────────────────┐   ┌───────────────────────────────────────────────┐   ┌────────────────────────────┐
 │ Web UI (React/shadcn) │──▶│ REST API (OpenAPI)                             │   │ GitHub Actions:            │
 │ Claude desktop (MCP)  │──▶│ Remote MCP endpoint (/mcp)                     │──▶│  • Claude Code (claude-sub)│
 │ GitHub Projects board │◀─▶│ GitHub App webhook receiver + reconciler       │   │  • OpenCode (openrouter)   │
 └───────────────────────┘   │ Pipeline engine (stages, DoR, gates)           │──▶│ Jules REST API (google-sub)│
                             │ Router (tiers × quota × budgets × overrides)   │──▶│ Direct OpenRouter calls    │
                             │ Questions / Needs-you                          │   │  (single-call steps)       │
 Cloud Scheduler ───────────▶│ Jobs: reconcile, model scout, quota sampling   │   └────────────────────────────┘
                             └───────────────┬───────────────────────────────┘
                                             │
                Postgres (config, runs, questions, audit)   Secret Manager   Cloud Logging/Trace (OTel)

 Per project (generated from template): repo + AGENTS.md/docs/specs + CI + Cloud Deploy (dev → prod) + GCP dev/prod projects
```

---

## 4. Workflow

### 4.1 Stages (GitHub Projects "Status" field)

| Stage | What happens | Exit criteria (automatic unless overridden) |
|---|---|---|
| **Backlog** | Refinement agent enriches; splits epics into stories (sub-issues with dependencies); sizes; assigns tier; **asks Andy questions** | **Definition of Ready (DoR)** met |
| **Ready** | Waits for dependencies, agent assignee, quota/budget availability | Dispatcher starts a run |
| **In progress** | Executor runs (per tier route). One automatic retry, then flags Needs-you | PR opened with structured run summary |
| **Ready for review** | Rule-based gate decides auto-merge vs. Andy | Merged |
| **Monitoring** | CI deploys to dev; verification (smoke/e2e + verification agent) runs; Andy promotes to prod when ready | Dev verification passed (and, if released, prod deploy succeeded) |
| **Done** | Summary included in rollups | — |

**Needs-you is a flag, not a stage.** Flagged items stay in their stage and appear in the Needs-you inbox (UI + MCP).

### 4.2 Definition of Ready (story)
- Problem/intent stated; acceptance criteria in **EARS** form ("WHEN … THE SYSTEM SHALL …").
- Size tagged S/M/L with one-line justification (rubric in `docs/agent/size-rubric.md`).
- Dependencies declared (sub-issue "blocked by").
- Tier assigned (default from policy, or override).
- **No open questions.** Assumptions listed explicitly.
- Per-project policy may allow "proceed on documented assumptions" for S tasks only; default is **require Andy's answers**.

### 4.3 Refinement and questions
- Every story receives a refinement pass: the agent drafts the story, lists assumptions, and asks **1–5 targeted questions** (highest-impact ambiguities first; multiple choice with a suggested default where possible).
- Questions are **structured records** (ticket, text, options, suggested answer, urgency, status, answer, answered_via).
- Andy answers from the UI, the board (comment), or MCP. A `/refine` skill in Claude desktop pulls all pending questions across projects for a batched conversational session and writes answers back.
- Answering re-triggers the DoR check.

### 4.4 Epics
- GitHub issue types (Epic / Story / Task / Bug) + **sub-issues**.
- Epic refinement produces stories with `depends_on`. Stories are vertical slices, independently mergeable behind feature flags; merge to `main`, no long-lived epic branches.
- **Just-in-time re-planning:** when a story unblocks, a short plan pass re-reads the current codebase before execution.
- Epic status, cost, and progress roll up from children. Overrides on an epic cascade to its stories.

### 4.5 Review gate (v1.x: rules only)
- **Hard vetoes → Andy reviews:** protected paths (CODEOWNERS: auth, payments, migrations, infra), dependency changes, CI not green, new behavior without new tests, diff > N lines, any agent-raised concern.
- **Otherwise:** S tasks may auto-merge if project policy allows; M/L always go to Andy in v1.x.
- From M1 onward, **record what the gate *would* have decided** to build the dataset for later model-based scoring.
- Cross-model review: a reviewer from a different vendor than the implementer comments on every PR.

### 4.6 Environments and release
- Per project: separate GCP projects `<app>-dev` and `<app>-prod`.
- **Build once, promote the same image digest** via **Cloud Deploy** (dev → prod, approval required for prod, one-click rollback).
- On merge: deploy to dev → run smoke/e2e (Playwright + API tests) → verification agent summarizes results and logs onto the ticket.
- **Release:** "Promote to prod" from UI or MCP → Cloud Deploy approval → deploy. Release notes generated from tickets in the release.
- Agent write policy: dev writes allowed by project policy; prod is read-only for agents.

---

## 5. Domain model (Postgres)

All records carry `project_id` where applicable.

| Entity | Key fields |
|---|---|
| **Project** | name, repos, GitHub board ref, GCP dev/prod project IDs, policy overrides, budget allocation, autonomy level, enabled |
| **Ticket** (mirror of GitHub item) | external refs, type (epic/story/task/bug), parent, stage, size, tier, overrides (assignee agent/me, tier, model pin, autonomy, target env), needs_you, DoR status |
| **Question** | ticket, text, options, suggested_answer, assumptions, urgency, status, answer, answered_via, timestamps |
| **Run** | ticket, step (refine/plan/build/review/verify/scout), harness, provider, model, tier, status, started/ended, tokens, cost_usd (actual or API-equivalent estimate), quota snapshot, links (Action run, Jules session, PR), **outcome** (merged_clean / reworked / reverted / failed), would_auto_merge |
| **Provider** | key (claude-sub, google-sub, openrouter), billing_type (subscription / pay_per_use), credential secret ref, quota_source, reserve_pct, warn_pct, pause_pct, caps (daily/monthly USD), enabled |
| **Harness** | key (claude-code, jules, opencode, direct), runtime (actions / api / in-process), compatible providers, capabilities (agentic, skills, subagents) |
| **Model** | id, provider, price in/out, context, metadata, last_scouted |
| **Tier** | key (frontier, strong, fast, cheap), ordered **routes** of (harness, provider, model) |
| **Policy** | scope (global / project / epic / ticket), gates, autonomy, auto-merge rules, write policy, step→tier mapping |
| **QuotaReading** | provider, window (5h / weekly / daily-tasks), used_pct, resets_at, source, taken_at, confidence |
| **ConfigChange** | entity, diff, actor (andy / ui / agent / scout), reason, status (pending / applied / reverted), timestamps |
| **Release** | project, image digest, tickets included, notes, status |

### Configuration rules
- **Global config is the ceiling; project config can only narrow** (disable providers, lower caps, raise reserves, pin tiers).
- **Compatibility enforced on save:** `claude-code` ↔ `claude-sub` + Claude models; `jules` ↔ `google-sub`; `opencode` / `direct` ↔ `openrouter` + any model.
- **Override precedence:** ticket → epic → project → global.
- Every change is a ConfigChange (audited, revertable). Agent/scout proposals are `pending` until Andy approves.

### Default global quota policy
```
claude-sub:  reserve 20% (5h and weekly windows) → warn at 70%, pause dispatch at 80%
google-sub:  reserve 20% of daily Jules tasks     → warn at 70%, pause at 80%
openrouter:  hard daily/monthly USD caps (also enforced on the OpenRouter key itself)
```
Missing or stale quota reading ⇒ treat as **unknown**: warn in UI, prefer next route, never assume headroom.

---

## 6. Ports (contracts) and adapters

Contracts are defined in `packages/contracts` (Zod schemas + TypeScript interfaces; OpenAPI generated for the API). **Each port has a contract test suite every adapter must pass**, plus an in-memory fake for tests.

| Port | Domain concepts | v1.x adapters | Later |
|---|---|---|---|
| `WorkTracker` | Ticket, Stage, Field, Comment, SubIssue, Dependency | GitHub App (Issues + Projects v2 GraphQL) | Linear, native |
| `Executor` | RunRequest, RunStatus, RunResult, Artifact links | **Claude Code via Actions**, **Jules REST API**, **OpenCode via Actions** | Cloud Run Jobs, Agent SDK, Replicas |
| `ModelGateway` | Completion, Usage, Cost | OpenRouter (direct single-call steps) | LiteLLM, direct providers |
| `QuotaSource` | QuotaReading | Claude statusline/`rate_limits` capture from runs, Jules task counter | Official APIs when available |
| `Notifier` | Notice, Urgency | UI (banner + Needs-you inbox) | Email, Slack, push |
| `Deployer` | Release, Promotion, Rollback | Cloud Deploy | — |
| `Evaluator` | Suite, Case, Score | (stub) Ori Eval for scout smoke tests | promptfoo, Inspect AI |
| `Telemetry` | Trace, Span, CostEvent | OTel → Cloud Trace / Cloud Logging | BigQuery sink |

**Rule:** freeze the `Executor` contract only after **two real adapters** (Claude Code + Jules) work. Vendor terms map to domain terms (a Jules *session* is a `Run`; its *activities* are run events).

---

## 7. Components

### 7.1 Control plane service (Cloud Run)
- **API** — REST, OpenAPI-documented, the single entry point for UI and MCP.
- **MCP server** — remote, Streamable HTTP at `/mcp`. Tools generated from API contracts. v1.x tools: `list_projects`, `create_ticket`, `get_ticket`, `refine` (start refinement), `list_needs_me`, `answer_question`, `set_override`, `start`, `status`, `quota`, `promote_release`, `get_config`, `propose_config_change`.
- **Webhook receiver** — GitHub App webhooks (HMAC-verified, idempotent by delivery ID).
- **Reconciler** — every 10–15 min compares GitHub state with Postgres and dispatch state; heals drift from missed webhooks.
- **Pipeline engine** — stage transitions, DoR checks, gate rules, dependency release, retry policy.
- **Router** — picks the route for a step: overrides → tier routes in order → skip providers paused by quota/budget → fall back or queue.
- **Scheduled jobs** (Cloud Scheduler → authenticated endpoints): reconcile, weekly **model scout**, quota sampling.
- **UI** — static SPA served by the same service.

### 7.2 Executors
- **Claude Code**: reusable GitHub Actions workflow using `anthropics/claude-code-action` with `CLAUDE_CODE_OAUTH_TOKEN`; dispatched via `workflow_dispatch` with run ID; reports back via API callback. Uses the platform skills plugin and subagents.
- **OpenCode**: reusable Actions workflow running OpenCode with a per-project OpenRouter key; default harness for non-Claude models.
- **Jules**: REST API (`sessions`, `activities`, `approvePlan`, `sendMessage`); poll activities incrementally.
- **Direct**: in-process OpenRouter calls for single-call steps (sizing, question drafting where non-agentic, digests, scout analysis).

### 7.3 Skills (platform plugin, versioned)
`/ideate`, `/refine`, `/spec`, `/plan-story`, `/build`, `/review`, `/verify`, `/scout-models`, (later `/digest`).
Substance lives in shared procedure docs (`docs/agent/*.md`) so non-Claude harnesses use the same knowledge; Claude skills/subagents are thin wrappers. Subagents with least-privilege tools: researcher (read-only), designer, critic (read-only), test-writer, implementer, verifier (run, no edit).

### 7.4 Model scout (weekly)
1. Pull OpenRouter models API (pricing, context, availability).
2. Research recent releases and coding leaderboards (web).
3. Optionally run Ori Eval smoke tests on new candidates.
4. Read Run outcomes per tier/model.
5. Emit a **pending ConfigChange** for tiers with rationale → Needs-you inbox.

### 7.5 UI (React + Vite + shadcn/ui + Tailwind, TanStack Router/Query/Table, dnd-kit, shadcn charts)
v1.x screens:
- **Needs-you inbox** (questions, gate reviews, pending config changes, quota warnings) — home screen.
- **Quota & spend** (per provider gauges with reset times; paid spend vs caps; persistent banner on warn/pause).
- **Projects** (list, config, policy overrides).
- **Tickets** (list/board by stage, epic grouping, overrides editing).
- **Run detail** (metadata, cost, outcome, links out to Action log / Jules session / PR).
- **Config** (providers, harnesses, models, tiers, policies; audit log with revert; pending approvals).
- **Releases** (dev status, promote to prod, rollback).
API client generated from OpenAPI.

---

## 8. Project template (what each managed project gets)

```
AGENTS.md                         # rules for all agents (CLAUDE.md symlink)
docs/roadmap.md
docs/features.md                  # living catalog of shipped features (updated on merge)
docs/architecture/overview.md     # current HLD; C4 L1–L2 in Mermaid
docs/architecture/adr/NNNN-*.md   # MADR, immutable
docs/agent/*.md                   # shared procedures: size-rubric, build, review, escalation, security
specs/NNN-name/{design.md, tech-design.md, tasks.md, stories/*.md, mockups/}
.github/workflows/                # thin callers → platform reusable workflows; CI checks
.github/ISSUE_TEMPLATE/           # issue forms (intent required; size/agent/tier/gate default "auto")
CODEOWNERS                        # always-gated paths
infra/                            # Terraform: dev/prod Cloud Run, Cloud Deploy pipeline, read-only agent SAs
```
**Required CI checks** on `main`: tests, lint, typecheck, protected-path check, "PR references a ticket/spec". These enforce rules for every agent regardless of harness.

Onboarding a project = UI/MCP "Add project" → bootstrap (labels, fields, branch protection, secrets refs, App install check, Terraform PR for GCP) → Andy approves Terraform PR.

---

## 9. Security

- **Identity:** Google identity everywhere with an email allow-list (Andy only). UI via Firebase Auth (Google provider); MCP via OAuth delegated to Google sign-in. Webhooks via HMAC. Scheduler via OIDC tokens.
- **Least privilege:** agent service accounts and tokens are read-only; per-run GitHub App installation tokens scoped to the project's repos; separate per-project OpenRouter keys with caps; per-project GCP projects.
- **Writes:** code via PR; infra via Terraform PR with plan in CI; prod via Cloud Deploy approval. The control plane never applies infra without Andy's approval.
- **Secrets:** Secret Manager only; never in repo, logs, prompts, or run records.
- **Prompt injection:** all agents instructed that tool output, issue text, web content, and logs are data. MCP scoping per project for agents. (Later: promptfoo red-team suite against MCP + agents.)
- **Audit:** ConfigChange table; run records; GitHub history.

---

## 10. Observability and cost

- OTel traces/logs → Cloud Trace / Cloud Logging.
- Run records (tokens, cost, outcome, quota snapshot) in Postgres drive the UI.
- Paid cost from OpenRouter usage; subscription runs record **API-equivalent cost estimates** (labelled as estimates) alongside quota %.
- Transcripts are not stored; run detail links to the Action log / Jules session / PR.

---

## 11. Technology choices

| Concern | Choice |
|---|---|
| Language / repo | TypeScript, pnpm workspaces monorepo |
| API | Node HTTP framework with Zod-based OpenAPI generation (builder to propose; e.g., Hono + zod-openapi) |
| MCP | Official MCP TypeScript SDK, Streamable HTTP, OAuth |
| DB | Postgres (Neon free tier initially vs Cloud SQL — **open question**) + Drizzle ORM + migrations |
| UI | React, Vite, shadcn/ui, Tailwind, TanStack Router/Query/Table, dnd-kit, shadcn charts; OpenAPI-generated client |
| Runtime | Cloud Run (single service), Cloud Scheduler, Secret Manager |
| Auth | Firebase Auth / Identity Platform (Google) + MCP OAuth facade |
| Work tracker | GitHub App in a GitHub **organization** (required for Projects v2 webhooks) |
| Executors | GitHub Actions (Claude Code, OpenCode), Jules REST API, OpenRouter |
| Release | Cloud Deploy (per project) |
| IaC | Terraform |
| Telemetry | OpenTelemetry → Cloud Trace / Logging |
| Evals | Ori Eval (scout smoke tests) now; promptfoo later |

---

## 12. Milestones (v1.x)

Each milestone must work **end to end** before the next starts. Acceptance criteria are verified by Andy.

### M0 — Foundations
Repo scaffold, contracts package, Terraform for control-plane GCP project (plan reviewed by Andy), Postgres + migrations, auth (UI + API allow-list), CI, ADRs for decisions in this doc.
**Done when:** Andy can sign in to an empty UI on Cloud Run; unauthorized users are rejected; `terraform plan` is clean.

### M1 — Vertical slice (Claude only, one project)
GitHub App + webhooks + reconciler; project registration; ticket mirror; refinement with structured questions; Needs-you inbox; Claude Code executor via Actions; PR with structured summary; all merges gated; run records with outcomes and would-auto-merge; remote MCP with core tools (`create_ticket`, `list_needs_me`, `answer_question`, `status`); quota capture for claude-sub with UI warnings.
**Done when:** From Claude desktop, Andy creates a ticket → agent asks refinement questions → Andy answers via MCP → ticket reaches Ready → Claude builds → PR opens → Andy merges → run shows in UI with cost/quota.

### M2 — Second executor + routing
Jules adapter; freeze `Executor` contract (two adapters pass contract tests); harness/provider/model/tier config with compatibility rules; size-based routing; cross-model review; google-sub quota (task counting) and reserves.

### M3 — Paid tier
OpenCode executor via Actions; OpenRouter direct-call gateway for single-call steps; global and per-project caps with hard stops; quota-aware route fallback with 20% reserves; weekly model scout producing pending tier changes; initial tier list seeded by scout.

### M4 — Second project + epics
Second real project onboarded via template + bootstrap; scoped tokens per project; epics with sub-issues and dependencies; just-in-time re-planning; config editing and audit/revert in UI and MCP; board and run detail screens.

### M5 — Ship it
Project template Terraform + Cloud Deploy dev→prod; dev deploy + verification (Playwright/API tests + verification agent); promote/rollback from UI and MCP; release notes; rule-based auto-merge for S tasks.

### Later (explicitly deferred)
Prod monitoring agent and alert→ticket flow; write-approval execution; model-based risk scoring; email/Slack digests; transcript storage; BigQuery analytics; promptfoo CI + red-team; Cloud Run Jobs executors; additional harnesses (Antigravity CLI, Codex).

---

## 13. Open questions (to resolve with Andy before/during M0)

1. GitHub organization name (new free org for side projects?).
2. GCP: billing account, control-plane project ID, region (e.g., `us-central1` vs `us-west*`), naming convention for per-project dev/prod projects.
3. Postgres: Neon free tier to start, or Cloud SQL from day one?
4. Custom domain for the UI/MCP, or default Cloud Run URL?
5. Claude plan (Pro vs Max) — affects automated-run budget; confirm current billing for Action/headless usage.
6. Google plan (AI Pro vs Ultra) and current Jules daily task quota.
7. OpenRouter: account exists? initial monthly/daily caps?
8. First real side project to onboard in M1 (and is andy-intelligence itself project #2 for dogfooding?).
9. Claude custom-connector OAuth mechanism currently supported (dynamic client registration vs static client) — determines MCP auth wiring.
10. Whether the Jules GitHub integration or the Jules REST API should be the dispatch path (REST preferred for run tracking).
