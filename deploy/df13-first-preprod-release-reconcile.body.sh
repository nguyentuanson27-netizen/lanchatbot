#!/usr/bin/bash
set -euo pipefail
set -E

trap - DEBUG RETURN ERR EXIT
unset BASH_ENV ENV CDPATH
unalias -a 2>/dev/null || :
unset -f docker git node readlink ln mv date flock setsid sha256sum cp mktemp rm dirname basename env grep sleep sync ps tr seq chmod stat id 2>/dev/null || :
readonly TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
PATH="$TRUSTED_PATH"
export PATH
readonly PATH

# Reconciles the immutable release that is already running with `current` and
# the append-only runtime-state record. It deliberately has no deployment,
# migration, database-write, or authority transition capability. The reviewed
# runtime-state capture helpers make read-only migration-ledger and routing
# queries so that the promoted record is an observed host identity, not a
# caller-supplied assertion.

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
  test "$(dirname "$resolved")" = "$app_root/releases" || die "RELEASE_DIRECTORY_OUTSIDE_ROOT"
  test -d "$resolved" || die "RELEASE_DIRECTORY_MISSING"
  printf '%s\n' "$resolved"
}

assert_path_in_parent() {
  local candidate="$1"
  local expected_parent="$2"
  local expected_prefix="$3"
  local failure_code="$4"
  local resolved=""
  local parent=""
  local name=""
  resolved="$(readlink -f -- "$candidate")" || die "$failure_code"
  parent="$(dirname "$resolved")"
  name="$(basename "$resolved")"
  test "$parent" = "$expected_parent" || die "$failure_code"
  [[ "$name" = "$expected_prefix"* ]] || die "$failure_code"
  printf '%s\n' "$resolved"
}

