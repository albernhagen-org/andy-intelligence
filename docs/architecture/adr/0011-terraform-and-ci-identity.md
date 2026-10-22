---
status: accepted
date: 2026-10-21
---

# 0011 — Terraform layout and CI identity

## Decision Outcome

- **Two roots.** `infra/bootstrap` (state bucket, Workload Identity Federation, read-only plan SA) is applied **once, locally, by Andy**, then its state is migrated into the bucket it creates. `infra/control-plane` holds everything else and uses the GCS backend.
- **No service-account keys.** GitHub Actions authenticates via WIF. The pool provider only accepts OIDC tokens whose `repository` is `albernhagen-org/andy-intelligence`.
- **Plans in CI, applies by Andy.** PRs touching `infra/control-plane` run `terraform plan -lock=false` as `tf-plan` (viewer, security reviewer, secret metadata viewer, state read). Andy applies locally after reviewing. CI never holds write access to infrastructure. (A CI apply gated by a GitHub environment reviewer was considered; environment protection rules aren't available for private repos on free plans, and local apply is simpler at this scale.)
- **App deploys in CI.** `github-deployer` can push to the one Artifact Registry repo, roll the one Cloud Run service, and act as the runtime SA — only from workflows on `refs/heads/main`. Terraform ignores the container image so deploys and applies don't fight.
- Runtime SA `control-plane-runtime`: log writer, trace agent, Firebase Auth viewer, and accessor on `control-plane-database-url` only.

### Consequences

- Good: least privilege; infra changes always have a human apply.
- Bad: applies need Andy's machine with `gcloud auth application-default login`.
