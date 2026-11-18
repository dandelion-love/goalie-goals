# Infrastructure

Terraform for the app's cloud home. This repo is public, so **no identifier is written
here**: every project id, billing account, bucket name and allowed account is a variable
with no default, set in files under `~/.config/goalie-goals/` that are never committed.
State, `.tfvars`, plan files and `.terraform/` never enter git (see `.gitignore`; the
privacy guard refuses them).

## Layout

| Root | What | State |
| --- | --- | --- |
| `bootstrap/` | The app's own project, billing link, monthly budget with alerts, state bucket | Local file in `~/.config/goalie-goals/` |
| `app/` (later) | Database, registry, runtime identity, secrets, runtime with sign-in | The state bucket |

## Run the bootstrap from a fresh clone

1. Sign in: `gcloud auth application-default login` (your own account, with the billing
   account's user role).
2. Create `~/.config/goalie-goals/bootstrap.tfvars`:

   ```hcl
   project_id      = "<new project id>"
   billing_account = "<billing account id>"
   quota_project   = "<an existing project with the budgets API on>"
   state_bucket    = "<globally unique bucket name>"
   budget_currency = "<your billing account's currency code>"
   ```

3. From `infra/bootstrap`:

   ```bash
   terraform init -backend-config="path=$HOME/.config/goalie-goals/bootstrap.tfstate"
   terraform plan -input=false -var-file="$HOME/.config/goalie-goals/bootstrap.tfvars" -out="$HOME/.config/goalie-goals/bootstrap.tfplan"
   terraform apply "$HOME/.config/goalie-goals/bootstrap.tfplan"
   ```

A missing variable makes `plan -input=false` fail and name it; there is no fallback value.

Two things that stop a first apply:

- **Stale application-default credentials.** If the apply says the billing link is
  missing `billing.resourceAssociations.create` although your account is a billing admin,
  the application-default sign-in is a different account. Either redo
  `gcloud auth application-default login`, or run with your active gcloud account:
  `export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)`.
- **The quota project needs the Cloud Resource Manager API** (`cloudresourcemanager.googleapis.com`)
  as well as the budgets API, or creating the project fails with a 403.

## Cost

The budget alerts at 50%, 90% and 100% of actual spend and at 100% of forecast. It does
not stop spend. Services scale to zero and run one instance at most, so the app is meant to
stay inside free tiers. See the Decision concept on the dedicated project and budget.
