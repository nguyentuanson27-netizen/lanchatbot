#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# Reuse only the reviewed credential-safe database and canonical ACL helpers.
# shellcheck source=track-b-0036-preprod-common.sh
source "$script_dir/track-b-0036-preprod-common.sh"

readonly T37_MIGRATION="0037_track_b_commerce_authority_replacement"
readonly T37_UP_SHA256="40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20"
readonly T37_DOWN_SHA256="c5b2ea232bf586aeaf1e034c017dbf1d002fda904c4c4e3ebd9daace4ae73ce3"
readonly T37_UP="$SOURCE_ROOT/packages/database/pending-migrations/$T37_MIGRATION.up.sql"
readonly T37_DOWN="$SOURCE_ROOT/packages/database/pending-migrations/$T37_MIGRATION.down.sql"
readonly T37_LEDGER_COUNT="36"
readonly T37_LEDGER_SHA256="1d6a1687574bf291092a508560ef45907d4acfb56ceb5db434e522ec0a43d125"
readonly T37_V1_VERSION="c88f3d7a-3c14-49ff-ab07-bcfbf664c643"
readonly T37_V1_BUNDLE="e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c"
readonly T37_V1_CONTENT="sha256:4900e2469b3f82cf66377a421e006cb11a2ce15eaf997b399ca327577a54be7b"
readonly T37_V2_BUNDLE="56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8"
readonly T37_V2_CONTENT="sha256:95ead755ea456c1e01c215d2421c2cf23f64fb536168ed49d5729bc4ec91f394"
readonly T37_POINTER_REVISION="6"
readonly T37_RELATION_ACL_SHA256="9bd6ea2d3457119de2e96620cd8a83a18f5baf2ec18f24b631c2f02d070a7635"
readonly T37_FUNCTION_ACL_SHA256="66b943803363c3d050ae05ca25543b097d69543233760fd268f502d632e16034"
readonly T37_PRE_CATALOG_SHA256="ffd731178c5c4231531de973ddf7fb51402f6d2af2eaf98e0e0f3cdd5e77aa6d"
readonly T37_CATALOG_QUERY="$SOURCE_ROOT/deploy/track-b-0037-catalog-canonical.sql"
readonly T37_REALTIME_IMAGE_ID="sha256:ea0b076cfded1b8e10d817c43ba984066c97b2b18bcdff878fa91ed809c42c16"
if test "${BASH_SOURCE[0]}" != "$0" && test "${TRACK_B_0037_OPERATOR_TEST_MODE:-}" = 'YES'; then
  : "${TRACK_B_0037_TEST_EVIDENCE_DIR:?test evidence directory is required}"
  T37_EVIDENCE_DIR="$TRACK_B_0037_TEST_EVIDENCE_DIR"
else
  T37_EVIDENCE_DIR="$APP_ROOT/backups/20260901-track-b-0037-preprod"
fi
readonly T37_EVIDENCE_DIR
readonly T37_BACKUP="$T37_EVIDENCE_DIR/lana_chatbot_pre_0037.dump"
readonly T37_BACKUP_SHA="$T37_BACKUP.sha256"
readonly T37_PREFLIGHT="$T37_EVIDENCE_DIR/target-preflight.txt"
readonly T37_MARKER="$T37_EVIDENCE_DIR/rehearsal.ok"
readonly T37_ROLLBACK="$T37_EVIDENCE_DIR/rollback-status.txt"

require_common_tools
require_command sed

t37_source_identity() {
  : "${SOURCE_REVISION:?SOURCE_REVISION is required}"
  [[ "$SOURCE_REVISION" =~ ^[a-f0-9]{40}$ ]] || die "source revision is invalid"
  test -s "$T37_UP" && test -s "$T37_DOWN" || die "0037 source artifacts missing"
  test "$(sha256sum "$T37_UP" | awk '{print $1}')" = "$T37_UP_SHA256" || die "0037 up checksum mismatch"
  test "$(sha256sum "$T37_DOWN" | awk '{print $1}')" = "$T37_DOWN_SHA256" || die "0037 down checksum mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_REVISION" || die "source revision checkout mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse refs/remotes/origin/main)" = "$SOURCE_REVISION" || die "source revision is not exact origin/main"
  test -z "$(git -C "$SOURCE_ROOT" status --porcelain)" || die "source worktree is dirty"
}