assert_private_regular_file() {
  local candidate="$1"
  local failure_code="$2"
  local owner=""
  local mode=""
  test -f "$candidate" && test ! -L "$candidate" || die "$failure_code"
  owner="$(stat -c '%u' -- "$candidate")" || die "$failure_code"
  mode="$(stat -c '%a' -- "$candidate")" || die "$failure_code"
  test "$owner" = "$(id -u)" || die "$failure_code"
  [[ "$mode" =~ ^[0-7]{3,4}$ ]] || die "$failure_code"
  (( (8#$mode & 8#77) == 0 )) || die "$failure_code"
}

kernel_boot_id() {
  local value=""
  IFS= read -r value < /proc/sys/kernel/random/boot_id || die "BOOT_ID_UNREADABLE"
  [[ "$value" =~ ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ ]] || die "BOOT_ID_INVALID"
  printf '%s\n' "$value"
}

process_start_ticks() {
  local pid="$1"
  local stat_line=""
  local suffix=""
  local -a fields=()
  test -r "/proc/$pid/stat" || return 1
  IFS= read -r stat_line < "/proc/$pid/stat" || return 1
  suffix="${stat_line##*) }"
  read -r -a fields <<< "$suffix" || return 1
  local ticks="${fields[19]:-}"
  [[ "$ticks" =~ ^[1-9][0-9]*$ ]] || return 1
  printf '%s\n' "$ticks"
}

process_state() {
  local pid="$1"
  local stat_line=""
  local suffix=""
  test -r "/proc/$pid/stat" || return 1
  IFS= read -r stat_line < "/proc/$pid/stat" || return 1
  suffix="${stat_line##*) }"
  local state="${suffix%% *}"
  [[ "$state" =~ ^[A-Z]$ ]] || return 1
  printf '%s\n' "$state"
}

process_has_helper_token() {
  local pid="$1"
  local token="$2"
  test -r "/proc/$pid/environ" || return 1
  tr '\000' '\n' < "/proc/$pid/environ" | grep -Fqx "DF13_RECONCILE_HELPER_TOKEN=$token"
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
  expected_blob="$(git -C "$repository_dir" rev-parse "${DF13_RELEASE_COMMIT}:${relative_path}")" || die "RELEASE_ARTIFACT_GIT_BLOB_MISSING:$relative_path"
  actual_blob="$(git hash-object -- "$artifact")" || die "RELEASE_ARTIFACT_HASH_UNAVAILABLE:$relative_path"
  [[ "$expected_blob" =~ ^[a-f0-9]{40}$ && "$actual_blob" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_ARTIFACT_HASH_INVALID:$relative_path"
  test "$actual_blob" = "$expected_blob" || die "RELEASE_FILE_HASH_MISMATCH:$relative_path"
}

atomic_switch_current() {
  local destination="$1"
  local next="$app_root/current.next.$$.df13-reconcile"
  test ! -e "$next" || die "CURRENT_NEXT_ALREADY_EXISTS"
  ln -s "$destination" "$next"
  mv -Tf "$next" "$app_root/current"
  test "$(readlink -f "$app_root/current")" = "$destination" || die "CURRENT_SWITCH_READBACK_MISMATCH"
}

for command_name in docker git node readlink ln mv date flock setsid sha256sum cp mktemp rm dirname basename env grep sleep sync ps tr seq chmod stat id; do
  require_command "$command_name"
done

script_path="$(readlink -f "$0")" || die "RECONCILIATION_ENTRYPOINT_UNRESOLVED"
release_dir="$(dirname "$(dirname "$script_path")")"
releases_dir="$(dirname "$release_dir")"
app_root="$(dirname "$releases_dir")"
test "$releases_dir" = "$app_root/releases" || die "RECONCILIATION_ENTRYPOINT_OUTSIDE_RELEASES"
test "$script_path" = "$release_dir/deploy/df13-first-preprod-release-reconcile.body.sh" || die "RECONCILIATION_BODY_RELEASE_MISMATCH"
release_tag="$(basename "$release_dir")"
case "$release_tag" in
  *[!A-Za-z0-9._-]*|'') die "RELEASE_TAG_INVALID" ;;
esac
readonly repository_dir="$app_root/repository"
readonly realtime_container="lana-chatbot-realtime-worker"
readonly DEPLOYMENT_LOCK_FILE="$app_root/shared/lana-chatbot-deployment.lock"

acquire_deployment_lock() {
  local lock_directory="$(dirname "$DEPLOYMENT_LOCK_FILE")"
  local resolved_lock=""
  test ! -L "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_SYMLINK"
  if test -e "$DEPLOYMENT_LOCK_FILE"; then
    test -f "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_NOT_REGULAR"
  fi
  resolved_lock="$(readlink -f "$DEPLOYMENT_LOCK_FILE")" || die "DEPLOYMENT_LOCK_UNRESOLVED"
  test "$(dirname "$resolved_lock")" = "$lock_directory" || die "DEPLOYMENT_LOCK_OUTSIDE_SHARED_ROOT"
  test "$(basename "$resolved_lock")" = "$(basename "$DEPLOYMENT_LOCK_FILE")" || die "DEPLOYMENT_LOCK_OUTSIDE_SHARED_ROOT"
  if test -e "/proc/$$/fd/9" &&
    test "$(readlink -f "/proc/$$/fd/9")" = "$resolved_lock"; then
    flock -n 9 || die "INHERITED_DEPLOYMENT_LOCK_NOT_HELD"
    return
  fi
  exec 9>> "$DEPLOYMENT_LOCK_FILE"
  test "$(readlink -f "/proc/$$/fd/9")" = "$resolved_lock" || die "DEPLOYMENT_LOCK_DESCRIPTOR_MISMATCH"
  flock -n 9 || die "RELEASE_RECONCILIATION_LOCK_UNAVAILABLE"
}

runtime_state_root="$(readlink -f "$app_root/runtime-state")" || die "RUNTIME_STATE_ROOT_UNRESOLVED"
test -d "$runtime_state_root" && test ! -L "$runtime_state_root" || die "RUNTIME_STATE_ROOT_INVALID"
runtime_state_current="$runtime_state_root/current.json"
journal_file="$runtime_state_root/df13-first-preprod-release-reconcile.journal"
journal_target_release_dir=""
journal_previous_release_dir=""
journal_runtime_state_snapshot=""
journal_previous_runtime_state_sha256=""
journal_candidate_path=""
journal_candidate_runtime_state_sha256=""
journal_service_evidence_snapshot=""
journal_service_evidence_sha256=""
journal_host_boot_id=""
journal_helper_step=""
journal_helper_pid=""
journal_helper_start_ticks=""
journal_helper_token=""
service_evidence_snapshot=""
service_evidence_sha256=""
host_boot_id="$(kernel_boot_id)"

journal_write() {
  local state="$1"
  local helper_step="$2"
  local helper_pid="$3"
  local helper_start_ticks="$4"
  local temporary=""
  case "$state" in
    PREPARED|HELPER_PREPARED|HELPER_RUNNING) ;;
    *) die "JOURNAL_STATE_INVALID" ;;
  esac
  [[ "$helper_pid" = "" || "$helper_pid" =~ ^[1-9][0-9]*$ ]] || die "JOURNAL_HELPER_PID_INVALID"
  [[ "$helper_start_ticks" = "" || "$helper_start_ticks" =~ ^[1-9][0-9]*$ ]] || die "JOURNAL_HELPER_START_TICKS_INVALID"
  { test -z "$helper_pid" && test -z "$helper_start_ticks"; } || { test -n "$helper_pid" && test -n "$helper_start_ticks"; } || die "JOURNAL_HELPER_IDENTITY_INCOMPLETE"
  for journal_value in \
    "$previous_release_dir" "$runtime_state_snapshot" "$previous_runtime_state_sha256" \
    "$candidate" "$candidate_runtime_state_sha256" "$service_evidence_snapshot" "$service_evidence_sha256" \
    "$host_boot_id" "$helper_step" "$helper_pid" "$helper_start_ticks" "$operation_token"; do
    [[ "$journal_value" != *$'\n'* && "$journal_value" != *=* ]] || die "JOURNAL_VALUE_UNSAFE"
  done
  temporary="$(mktemp "$runtime_state_root/.df13-reconcile-journal.XXXXXX")" || die "JOURNAL_TEMPORARY_CREATE_FAILED"
  chmod 600 "$temporary" || die "JOURNAL_TEMPORARY_MODE_FAILED"
  {
    printf '%s\n' "version=1"
    printf '%s\n' "state=$state"
    printf '%s\n' "target_release_dir=$release_dir"
    printf '%s\n' "previous_release_dir=$previous_release_dir"
    printf '%s\n' "runtime_state_snapshot=$runtime_state_snapshot"
    printf '%s\n' "previous_runtime_state_sha256=$previous_runtime_state_sha256"
    printf '%s\n' "candidate_path=$candidate"
    printf '%s\n' "candidate_runtime_state_sha256=$candidate_runtime_state_sha256"
    printf '%s\n' "service_evidence_snapshot=$service_evidence_snapshot"
    printf '%s\n' "service_evidence_sha256=$service_evidence_sha256"
    printf '%s\n' "host_boot_id=$host_boot_id"
    printf '%s\n' "helper_step=$helper_step"
    printf '%s\n' "helper_pid=$helper_pid"
    printf '%s\n' "helper_start_ticks=$helper_start_ticks"
    printf '%s\n' "helper_token=$operation_token"
  } > "$temporary" || die "JOURNAL_WRITE_FAILED"
  sync -f "$temporary" || die "JOURNAL_SYNC_FAILED"
  mv -Tf "$temporary" "$journal_file" || die "JOURNAL_PROMOTION_FAILED"
  sync -f "$runtime_state_root" || die "JOURNAL_DIRECTORY_SYNC_FAILED"
}

journal_load() {
  local key value
  declare -A seen=()
  assert_private_regular_file "$journal_file" "JOURNAL_MISSING_OR_SYMLINK"
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^(version|state|target_release_dir|previous_release_dir|runtime_state_snapshot|previous_runtime_state_sha256|candidate_path|candidate_runtime_state_sha256|service_evidence_snapshot|service_evidence_sha256|host_boot_id|helper_step|helper_pid|helper_start_ticks|helper_token)$ ]] || die "JOURNAL_FIELD_UNKNOWN"
    test -z "${seen[$key]+x}" || die "JOURNAL_FIELD_DUPLICATE"
    seen[$key]=1
    [[ "$value" != *$'\n'* && "$value" != *=* ]] || die "JOURNAL_VALUE_UNSAFE"
    case "$key" in
      version) test "$value" = "1" || die "JOURNAL_VERSION_INVALID" ;;
      state) case "$value" in PREPARED|HELPER_PREPARED|HELPER_RUNNING) ;; *) die "JOURNAL_STATE_INVALID" ;; esac ;;
      target_release_dir) journal_target_release_dir="$value" ;;
      previous_release_dir) journal_previous_release_dir="$value" ;;
      runtime_state_snapshot) journal_runtime_state_snapshot="$value" ;;
      previous_runtime_state_sha256) journal_previous_runtime_state_sha256="$value" ;;
      candidate_path) journal_candidate_path="$value" ;;
      candidate_runtime_state_sha256) journal_candidate_runtime_state_sha256="$value" ;;
      service_evidence_snapshot) journal_service_evidence_snapshot="$value" ;;
      service_evidence_sha256) journal_service_evidence_sha256="$value" ;;
      host_boot_id) journal_host_boot_id="$value" ;;
      helper_step) journal_helper_step="$value" ;;
      helper_pid) journal_helper_pid="$value" ;;
      helper_start_ticks) journal_helper_start_ticks="$value" ;;
      helper_token) journal_helper_token="$value" ;;
    esac
  done < "$journal_file"
  for key in version state target_release_dir previous_release_dir runtime_state_snapshot previous_runtime_state_sha256 candidate_path candidate_runtime_state_sha256 service_evidence_snapshot service_evidence_sha256 host_boot_id helper_step helper_pid helper_start_ticks helper_token; do
    test -n "${seen[$key]+x}" || die "JOURNAL_FIELD_MISSING:$key"
  done
  [[ "$journal_previous_runtime_state_sha256" =~ ^[a-f0-9]{64}$ ]] || die "JOURNAL_PRIOR_HASH_INVALID"
  [[ "$journal_candidate_runtime_state_sha256" = "" || "$journal_candidate_runtime_state_sha256" =~ ^[a-f0-9]{64}$ ]] || die "JOURNAL_CANDIDATE_HASH_INVALID"
  [[ "$journal_service_evidence_sha256" =~ ^[a-f0-9]{64}$ ]] || die "JOURNAL_EVIDENCE_HASH_INVALID"
  [[ "$journal_host_boot_id" =~ ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ ]] || die "JOURNAL_BOOT_ID_INVALID"
  [[ "$journal_helper_pid" = "" || "$journal_helper_pid" =~ ^[1-9][0-9]*$ ]] || die "JOURNAL_HELPER_PID_INVALID"
  [[ "$journal_helper_start_ticks" = "" || "$journal_helper_start_ticks" =~ ^[1-9][0-9]*$ ]] || die "JOURNAL_HELPER_START_TICKS_INVALID"
  { test -z "$journal_helper_pid" && test -z "$journal_helper_start_ticks"; } || { test -n "$journal_helper_pid" && test -n "$journal_helper_start_ticks"; } || die "JOURNAL_HELPER_IDENTITY_INCOMPLETE"
  test -n "$journal_helper_token" || die "JOURNAL_HELPER_TOKEN_MISSING"
  test "$(safe_release_dir "$journal_target_release_dir")" = "$journal_target_release_dir" || die "JOURNAL_TARGET_RELEASE_INVALID"
  test "$(safe_release_dir "$journal_previous_release_dir")" = "$journal_previous_release_dir" || die "JOURNAL_PRIOR_RELEASE_INVALID"
  journal_runtime_state_snapshot="$(assert_path_in_parent "$journal_runtime_state_snapshot" "$runtime_state_root" ".df13-reconcile-prior." "JOURNAL_SNAPSHOT_OUTSIDE_ROOT")"
  journal_candidate_path="$(assert_path_in_parent "$journal_candidate_path" "$runtime_state_root/candidates" "df13-reconcile-" "JOURNAL_CANDIDATE_OUTSIDE_ROOT")"
  journal_service_evidence_snapshot="$(assert_path_in_parent "$journal_service_evidence_snapshot" "$runtime_state_root" ".df13-reconcile-evidence." "JOURNAL_EVIDENCE_OUTSIDE_ROOT")"
  assert_private_regular_file "$journal_runtime_state_snapshot" "JOURNAL_SNAPSHOT_MISSING_OR_SYMLINK"
  assert_private_regular_file "$journal_service_evidence_snapshot" "JOURNAL_EVIDENCE_MISSING_OR_SYMLINK"
  test "$(sha256_file "$journal_runtime_state_snapshot")" = "$journal_previous_runtime_state_sha256" || die "JOURNAL_SNAPSHOT_HASH_MISMATCH"
  test "$(sha256_file "$journal_service_evidence_snapshot")" = "$journal_service_evidence_sha256" || die "JOURNAL_EVIDENCE_HASH_MISMATCH"
}

