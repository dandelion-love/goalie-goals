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
| `app/` | Database, registry, runtime identity, secrets, runtime behind Google sign-in | The state bucket |

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

## Run the app root

1. Create `~/.config/goalie-goals/app.backend.hcl` with the state bucket
   (`bucket = "<state bucket>"`, `prefix = "app"`) and `~/.config/goalie-goals/app.tfvars`:

   ```hcl
   project_id      = "<the app's project id>"
   allowed_members = ["user:<an allowed account>"]
   ```

2. From `infra/app`:

   ```bash
   terraform init -backend-config="$HOME/.config/goalie-goals/app.backend.hcl"
   terraform plan -input=false -var-file="$HOME/.config/goalie-goals/app.tfvars" -out="$HOME/.config/goalie-goals/app.tfplan"
   terraform apply "$HOME/.config/goalie-goals/app.tfplan"
   ```

An empty `allowed_members` fails the plan and names the variable, never its values. The
runtime starts on a public placeholder image until the app's own image exists; only the
sign-in proxy may invoke it, and only the allowed accounts get through the proxy.

## Sign-in proxy

A project with no organisation can't get an OAuth client for the sign-in proxy from any
API, and the Terraform provider can't set one. The owner makes it once in the cloud console:

1. Google Auth Platform: configure the app (External; Testing mode), and add each person who
   may sign in as a test user.
2. Clients: create a Web application client, and add the proxy's redirect URI that the
   console's IAP documentation gives for that client.
3. Secret Manager, in the app's project: store the client secret as
   `iap-oauth-client-secret`. Run the command yourself; an agent never handles the secret.
4. Put the client id in `~/.config/goalie-goals/app.tfvars` as `iap_oauth_client_id`
   (or export `GOALIE_IAP_CLIENT_ID`), then run `scripts/iap-oauth.sh`.

The script reads the secret into a private temporary file only, never onto a command line,
deletes it on exit, and prints no values.

## Custom subdomain

`infra/app/domain.tf` maps the runtime to a subdomain of the owner's domain and adds the
CNAME in the owner's existing DNS zone, which lives in another project. Set
`custom_domain`, `dns_zone_name` and `dns_zone_project` in the variables file outside the
repo; none has a default.

- The deploying account must have verified the domain (Search Console). If the apply says
  the caller doesn't own the domain, verify it there first.
- Google issues the certificate after the CNAME resolves, usually within an hour. Until
  then HTTPS on the subdomain fails; check the mapping's status conditions.
- A hostname becomes public in certificate-transparency logs once the certificate is
  issued; choose the label knowing that, and keep it out of the repo regardless.
- `scripts/deploy.sh` owns the running image and its environment, and Terraform ignores
  them, so an apply never rolls the app back to the placeholder image.

## Cost

The budget alerts at 50%, 90% and 100% of actual spend and at 100% of forecast. It does
not stop spend. Services scale to zero and run one instance at most, so the app is meant to
stay inside free tiers. See the Decision concept on the dedicated project and budget.
