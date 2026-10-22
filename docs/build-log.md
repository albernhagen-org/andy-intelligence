# Build log

Temporary progress log until andy-intelligence can track its own work (then migrated to tickets).

## 2026-10-21 — Foundations: repo, sign-in, GCP infra (M0) started

**Decided (Andy):** GitHub org `albernhagen-org` (superseded: personal public repo `albernhagen/andy-intelligence`, ADR-0003); GCP project `andy-intelligence-512400`; Neon free tier; `us-central1`; default run.app URL; standard TS stack. See ADR-0003, 0007, 0008, 0009.

**Done (branch `m0/foundations`):**

- Monorepo scaffold, CI (lint, typecheck, test, build, terraform fmt/validate).
- `@andy/contracts`: §5 entities as Zod, ports, fakes + contract suites for WorkTracker / Executor / QuotaSource (8 tests).
- `@andy/store`: Firestore client and Zod-validated converters (4 tests). (Replaced the earlier Drizzle/Postgres package before anything was deployed.)
- `@andy/api`: Hono + OpenAPI, `/health`, `/config.json`, `/api/me` behind Firebase token + allow-list (5 tests); serves the SPA.
- `@andy/web`: React/Vite/Tailwind/shadcn shell with Google sign-in.
- Dockerfile; deploy and terraform-plan workflows (WIF, no keys).
- Terraform: `infra/bootstrap`, `infra/control-plane` (google provider 8.8). **Not validated locally** — the workspace can't reach the Terraform registry; CI runs `terraform validate`.
- ADRs 0001–0017; runbook `docs/runbooks/m0-setup.md`.

**Verified locally:** tests, typecheck, lint, builds, and a smoke run of the bundled server (`/health` 200, `/api/me` 401, SPA fallback 200).

**Decided (Andy, later 2026-10-21):** repo is public (ADR-0015: secret hygiene, TruffleHog + GitHub push protection); CI plans / local applies and public service with app-level auth confirmed (ADR-0010, 0011). Neon reconfirmed after checking Cloud SQL has no free tier (~$10/mo minimum).

**Decided (Andy, 2026-10-21 evening):** repo transferred to personal account `albernhagen/andy-intelligence` (ADR-0003). Work tracking moves into the app: Postgres tickets + in-app story board + MCP; GitHub only for code (ADR-0016, supersedes 0004). ARCHITECTURE.md updated (§1–4, 5, 6, 7, 8, 9, 10, 11, 12, 13). DB schema and contracts updated before any migration was applied (tickets as system of record, `ticket_events`, `ticket_dependencies`, project ticket keys). Stay on Neon (Supabase free tier pauses after a week idle and duplicates Firebase/GCP features).

**Decided (Andy, 2026-10-21 late):** Firestore replaces Neon/Postgres (ADR-0017, supersedes 0008 and 0013). Event-driven flow: per-run Cloud Tasks watchdog instead of a polling reconciler; weekly scout is the only scheduled job. Cloud SQL priced at ≈$9.50/mo and rejected.

## 2026-10-22 — Foundations PR (#1) opened; Docs sync (M1.0)

- Foundations PR (#1) opened: `m0/foundations` → `main`. Runbook steps 0–4 still pending.
- Docs sync (M1.0) folded into the Foundations PR (#1) to avoid a stacked PR; its separate PR (#2) closed: ARCHITECTURE revision `2026-10-22a`; ADRs 0018–0023; `AGENTS.md` (+ `CLAUDE.md` symlink); PR template with docs checklist; build prompt moved to slices.
- **Decided (Andy):** ADR-0012 rejected — every port gets a fake + contract suite, written in the slice that first uses the port (ADR-0023). Docs ship with the change (ADR-0022). M1 sliced (ADR-0021).
- **Decided (Andy):** no stacked PRs — slices branch from latest `main` (ADR-0021). Terraform pinned to 1.16.7 via `.terraform-version`, managed with tenv (ADR-0024). Docs written short and plain (ADR-0022).

## Slices: first end-to-end flow, ticket → PR with Claude (M1)

Status: todo / in progress / PR open / merged. Definitions: ARCHITECTURE §12.

| Slice                                    | Size            | Depends on                                                                     | Status                      |
| ---------------------------------------- | --------------- | ------------------------------------------------------------------------------ | --------------------------- |
| Docs sync (M1.0)                         | S               | Foundations (M0)                                                               | PR open (Foundations PR #1) |
| MCP OAuth spike (M1.1)                   | M               | Foundations (M0)                                                               | todo                        |
| Ticket core (M1.2)                       | M               | Foundations (M0)                                                               | todo                        |
| UI: tickets + inbox (M1.3)               | M               | Ticket core (M1.2)                                                             | todo                        |
| MCP core tools (M1.4)                    | S               | MCP OAuth spike (M1.1), Ticket core (M1.2)                                     | todo                        |
| GitHub App + project registration (M1.5) | M               | Ticket core (M1.2)                                                             | todo                        |
| Claude Code executor (M1.6)              | L (split 6a/6b) | GitHub App + project registration (M1.5)                                       | todo                        |
| Refinement (M1.7)                        | M               | UI: tickets + inbox (M1.3), MCP core tools (M1.4), Claude Code executor (M1.6) | todo                        |
| Build + gate (M1.8)                      | M               | Refinement (M1.7)                                                              | todo                        |
| Quota capture (M1.9)                     | S               | Claude Code executor (M1.6)                                                    | todo                        |

Next unblocked once Foundations (M0) is done: MCP OAuth spike (M1.1) and Ticket core (M1.2), in parallel.

**Pending decisions (Andy):**

- First real project to onboard (open question 8); needed by GitHub App + project registration (M1.5).
- Claude plan and headless billing (open question 5); needed by Claude Code executor (M1.6).
- MCP OAuth mechanism: answered by MCP OAuth spike (M1.1).

**Blocked on Andy:**

- Foundations (M0): runbook steps 0–4 (`docs/runbooks/m0-setup.md`), first `terraform plan` review, merge the Foundations PR (#1).