terminate_orphaned_helper() {
  local helper_pid="$1"
  local helper_start_ticks="$2"
  local helper_token="$3"
  local helper_group=""
  test -n "$helper_pid" || return 0
  if [ "$journal_host_boot_id" != "$host_boot_id" ]; then
    return 0
  fi
  if ! kill -0 "$helper_pid" 2>/dev/null; then
    return 0
  fi
  if [ "$(process_state "$helper_pid" || true)" = "Z" ]; then
    return 0
  fi
  if [ "$(process_start_ticks "$helper_pid" || true)" != "$helper_start_ticks" ]; then
    return 0
  fi
  if ! process_has_helper_token "$helper_pid" "$helper_token"; then
    die "JOURNAL_HELPER_TOKEN_UNVERIFIABLE"
  fi
  helper_group="$(ps -o pgid= -p "$helper_pid" | tr -d ' ')" || die "JOURNAL_HELPER_PROCESS_UNOBSERVABLE"
  test "$helper_group" = "$helper_pid" || die "JOURNAL_HELPER_PROCESS_GROUP_MISMATCH"
  kill -TERM -- "-$helper_pid" 2>/dev/null || die "JOURNAL_HELPER_TERMINATION_FAILED"
  for _ in $(seq 1 50); do
    kill -0 "$helper_pid" 2>/dev/null || return 0
    sleep 0.1
  done
  kill -KILL -- "-$helper_pid" 2>/dev/null || die "JOURNAL_HELPER_KILL_FAILED"
  for _ in $(seq 1 50); do
    kill -0 "$helper_pid" 2>/dev/null || return 0
    sleep 0.1
  done
  die "JOURNAL_HELPER_STILL_RUNNING"
}

