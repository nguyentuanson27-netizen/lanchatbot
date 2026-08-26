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
: "${DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256:?DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256 is required}"
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

sha256_file() {
  local digest
  digest="$(sha256sum -- "$1")" || die "FILE_HASH_UNAVAILABLE"
  digest="${digest%% *}"
  [[ "$digest" =~ ^[a-f0-9]{64}$ ]] || die "FILE_HASH_INVALID"
  printf '%s\n' "$digest"
}

assert_release_artifact() {
  local relative_path="$1"
  local artifact="$release_dir/$relative_path"
  local expected_blob
  local actual_blob
  test -f "$artifact" && test ! -L "$artifact" || die "RELEASE_ARTIFACT_MISSING_OR_SYMLINK:$relative_path"
  expected_blob="$(git -C "$DF13_REPOSITORY_DIR" rev-parse "${DF13_RELEASE_COMMIT}:${relative_path}")" || die "RELEASE_ARTIFACT_GIT_BLOB_MISSING:$relative_path"
  actual_blob="$(git hash-object -- "$artifact")" || die "RELEASE_ARTIFACT_HASH_UNAVAILABLE:$relative_path"
  [[ "$expected_blob" =~ ^[a-f0-9]{40}$ && "$actual_blob" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_ARTIFACT_HASH_INVALID:$relative_path"
  test "$actual_blob" = "$expected_blob" || die "RELEASE_FILE_HASH_MISMATCH:$relative_path"
}

atomic_switch_current() {
  local destination="$1"
  local next="$DF13_APP_ROOT/current.next.$$.df13-reconcile"
  test ! -e "$next" || die "CURRENT_NEXT_ALREADY_EXISTS"
  ln -s "$destination" "$next"
  mv -Tf "$next" "$DF13_APP_ROOT/current"
  test "$(readlink -f "$DF13_APP_ROOT/current")" = "$destination" || die "CURRENT_SWITCH_READBACK_MISMATCH"
}

for command_name in docker git node readlink ln mv date flock setsid sha256sum cp mktemp rm; do
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
[[ "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "RUNTIME_STATE_EVIDENCE_HASH_INVALID"

release_dir="$(safe_release_dir "$DF13_RELEASE_DIR")"
previous_release_dir="$(safe_release_dir "$DF13_PREVIOUS_RELEASE_DIR")"
test "$(basename "$release_dir")" = "$DF13_RELEASE_TAG" || die "RELEASE_TAG_DIRECTORY_MISMATCH"
test -L "$DF13_APP_ROOT/current" || die "CURRENT_SYMLINK_MISSING"
test "$(readlink -f "$DF13_APP_ROOT/current")" = "$previous_release_dir" || die "CURRENT_RELEASE_DRIFT"
test -s "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" || die "RUNTIME_STATE_EVIDENCE_MISSING"
test "$(sha256_file "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE")" = "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256" || die "RUNTIME_STATE_EVIDENCE_HASH_MISMATCH"

test "$(git -C "$DF13_REPOSITORY_DIR" cat-file -t "${DF13_RELEASE_TAG}")" = "tag" || die "RELEASE_TAG_NOT_ANNOTATED"
test "$(git -C "$DF13_REPOSITORY_DIR" rev-parse "${DF13_RELEASE_TAG}^{commit}")" = "$DF13_RELEASE_COMMIT" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$(git -C "$DF13_REPOSITORY_DIR" rev-parse "${DF13_RELEASE_COMMIT}^{tree}")" = "$DF13_RELEASE_TREE" || die "RELEASE_TREE_MISMATCH"
test "$(readlink -f "$0")" = "$release_dir/deploy/df13-first-preprod-release-reconcile.sh" || die "RECONCILIATION_ENTRYPOINT_RELEASE_MISMATCH"
for release_artifact in \
  deploy/df13-first-preprod-release-reconcile.sh \
  deploy/docker-compose.vps.yml \
  deploy/runtime-state/release-source.mjs \
  deploy/runtime-state/capture-current.sh \
  deploy/runtime-state/verify-current.sh \
  deploy/runtime-state/promote-current.sh \
  deploy/runtime-state/runtime-state.mjs \
  deploy/runtime-state/service-inventory.json \
  deploy/runtime-state/config-allowlists.json; do
  assert_release_artifact "$release_artifact"
done
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
runtime_state_root="$DF13_APP_ROOT/runtime-state"
runtime_state_current="$runtime_state_root/current.json"
candidate="$runtime_state_root/candidates/$candidate_id.json"
test ! -e "$candidate" || die "RUNTIME_STATE_CANDIDATE_EXISTS"
test -f "$runtime_state_current" && test ! -L "$runtime_state_current" || die "RUNTIME_STATE_CURRENT_MISSING_OR_SYMLINK"
runtime_state_snapshot="$(mktemp "$runtime_state_root/.df13-reconcile-prior.XXXXXX")"
cp -- "$runtime_state_current" "$runtime_state_snapshot"
previous_runtime_state_sha256="$(sha256_file "$runtime_state_snapshot")"
candidate_runtime_state_sha256=""
runtime_state_may_be_promoted=false
switched=false
active_step_pid=""

cleanup_runtime_state_snapshot() {
  if [ -n "$runtime_state_snapshot" ] && test -e "$runtime_state_snapshot"; then
    rm -f -- "$runtime_state_snapshot"
  fi
  runtime_state_snapshot=""
}

restore_previous_runtime_state() {
  if [ "$runtime_state_may_be_promoted" != true ]; then
    return 0
  fi
  local observed_sha256=""
  if test -e "$runtime_state_current"; then
    test -f "$runtime_state_current" && test ! -L "$runtime_state_current" || return 1
    observed_sha256="$(sha256_file "$runtime_state_current")"
  fi
  if [ "$observed_sha256" = "$previous_runtime_state_sha256" ]; then
    runtime_state_may_be_promoted=false
    return 0
  fi
  if [ -n "$observed_sha256" ] && [ "$observed_sha256" != "$candidate_runtime_state_sha256" ]; then
    return 1
  fi
  local restore_next="$runtime_state_current.$$.df13-reconcile-restore"
  test ! -e "$restore_next" || return 1
  cp -- "$runtime_state_snapshot" "$restore_next" || return 1
  mv -Tf "$restore_next" "$runtime_state_current" || return 1
  test "$(sha256_file "$runtime_state_current")" = "$previous_runtime_state_sha256" || return 1
  runtime_state_may_be_promoted=false
}

restore_previous_current() {
  if [ "$switched" = true ]; then
    if ! restore_previous_runtime_state; then
      printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RUNTIME_STATE_RECOVERY_AMBIGUOUS" >&2
      return 1
    fi
    switched=false
    atomic_switch_current "$previous_release_dir"
  fi
  cleanup_runtime_state_snapshot
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
  restore_previous_current || true
  trap - EXIT INT TERM HUP
  exit "$exit_code"
}

commit_reconciliation() {
  # A signal between the two durable pointers would otherwise create split
  # provenance. Ignore the handled signals only while both commit flags are
  # disarmed and the snapshot is removed; before this point the rollback traps
  # restore both pointers, and after it they are already converged.
  trap '' INT TERM HUP
  reconciliation_commit_disarmed=true
  switched=false
  runtime_state_may_be_promoted=false
  cleanup_runtime_state_snapshot
  trap - EXIT INT TERM HUP
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
candidate_runtime_state_sha256="$(sha256_file "$candidate")"

run_runtime_state_step env \
  RUNTIME_STATE_APP_ROOT="$DF13_APP_ROOT" \
  RUNTIME_STATE_ROOT="$DF13_APP_ROOT/runtime-state" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  RUNTIME_STATE_CANDIDATE="$candidate" \
  RUNTIME_STATE_GIT_DIR="$DF13_REPOSITORY_DIR" \
  "$release_dir/deploy/runtime-state/verify-current.sh"

runtime_state_may_be_promoted=true
run_runtime_state_step env \
  RUNTIME_STATE_APP_ROOT="$DF13_APP_ROOT" \
  RUNTIME_STATE_ROOT="$DF13_APP_ROOT/runtime-state" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  RUNTIME_STATE_CANDIDATE="$candidate" \
  RUNTIME_STATE_GIT_DIR="$DF13_REPOSITORY_DIR" \
  "$release_dir/deploy/runtime-state/promote-current.sh"
test "$(sha256_file "$runtime_state_current")" = "$candidate_runtime_state_sha256" || die "RUNTIME_STATE_PROMOTION_READBACK_MISMATCH"
commit_reconciliation
printf '%s\n' "DF13_RELEASE_RECONCILIATION_PASS release=$DF13_RELEASE_TAG commit=$DF13_RELEASE_COMMIT tree=$DF13_RELEASE_TREE candidate=$candidate_id"