t37_ledger_sha() {
  database_copy_sha256_named "$EXPECTED_DATABASE" \
    "SELECT migration_name,checksum_sha256 FROM schema_migrations ORDER BY migration_name"
}

t37_pointer() {
  database_query "SELECT p.pointer_revision||'|'||v.mode_version_id||'|'||v.sales_authority_mode||'|'||v.state_read_mode||'|'||v.authority_bundle_hash||'|'||v.content_hash FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL'"
}

t37_expected_preflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$EXPECTED_HOST_MACHINE_ID_SHA256" \
    "POSTGRES_IMAGE_ID=$EXPECTED_POSTGRES_IMAGE_ID" \
    "POSTGRES_VOLUME=$EXPECTED_POSTGRES_VOLUME" \
    "REALTIME_IMAGE=$EXPECTED_REALTIME_IMAGE" \
    "REALTIME_IMAGE_ID=$T37_REALTIME_IMAGE_ID" \
    "REALTIME_HEALTH=healthy|0" \
    "DATABASE_ENGINE=$EXPECTED_DATABASE|$EXPECTED_POSTGRES_MAJOR" \
    "SYSTEM_IDENTIFIER=$EXPECTED_SYSTEM_IDENTIFIER" \
    "PAGE_COUNT=$EXPECTED_PAGE_COUNT" \
    "PAGE_SET_SHA256=$EXPECTED_PAGE_SET_SHA256" \
    "PREPROD_PAGE=1" \
    "LEDGER_COUNT=$T37_LEDGER_COUNT" \
    "LEDGER_SHA256=$T37_LEDGER_SHA256" \
    "LATEST_LEDGER=$EXPECTED_MIGRATION|$EXPECTED_UP_SHA256" \
    "POINTER=$T37_POINTER_REVISION|$T37_V1_VERSION|COMMERCE|LEGACY|$T37_V1_BUNDLE|$T37_V1_CONTENT" \
    "ROLE_STATE_SHA256=$EXPECTED_ROLE_STATE_SHA256" \
    "ROLE_MEMBERSHIP_SHA256=$EXPECTED_ROLE_MEMBERSHIP_SHA256" \
    "RELATION_ACL_SHA256=$T37_RELATION_ACL_SHA256" \
    "FUNCTION_ACL_SHA256=$T37_FUNCTION_ACL_SHA256" \
    "CATALOG_SHA256=$T37_PRE_CATALOG_SHA256" \
    "EXTENSIONS_SHA256=$EXPECTED_EXTENSIONS_SHA256" \
    "AUTHORITY_FENCES=0|0|0" \
    "CUTOVER_FENCES=0|0"
}

t37_observed_preflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$(sha256sum /etc/machine-id | awk '{print $1}')" \
    "POSTGRES_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" \
    "POSTGRES_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination \"/var/lib/postgresql/data\"}}{{.Name}}|{{.Type}}|{{.RW}}{{end}}{{end}}' "$POSTGRES_CONTAINER")" \
    "REALTIME_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}|{{.RestartCount}}' "$REALTIME_CONTAINER")" \
    "DATABASE_ENGINE=$(database_query "SELECT current_database()||'|'||split_part(current_setting('server_version'),'.',1)")" \
    "SYSTEM_IDENTIFIER=$(database_query "SELECT system_identifier FROM pg_control_system()")" \
    "PAGE_COUNT=$(database_query "SELECT count(*) FROM pages")" \
    "PAGE_SET_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT page_id,status,routing_owner,app_send_enabled,kill_switch FROM pages ORDER BY page_id")" \
    "PREPROD_PAGE=$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" \
    "LEDGER_COUNT=$(database_query "SELECT count(*) FROM schema_migrations")" \
    "LEDGER_SHA256=$(t37_ledger_sha)" \
    "LATEST_LEDGER=$(database_query "SELECT migration_name||'|'||checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" \
    "POINTER=$(t37_pointer)" \
    "ROLE_STATE_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" \
    "ROLE_MEMBERSHIP_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" \
    "RELATION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")" \
    "FUNCTION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")" \
    "CATALOG_SHA256=$(t37_catalog_sha_named "$EXPECTED_DATABASE")" \
    "EXTENSIONS_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" \
    "AUTHORITY_FENCES=$(database_query "SELECT (SELECT count(*) FROM df13_commerce_authority_fences)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fence_claims)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fences WHERE completed_at IS NULL AND token_hash IS NOT NULL AND lease_until>clock_timestamp())::text")" \
    "CUTOVER_FENCES=$(database_query "SELECT count(*)::text||'|'||count(*) FILTER (WHERE released_at IS NULL)::text FROM df13_commerce_cutover_fences")"
}