restore_runtime_state_from_journal() {
  local observed_sha256=""
  test -f "$runtime_state_current" && test ! -L "$runtime_state_current" || return 1
  observed_sha256="$(sha256_file "$runtime_state_current")"
  if [ "$observed_sha256" = "$journal_previous_runtime_state_sha256" ]; then
    return 0
  fi
  test -n "$journal_candidate_runtime_state_sha256" || return 1
  test "$observed_sha256" = "$journal_candidate_runtime_state_sha256" || return 1
  local restore_next="$runtime_state_current.$$.df13-reconcile-restore"
  test ! -e "$restore_next" || return 1
  cp -- "$journal_runtime_state_snapshot" "$restore_next" || return 1
  mv -Tf "$restore_next" "$runtime_state_current" || return 1
  test "$(sha256_file "$runtime_state_current")" = "$journal_previous_runtime_state_sha256" || return 1
}

restore_current_from_journal() {
  local observed_release=""
  test -L "$app_root/current" || return 1
  observed_release="$(safe_release_dir "$(readlink -f "$app_root/current")")"
  if [ "$observed_release" = "$journal_previous_release_dir" ]; then
    return 0
  fi
  test "$observed_release" = "$journal_target_release_dir" || return 1
  atomic_switch_current "$journal_previous_release_dir"
}

