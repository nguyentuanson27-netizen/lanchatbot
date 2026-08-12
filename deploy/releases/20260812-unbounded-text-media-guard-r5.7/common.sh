#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_RELEASE_TAG="20260812-unbounded-text-media-guard-r5.7"
readonly IMPLEMENTATION_COMMIT="ab0638e30d360c190f04f11faa59dc7a7348391c"
readonly EXPECTED_REALTIME_IMAGE="lana-chatbot-app:unbounded-text-media-guard-r5.7"
readonly EXPECTED_MANIFEST_SHA256="46add84eca65b7974defb237c3103ca86e8645de5483affa6a4f5be18f5bac23"
readonly EXPECTED_COMPOSE_SHA256="e59ab08b6ad42c2d1d2e3a5a11ce9e34a935921c866917b0d23b6c3c5d69ac33"
readonly EXPECTED_LATEST_MIGRATION="0031_admin_policy_safe_deletion"
readonly EXPECTED_PAGE_ID="1198992073286645"
readonly EXPECTED_REALTIME_WORKER_ID="realtime-worker-1"
readonly EXPECTED_PREVIOUS_RELEASE="20260812-bf10-delivery-r5.6"
readonly EXPECTED_PREVIOUS_COMPOSE_SHA256="e59ab08b6ad42c2d1d2e3a5a11ce9e34a935921c866917b0d23b6c3c5d69ac33"
readonly EXPECTED_ROLLBACK_REALTIME_IMAGE="lana-chatbot-app:bf03-wave-c-r5.5"
readonly EXPECTED_ROLLBACK_REALTIME_IMAGE_ID="sha256:97b59eb4c7fbf03be8c4efd292af06fcfafa0068dbaeb2be9d6aa8385eea951a"
readonly EXPECTED_ROLLBACK_REALTIME_REVISION="31d74695a794a28d6f93427416593b2a414270d6"
readonly EXPECTED_ROLLBACK_REALTIME_RELEASE_ID="20260810-bf03-wave-c-r5.5"
readonly EXPECTED_CANDIDATE_TAG="20260812-unbounded-text-media-guard-r5.7-review-candidate.1"
readonly EXPECTED_ORIGIN_SSH="git@github.com:nguyentuanson27-netizen/lanchatbot.git"
readonly EXPECTED_ORIGIN_HTTPS="https://github.com/nguyentuanson27-netizen/lanchatbot.git"

APP_ROOT="${APP_ROOT:-/opt/lana-chatbot}"
REPOSITORY_DIR="${REPOSITORY_DIR:-$APP_ROOT/repository}"
INFRASTRUCTURE_ENV_FILE="${INFRASTRUCTURE_ENV_FILE:-$APP_ROOT/shared/.env.infrastructure}"
RELEASE_TAG="${RELEASE_TAG:-$EXPECTED_RELEASE_TAG}"
RELEASE_COMMIT="${RELEASE_COMMIT:-}"
RELEASE_TAG_OBJECT="${RELEASE_TAG_OBJECT:-}"
REVIEWED_CANDIDATE_COMMIT="${REVIEWED_CANDIDATE_COMMIT:-}"
CANDIDATE_TAG_OBJECT="${CANDIDATE_TAG_OBJECT:-}"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_TAG"
COMPOSE_FILE="$RELEASE_DIR/deploy/docker-compose.vps.yml"
EVIDENCE_DIR="${EVIDENCE_DIR:-$APP_ROOT/shared/release-artifacts/$RELEASE_TAG}"
ENV_BACKUP="$APP_ROOT/shared/.env.infrastructure.backup-$RELEASE_TAG"
TARGET_REALTIME_IMAGE="${TARGET_REALTIME_IMAGE:-$EXPECTED_REALTIME_IMAGE}"
RELEASE_SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_COMPOSE_OVERRIDE="$RELEASE_DIR/deploy/releases/$EXPECTED_RELEASE_TAG/realtime-rollback-image-override.yml"
readonly DEPLOYMENT_LOCK_FILE="$APP_ROOT/shared/lana-chatbot-deployment.lock"

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command missing: $1"
}

