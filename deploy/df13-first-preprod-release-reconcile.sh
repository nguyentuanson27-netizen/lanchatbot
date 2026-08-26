#!/usr/bin/env bash
set -euo pipefail
set -E

# Reconciles the immutable release that is already running with `current` and
# the append-only runtime-state record. It deliberately has no deployment,
# migration, database-write, or authority transition capability. The reviewed
# runtime-state capture helpers make read-only migration-ledger and routing
# queries so that the promoted record is an observed host identity, not a
# caller-supplied assertion.

: "${DF13_RELEASE_DIR:?DF13_RELEASE_DIR is required}"
: "${DF13_RELEASE_TAG:?DF13_RELEASE_TAG is required}"
: "${DF13_RELEASE_COMMIT:?DF13_RELEASE_COMMIT is required}"
: "${DF13_RELEASE_TREE:?DF13_RELEASE_TREE is required}"
: "${DF13_PREVIOUS_RELEASE_DIR:?DF13_PREVIOUS_RELEASE_DIR is required}"
: "${DF13_RELEASE_REALTIME_IMAGE:?DF13_RELEASE_REALTIME_IMAGE is required}"
: "${DF13_RELEASE_REALTIME_IMAGE_ID:?DF13_RELEASE_REALTIME_IMAGE_ID is required}"
: "${DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE:?DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE is required}"
: "${DF13_APP_ROOT:=/opt/lana-chatbot}"
: "${DF13_REPOSITORY_DIR:=$DF13_APP_ROOT/repository}"
: "${DF13_REALTIME_CONTAINER:=lana-chatbot-realtime-worker}"

die() {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "COMMAND_MISSING:$1"
}

