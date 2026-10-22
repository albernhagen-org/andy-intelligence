---
status: accepted
date: 2026-10-21
---

# 0003 — Host repos and boards in the `albernhagen-org` GitHub organization

## Context and Problem Statement

`projects_v2_item` webhooks are only delivered to organization webhooks and to GitHub Apps with the organization-projects permission; user-owned Projects v2 boards get no webhooks (verified 2026-10-21, GitHub community discussion #17405 and webhook payload schema requiring `organization`).

## Considered Options

1. New free organization (keeps webhooks).
2. Personal account + reconciler polling.
3. Personal account, no board (labels only).

## Decision Outcome

Option 1: `albernhagen-org`. This repo is `albernhagen-org/andy-intelligence`; managed side projects move into or are created in the org.

### Consequences

- Good: board webhooks work; the GitHub App installs once on the org.
- Bad: free-org limits on private repos (e.g., environment protection rules) apply — see ADR-0011.
