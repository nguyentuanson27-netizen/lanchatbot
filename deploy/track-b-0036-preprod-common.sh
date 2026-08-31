#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_PAGE_ID="1198992073286645"
readonly EXPECTED_CHANNEL="MESSENGER"
readonly EXPECTED_DATABASE="lana_chatbot"
readonly EXPECTED_POSTGRES_MAJOR="17"
readonly EXPECTED_POSTGRES_IMAGE_ID="sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193"
readonly EXPECTED_POSTGRES_VOLUME="lana-chatbot-postgres-data|volume|true"
readonly EXPECTED_HOST_MACHINE_ID_SHA256="862432ed3b8433b43cee858d3ef8ed54949d2a829b1f77f9b89150d7cd343fde"
readonly EXPECTED_SYSTEM_IDENTIFIER="7662301595202035746"
readonly EXPECTED_PAGE_COUNT="1"
readonly EXPECTED_PAGE_SET_SHA256="7ec2f787fc4e22d7e70ae30e00875fd6ec061b42fb520786c013f232f5e8fc6a"
readonly EXPECTED_LEDGER_COUNT="35"
readonly EXPECTED_LEDGER_SHA256="6d09d35d80ce763a4b2913f762c803bcb72a71523d30f10d1004371f503ee42c"
readonly EXPECTED_ROLE_STATE_SHA256="7aed840e198c02a47fbae39578d4ca88c7a26dcd6d03be5b8909dfc474b0c6bb"
readonly EXPECTED_ROLE_MEMBERSHIP_SHA256="c6935a1f7e3950b60e4cd869435b569c3591853f00477b8feeaeb625da7fdb4c"
readonly EXPECTED_RELATION_ACL_SHA256="79657b7405bab6dfa287456f0a42220fce1f0e098c325e54ee7703658a5e42a8"
readonly EXPECTED_FUNCTION_ACL_SHA256="a32564856140f2809190ed071f134efc381370018f0e998808c2f0c6e51fd079"
readonly EXPECTED_EXTENSIONS_SHA256="b025b21b2d90b87fa0165593faf27543989fd4cd42b3d0061d8c4dfd3c240cd9"
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
RELATION_ACL_QUERY="$SOURCE_ROOT/deploy/track-b-0036-relation-acl-canonical.sql"
FUNCTION_ACL_QUERY="$SOURCE_ROOT/deploy/track-b-0036-function-acl-canonical.sql"
readonly EVIDENCE_DIR="$APP_ROOT/backups/20260831-track-b-0036-preprod"
BACKUP_FILE="$EVIDENCE_DIR/lana_chatbot_pre_0036.dump"
BACKUP_SHA256_FILE="$BACKUP_FILE.sha256"
REHEARSAL_MARKER="$EVIDENCE_DIR/rehearsal.ok"
PREFLIGHT_RECORD="$EVIDENCE_DIR/target-preflight.txt"
ROLLBACK_RECORD="$EVIDENCE_DIR/rollback-status.txt"

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

database_copy_sha256_named() {
  local database="$1"
  local query="$2"
  docker exec "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c "COPY ($2) TO STDOUT WITH (FORMAT csv)" |
      sha256sum | awk "{print \$1}"
  ' sh "$database" "$query"
}

database_sql_file_sha256_named() {
  local database="$1"
  local sql_file="$2"
  test -s "$sql_file" || die "canonical ACL query missing"
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -f - |
      sha256sum | awk "{print \$1}"
  ' sh "$database" < "$sql_file"
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

expected_target_record() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$EXPECTED_HOST_MACHINE_ID_SHA256" \
    "POSTGRES_IMAGE_ID=$EXPECTED_POSTGRES_IMAGE_ID" \
    "POSTGRES_VOLUME=$EXPECTED_POSTGRES_VOLUME" \
    "REALTIME_IMAGE=$EXPECTED_REALTIME_IMAGE" \
    "REALTIME_HEALTH=healthy" \
    "DATABASE_ENGINE=$EXPECTED_DATABASE|$EXPECTED_POSTGRES_MAJOR" \
    "SYSTEM_IDENTIFIER=$EXPECTED_SYSTEM_IDENTIFIER" \
    "PAGE_COUNT=$EXPECTED_PAGE_COUNT" \
    "PAGE_SET_SHA256=$EXPECTED_PAGE_SET_SHA256" \
    "PREPROD_PAGE=1" \
    "LEDGER_COUNT=$EXPECTED_LEDGER_COUNT" \
    "LEDGER_SHA256=$EXPECTED_LEDGER_SHA256" \
    "LATEST_LEDGER=$EXPECTED_PREVIOUS_MIGRATION|$EXPECTED_PREVIOUS_MIGRATION_SHA256" \
    "POINTER=$EXPECTED_POINTER_REVISION|$EXPECTED_MODE_VERSION|COMMERCE|LEGACY|$EXPECTED_AUTHORITY_BUNDLE|$EXPECTED_CONTENT_HASH" \
    "ROLE_STATE_SHA256=$EXPECTED_ROLE_STATE_SHA256" \
    "ROLE_MEMBERSHIP_SHA256=$EXPECTED_ROLE_MEMBERSHIP_SHA256" \
    "RELATION_ACL_SHA256=$EXPECTED_RELATION_ACL_SHA256" \
    "FUNCTION_ACL_SHA256=$EXPECTED_FUNCTION_ACL_SHA256" \
    "EXTENSIONS_SHA256=$EXPECTED_EXTENSIONS_SHA256" \
    "MIGRATION_0036_OBJECTS=0"
}