safe_release_dir() {
  local candidate="$1"
  local resolved
  resolved="$(readlink -f "$candidate")" || die "RELEASE_DIRECTORY_UNRESOLVED"
  case "$resolved" in
    "$DF13_APP_ROOT"/releases/*) ;;
    *) die "RELEASE_DIRECTORY_OUTSIDE_ROOT" ;;
  esac
  test -d "$resolved" || die "RELEASE_DIRECTORY_MISSING"
  printf '%s\n' "$resolved"
}

atomic_switch_current() {
  local destination="$1"
  local next="$DF13_APP_ROOT/current.next.$$.df13-reconcile"
  test ! -e "$next" || die "CURRENT_NEXT_ALREADY_EXISTS"
  ln -s "$destination" "$next"
  mv -Tf "$next" "$DF13_APP_ROOT/current"
  test "$(readlink -f "$DF13_APP_ROOT/current")" = "$destination" || die "CURRENT_SWITCH_READBACK_MISMATCH"
}

for command_name in docker git node readlink ln mv date flock setsid; do
  require_command "$command_name"
done
readonly DEPLOYMENT_LOCK_FILE="$DF13_APP_ROOT/shared/lana-chatbot-deployment.lock"
mkdir -p "$(dirname "$DEPLOYMENT_LOCK_FILE")"

acquire_deployment_lock() {
  if test -e "/proc/$$/fd/9" &&
    test "$(readlink -f "/proc/$$/fd/9")" = "$(readlink -f "$DEPLOYMENT_LOCK_FILE")"; then
    flock -n 9 || die "INHERITED_DEPLOYMENT_LOCK_NOT_HELD"
    return
  fi
  exec 9> "$DEPLOYMENT_LOCK_FILE"
  flock -n 9 || die "RELEASE_RECONCILIATION_LOCK_UNAVAILABLE"
}

acquire_deployment_lock

case "$DF13_RELEASE_TAG" in
  *[!A-Za-z0-9._-]*|'') die "RELEASE_TAG_INVALID" ;;
esac
[[ "$DF13_RELEASE_COMMIT" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_COMMIT_INVALID"
[[ "$DF13_RELEASE_TREE" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_TREE_INVALID"
[[ "$DF13_RELEASE_REALTIME_IMAGE_ID" =~ ^sha256:[a-f0-9]{64}$ ]] || die "REALTIME_IMAGE_ID_INVALID"

release_dir="$(safe_release_dir "$DF13_RELEASE_DIR")"
previous_release_dir="$(safe_release_dir "$DF13_PREVIOUS_RELEASE_DIR")"
test "$(basename "$release_dir")" = "$DF13_RELEASE_TAG" || die "RELEASE_TAG_DIRECTORY_MISMATCH"
test -L "$DF13_APP_ROOT/current" || die "CURRENT_SYMLINK_MISSING"
test "$(readlink -f "$DF13_APP_ROOT/current")" = "$previous_release_dir" || die "CURRENT_RELEASE_DRIFT"
test -s "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" || die "RUNTIME_STATE_EVIDENCE_MISSING"

test "$(git -C "$DF13_REPOSITORY_DIR" cat-file -t "${DF13_RELEASE_TAG}")" = "tag" || die "RELEASE_TAG_NOT_ANNOTATED"
test "$(git -C "$DF13_REPOSITORY_DIR" rev-parse "${DF13_RELEASE_TAG}^{commit}")" = "$DF13_RELEASE_COMMIT" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$(git -C "$DF13_REPOSITORY_DIR" rev-parse "${DF13_RELEASE_COMMIT}^{tree}")" = "$DF13_RELEASE_TREE" || die "RELEASE_TREE_MISMATCH"
node "$release_dir/deploy/runtime-state/release-source.mjs" validate \
  --file "$release_dir/.release-source.json" \
  --release "$DF13_RELEASE_TAG" >/dev/null
DF13_RELEASE_SOURCE_FILE="$release_dir/.release-source.json" \
DF13_RELEASE_EXPECTED_COMMIT="$DF13_RELEASE_COMMIT" \
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const source = JSON.parse(readFileSync(process.env.DF13_RELEASE_SOURCE_FILE, "utf8"));
    if (source.commit !== process.env.DF13_RELEASE_EXPECTED_COMMIT) process.exit(1);
  ' || die "RELEASE_SOURCE_COMMIT_MISMATCH"

compose_file="$release_dir/deploy/docker-compose.vps.yml"
test -f "$compose_file" || die "RELEASE_COMPOSE_MISSING"
test "$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$DF13_REALTIME_CONTAINER")" = "$compose_file" || die "REALTIME_COMPOSE_SOURCE_MISMATCH"
test "$(docker inspect --format '{{.Config.Image}}' "$DF13_REALTIME_CONTAINER")" = "$DF13_RELEASE_REALTIME_IMAGE" || die "REALTIME_IMAGE_REFERENCE_MISMATCH"
test "$(docker inspect --format '{{.Image}}' "$DF13_REALTIME_CONTAINER")" = "$DF13_RELEASE_REALTIME_IMAGE_ID" || die "REALTIME_IMAGE_ID_MISMATCH"
test "$(docker inspect --format '{{.State.Running}}' "$DF13_REALTIME_CONTAINER")" = "true" || die "REALTIME_NOT_RUNNING"
test "$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$DF13_RELEASE_REALTIME_IMAGE_ID")" = "$DF13_RELEASE_COMMIT" || die "REALTIME_REVISION_MISMATCH"

candidate_id="df13-reconcile-${DF13_RELEASE_TAG}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
candidate="$DF13_APP_ROOT/runtime-state/candidates/$candidate_id.json"
test ! -e "$candidate" || die "RUNTIME_STATE_CANDIDATE_EXISTS"
switched=false
active_step_pid=""

restore_previous_current() {
  if [ "$switched" = true ]; then
    switched=false
    atomic_switch_current "$previous_release_dir"
  fi
}

terminate_active_step() {
  if [ -n "$active_step_pid" ]; then
    kill -TERM -- "-$active_step_pid" 2>/dev/null || true
    wait "$active_step_pid" 2>/dev/null || true
    active_step_pid=""
  fi
}

abort_reconciliation() {
  local exit_code="$1"
  terminate_active_step
  restore_previous_current
  trap - EXIT INT TERM HUP
  exit "$exit_code"
}

run_runtime_state_step() {
  setsid "$@" &
  active_step_pid="$!"
  local step_status=0
  if wait "$active_step_pid"; then
    step_status=0
  else
    step_status=$?
  fi
  active_step_pid=""
  return "$step_status"
}

trap restore_previous_current EXIT
trap 'abort_reconciliation 130' INT
trap 'abort_reconciliation 143' TERM
trap 'abort_reconciliation 129' HUP

switched=true
atomic_switch_current "$release_dir"

run_runtime_state_step env \
  RUNTIME_STATE_APP_ROOT="$DF13_APP_ROOT" \
  RUNTIME_STATE_ROOT="$DF13_APP_ROOT/runtime-state" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  RUNTIME_STATE_CANDIDATE_ID="$candidate_id" \
  RUNTIME_STATE_GIT_DIR="$DF13_REPOSITORY_DIR" \
  "$release_dir/deploy/runtime-state/capture-current.sh"

run_runtime_state_step env \
  RUNTIME_STATE_APP_ROOT="$DF13_APP_ROOT" \
  RUNTIME_STATE_ROOT="$DF13_APP_ROOT/runtime-state" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  RUNTIME_STATE_CANDIDATE="$candidate" \
  RUNTIME_STATE_GIT_DIR="$DF13_REPOSITORY_DIR" \
  "$release_dir/deploy/runtime-state/verify-current.sh"

run_runtime_state_step env \
  RUNTIME_STATE_APP_ROOT="$DF13_APP_ROOT" \
  RUNTIME_STATE_ROOT="$DF13_APP_ROOT/runtime-state" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  RUNTIME_STATE_CANDIDATE="$candidate" \
  RUNTIME_STATE_GIT_DIR="$DF13_REPOSITORY_DIR" \
  "$release_dir/deploy/runtime-state/promote-current.sh"

switched=false
trap - EXIT INT TERM HUP
printf '%s\n' "DF13_RELEASE_RECONCILIATION_PASS release=$DF13_RELEASE_TAG commit=$DF13_RELEASE_COMMIT tree=$DF13_RELEASE_TREE candidate=$candidate_id"