t37_preflight_matches() { test "$(t37_observed_preflight)" = "$(t37_expected_preflight)"; }
t37_require_preflight() { t37_preflight_matches || die "exact ENGINEERING_PREPROD pre-0037 target mismatch"; }

t37_catalog_sha_named() {
  local database="$1"
  test -s "$T37_CATALOG_QUERY" || die "0037 canonical catalog query missing"
  database_sql_file_sha256_named "$database" "$T37_CATALOG_QUERY"
}

t37_apply_up_named() {
  local database="$1"
  {
    printf '%s\n' 'BEGIN;'
    cat "$T37_UP"
    printf '%s\n' "INSERT INTO schema_migrations(migration_name,checksum_sha256) VALUES (:'migration_name',:'migration_checksum');" 'COMMIT;'
  } | database_stream_named "$database" -v migration_name="$T37_MIGRATION" -v migration_checksum="$T37_UP_SHA256" >/dev/null
}

t37_apply_down_named() {
  local database="$1"
  {
    printf '%s\n' 'BEGIN;'
    cat "$T37_DOWN"
    printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name=:'migration_name' AND checksum_sha256=:'migration_checksum';" 'COMMIT;'
  } | database_stream_named "$database" -v migration_name="$T37_MIGRATION" -v migration_checksum="$T37_UP_SHA256" >/dev/null
}

t37_verify_up_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T37_MIGRATION' AND checksum_sha256='$T37_UP_SHA256'")" = "1" || die "0037 ledger readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_get_functiondef('guard_df13_commerce_cutover_fence_insert_identity()'::regprocedure) AS d WHERE d LIKE '%$T37_V1_BUNDLE%' AND d LIKE '%$T37_V2_BUNDLE%'")" = "1" || die "0037 guard definition readback mismatch"
  test "$(database_sql_file_sha256_named "$database" "$RELATION_ACL_QUERY")" = "$T37_RELATION_ACL_SHA256" || die "0037 relation ACL drift"
  test "$(database_sql_file_sha256_named "$database" "$FUNCTION_ACL_QUERY")" = "$T37_FUNCTION_ACL_SHA256" || die "0037 function ACL drift"
  test "$(database_query_named "$database" "SELECT count(*) FROM (VALUES(to_regclass('public.df13_commerce_authority_fences')),(to_regclass('public.df13_commerce_authority_fence_claims')),(to_regclass('public.df13_commerce_cutover_fences')))x(v) WHERE v IS NOT NULL")" = "3" || die "0037 base tables missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('df13_commerce_authority_fences_scope_unique','df13_commerce_authority_fence_claims_live_inbox_uq','df13_commerce_cutover_fences_operation_id_key','df13_commerce_cutover_fences_live_scope_uk')")" = "4" || die "0037 base indexes missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger WHERE tgname IN ('df13_commerce_cutover_fence_insert_identity_guard','df13_commerce_cutover_fence_identity_guard') AND NOT tgisinternal")" = "2" || die "0037 base triggers missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_constraint WHERE conname LIKE 'df13_commerce_%' AND conrelid IN ('df13_commerce_authority_fences'::regclass,'df13_commerce_authority_fence_claims'::regclass,'df13_commerce_cutover_fences'::regclass)")" = "25" || die "0037 base constraints missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE c.relname IN ('df13_commerce_authority_fences','df13_commerce_authority_fence_claims','df13_commerce_cutover_fences') AND r.rolname='lana_app'")" = "3" || die "0037 base owners changed"
  test "$(database_copy_sha256_named "$database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0037 role attributes drift"
  test "$(database_copy_sha256_named "$database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0037 role memberships drift"
  test "$(database_copy_sha256_named "$database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0037 extensions drift"
}