observed_target_record() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$(sha256sum /etc/machine-id | awk '{print $1}')" \
    "POSTGRES_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" \
    "POSTGRES_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}|{{.Type}}|{{.RW}}{{end}}{{end}}' "$POSTGRES_CONTAINER")" \
    "REALTIME_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$REALTIME_CONTAINER")" \
    "DATABASE_ENGINE=$(database_query "SELECT current_database() || '|' || split_part(current_setting('server_version'),'.',1)")" \
    "SYSTEM_IDENTIFIER=$(database_query "SELECT system_identifier FROM pg_control_system()")" \
    "PAGE_COUNT=$(database_query "SELECT count(*) FROM pages")" \
    "PAGE_SET_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT page_id,status,routing_owner,app_send_enabled,kill_switch FROM pages ORDER BY page_id")" \
    "PREPROD_PAGE=$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" \
    "LEDGER_COUNT=$(database_query "SELECT count(*) FROM schema_migrations")" \
    "LEDGER_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT migration_name,checksum_sha256 FROM schema_migrations ORDER BY migration_name")" \
    "LATEST_LEDGER=$(database_query "SELECT migration_name || '|' || checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" \
    "POINTER=$(database_query "SELECT p.pointer_revision || '|' || v.mode_version_id || '|' || v.sales_authority_mode || '|' || v.state_read_mode || '|' || v.authority_bundle_hash || '|' || v.content_hash FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL'")" \
    "ROLE_STATE_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" \
    "ROLE_MEMBERSHIP_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" \
    "RELATION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")" \
    "FUNCTION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")" \
    "EXTENSIONS_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" \
    "MIGRATION_0036_OBJECTS=$(database_query "SELECT count(*) FROM (VALUES (to_regclass('public.df13_commerce_authority_fences')),(to_regclass('public.df13_commerce_authority_fence_claims')),(to_regclass('public.df13_commerce_cutover_fences'))) AS objects(value) WHERE value IS NOT NULL")"
}

require_target_identity() {
  test "$(observed_target_record)" = "$(expected_target_record)" || die "exact ENGINEERING_PREPROD target record mismatch"
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
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname IN ('df13_commerce_authority_fences','df13_commerce_authority_fence_claims','df13_commerce_cutover_fences') AND c.relacl IS NULL")" = "3" || die "0036 table ACL mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname=current_schema() AND p.proname IN ('guard_df13_commerce_cutover_fence_insert_identity','guard_df13_commerce_cutover_fence_identity') AND r.rolname='lana_app' AND p.proacl IS NULL")" = "2" || die "0036 function owner/ACL mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "database role attributes mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "database role memberships mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "database extensions mismatch"
}

verify_restored_baseline_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM pages")" = "$EXPECTED_PAGE_COUNT" || die "restored page count mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT page_id,status,routing_owner,app_send_enabled,kill_switch FROM pages ORDER BY page_id")" = "$EXPECTED_PAGE_SET_SHA256" || die "restored page set mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations")" = "$EXPECTED_LEDGER_COUNT" || die "restored ledger count mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT migration_name,checksum_sha256 FROM schema_migrations ORDER BY migration_name")" = "$EXPECTED_LEDGER_SHA256" || die "restored full ledger mismatch"
  test "$(database_sql_file_sha256_named "$database" "$RELATION_ACL_QUERY")" = "$EXPECTED_RELATION_ACL_SHA256" || die "restored canonical relation owner/ACL mismatch"
  test "$(database_sql_file_sha256_named "$database" "$FUNCTION_ACL_QUERY")" = "$EXPECTED_FUNCTION_ACL_SHA256" || die "restored canonical function owner/ACL mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "restored role attributes mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "restored role memberships mismatch"
  test "$(database_copy_sha256_named "$database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "restored extensions mismatch"
}

