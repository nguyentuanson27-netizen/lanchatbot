#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_RELEASE_TAG="20260809-admin-policy-review-r6.1"
readonly IMPLEMENTATION_COMMIT="43a42392cf975891ddb284083efe153581388d55"
readonly EXPECTED_ADMIN_IMAGE="lana-chatbot-app:admin-policy-review-r6.1"

APP_ROOT="${APP_ROOT:-/opt/lana-chatbot}"
REPOSITORY_DIR="${REPOSITORY_DIR:-$APP_ROOT/repository}"
INFRASTRUCTURE_ENV_FILE="${INFRASTRUCTURE_ENV_FILE:-$APP_ROOT/shared/.env.infrastructure}"
RELEASE_TAG="${RELEASE_TAG:-$EXPECTED_RELEASE_TAG}"
RELEASE_COMMIT="${RELEASE_COMMIT:-}"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_TAG"
COMPOSE_FILE="$RELEASE_DIR/deploy/docker-compose.vps.yml"
EVIDENCE_DIR="${EVIDENCE_DIR:-$APP_ROOT/shared/release-artifacts/$RELEASE_TAG}"
ENV_BACKUP="$APP_ROOT/shared/.env.infrastructure.backup-$RELEASE_TAG"
TARGET_ADMIN_IMAGE="${TARGET_ADMIN_IMAGE:-$EXPECTED_ADMIN_IMAGE}"
RELEASE_SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command missing: $1"
}