validate_image_ref() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*:[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || die "invalid image reference"
}

validate_image_id() {
  [[ "$1" =~ ^sha256:[a-f0-9]{64}$ ]] || die "invalid image ID"
}

validate_release_id() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]] || die "invalid release ID"
}

require_release_provenance() {
  test "$RELEASE_TAG" = "$EXPECTED_RELEASE_TAG" || die "unexpected release tag"
  [[ "$RELEASE_COMMIT" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_COMMIT must be a full lowercase SHA-1"
  [[ "$RELEASE_TAG_OBJECT" =~ ^[a-f0-9]{40}$ ]] || die "RELEASE_TAG_OBJECT must be a full lowercase SHA-1"
  test "$RELEASE_DIR" = "$APP_ROOT/releases/$EXPECTED_RELEASE_TAG" || die "release path mismatch"
  test "$TARGET_REALTIME_IMAGE" = "$EXPECTED_REALTIME_IMAGE" || die "unexpected target realtime image"
  [[ "$REVIEWED_CANDIDATE_COMMIT" =~ ^[a-f0-9]{40}$ ]] || die "REVIEWED_CANDIDATE_COMMIT must be a full lowercase SHA-1"
  [[ "$CANDIDATE_TAG_OBJECT" =~ ^[a-f0-9]{40}$ ]] || die "CANDIDATE_TAG_OBJECT must be a full lowercase SHA-1"

  local tag_ref="refs/tags/$RELEASE_TAG"
  test "$(git -C "$REPOSITORY_DIR" cat-file -t "$tag_ref")" = "tag" || die "release tag must be annotated"
  test "$(git -C "$REPOSITORY_DIR" rev-parse "$tag_ref")" = "$RELEASE_TAG_OBJECT" || die "release tag object mismatch"
  local peeled origin_url manifest_sha compose_sha
  peeled="$(git -C "$REPOSITORY_DIR" rev-parse "$tag_ref^{}")"
  test "$peeled" = "$RELEASE_COMMIT" || die "release tag/commit mismatch"
  local candidate_ref="refs/tags/$EXPECTED_CANDIDATE_TAG"
  test "$(git -C "$REPOSITORY_DIR" cat-file -t "$candidate_ref")" = "tag" || die "candidate tag must be annotated"
  test "$(git -C "$REPOSITORY_DIR" rev-parse "$candidate_ref")" = "$CANDIDATE_TAG_OBJECT" || die "candidate tag object mismatch"
  test "$(git -C "$REPOSITORY_DIR" rev-parse "$candidate_ref^{}")" = "$REVIEWED_CANDIDATE_COMMIT" || die "candidate tag/commit mismatch"
  local parent_line
  parent_line="$(git -C "$REPOSITORY_DIR" show -s --format='%P' "$RELEASE_COMMIT")"
  test "$parent_line" = "$IMPLEMENTATION_COMMIT $REVIEWED_CANDIDATE_COMMIT" || die "final release merge parents mismatch"
  git -C "$REPOSITORY_DIR" merge-base --is-ancestor "$IMPLEMENTATION_COMMIT" "$RELEASE_COMMIT" || die "implementation commit is not in release"
  git -C "$REPOSITORY_DIR" cat-file -e "refs/remotes/origin/main^{commit}" || die "origin/main is not available for provenance"
  test "$(git -C "$REPOSITORY_DIR" rev-parse refs/remotes/origin/main)" = "$RELEASE_COMMIT" || die "final release commit is not exact fetched origin/main"
  origin_url="$(git -C "$REPOSITORY_DIR" remote get-url origin)"
  case "$origin_url" in
    "$EXPECTED_ORIGIN_SSH"|"$EXPECTED_ORIGIN_HTTPS") ;;
    *) die "unexpected GitHub origin" ;;
  esac
  manifest_sha="$(git -C "$REPOSITORY_DIR" show "$tag_ref:deploy/manifests/$EXPECTED_RELEASE_TAG.json" | sha256sum | awk '{print $1}')"
  test "$manifest_sha" = "$EXPECTED_MANIFEST_SHA256" || die "release manifest checksum mismatch"
  compose_sha="$(git -C "$REPOSITORY_DIR" show "$tag_ref:deploy/docker-compose.vps.yml" | sha256sum | awk '{print $1}')"
  test "$compose_sha" = "$EXPECTED_COMPOSE_SHA256" || die "release compose checksum mismatch"
}

