---
status: accepted
date: 2026-10-21
supersedes: 0004
---

# 0016 — Native work tracking in Postgres with an in-app story board

## Context and Problem Statement

The original design used GitHub Issues + a Projects v2 board as the system of record for work, mirrored into Postgres. Board webhooks need an organization (ADR-0003 moved to a personal account), and the mirror meant webhooks, a reconciler, label conventions, and drift handling — a large slice of M1 — for a tracker only Andy uses. Andy reaches the system from the UI and any MCP-capable AI tool anyway.

## Considered Options

1. GitHub Issues with label-based stages (instant webhooks, no board).
2. GitHub Projects v2 board, polled.
3. **Native tickets in Postgres, in-app story board, MCP for AI tools.**

## Decision Outcome

Option 3.

- Postgres is the system of record for tickets: key (`AI-42`), title, body, EARS acceptance criteria, assumptions, type, parent, stage, size, tier, overrides, rank, `needs_you`, DoR.
- `ticket_dependencies` holds "blocked by" links; `ticket_events` holds comments and every change (stage, fields, linked runs/PRs) with actor — the ticket's full history and audit trail.
- Every run, question, PR link, model, token count, and cost hangs off the ticket, so one query answers "what did which model do on this story, and what did it cost".
- GitHub remains the system of record for code. A new `CodeHost` port (GitHub App adapter) covers PRs, check runs, merges and workflow dispatch; webhooks are only for those.
- Agents get the ticket snapshot in the dispatch request and call back with a short-lived per-run token scoped to their ticket.
- PRs reference tickets by key (branch name or body); CI verifies the key against the API.
- The `WorkTracker` port stays, with the native adapter as v1.x; GitHub Issues/Linear become optional mirror/export adapters later.

### Consequences

- Good: removes the GitHub↔Postgres sync and its drift; M1 shrinks; tickets, runs, models and costs are joined natively; MCP gives access from any AI tool; mobile notifications can come later via the `Notifier` port.
- Bad: no GitHub issue UI or mobile app — the in-app story board becomes an M1 must-have. Postgres holds the only copy of work, so a scheduled `pg_dump` → GCS backup ships in M1. Neon free-tier compute is metered (CU-hours), so background jobs must not wake the database on a tight schedule when nothing is in flight.