recover_incomplete_reconciliation() {
  test -e "$journal_file" || test -L "$journal_file" || return 0
  journal_load
  test "$journal_target_release_dir" = "$release_dir" || die "JOURNAL_TARGET_RELEASE_MISMATCH"
  terminate_orphaned_helper "$journal_helper_pid" "$journal_helper_start_ticks" "$journal_helper_token"
  restore_runtime_state_from_journal || die "RUNTIME_STATE_RECOVERY_AMBIGUOUS"
  restore_current_from_journal || die "CURRENT_RECOVERY_AMBIGUOUS"
  rm -f -- "$journal_file" "$journal_runtime_state_snapshot" "$journal_service_evidence_snapshot"
  sync -f "$runtime_state_root" || die "RECOVERY_DIRECTORY_SYNC_FAILED"
  die "INCOMPLETE_RECONCILIATION_RECOVERED"
}

: "${DF13_RELEASE_COMMIT:?DF13_RELEASE_COMMIT is required}"
: "${DF13_RELEASE_TREE:?DF13_RELEASE_TREE is required}"
: "${DF13_RELEASE_REALTIME_IMAGE:?DF13_RELEASE_REALTIME_IMAGE is required}"
: "${DF13_RELEASE_REALTIME_IMAGE_ID:?DF13_RELEASE_REALTIME_IMAGE_ID is required}"
: "${DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE:?DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE is required}"
: "${DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256:?DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256 is required}"
[[ "$DF13_RELEASE_COMMIT" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_COMMIT_INVALID"
[[ "$DF13_RELEASE_TREE" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_TREE_INVALID"
[[ "$DF13_RELEASE_REALTIME_IMAGE_ID" =~ ^sha256:[a-f0-9]{64}$ ]] || die "REALTIME_IMAGE_ID_INVALID"
[[ "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "RUNTIME_STATE_EVIDENCE_HASH_INVALID"

release_dir="$(safe_release_dir "$release_dir")"
test -s "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" && test ! -L "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" || die "RUNTIME_STATE_EVIDENCE_MISSING_OR_SYMLINK"

test "$(git -C "$repository_dir" cat-file -t "${release_tag}")" = "tag" || die "RELEASE_TAG_NOT_ANNOTATED"
test "$(git -C "$repository_dir" rev-parse "${release_tag}^{commit}")" = "$DF13_RELEASE_COMMIT" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$(git -C "$repository_dir" rev-parse "${DF13_RELEASE_COMMIT}^{tree}")" = "$DF13_RELEASE_TREE" || die "RELEASE_TREE_MISMATCH"
for release_artifact in \
  deploy/df13-first-preprod-release-reconcile.sh \
  deploy/df13-first-preprod-release-reconcile.body.sh \
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
  --release "$release_tag" >/dev/null
DF13_RELEASE_SOURCE_FILE="$release_dir/.release-source.json" \
DF13_RELEASE_EXPECTED_COMMIT="$DF13_RELEASE_COMMIT" \
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const source = JSON.parse(readFileSync(process.env.DF13_RELEASE_SOURCE_FILE, "utf8"));
    if (source.commit !== process.env.DF13_RELEASE_EXPECTED_COMMIT) process.exit(1);
  ' || die "RELEASE_SOURCE_COMMIT_MISMATCH"

mkdir -p "$(dirname "$DEPLOYMENT_LOCK_FILE")"
acquire_deployment_lock
recover_incomplete_reconciliation
test -L "$app_root/current" || die "CURRENT_SYMLINK_MISSING"
previous_release_dir="$(safe_release_dir "$(readlink -f "$app_root/current")")"

compose_file="$release_dir/deploy/docker-compose.vps.yml"
test -f "$compose_file" || die "RELEASE_COMPOSE_MISSING"
test "$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$realtime_container")" = "$compose_file" || die "REALTIME_COMPOSE_SOURCE_MISMATCH"
test "$(docker inspect --format '{{.Config.Image}}' "$realtime_container")" = "$DF13_RELEASE_REALTIME_IMAGE" || die "REALTIME_IMAGE_REFERENCE_MISMATCH"
test "$(docker inspect --format '{{.Image}}' "$realtime_container")" = "$DF13_RELEASE_REALTIME_IMAGE_ID" || die "REALTIME_IMAGE_ID_MISMATCH"
test "$(docker inspect --format '{{.State.Running}}' "$realtime_container")" = "true" || die "REALTIME_NOT_RUNNING"
test "$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$DF13_RELEASE_REALTIME_IMAGE_ID")" = "$DF13_RELEASE_COMMIT" || die "REALTIME_REVISION_MISMATCH"

candidate_id="df13-reconcile-${release_tag}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
candidate="$runtime_state_root/candidates/$candidate_id.json"
test ! -e "$candidate" || die "RUNTIME_STATE_CANDIDATE_EXISTS"
test -f "$runtime_state_current" && test ! -L "$runtime_state_current" || die "RUNTIME_STATE_CURRENT_MISSING_OR_SYMLINK"
runtime_state_snapshot="$(mktemp "$runtime_state_root/.df13-reconcile-prior.XXXXXX")"
cp -- "$runtime_state_current" "$runtime_state_snapshot"
assert_private_regular_file "$runtime_state_snapshot" "RUNTIME_STATE_SNAPSHOT_PRIVATE_FILE_INVALID"
previous_runtime_state_sha256="$(sha256_file "$runtime_state_snapshot")"
service_evidence_snapshot="$(mktemp "$runtime_state_root/.df13-reconcile-evidence.XXXXXX")"
chmod 600 "$service_evidence_snapshot" || die "RUNTIME_STATE_EVIDENCE_SNAPSHOT_MODE_FAILED"
cp -- "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE" "$service_evidence_snapshot"
assert_private_regular_file "$service_evidence_snapshot" "RUNTIME_STATE_EVIDENCE_SNAPSHOT_PRIVATE_FILE_INVALID"
service_evidence_sha256="$(sha256_file "$service_evidence_snapshot")"
test "$service_evidence_sha256" = "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256" || die "RUNTIME_STATE_EVIDENCE_HASH_MISMATCH"
sync -f "$service_evidence_snapshot" || die "RUNTIME_STATE_EVIDENCE_SNAPSHOT_SYNC_FAILED"
candidate_runtime_state_sha256=""
active_step_pid=""
operation_token="$candidate_id"

restore_previous_state() {
  test -e "$journal_file" || test -L "$journal_file" || return 0
  journal_load
  test "$journal_target_release_dir" = "$release_dir" || return 1
  terminate_orphaned_helper "$journal_helper_pid" "$journal_helper_start_ticks" "$journal_helper_token"
  restore_runtime_state_from_journal || return 1
  restore_current_from_journal || return 1
  rm -f -- "$journal_file" "$journal_runtime_state_snapshot" "$journal_service_evidence_snapshot"
  sync -f "$runtime_state_root" || return 1
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
  restore_previous_state || true
  trap - EXIT INT TERM HUP
  exit "$exit_code"
}

commit_reconciliation() {
  # Both durable pointers have passed exact readback. Mask handled signals only
  # while removing the recovery journal; before this point its exact snapshot
  # restores both pointers, and after it the pointers already converge.
  trap '' INT TERM HUP
  rm -f -- "$journal_file" "$runtime_state_snapshot" "$service_evidence_snapshot"
  sync -f "$runtime_state_root" || die "COMMIT_DIRECTORY_SYNC_FAILED"
  trap - EXIT INT TERM HUP
}

run_runtime_state_step() {
  # A signal after the helper begins but before its process group is recorded
  # would leave an unowned helper able to publish runtime state after rollback.
  # Defer handled signals only across that launch handshake, then fail closed
  # once the child process group is recorded. The child restores default
  # dispositions before exec so it never inherits the parent's temporary
  # deferred handlers.
  local step_name="$1"
  shift
  local launch_signal_exit_code=0
  trap 'launch_signal_exit_code=130' INT
  trap 'launch_signal_exit_code=143' TERM
  trap 'launch_signal_exit_code=129' HUP
  local step_pid=""
  journal_write HELPER_PREPARED "$step_name" "" ""
  setsid env -u BASH_ENV -u ENV --default-signal=INT,TERM,HUP "DF13_RECONCILE_HELPER_TOKEN=$operation_token" /usr/bin/bash --noprofile --norc -c '
    journal_file="$1"
    expected_step="$2"
    expected_token="$3"
    shift 3
    for _ in $(seq 1 100); do
      if test -f "$journal_file" &&
        grep -Fqx "state=HELPER_RUNNING" "$journal_file" &&
        grep -Fqx "helper_step=$expected_step" "$journal_file" &&
        grep -Fqx "helper_token=$expected_token" "$journal_file" &&
        grep -Fqx "helper_pid=$$" "$journal_file"; then
        exec "$@"
      fi
      test -e "$journal_file" || exit 1
      sleep 0.05
    done
    exit 1
  ' bash "$journal_file" "$step_name" "$operation_token" "$@" &
  step_pid="$!"
  active_step_pid="$step_pid"
  local step_start_ticks="$(process_start_ticks "$step_pid")" || die "HELPER_START_TICKS_UNAVAILABLE"
  journal_write HELPER_RUNNING "$step_name" "$step_pid" "$step_start_ticks"
  trap 'abort_reconciliation 130' INT
  trap 'abort_reconciliation 143' TERM
  trap 'abort_reconciliation 129' HUP
  if [ "$launch_signal_exit_code" -ne 0 ]; then
    abort_reconciliation "$launch_signal_exit_code"
  fi
  local step_status=0
  if wait "$active_step_pid"; then
    step_status=0
  else
    step_status=$?
  fi
  active_step_pid=""
  journal_write PREPARED "" "" ""
  return "$step_status"
}

journal_write PREPARED "" "" ""
trap restore_previous_state EXIT
trap 'abort_reconciliation 130' INT
trap 'abort_reconciliation 143' TERM
trap 'abort_reconciliation 129' HUP

atomic_switch_current "$release_dir"

run_runtime_state_step capture env \
  RUNTIME_STATE_APP_ROOT="$app_root" \
  RUNTIME_STATE_ROOT="$runtime_state_root" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$service_evidence_snapshot" \
  RUNTIME_STATE_CANDIDATE_ID="$candidate_id" \
  RUNTIME_STATE_GIT_DIR="$repository_dir" \
  "$release_dir/deploy/runtime-state/capture-current.sh"
candidate_runtime_state_sha256="$(sha256_file "$candidate")"
journal_write PREPARED "" "" ""

run_runtime_state_step verify env \
  RUNTIME_STATE_APP_ROOT="$app_root" \
  RUNTIME_STATE_ROOT="$runtime_state_root" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$service_evidence_snapshot" \
  RUNTIME_STATE_CANDIDATE="$candidate" \
  RUNTIME_STATE_GIT_DIR="$repository_dir" \
  "$release_dir/deploy/runtime-state/verify-current.sh"

run_runtime_state_step promote env \
  RUNTIME_STATE_APP_ROOT="$app_root" \
  RUNTIME_STATE_ROOT="$runtime_state_root" \
  RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$service_evidence_snapshot" \
  RUNTIME_STATE_CANDIDATE="$candidate" \
  RUNTIME_STATE_GIT_DIR="$repository_dir" \
  "$release_dir/deploy/runtime-state/promote-current.sh"
test "$(sha256_file "$runtime_state_current")" = "$candidate_runtime_state_sha256" || die "RUNTIME_STATE_PROMOTION_READBACK_MISMATCH"
commit_reconciliation
printf '%s\n' "DF13_RELEASE_RECONCILIATION_PASS release=$release_tag commit=$DF13_RELEASE_COMMIT tree=$DF13_RELEASE_TREE candidate=$candidate_id"