t37_verify_down_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T37_MIGRATION'")" = "0" || die "0037 down ledger mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_get_functiondef('guard_df13_commerce_cutover_fence_insert_identity()'::regprocedure) AS d WHERE d NOT LIKE '%$T37_V2_BUNDLE%' AND d LIKE '%pre_version.sales_authority_mode <> ''LEGACY''%'")" = "1" || die "0037 down guard readback mismatch"
  test "$(t37_catalog_sha_named "$database")" = "$T37_PRE_CATALOG_SHA256" || die "0037 down exact catalog mismatch"
}

t37_marker_post_catalog() {
  sed -n 's/^POST_CATALOG_SHA256=//p' "$T37_MARKER"
}

t37_verify_marker() {
  test -s "$T37_BACKUP" && test -s "$T37_BACKUP_SHA" && test -s "$T37_PREFLIGHT" && test -s "$T37_MARKER" || die "0037 rehearsal evidence missing"
  sha256sum -c "$T37_BACKUP_SHA" >/dev/null || die "0037 backup checksum mismatch"
  grep -Fx "SOURCE_REVISION=$SOURCE_REVISION" "$T37_MARKER" >/dev/null || die "0037 rehearsal source mismatch"
  grep -Fx "UP_SHA256=$T37_UP_SHA256" "$T37_MARKER" >/dev/null || die "0037 rehearsal up mismatch"
  grep -Fx "DOWN_SHA256=$T37_DOWN_SHA256" "$T37_MARKER" >/dev/null || die "0037 rehearsal down mismatch"
  grep -Fx "BACKUP_SHA256=$(awk '{print $1}' "$T37_BACKUP_SHA")" "$T37_MARKER" >/dev/null || die "0037 rehearsal backup mismatch"
  grep -Fx "PREFLIGHT_SHA256=$(sha256sum "$T37_PREFLIGHT" | awk '{print $1}')" "$T37_MARKER" >/dev/null || die "0037 rehearsal preflight mismatch"
  local post_catalog
  post_catalog="$(t37_marker_post_catalog)"
  [[ "$post_catalog" =~ ^[a-f0-9]{64}$ ]] || die "0037 rehearsal catalog identity missing"
  grep -Fx 'REHEARSAL=UP_DOWN_UP_PASS' "$T37_MARKER" >/dev/null || die "0037 rehearsal verdict missing"
  test "$(cat "$T37_PREFLIGHT")" = "$(t37_expected_preflight)" || die "0037 recorded preflight is not the approved target"
  test "$(t37_observed_preflight)" = "$(cat "$T37_PREFLIGHT")" || die "target changed since 0037 rehearsal"
}

t37_backup_rehearse() {
  t37_source_identity
  acquire_mutation_lock
  t37_require_preflight
  test ! -e "$T37_EVIDENCE_DIR" || die "0037 evidence directory already exists"
  install -d -m 0700 "$T37_EVIDENCE_DIR"
  t37_observed_preflight > "$T37_PREFLIGHT"
  chmod 600 "$T37_PREFLIGHT"
  test "$(cat "$T37_PREFLIGHT")" = "$(t37_expected_preflight)" || die "0037 recorded preflight mismatch"
  local restore_database="lana_track_b_0037_rehearsal_$$" cleanup=1
  finish() {
    docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec dropdb --if-exists --force -U "$POSTGRES_USER" "$1"' sh "$restore_database" >/dev/null 2>&1 || true
    if test "$cleanup" = "1"; then rm -rf -- "$T37_EVIDENCE_DIR"; fi
  }
  trap finish EXIT HUP INT TERM
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$T37_BACKUP"
  test -s "$T37_BACKUP" || die "0037 backup is empty"
  chmod 600 "$T37_BACKUP"
  sha256sum "$T37_BACKUP" > "$T37_BACKUP_SHA"
  chmod 600 "$T37_BACKUP_SHA"
  docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$T37_BACKUP" >/dev/null
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec createdb -U "$POSTGRES_USER" "$1"' sh "$restore_database"
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_restore --exit-on-error -U "$POSTGRES_USER" -d "$1"' sh "$restore_database" < "$T37_BACKUP"
  test "$(database_query_named "$restore_database" "SELECT split_part(current_setting('server_version'),'.',1)")" = "$EXPECTED_POSTGRES_MAJOR" || die "0037 restored engine mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT migration_name,checksum_sha256 FROM schema_migrations ORDER BY migration_name")" = "$T37_LEDGER_SHA256" || die "0037 restored ledger mismatch"
  test "$(database_sql_file_sha256_named "$restore_database" "$RELATION_ACL_QUERY")" = "$T37_RELATION_ACL_SHA256" || die "0037 restored relation ACL mismatch"
  test "$(database_sql_file_sha256_named "$restore_database" "$FUNCTION_ACL_QUERY")" = "$T37_FUNCTION_ACL_SHA256" || die "0037 restored function ACL mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0037 restored role attributes mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0037 restored role memberships mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0037 restored extensions mismatch"

  database_stream_named "$restore_database" >/dev/null <<SQL
