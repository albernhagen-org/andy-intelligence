# Build log

Temporary progress log until andy-intelligence can track its own work (then migrated to tickets).

## 2026-10-21 — M0 started

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

## 2026-10-22 — M0 PR opened; M1.0 docs sync

- M0 PR opened: #1 (`m0/foundations` → `main`). Runbook steps 0–4 still pending.
- M1.0 docs sync, folded into PR #1 (M0 foundations) to avoid a stacked PR (closed PR #2): ARCHITECTURE revision `2026-10-22a`; ADRs 0018–0023; `AGENTS.md` (+ `CLAUDE.md` symlink); PR template with docs checklist; build prompt moved to slices.
- **Decided (Andy):** ADR-0012 rejected — every port gets a fake + contract suite, written in the slice that first uses the port (ADR-0023). Docs ship with the change (ADR-0022). M1 sliced (ADR-0021).
- **Decided (Andy):** no stacked PRs — slices branch from latest `main` (ADR-0021). Terraform pinned to 1.16.7 via `.terraform-version`, managed with tenv (ADR-0024). Docs written short and plain (ADR-0022).

## M1 slices

Status: todo / in progress / PR open / merged. Definitions: ARCHITECTURE §12.

| Slice                                  | Size            | Depends on       | Status             |
| -------------------------------------- | --------------- | ---------------- | ------------------ |
| M1.0 Docs sync                         | S               | M0               | PR open (in PR #1) |
| M1.1 MCP OAuth spike                   | M               | M0               | todo               |
| M1.2 Ticket core                       | M               | M0               | todo               |
| M1.3 UI: tickets + inbox               | M               | M1.2             | todo               |
| M1.4 MCP core tools                    | S               | M1.1, M1.2       | todo               |
| M1.5 GitHub App + project registration | M               | M1.2             | todo               |
| M1.6 Claude Code executor              | L (split 6a/6b) | M1.5             | todo               |
| M1.7 Refinement                        | M               | M1.3, M1.4, M1.6 | todo               |
| M1.8 Build + gate                      | M               | M1.7             | todo               |
| M1.9 Quota capture                     | S               | M1.6             | todo               |

Next unblocked once M0 is done: M1.1 and M1.2 (parallel).

**Pending decisions (Andy):**

- First real project to onboard in M1 (open question 8); needed by M1.5.
- Claude plan and headless billing (open question 5); needed by M1.6.
- MCP OAuth mechanism: answered by M1.1.

**Blocked on Andy:**

- M0: runbook steps 0–4 (`docs/runbooks/m0-setup.md`), first `terraform plan` review, merge #1.
