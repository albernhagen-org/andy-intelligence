# M0 setup runbook (Andy)

One-time steps that need your credentials. **This repo is public:** nothing in these steps puts a secret, email address, or credential into a file that gets committed. Values that must stay private go in Secret Manager, GitHub Actions **secrets**, or gitignored local files.

## 0. GitHub settings

**Let Claude push branches** — install the Claude GitHub App on the org:

1. Open https://github.com/apps/claude/installations/select_target → choose **albernhagen-org**.
2. Repository access → **Only select repositories** → `andy-intelligence` → Install.

**Secret protection** (Settings → Advanced Security / Code security):

- Enable **Secret scanning** and **Push protection** (free on public repos). Push protection rejects pushes containing known credential formats, from anyone, including agents.

**Protect `main`** (Settings → Rules → Rulesets → New branch ruleset, target `main`):

- Require a pull request before merging.
- Require status checks to pass: `check`, `terraform`, `trufflehog`.
- Block force pushes and deletions.

**Outside contributions** (Settings → Actions → General):

- Fork pull request workflows → **Require approval for all external contributors**.

**Your commit email** (your personal Settings → Emails): enable **Keep my email addresses private** and **Block command line pushes that expose my email**, and use `albernhagen@users.noreply.github.com` locally. The repo's existing "Initial commit" already shows your Gmail; that's public now and can't be removed without force-pushing `main`.

## 1. Prerequisites (your machine)

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project andy-intelligence-512400
terraform -version   # >= 1.9
```

You need Owner on `andy-intelligence-512400`; the project creator has it.

## 2. Bootstrap (state bucket + GitHub federation)

```sh
cd infra/bootstrap
terraform init
terraform plan -out=bootstrap.tfplan    # review
terraform apply bootstrap.tfplan
```

Move bootstrap state into the bucket it just created:

1. Uncomment the `backend "gcs"` block in `infra/bootstrap/main.tf` (commit that change via PR afterwards).
2. `terraform init -migrate-state -backend-config="bucket=andy-intelligence-512400-tfstate"` → answer `yes`.
3. Delete the local `terraform.tfstate*` files once the migration succeeds.

Set GitHub **repository variables** (Settings → Secrets and variables → Actions → **Variables**) from `terraform output`:

| Variable           | Output                       |
| ------------------ | ---------------------------- |
| `GCP_WIF_PROVIDER` | `workload_identity_provider` |
| `GCP_TF_PLAN_SA`   | `tf_plan_service_account`    |

These are identifiers, not secrets.

## 3. Control plane

Your allow-listed email never goes in the repo:

```sh
cd infra/control-plane
cp terraform.tfvars.example terraform.tfvars   # gitignored; put your Google account email in it
terraform init
terraform plan -out=cp.tfplan                  # review in full (CI only prints the summary line)
terraform apply cp.tfplan
```

Add a GitHub Actions **secret** (Secrets tab, not Variables) `TF_VAR_ALLOWED_EMAILS` with the same value in HCL list form, e.g. `["you@example.com"]`, so CI plans match yours.

If the first apply errors on the Firebase web app config or Identity Platform (API enablement can take a minute to propagate), re-run `plan`/`apply`.

Add the remaining repository **variables** from `terraform output`:

| Variable          | Output                     |
| ----------------- | -------------------------- |
| `GCP_DEPLOYER_SA` | `deployer_service_account` |
| `GCP_IMAGE_REPO`  | `image_repository`         |

## 4. Enable Google sign-in (manual — can't be done in Terraform)

Terraform has already created the Firebase project, web app, and Identity Platform config. The Google provider needs an OAuth client, which only the console can create:

1. https://console.firebase.google.com → project **andy-intelligence-512400** → **Build → Authentication**. (If prompted "Get started", click it.)
2. **Sign-in method** tab → **Add new provider** → **Google** → toggle **Enable**.
3. Public-facing name: `andy-intelligence`; support email: your Google account → **Save**.
4. **Settings** tab → **Authorized domains**: confirm the `control-plane-<number>.us-central1.run.app` domain is listed (Terraform adds it).

Only emails in `allowed_emails` get past the API; anyone else can complete Google sign-in but receives 403.

## 5. Database

Neon free tier (ADR-0008; Cloud SQL has no free tier — reconfirmed 2026-10-21).

1. At https://neon.tech sign in with Google or GitHub, create project `andy-intelligence` in a US region, and copy the **pooled** connection string (it includes `sslmode=require`).
2. Add it to Secret Manager without it touching your shell history or this repo:

   ```sh
   read -rs DATABASE_URL && printf '%s' "$DATABASE_URL" | \
     gcloud secrets versions add control-plane-database-url --data-file=- --project andy-intelligence-512400
   unset DATABASE_URL
   ```

3. Tell Claude. It will open a PR flipping `database_secret_ready` to `true`; you apply it like step 3.

## 6. First deploy

Merge the M0 PR to `main`. The **Deploy control plane** workflow builds the image, pushes it, rolls Cloud Run, and smoke-tests `/health` (200) and `/api/me` (401).

## 7. Verify M0 "Done when"

- [ ] Open the `service_url` output, sign in with Google → "Needs you" page shows your email.
- [ ] Sign in with a different Google account → "not allowed" message (API returns 403).
- [ ] `curl -i <service_url>/api/me` → 401.
- [ ] `terraform plan` in `infra/control-plane` → "No changes".
- [ ] Cloud Run logs show `migrations applied` once the database is wired.
