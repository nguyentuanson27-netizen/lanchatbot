#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_PAGE_ID="1198992073286645"
readonly EXPECTED_CHANNEL="MESSENGER"
readonly EXPECTED_DATABASE="lana_chatbot"
readonly EXPECTED_POSTGRES_MAJOR="17"
readonly EXPECTED_POSTGRES_IMAGE_ID="sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193"
readonly EXPECTED_PREVIOUS_MIGRATION="0035_df13_commerce_behavior_mode"
readonly EXPECTED_PREVIOUS_MIGRATION_SHA256="51f94dce65d31f53829f96d1166bd131b726ee00557bc952a5489a9fc98762fc"
readonly EXPECTED_MIGRATION="0036_df13_commerce_authority_fence"
readonly EXPECTED_UP_SHA256="d709617e10554a0186b9233a404ef7faadfdf3576ba3c133efe51a56c2214425"
readonly EXPECTED_DOWN_SHA256="c8e2f56ba2f384cc49f3c9d9a2d76da3a4b4165e90b21726ce723d893a09f1e0"
readonly EXPECTED_POINTER_REVISION="6"
readonly EXPECTED_MODE_VERSION="c88f3d7a-3c14-49ff-ab07-bcfbf664c643"
readonly EXPECTED_AUTHORITY_BUNDLE="e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c"
readonly EXPECTED_CONTENT_HASH="sha256:4900e2469b3f82cf66377a421e006cb11a2ce15eaf997b399ca327577a54be7b"
readonly EXPECTED_REALTIME_IMAGE="lana-chatbot-app:20260828-df13-commerce-abea1fb"
readonly POSTGRES_CONTAINER="lana-chatbot-postgres"
readonly REALTIME_CONTAINER="lana-chatbot-realtime-worker"
readonly APP_ROOT="/opt/lana-chatbot"
readonly MUTATION_LOCK="$APP_ROOT/shared/lana-chatbot-deployment.lock"

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="${SOURCE_ROOT:-$(CDPATH= cd -- "$script_dir/.." && pwd)}"
MIGRATION_UP="$SOURCE_ROOT/packages/database/pending-migrations/0036_df13_commerce_authority_fence.up.sql"
MIGRATION_DOWN="$SOURCE_ROOT/packages/database/pending-migrations/0036_df13_commerce_authority_fence.down.sql"
readonly EVIDENCE_DIR="$APP_ROOT/backups/20260831-track-b-0036-preprod"
BACKUP_FILE="$EVIDENCE_DIR/lana_chatbot_pre_0036.dump"
BACKUP_SHA256_FILE="$BACKUP_FILE.sha256"
REHEARSAL_MARKER="$EVIDENCE_DIR/rehearsal.ok"

die() { printf '%s\n' "$*" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || die "required command missing: $1"; }

database_query() {
  local sql="$1"
  docker exec "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1"
  ' sh "$sql"
}

database_query_named() {
  local database="$1"
  local sql="$2"
  docker exec "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c "$2"
  ' sh "$database" "$sql"
}

database_stream() {
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
  ' sh "$@"
}

database_stream_named() {
  local database="$1"
  shift
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    database="$1"
    shift
    exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$database" "$@"
  ' sh "$database" "$@"
}

require_source_identity() {
  : "${SOURCE_REVISION:?SOURCE_REVISION is required}"
  [[ "$SOURCE_REVISION" =~ ^[a-f0-9]{40}$ ]] || die "source revision is invalid"
  test -f "$MIGRATION_UP" && test -f "$MIGRATION_DOWN" || die "0036 source artifacts missing"
  test "$(sha256sum "$MIGRATION_UP" | awk '{print $1}')" = "$EXPECTED_UP_SHA256" || die "0036 up checksum mismatch"
  test "$(sha256sum "$MIGRATION_DOWN" | awk '{print $1}')" = "$EXPECTED_DOWN_SHA256" || die "0036 down checksum mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_REVISION" || die "source revision checkout mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse refs/remotes/origin/main)" = "$SOURCE_REVISION" || die "source revision is not exact origin/main"
  test -z "$(git -C "$SOURCE_ROOT" status --porcelain)" || die "source worktree is dirty"
}