INSERT INTO runtime_behavior_mode_versions(mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at)
VALUES ('70000000-0000-4000-8000-000000000001','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',1,'V2_ACTIVE','COMMERCE','LEGACY','$T37_V2_BUNDLE','$T37_V2_CONTENT','TRACK_B_0037_REHEARSAL','isolated disposable rehearsal',clock_timestamp());
SQL
  t37_apply_up_named "$restore_database"
  t37_verify_up_named "$restore_database"
  local post_catalog_sha
  post_catalog_sha="$(t37_catalog_sha_named "$restore_database")"
  test "$post_catalog_sha" != "$T37_PRE_CATALOG_SHA256" || die "0037 up did not change the exact guard catalog"

  local concurrent_first="$T37_EVIDENCE_DIR/concurrent-first.err"
  local concurrent_second="$T37_EVIDENCE_DIR/concurrent-second.err"
  (
    database_stream_named "$restore_database" >/dev/null 2>"$concurrent_first" <<SQL
BEGIN;
INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at)
VALUES ('70000000-0000-4000-8000-000000000020','70000000-0000-4000-8000-000000000021','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T37_V1_VERSION','$T37_V1_CONTENT',$T37_POINTER_REVISION,'70000000-0000-4000-8000-000000000001','$T37_V2_CONTENT','$T37_V2_BUNDLE',repeat('1',64),1,repeat('2',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp());
SELECT pg_sleep(2);
COMMIT;
SQL
  ) &
  local concurrent_pid=$!
  sleep 1
  if database_query_named "$restore_database" "SET statement_timeout='5s'; INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at) VALUES ('70000000-0000-4000-8000-000000000022','70000000-0000-4000-8000-000000000023','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T37_V1_VERSION','$T37_V1_CONTENT',$T37_POINTER_REVISION,'70000000-0000-4000-8000-000000000001','$T37_V2_CONTENT','$T37_V2_BUNDLE',repeat('3',64),1,repeat('4',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp())" >/dev/null 2>"$concurrent_second"; then
    die "0037 concurrent live-scope conflict succeeded"
  fi
  wait "$concurrent_pid" || die "0037 concurrent winning fence failed"
  grep -q 'df13_commerce_cutover_fences_live_scope_uk' "$concurrent_second" || die "0037 concurrent refusal mismatch"
  database_query_named "$restore_database" "UPDATE df13_commerce_cutover_fences SET token_hash=NULL,lease_until=NULL,released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE fence_id='70000000-0000-4000-8000-000000000020'" >/dev/null
  rm -f -- "$concurrent_first" "$concurrent_second"

  database_query_named "$restore_database" "INSERT INTO runtime_behavior_mode_versions(mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at) VALUES ('70000000-0000-4000-8000-000000000002','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',1,'V2_ACTIVE','COMMERCE','LEGACY',repeat('9',64),'sha256:'||repeat('8',64),'TRACK_B_0037_REHEARSAL','invalid transition probe',clock_timestamp())" >/dev/null
  local invalid_transition="$T37_EVIDENCE_DIR/invalid-transition.err"
  if database_query_named "$restore_database" "INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at) VALUES ('70000000-0000-4000-8000-000000000024','70000000-0000-4000-8000-000000000025','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T37_V1_VERSION','$T37_V1_CONTENT',$T37_POINTER_REVISION,'70000000-0000-4000-8000-000000000002','sha256:'||repeat('8',64),repeat('9',64),repeat('5',64),1,repeat('6',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp())" >/dev/null 2>"$invalid_transition"; then
    die "0037 ambiguous authority transition succeeded"
  fi
  grep -q 'df13 commerce cutover fence authority transition is invalid' "$invalid_transition" || die "0037 invalid transition refusal mismatch"
  rm -f -- "$invalid_transition"

  database_stream_named "$restore_database" >/dev/null <<SQL
INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at)
VALUES ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000011','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T37_V1_VERSION','$T37_V1_CONTENT',$T37_POINTER_REVISION,'70000000-0000-4000-8000-000000000001','$T37_V2_CONTENT','$T37_V2_BUNDLE',repeat('a',64),1,repeat('b',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp());
UPDATE df13_commerce_cutover_fences SET token_hash=NULL,lease_until=NULL,released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE fence_id='70000000-0000-4000-8000-000000000010';
UPDATE runtime_behavior_mode_pointers SET active_version_id='70000000-0000-4000-8000-000000000001',pointer_revision=pointer_revision+1 WHERE page_id='$EXPECTED_PAGE_ID' AND channel='$EXPECTED_CHANNEL';
INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at)
VALUES ('70000000-0000-4000-8000-000000000012','70000000-0000-4000-8000-000000000013','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','70000000-0000-4000-8000-000000000001','$T37_V2_CONTENT',$((T37_POINTER_REVISION+1)),'$T37_V1_VERSION','$T37_V1_CONTENT','$T37_V1_BUNDLE',repeat('c',64),1,repeat('d',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp());
UPDATE df13_commerce_cutover_fences SET token_hash=NULL,lease_until=NULL,released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE fence_id='70000000-0000-4000-8000-000000000012';
SQL
  if cat "$T37_DOWN" | database_stream_named "$restore_database" >/dev/null 2>&1; then die "0037 down accepted active V2"; fi
  database_query_named "$restore_database" "UPDATE runtime_behavior_mode_pointers SET active_version_id='$T37_V1_VERSION',pointer_revision=pointer_revision+1 WHERE page_id='$EXPECTED_PAGE_ID' AND channel='$EXPECTED_CHANNEL'" >/dev/null
  database_query_named "$restore_database" "INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at) VALUES ('70000000-0000-4000-8000-000000000014','70000000-0000-4000-8000-000000000015','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T37_V1_VERSION','$T37_V1_CONTENT',(SELECT pointer_revision FROM runtime_behavior_mode_pointers WHERE page_id='$EXPECTED_PAGE_ID' AND channel='$EXPECTED_CHANNEL'),'70000000-0000-4000-8000-000000000001','$T37_V2_CONTENT','$T37_V2_BUNDLE',repeat('e',64),1,repeat('f',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp())" >/dev/null
  if t37_apply_down_named "$restore_database" >/dev/null 2>&1; then die "0037 down erased a live fence"; fi
  database_query_named "$restore_database" "UPDATE df13_commerce_cutover_fences SET token_hash=NULL,lease_until=NULL,released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE fence_id='70000000-0000-4000-8000-000000000014'" >/dev/null
  t37_apply_down_named "$restore_database"
  t37_verify_down_named "$restore_database"
  t37_apply_up_named "$restore_database"
  cat "$T37_UP" | database_stream_named "$restore_database" >/dev/null
  t37_verify_up_named "$restore_database"
  test "$(t37_catalog_sha_named "$restore_database")" = "$post_catalog_sha" || die "0037 repeated up catalog mismatch"

  printf '%s\n' \
    "SOURCE_REVISION=$SOURCE_REVISION" \
    "UP_SHA256=$T37_UP_SHA256" \
    "DOWN_SHA256=$T37_DOWN_SHA256" \
    "BACKUP_SHA256=$(awk '{print $1}' "$T37_BACKUP_SHA")" \
    "PREFLIGHT_SHA256=$(sha256sum "$T37_PREFLIGHT" | awk '{print $1}')" \
    "POST_CATALOG_SHA256=$post_catalog_sha" \
    'REHEARSAL=UP_DOWN_UP_PASS' > "$T37_MARKER"
  chmod 600 "$T37_MARKER"
  cleanup=0
  finish
  trap - EXIT HUP INT TERM
  printf '%s\n' 'TRACK_B_0037_BACKUP_REHEARSAL_PASS'
}