require_release_identity() {
  test "$RELEASE_TAG" = "$EXPECTED_RELEASE_TAG" || die "unexpected release tag"
  [[ "$RELEASE_COMMIT" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_COMMIT must be a full lowercase SHA-1"
  test "$RELEASE_DIR" = "$APP_ROOT/releases/$EXPECTED_RELEASE_TAG" || die "release path mismatch"
  test "$TARGET_ADMIN_IMAGE" = "$EXPECTED_ADMIN_IMAGE" || die "unexpected target admin image"

  local tag_ref="refs/tags/$RELEASE_TAG"
  test "$(git -C "$REPOSITORY_DIR" cat-file -t "$tag_ref")" = "tag" || die "release tag must be annotated"
  local peeled
  peeled="$(git -C "$REPOSITORY_DIR" rev-parse "$tag_ref^{}")"
  test "$peeled" = "$RELEASE_COMMIT" || die "release tag/commit mismatch"
  git -C "$REPOSITORY_DIR" merge-base --is-ancestor "$IMPLEMENTATION_COMMIT" "$RELEASE_COMMIT" || die "implementation commit is not in release"
}

validate_image_ref() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*:[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || die "invalid image reference"
}

require_image_inputs() {
  : "${PRESERVED_ADMIN_SIMULATION_IMAGE:?PRESERVED_ADMIN_SIMULATION_IMAGE is required}"
  : "${ROLLBACK_ADMIN_API_IMAGE:?ROLLBACK_ADMIN_API_IMAGE is required}"
  : "${ROLLBACK_ADMIN_WEB_IMAGE:?ROLLBACK_ADMIN_WEB_IMAGE is required}"
  : "${PREVIOUS_RELEASE_DIR:?PREVIOUS_RELEASE_DIR is required}"
  validate_image_ref "$PRESERVED_ADMIN_SIMULATION_IMAGE"
  validate_image_ref "$ROLLBACK_ADMIN_API_IMAGE"
  validate_image_ref "$ROLLBACK_ADMIN_WEB_IMAGE"
  test "$PREVIOUS_RELEASE_DIR" != "$RELEASE_DIR" || die "previous release cannot equal target release"
  case "$PREVIOUS_RELEASE_DIR" in
    "$APP_ROOT"/releases/*) ;;
    *) die "previous release must be under the release root" ;;
  esac
  test -d "$PREVIOUS_RELEASE_DIR" || die "previous release directory missing"
}

require_cutover_inputs() {
  require_release_identity
  require_image_inputs
  test "${DEPLOYMENT_AUTHORIZED:-}" = "YES_I_AM_AUTHORIZED" || die "explicit deployment authorization is required"
  : "${RUNTIME_STATE_SERVICE_EVIDENCE_FILE:?RUNTIME_STATE_SERVICE_EVIDENCE_FILE is required}"
  : "${RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE:?RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE is required}"
  : "${ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE:?ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE is required}"
  test -s "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" || die "deployment runtime-state evidence missing"
  test -s "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" || die "rollback runtime-state evidence missing"
  test -s "$ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE" || die "admin UI walkthrough evidence missing"
  node "$RELEASE_SCRIPT_DIR/validate-service-evidence.mjs" "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json"
  node "$RELEASE_SCRIPT_DIR/validate-service-evidence.mjs" "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json"
  node "$RELEASE_SCRIPT_DIR/validate-walkthrough-evidence.mjs" "$ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE" "$RELEASE_TAG" "$RELEASE_COMMIT"
}

compose() {
  docker compose --env-file "$INFRASTRUCTURE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

container_id() {
  local id
  id="$(compose ps -q "$1")"
  test -n "$id" || die "container missing for service: $1"
  docker inspect --format '{{.Id}}' "$id"
}

container_image_ref() {
  docker inspect --format '{{.Config.Image}}' "$1"
}

container_image_id() {
  docker inspect --format '{{.Image}}' "$1"
}

wait_healthy() {
  local service="$1"
  local deadline=$(( $(date +%s) + 180 ))
  local id status
  while (( $(date +%s) < deadline )); do
    id="$(compose ps -q "$service")"
    if test -n "$id"; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")"
      test "$status" = "healthy" && return 0
    fi
    sleep 5
  done
  die "service did not become healthy: $service"
}

upsert_env_pin() {
  local key="$1"
  local value="$2"
  case "$key" in
    ADMIN_API_IMAGE|ADMIN_WEB_IMAGE|ADMIN_SIMULATION_IMAGE) ;;
    *) die "unsupported environment pin" ;;
  esac
  validate_image_ref "$value"
  local tmp
  tmp="$(mktemp "$(dirname "$INFRASTRUCTURE_ENV_FILE")/.env.infrastructure.$key.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$INFRASTRUCTURE_ENV_FILE" > "$tmp"
  chown --reference="$INFRASTRUCTURE_ENV_FILE" "$tmp"
  chmod --reference="$INFRASTRUCTURE_ENV_FILE" "$tmp"
  mv -f "$tmp" "$INFRASTRUCTURE_ENV_FILE"
}

save_non_target_ids() {
  local output="$1"
  : > "$output"
  local service container id
  while IFS=$'\t' read -r service container; do
    case "$service" in
      admin-api|admin-web) continue ;;
    esac
    id="$(docker inspect --format '{{.Id}}' "$container" 2>/dev/null || true)"
    printf '%s\t%s\t%s\n' "$service" "$container" "${id:-MISSING}" >> "$output"
  done < <(node "$RELEASE_SCRIPT_DIR/list-inventory-services.mjs" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json")
  chmod 600 "$output"
}

verify_non_target_ids() {
  local input="$1"
  local service container expected actual
  while IFS=$'\t' read -r service container expected; do
    [[ "$service" =~ ^[A-Za-z0-9_-]+$ ]] || die "invalid service in identity evidence"
    [[ "$container" =~ ^[A-Za-z0-9_.-]+$ ]] || die "invalid container in identity evidence"
    actual="$(docker inspect --format '{{.Id}}' "$container" 2>/dev/null || true)"
    test "${actual:-MISSING}" = "$expected" || die "non-target container changed: $service"
  done < "$input"
}

verify_required_service_health() {
  local service container status
  while IFS=$'\t' read -r service container; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
    case "$status" in
      healthy|running) ;;
      *) die "required service is not healthy/running: $service" ;;
    esac
  done < <(node "$RELEASE_SCRIPT_DIR/list-inventory-services.mjs" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json")
}

atomic_switch_current() {
  local destination="$1"
  test -d "$destination" || die "symlink destination missing"
  local next="$APP_ROOT/current.next.$RELEASE_TAG.$$"
  test ! -e "$next" || die "temporary symlink already exists"
  ln -s "$destination" "$next"
  mv -Tf "$next" "$APP_ROOT/current"
  test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$destination")" || die "current symlink verification failed"
}