require_target_identity() {
  test "$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" = "$EXPECTED_POSTGRES_IMAGE_ID" || die "postgres image identity mismatch"
  test "$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" = "$EXPECTED_REALTIME_IMAGE" || die "realtime image identity mismatch"
  test "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$REALTIME_CONTAINER")" = "healthy" || die "realtime worker is not healthy"
  test "$(database_query "SELECT current_database() || '|' || split_part(current_setting('server_version'),'.',1)")" = "$EXPECTED_DATABASE|$EXPECTED_POSTGRES_MAJOR" || die "database target identity mismatch"
  test "$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" = "1" || die "PREPROD page routing identity mismatch"
  test "$(database_query "SELECT migration_name || '|' || checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" = "$EXPECTED_PREVIOUS_MIGRATION|$EXPECTED_PREVIOUS_MIGRATION_SHA256" || die "pre-migration ledger mismatch"
  test "$(database_query "SELECT p.pointer_revision || '|' || v.mode_version_id || '|' || v.sales_authority_mode || '|' || v.state_read_mode || '|' || v.authority_bundle_hash || '|' || v.content_hash FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL'")" = "$EXPECTED_POINTER_REVISION|$EXPECTED_MODE_VERSION|COMMERCE|LEGACY|$EXPECTED_AUTHORITY_BUNDLE|$EXPECTED_CONTENT_HASH" || die "pre-migration behavior pointer mismatch"
  test "$(database_query "SELECT count(*) FROM pg_roles WHERE rolname IN ('lana_app','lana_runtime_behavior_reader','lana_admin_control_api')")" = "3" || die "required database roles mismatch"
  test "$(database_query "SELECT count(*) FROM (VALUES (to_regclass('public.df13_commerce_authority_fences')),(to_regclass('public.df13_commerce_authority_fence_claims')),(to_regclass('public.df13_commerce_cutover_fences'))) AS objects(value) WHERE value IS NOT NULL")" = "0" || die "0036 objects already exist without ledger"
}

acquire_mutation_lock() {
  require_command flock
  exec 9>"$MUTATION_LOCK"
  flock -n 9 || die "another lana-chatbot mutation holds the global lock"
}

verify_0036_schema_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT migration_name || '|' || checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" = "$EXPECTED_MIGRATION|$EXPECTED_UP_SHA256" || die "0036 ledger readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM (VALUES (to_regclass('public.df13_commerce_authority_fences')),(to_regclass('public.df13_commerce_authority_fence_claims')),(to_regclass('public.df13_commerce_cutover_fences'))) AS objects(value) WHERE value IS NOT NULL")" = "3" || die "0036 table readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('df13_commerce_authority_fences_scope_unique','df13_commerce_authority_fence_claims_live_inbox_uq','df13_commerce_cutover_fences_operation_id_key','df13_commerce_cutover_fences_live_scope_uk')")" = "4" || die "0036 index readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc WHERE proname IN ('guard_df13_commerce_cutover_fence_insert_identity','guard_df13_commerce_cutover_fence_identity')")" = "2" || die "0036 function readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger WHERE tgname IN ('df13_commerce_cutover_fence_insert_identity_guard','df13_commerce_cutover_fence_identity_guard') AND NOT tgisinternal")" = "2" || die "0036 trigger readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_constraint WHERE conname LIKE 'df13_commerce_%' AND conrelid IN ('df13_commerce_authority_fences'::regclass,'df13_commerce_authority_fence_claims'::regclass,'df13_commerce_cutover_fences'::regclass)")" = "25" || die "0036 constraint readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.relname IN ('df13_commerce_authority_fences','df13_commerce_authority_fence_claims','df13_commerce_cutover_fences') AND r.rolname='lana_app'")" = "3" || die "0036 table owner mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM information_schema.role_table_grants WHERE table_name IN ('df13_commerce_authority_fences','df13_commerce_authority_fence_claims','df13_commerce_cutover_fences') AND grantee='PUBLIC'")" = "0" || die "0036 PUBLIC grant mismatch"
}

require_common_tools() {
  for command_name in docker git sha256sum awk cat grep mktemp; do require_command "$command_name"; done
}