verify_rehearsal_evidence() {
  local evidence_dir="$1"
  local source_revision="$2"
  local backup_file="$evidence_dir/lana_chatbot_pre_0036.dump"
  local backup_hash_file="$backup_file.sha256"
  local marker="$evidence_dir/rehearsal.ok"
  local preflight="$evidence_dir/target-preflight.txt"
  test -s "$backup_file" && test -s "$backup_hash_file" && test -s "$marker" && test -s "$preflight" || die "verified backup/rehearsal evidence missing"
  sha256sum -c "$backup_hash_file" >/dev/null || die "backup checksum verification failed"
  grep -Fx "SOURCE_REVISION=$source_revision" "$marker" >/dev/null || die "rehearsal source mismatch"
  grep -Fx "UP_SHA256=$EXPECTED_UP_SHA256" "$marker" >/dev/null || die "rehearsal up hash mismatch"
  grep -Fx "DOWN_SHA256=$EXPECTED_DOWN_SHA256" "$marker" >/dev/null || die "rehearsal down hash mismatch"
  grep -Fx "BACKUP_SHA256=$(awk '{print $1}' "$backup_hash_file")" "$marker" >/dev/null || die "rehearsal backup hash mismatch"
  grep -Fx "PREFLIGHT_SHA256=$(sha256sum "$preflight" | awk '{print $1}')" "$marker" >/dev/null || die "rehearsal preflight hash mismatch"
  grep -Fx "REHEARSAL=UP_DOWN_UP_PASS" "$marker" >/dev/null || die "rehearsal verdict missing"
  test "$(observed_target_record)" = "$(cat "$preflight")" || die "target changed since rehearsal"
}

observed_recovery_record() {
  local ledger_count latest_ledger object_count pointer
  ledger_count="$(database_query "SELECT count(*) FROM schema_migrations")" || return 1
  latest_ledger="$(database_query "SELECT migration_name || '|' || checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" || return 1
  object_count="$(database_query "SELECT count(*) FROM (VALUES (to_regclass('public.df13_commerce_authority_fences')),(to_regclass('public.df13_commerce_authority_fence_claims')),(to_regclass('public.df13_commerce_cutover_fences'))) AS objects(value) WHERE value IS NOT NULL")" || return 1
  pointer="$(database_query "SELECT p.pointer_revision || '|' || v.mode_version_id || '|' || v.authority_bundle_hash FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL'")" || return 1
  printf '%s\n' "OBSERVED_LEDGER_COUNT=$ledger_count" "OBSERVED_LATEST_LEDGER=$latest_ledger" "OBSERVED_0036_OBJECTS=$object_count" "OBSERVED_POINTER=$pointer"
}

perform_verified_schema_rollback() {
  local record="$1"
  local recovery_readback
  if rollback_schema && (require_target_identity); then
    printf '%s\n' "RECOVERY=VERIFIED_PRE_0036" "BACKUP_FILE=$BACKUP_FILE" "BACKUP_SHA256=$(awk '{print $1}' "$BACKUP_SHA256_FILE")" > "$record"
    chmod 600 "$record"
    return 0
  fi
  write_blocked_schema_recovery "$record"
  return 1
}

write_blocked_schema_recovery() {
  local record="$1"
  local recovery_readback
  printf '%s\n' "RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED" "BACKUP_FILE=$BACKUP_FILE" "BACKUP_SHA256=$(awk '{print $1}' "$BACKUP_SHA256_FILE" 2>/dev/null || printf 'UNAVAILABLE')" > "$record"
  if recovery_readback="$(observed_recovery_record 2>/dev/null)"; then
    printf '%s\n' "$recovery_readback" >> "$record"
  else
    printf '%s\n' "OBSERVED_STATE=UNAVAILABLE" >> "$record"
  fi
  chmod 600 "$record"
}

require_common_tools() {
  for command_name in docker git sha256sum awk cat grep mktemp cmp chmod; do require_command "$command_name"; done
}