require_release_identity() {
  require_release_provenance
}

require_image_inputs() {
  : "${ROLLBACK_REALTIME_IMAGE:?ROLLBACK_REALTIME_IMAGE is required}"
  : "${ROLLBACK_REALTIME_IMAGE_ID:?ROLLBACK_REALTIME_IMAGE_ID is required}"
  : "${ROLLBACK_REALTIME_RELEASE_ID:?ROLLBACK_REALTIME_RELEASE_ID is required}"
  : "${PREVIOUS_RELEASE_DIR:?PREVIOUS_RELEASE_DIR is required}"
  : "${PREVIOUS_COMPOSE_SHA256:?PREVIOUS_COMPOSE_SHA256 is required}"
  validate_image_ref "$ROLLBACK_REALTIME_IMAGE"
  validate_image_id "$ROLLBACK_REALTIME_IMAGE_ID"
  validate_release_id "$ROLLBACK_REALTIME_RELEASE_ID"
  test "$ROLLBACK_REALTIME_IMAGE" = "$EXPECTED_ROLLBACK_REALTIME_IMAGE" || die "unexpected rollback realtime image"
  test "$ROLLBACK_REALTIME_IMAGE_ID" = "$EXPECTED_ROLLBACK_REALTIME_IMAGE_ID" || die "unexpected rollback realtime image ID"
  test "$ROLLBACK_REALTIME_RELEASE_ID" = "$EXPECTED_ROLLBACK_REALTIME_RELEASE_ID" || die "unexpected rollback realtime release ID"
  [[ "$PREVIOUS_COMPOSE_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "invalid previous Compose checksum"
  test "$PREVIOUS_RELEASE_DIR" = "$APP_ROOT/releases/$EXPECTED_PREVIOUS_RELEASE" || die "unexpected previous release"
  test "$PREVIOUS_COMPOSE_SHA256" = "$EXPECTED_PREVIOUS_COMPOSE_SHA256" || die "unexpected previous Compose checksum"
  test "$PREVIOUS_RELEASE_DIR" != "$RELEASE_DIR" || die "previous release cannot equal target release"
  case "$PREVIOUS_RELEASE_DIR" in
    "$APP_ROOT"/releases/*) ;;
    *) die "previous release must be under the release root" ;;
  esac
  test -d "$PREVIOUS_RELEASE_DIR" || die "previous release directory missing"
  PREVIOUS_COMPOSE_FILE="$PREVIOUS_RELEASE_DIR/deploy/docker-compose.vps.yml"
  export PREVIOUS_COMPOSE_FILE
  test -f "$PREVIOUS_COMPOSE_FILE" || die "previous release Compose file missing"
  test "$(sha256sum "$PREVIOUS_COMPOSE_FILE" | awk '{print $1}')" = "$PREVIOUS_COMPOSE_SHA256" || die "previous release Compose checksum drift"
  test -f "$(rollback_override_source)" || die "rollback Compose override missing"
}

rollback_override_source() {
  if test -d "$RELEASE_DIR"; then
    printf '%s\n' "$ROLLBACK_COMPOSE_OVERRIDE"
  else
    printf '%s\n' "$REPOSITORY_DIR/deploy/releases/$EXPECTED_RELEASE_TAG/realtime-rollback-image-override.yml"
  fi
}

require_cutover_inputs() {
  require_release_identity
  require_image_inputs
  test "${DEPLOYMENT_AUTHORIZED:-}" = "YES_I_AM_AUTHORIZED" || die "explicit deployment authorization is required"
  : "${RUNTIME_STATE_SERVICE_EVIDENCE_FILE:?RUNTIME_STATE_SERVICE_EVIDENCE_FILE is required}"
  : "${RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE:?RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE is required}"
  test -s "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" || die "deployment runtime-state evidence missing"
  test -s "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" || die "rollback runtime-state evidence missing"
  node "$RELEASE_SCRIPT_DIR/validate-service-evidence.mjs" "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json"
  node "$RELEASE_SCRIPT_DIR/validate-service-evidence.mjs" "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json"
}

require_rollback_inputs() {
  require_image_inputs
  test "${DEPLOYMENT_AUTHORIZED:-}" = "YES_I_AM_AUTHORIZED" || die "explicit deployment authorization is required"
  : "${RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE:?RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE is required}"
  test -s "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" || die "rollback runtime-state evidence missing"
  node "$RELEASE_SCRIPT_DIR/validate-service-evidence.mjs" "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json"
}

acquire_deployment_lock() {
  require_command flock
  if test -e "/proc/$$/fd/9" &&
      test "$(readlink -f "/proc/$$/fd/9")" = "$(readlink -f "$DEPLOYMENT_LOCK_FILE")"; then
    flock -n 9 || die "inherited deployment lock is not held"
    return 0
  fi
  exec 9>"$DEPLOYMENT_LOCK_FILE"
  flock -n 9 || die "another lana-chatbot deployment holds the global lock"
}

cutover_started=0

automatic_rollback_on_exit() {
  local status=$?
  trap - EXIT HUP INT TERM
  if test "$status" -ne 0 && test "$cutover_started" = "1"; then
    if ! AUTO_ROLLBACK=1 "$RELEASE_SCRIPT_DIR/rollback.sh"; then
      printf '%s\n' "AUTOMATIC_ROLLBACK_FAILED" >&2
    fi
  fi
  exit "$status"
}

arm_automatic_rollback() {
  cutover_started=1
  trap automatic_rollback_on_exit EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
}

disarm_automatic_rollback() {
  cutover_started=0
  trap - EXIT HUP INT TERM
}

compose() {
  require_no_inherited_compose_overrides "" "$COMPOSE_FILE"
  docker compose --env-file "$INFRASTRUCTURE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

rollback_compose() {
  require_no_inherited_compose_overrides "ROLLBACK_REALTIME_IMAGE" "$PREVIOUS_COMPOSE_FILE" "$ROLLBACK_COMPOSE_OVERRIDE"
  ROLLBACK_REALTIME_IMAGE="$ROLLBACK_REALTIME_IMAGE" \
    docker compose --env-file "$INFRASTRUCTURE_ENV_FILE" \
      -f "$PREVIOUS_COMPOSE_FILE" -f "$ROLLBACK_COMPOSE_OVERRIDE" "$@"
}

require_no_inherited_compose_overrides() {
  local allowed_csv="${1-}"
  shift || true
  command -v printenv >/dev/null 2>&1 || die "required command missing: printenv"
  command -v grep >/dev/null 2>&1 || die "required command missing: grep"
  command -v sed >/dev/null 2>&1 || die "required command missing: sed"
  test -f "$INFRASTRUCTURE_ENV_FILE" || die "production infrastructure env missing"
  local line key seen_keys=$'\n'
  while IFS= read -r line || test -n "$line"; do
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)= ]] || continue
    key="${BASH_REMATCH[1]}"
    if [[ "$seen_keys" == *$'\n'"$key"$'\n'* ]]; then
      die "duplicate infrastructure environment key forbidden: $key"
    fi
    seen_keys+="$key"$'\n'
    if printenv "$key" >/dev/null 2>&1; then
      die "inherited Compose environment override forbidden: $key"
    fi
  done < "$INFRASTRUCTURE_ENV_FILE"
  local compose_file allowed
  for compose_file in "$@"; do
    test -f "$compose_file" || die "Compose interpolation source missing"
    while IFS= read -r key; do
      allowed=0
      case ",$allowed_csv," in
        *,"$key",*) allowed=1 ;;
      esac
      if test "$allowed" = "0" && printenv "$key" >/dev/null 2>&1; then
        die "inherited Compose interpolation override forbidden: $key"
      fi
    done < <(grep -hoE '\$\{[A-Za-z_][A-Za-z0-9_]*' "$compose_file" | sed 's/^${//')
  done
  for key in COMPOSE_PROJECT_NAME COMPOSE_PROFILES COMPOSE_FILE COMPOSE_PATH_SEPARATOR; do
    if printenv "$key" >/dev/null 2>&1; then
      die "inherited Compose control override forbidden: $key"
    fi
  done
}

verify_prospective_realtime_env_parity() {
  local compose_source="${1:?Compose source is required}"
  require_no_inherited_compose_overrides "" "$compose_source"
  if ! docker compose --env-file "$INFRASTRUCTURE_ENV_FILE" -f "$compose_source" config --format json |
      node "$RELEASE_SCRIPT_DIR/validate-prospective-realtime-env.mjs" \
        --live-container lana-chatbot-realtime-worker; then
    die "prospective realtime environment parity failed"
  fi
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

container_env_value() {
  local container="$1" key="$2"
  docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container" |
    awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; found=1 } END { if (!found) exit 1 }'
}

database_query() {
  local sql="$1"
  docker exec lana-chatbot-postgres sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1"
  ' sh "$sql"
}

database_latest_migration() {
  database_query "SELECT migration_name FROM schema_migrations ORDER BY migration_name DESC LIMIT 1"
}

wait_healthy() {
  local deadline=$(( $(date +%s) + 180 ))
  local status
  while (( $(date +%s) < deadline )); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' lana-chatbot-realtime-worker 2>/dev/null || true)"
    test "$status" = "healthy" && return 0
    sleep 5
  done
  die "realtime-worker did not become healthy"
}

wait_realtime_ready() {
  local deadline=$(( $(date +%s) + 90 ))
  local ready
  while (( $(date +%s) < deadline )); do
    ready="$(database_query "SELECT count(*) FROM realtime_worker_status WHERE worker_id='$EXPECTED_REALTIME_WORKER_ID' AND status IN ('IDLE','PROCESSING') AND mode='LIVE' AND send_enabled AND last_error_code IS NULL AND last_seen_at >= clock_timestamp() - interval '60 seconds'")"
    test "$ready" = "1" && return 0
    sleep 3
  done
  die "realtime worker status did not become ready"
}

upsert_env_pin() {
  local key="$1" value="$2"
  case "$key" in
    REALTIME_IMAGE) validate_image_ref "$value" ;;
    *) die "unsupported environment pin" ;;
  esac
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
  local service container requirement id
  while IFS=$'\t' read -r service container requirement; do
    test "$service" = "realtime-worker" && continue
    id="$(docker inspect --format '{{.Id}}' "$container" 2>/dev/null || true)"
    if test "$requirement" = "required" && test -z "$id"; then die "required inventory container missing: $service"; fi
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
  local service container requirement status
  while IFS=$'\t' read -r service container requirement; do
    test "$requirement" = "required" || continue
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
    case "$status" in
      healthy|running) ;;
      *) die "required service is not healthy/running: $service" ;;
    esac
  done < <(node "$RELEASE_SCRIPT_DIR/list-inventory-services.mjs" "$RELEASE_DIR/deploy/runtime-state/service-inventory.json")
}

verify_delivery_health() {
  local mode="${1:-strict}"
  test "$mode" = "strict" || test "$mode" = "rollback" || die "invalid delivery health mode"
  docker exec lana-chatbot-delivery-worker node -e '
    const mode = process.argv[1];
    const check = async () => {
      const ready = await fetch("http://127.0.0.1:8091/health/ready");
      if (ready.status !== 200) process.exit(1);
      const queue = await fetch("http://127.0.0.1:8091/health/queue");
      if (mode === "strict" && queue.status !== 200) process.exit(1);
      if (![200, 503].includes(queue.status)) process.exit(1);
      process.stdout.write(`DELIVERY_HEALTH_PASS mode=${mode} ready=${ready.status} queue=${queue.status}\n`);
    };
    check().catch(() => process.exit(1));
  ' "$mode"
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
