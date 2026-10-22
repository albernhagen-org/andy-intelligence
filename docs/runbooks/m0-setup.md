# M0 setup runbook (Andy)

One-time steps that need your credentials. Nothing here prints or stores a secret in the repo.

## 0. Prerequisites (your machine)

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project andy-intelligence-512400
terraform -version   # >= 1.9
```

You need Owner (or equivalent) on `andy-intelligence-512400`; the project creator has it.

## 1. Bootstrap (state bucket + GitHub federation)

```sh
cd infra/bootstrap
terraform init
terraform plan -out=bootstrap.tfplan    # review; share the output with Claude if anything looks off
terraform apply bootstrap.tfplan
```

Move bootstrap state into the bucket it just created:

1. Uncomment the `backend "gcs"` block in `infra/bootstrap/main.tf`.
2. `terraform init -migrate-state -backend-config="bucket=andy-intelligence-512400-tfstate"` → answer `yes`.
3. Delete the local `terraform.tfstate*` files once the migration succeeds.

Set GitHub **repository variables** (Settings → Secrets and variables → Actions → Variables) from the outputs (`terraform output`):

| Variable           | Output                       |
| ------------------ | ---------------------------- |
| `GCP_WIF_PROVIDER` | `workload_identity_provider` |
| `GCP_TF_PLAN_SA`   | `tf_plan_service_account`    |

These are identifiers, not secrets.

## 2. Control plane

```sh
cd infra/control-plane
terraform init
terraform plan -out=cp.tfplan            # review; this is the plan Claude asked you to approve
terraform apply cp.tfplan
```

If the first apply errors on the Firebase web app config or Identity Platform (API enablement can take a minute to propagate), re-run `plan`/`apply`.

Add the remaining repository variables from `terraform output`:

| Variable          | Output                     |
| ----------------- | -------------------------- |
| `GCP_DEPLOYER_SA` | `deployer_service_account` |
| `GCP_IMAGE_REPO`  | `image_repository`         |

## 3. Enable Google sign-in (manual — can't be done in Terraform)

Firebase console → project `andy-intelligence-512400` → **Authentication → Sign-in method → Add new provider → Google** → Enable → set the support email → Save. This creates the OAuth client automatically.

## 4. Database (Neon)

1. In Neon, create project `andy-intelligence` in a US region; copy the **pooled** connection string (it includes `sslmode=require`).
2. Add it to Secret Manager without it touching your shell history or this repo:

   ```sh
   read -rs DATABASE_URL && printf '%s' "$DATABASE_URL" | \
     gcloud secrets versions add control-plane-database-url --data-file=- --project andy-intelligence-512400
   unset DATABASE_URL
   ```

3. Tell Claude. It will open a PR flipping `database_secret_ready` to `true`; you apply it like step 2.

## 5. First deploy

Merge the M0 PR to `main`. The **Deploy control plane** workflow builds the image, pushes it, rolls Cloud Run, and smoke-tests `/health` (200) and `/api/me` (401).

## 6. Verify M0 "Done when"

- [ ] Open the `service_url` output, sign in with Google → "Needs you" page shows your email.
- [ ] Sign in with a different Google account → "not allowed" message (API returns 403).
- [ ] `curl -i <service_url>/api/me` → 401.
- [ ] `terraform plan` in `infra/control-plane` → "No changes".
- [ ] Cloud Run logs show `migrations applied` after step 4.
