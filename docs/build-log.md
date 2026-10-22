# Build log

Temporary progress log until andy-intelligence can track its own work (then migrated to tickets).

## 2026-10-21 — M0 started

**Decided (Andy):** GitHub org `albernhagen-org` (superseded: personal public repo `albernhagen/andy-intelligence`, ADR-0003); GCP project `andy-intelligence-512400`; Neon free tier; `us-central1`; default run.app URL; standard TS stack. See ADR-0003, 0007, 0008, 0009.

**Done (branch `m0/foundations`):**

- Monorepo scaffold, CI (lint, typecheck, test, build, terraform fmt/validate).
- `@andy/contracts`: §5 entities as Zod, ports, fakes + contract suites for WorkTracker / Executor / QuotaSource (8 tests).
- `@andy/db`: Drizzle schema for all §5 entities; initial migration `0000_init.sql`.
- `@andy/api`: Hono + OpenAPI, `/health`, `/config.json`, `/api/me` behind Firebase token + allow-list (5 tests); serves the SPA; migrations at boot.
- `@andy/web`: React/Vite/Tailwind/shadcn shell with Google sign-in.
- Dockerfile; deploy and terraform-plan workflows (WIF, no keys).
- Terraform: `infra/bootstrap`, `infra/control-plane` (google provider 8.8). **Not validated locally** — the workspace can't reach the Terraform registry; CI runs `terraform validate`.
- ADRs 0001–0014; runbook `docs/runbooks/m0-setup.md`.

**Verified locally:** tests, typecheck, lint, builds, and a smoke run of the bundled server (`/health` 200, `/api/me` 401, SPA fallback 200).

**Decided (Andy, later 2026-10-21):** repo is public (ADR-0015: secret hygiene, TruffleHog + GitHub push protection); CI plans / local applies and public service with app-level auth confirmed (ADR-0010, 0011). Neon reconfirmed after checking Cloud SQL has no free tier (~$10/mo minimum).

**Pending decisions (Andy):**

- ADR-0012 (proposed): contract suites only for WorkTracker/Executor/QuotaSource.
- MCP OAuth spike: end of M0 or start of M1?

**Blocked on Andy:**

- Claude GitHub App install on the org (push access).
- Runbook steps 0–4.
