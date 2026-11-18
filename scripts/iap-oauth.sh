#!/usr/bin/env bash
# Point the sign-in proxy (IAP) of the app's project at the OAuth client the owner made in
# the cloud console. A project with no organisation can't get a client any other way, and
# the Terraform provider can't set one, so this script does it once (see infra/README.md).
#
# Inputs, all from outside the repo; there are no defaults:
#   GOALIE_PROJECT            or project_id in ~/.config/goalie-goals/app.tfvars
#   GOALIE_IAP_CLIENT_ID      or iap_oauth_client_id in the same file
#   the client secret         Secret Manager secret "iap-oauth-client-secret" in that project
#
# The secret is written only into a settings file in a private temp directory (umask 077),
# never onto a command line, and the directory is removed on exit, success or failure. No
# value is printed: the script reports which step it is on, and on failure only the step.
#
# Usage: scripts/iap-oauth.sh
set -euo pipefail
umask 077

TFVARS="${GOALIE_APP_TFVARS:-$HOME/.config/goalie-goals/app.tfvars}"
SECRET_NAME="iap-oauth-client-secret"

tfvar() {
  [[ -f "$TFVARS" ]] || return 0
  sed -n -E "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\"([^\"]*)\".*$/\1/p" "$TFVARS" | head -n 1
}

fail() { echo "iap-oauth: $1; stopping." >&2; exit 1; }

PROJECT="${GOALIE_PROJECT:-$(tfvar project_id)}"
CLIENT_ID="${GOALIE_IAP_CLIENT_ID:-$(tfvar iap_oauth_client_id)}"
[[ -n "$PROJECT" ]] || fail "the project is not set (GOALIE_PROJECT or project_id in $(basename "$TFVARS"))"
[[ -n "$CLIENT_ID" ]] || fail "the OAuth client id is not set (GOALIE_IAP_CLIENT_ID or iap_oauth_client_id in $(basename "$TFVARS"))"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/iap-oauth.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

echo "iap-oauth: read the client secret"
SECRET_FILE="$WORK/secret"
gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" \
  --out-file="$SECRET_FILE" >/dev/null 2>&1 \
  || fail "the secret $SECRET_NAME could not be read (does it exist in the app's project?)"
[[ -s "$SECRET_FILE" ]] || fail "the secret $SECRET_NAME is empty"

echo "iap-oauth: write the settings file"
SETTINGS="$WORK/settings.yaml"
{
  printf 'accessSettings:\n  oauthSettings:\n    clientId: "%s"\n    clientSecret: "' "$CLIENT_ID"
  tr -d '\r\n' < "$SECRET_FILE"
  printf '"\n'
} > "$SETTINGS"

echo "iap-oauth: apply the settings to the project's sign-in proxy"
gcloud iap settings set "$SETTINGS" --project="$PROJECT" --resource-type=iap_web \
  >/dev/null 2>&1 || fail "applying the settings failed (check your access to the project)"

echo "iap-oauth: done"
