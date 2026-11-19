#!/usr/bin/env bash
# Build the container, push it to the app's registry and point the runtime at it.
#
# Every identifier comes from outside the repo, from environment variables first, then from
# ~/.config/goalie-goals/app.tfvars (the same file infra/app reads):
#
#   GOALIE_PROJECT   or project_id           the app's project
#   GOALIE_REGION    or region               region of the registry and the runtime
#   GOALIE_REGISTRY  or registry_repository  registry repository name
#   GOALIE_SERVICE   or service_name         runtime service name
#
# Optional, passed to the service as environment variables when set:
#   GOALIE_IAP_AUDIENCE  the signed header's audience; when unset it is derived from the
#                        project number, region and service name
#   GOALIE_ROLES         the role seed (account=role pairs separated by ;)
#
# No value is printed: the script reports only which step it is on. Output of the cloud
# tools, which names resources, goes to /dev/null unless a step fails.
#
# Usage: scripts/deploy.sh [--dry-run]
set -euo pipefail

TFVARS="${GOALIE_APP_TFVARS:-$HOME/.config/goalie-goals/app.tfvars}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

# Read `key = "value"` from the tfvars file without echoing it.
tfvar() {
  [[ -f "$TFVARS" ]] || return 0
  sed -n -E "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\"([^\"]*)\".*$/\1/p" "$TFVARS" | head -n 1
}

need() {
  local name="$1" value="$2"
  if [[ -z "$value" ]]; then
    echo "deploy: $name is not set (environment or $(basename "$TFVARS")); stopping." >&2
    exit 1
  fi
}

PROJECT="${GOALIE_PROJECT:-$(tfvar project_id)}"
REGION="${GOALIE_REGION:-$(tfvar region)}"
REGISTRY="${GOALIE_REGISTRY:-$(tfvar registry_repository)}"
SERVICE="${GOALIE_SERVICE:-$(tfvar service_name)}"
need "project (GOALIE_PROJECT / project_id)" "$PROJECT"
need "region (GOALIE_REGION / region)" "$REGION"
need "registry (GOALIE_REGISTRY / registry_repository)" "$REGISTRY"
need "service (GOALIE_SERVICE / service_name)" "$SERVICE"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAG="$(git -C "$ROOT" rev-parse --short=12 HEAD)"
if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
  echo "deploy: the working tree has uncommitted changes; commit first so the tag names the code." >&2
  exit 1
fi
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REGISTRY}/app:${TAG}"
LOG="$(mktemp)"
trap 'rm -f "$LOG"' EXIT

run_quiet() {
  # Run a step, keeping its output (which names resources) off the terminal unless it fails.
  local step="$1"; shift
  echo "deploy: $step"
  if [[ $DRY_RUN -eq 1 ]]; then return 0; fi
  if ! "$@" >"$LOG" 2>&1; then
    echo "deploy: $step failed; its output is below (it may name resources: do not paste it publicly)." >&2
    cat "$LOG" >&2
    exit 1
  fi
}

echo "deploy: tests and build"
if [[ $DRY_RUN -eq 0 ]]; then
  (cd "$ROOT" && npm test && npm run build)
fi

run_quiet "build image ($TAG)" docker build -t "goalie-goals:${TAG}" "$ROOT"
run_quiet "authorise the registry" gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run_quiet "tag image" docker tag "goalie-goals:${TAG}" "$IMAGE"
run_quiet "push image" docker push "$IMAGE"

AUDIENCE="${GOALIE_IAP_AUDIENCE:-}"
if [[ -z "$AUDIENCE" && $DRY_RUN -eq 0 ]]; then
  NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)' 2>/dev/null)"
  need "project number" "$NUMBER"
  AUDIENCE="/projects/${NUMBER}/locations/${REGION}/services/${SERVICE}"
fi

# `^|^` makes | the separator, so values may hold commas.
ENV_VARS="IAP_AUDIENCE=${AUDIENCE}"
if [[ -n "${GOALIE_ROLES:-}" ]]; then
  ENV_VARS="${ENV_VARS}|GOALIE_ROLES=${GOALIE_ROLES}"
fi

# Git Bash must not rewrite the IAP audience (an API resource name) as a Windows path.
# This is set only after docker has received its local build path. It has no effect on Linux.
export MSYS2_ARG_CONV_EXCL="*"

run_quiet "update the runtime image" gcloud run services update "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --update-env-vars "^|^${ENV_VARS}" --quiet

echo "deploy: done ($TAG)"