t37_verify_live() {
  t37_source_identity
  t37_verify_up_named "$EXPECTED_DATABASE"
  test "$(t37_catalog_sha_named "$EXPECTED_DATABASE")" = "$(t37_marker_post_catalog)" || die "0037 live exact catalog mismatch"
  test "$(database_query "SELECT count(*) FROM schema_migrations")" = "37" || die "0037 live ledger count mismatch"
  test "$(t37_pointer)" = "$T37_POINTER_REVISION|$T37_V1_VERSION|COMMERCE|LEGACY|$T37_V1_BUNDLE|$T37_V1_CONTENT" || die "0037 changed behavior pointer"
  test "$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL")" = "0" || die "0037 live fence is not empty"
  printf '%s\n' 'TRACK_B_0037_PREPROD_SCHEMA_VERIFIED'
}

t37_recovery_observed() {
  printf '%s\n' \
    "OBSERVED_LEDGER_0037=$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T37_MIGRATION' AND checksum_sha256='$T37_UP_SHA256'" 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_POINTER=$(t37_pointer 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_LIVE_CUTOVER_FENCES=$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL" 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_CATALOG_SHA256=$(t37_catalog_sha_named "$EXPECTED_DATABASE" 2>/dev/null || printf UNAVAILABLE)"
}

t37_write_recovery() {
  local disposition="$1"
  if ! {
    printf '%s\n' "RECOVERY=$disposition" "BACKUP_FILE=$T37_BACKUP" \
      "BACKUP_SHA256=$(awk '{print $1}' "$T37_BACKUP_SHA" 2>/dev/null || printf UNAVAILABLE)"
    t37_recovery_observed
  } > "$T37_ROLLBACK"; then
    return 1
  fi
  chmod 600 "$T37_ROLLBACK" || return 1
}

t37_recover_failed_apply() {
  local ledger pointer live_fences
  ledger="$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T37_MIGRATION' AND checksum_sha256='$T37_UP_SHA256'" 2>/dev/null || printf UNAVAILABLE)"
  if test "$ledger" = "0" && t37_preflight_matches; then
    if t37_write_recovery 'VERIFIED_TRANSACTION_NOT_COMMITTED'; then return 0; fi
    return 1
  fi
  pointer="$(t37_pointer 2>/dev/null || printf UNAVAILABLE)"
  live_fences="$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL" 2>/dev/null || printf UNAVAILABLE)"
  if test "$ledger" = "1" &&
     test "$pointer" = "$T37_POINTER_REVISION|$T37_V1_VERSION|COMMERCE|LEGACY|$T37_V1_BUNDLE|$T37_V1_CONTENT" &&
     test "$live_fences" = "0"; then
    if t37_apply_down_named "$EXPECTED_DATABASE" && t37_preflight_matches; then
      if t37_write_recovery 'VERIFIED_PRE_0037'; then return 0; fi
      return 1
    fi
  fi
  if t37_write_recovery 'BLOCKED_MANUAL_RESTORE_REQUIRED'; then return 0; fi
  return 1
}

t37_apply_live() {
  test "${MIGRATION_AUTHORIZED:-}" = 'YES_I_AM_AUTHORIZED' || die "explicit 0037 migration authorization is required"
  t37_source_identity
  acquire_mutation_lock
  t37_require_preflight
  t37_verify_marker
  local may_have_committed=0
  recover() {
    local status=$?
    trap - EXIT HUP INT TERM
    if test "$status" -ne 0 && test "$may_have_committed" = "1"; then
      if ! t37_recover_failed_apply; then
        printf '%s\n' 'TRACK_B_0037_RECOVERY_EVIDENCE_WRITE_FAILED' >&2
      fi
    fi
    exit "$status"
  }
  trap recover EXIT HUP INT TERM
  may_have_committed=1
  t37_apply_up_named "$EXPECTED_DATABASE"
  t37_verify_live
  may_have_committed=0
  trap - EXIT HUP INT TERM
  printf '%s\n' 'TRACK_B_0037_PREPROD_APPLY_PASS'
}

if test "${BASH_SOURCE[0]}" = "$0"; then
  case "${1:-}" in
    preflight) t37_source_identity; t37_require_preflight; printf '%s\n' 'TRACK_B_0037_PREFLIGHT_PASS' ;;
    backup-rehearse) t37_backup_rehearse ;;
    apply) t37_apply_live ;;
    verify) t37_verify_live ;;
    *) die "usage: $0 {preflight|backup-rehearse|apply|verify}" ;;
  esac
fi
