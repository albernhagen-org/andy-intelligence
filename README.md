# andy-intelligence

Personal control plane for agentic software development. Architecture: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md). Decisions: [`docs/architecture/adr/`](docs/architecture/adr/). Progress: [`docs/build-log.md`](docs/build-log.md).

## Develop

```sh
pnpm install
pnpm test        # vitest, all packages
pnpm typecheck
pnpm lint
pnpm build
```

Run locally (needs a Firebase project for sign-in):

```sh
GCP_PROJECT_ID=andy-intelligence-512400 ALLOWED_EMAILS=you@example.com \
FIREBASE_API_KEY=... FIREBASE_AUTH_DOMAIN=andy-intelligence-512400.firebaseapp.com \
pnpm --filter @andy/api dev          # :8080
pnpm --filter @andy/web dev          # :5173, proxies /api to :8080
```

## Layout

| Path                  | What                                                 |
| --------------------- | ---------------------------------------------------- |
| `apps/api`            | Hono API (later MCP, webhooks, jobs); serves the SPA |
| `apps/web`            | React + Vite + shadcn UI                             |
| `packages/contracts`  | Zod entities, ports, fakes, contract suites          |
| `packages/db`         | Drizzle schema + migrations                          |
| `infra/bootstrap`     | One-time GCP bootstrap (state bucket, GitHub OIDC)   |
| `infra/control-plane` | Control-plane GCP resources                          |

Infra setup: [`docs/runbooks/m0-setup.md`](docs/runbooks/m0-setup.md).
