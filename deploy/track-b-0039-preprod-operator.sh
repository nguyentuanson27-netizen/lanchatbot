#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# Reuse the reviewed credential-safe database, ACL, catalog, and target helpers.
# shellcheck source=track-b-0037-preprod-operator.sh
source "$script_dir/track-b-0037-preprod-operator.sh"

readonly T39_MIGRATION="0039_track_b_v2_lkg_cutover_fence"
readonly T39_UP_SHA256="f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca"
readonly T39_DOWN_SHA256="191e1846a549d99d4c6d4a804fc0148b0458f0fda6944a04e20d48286f7e7301"
readonly T39_PREVIOUS_MIGRATION="0038_track_b_commerce_admission_gate"
readonly T39_PREVIOUS_SHA256="9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140"
readonly T39_PRE_LEDGER_SHA256="f320a6892ff6a1b10aa1283e35577e673af78099357a1a2b8f791d35bbeed9be"
readonly T39_POST_LEDGER_SHA256="abc4239e2b473def1ecd8f6ca31fb505deec1469cb08af41778ef2dc757cfd3b"
readonly T39_UP="$SOURCE_ROOT/packages/database/pending-migrations/$T39_MIGRATION.up.sql"
readonly T39_DOWN="$SOURCE_ROOT/packages/database/pending-migrations/$T39_MIGRATION.down.sql"
readonly T39_POINTER_REVISION="11"
readonly T39_V2_VERSION="ccd021a6-24e3-4a46-87a0-6d63f506cb86"
readonly T39_V2_BUNDLE="$T37_V2_BUNDLE"
readonly T39_V2_CONTENT="$T37_V2_CONTENT"
readonly T39_REALTIME_IMAGE="lana-chatbot-app:track-b-b0aeb8907"
readonly T39_REALTIME_IMAGE_ID="sha256:1c141af18db98d127dfb30c5c70625bc6f27a85d6c5911473339a5cf47277536"
readonly T39_REALTIME_REVISION="b0aeb8907dae4ae2d9051b409ba25fa3f17fd188"
readonly T39_RUNTIME_CONFIG_SHA256="061a39956252a3ef4c8aed5b4e0694694a7b0768dfc5c05e5c5339bde1b9ce80"
readonly T39_STARTUP_FILE_SHA256="d97f510a9accfba974b7c49f179722529a0a1f6bee6b03fa6f31033ded21d5d1"
readonly T39_PRE_FUNCTION_ACL_SHA256="5484d2684f85375e1398d793945ab0c48deae8dcb8170930a96ebf98930f26d6"
readonly T39_PRE_CATALOG_SHA256="db48cb79a29aa19090ee0728abed11f6cf42995263cd9fe2a3cba8fae1a8a980"
if test "${BASH_SOURCE[0]}" != "$0" && test "${TRACK_B_0039_OPERATOR_TEST_MODE:-}" = 'YES'; then
  : "${TRACK_B_0039_TEST_EVIDENCE_DIR:?test evidence directory is required}"
  T39_EVIDENCE_DIR="$TRACK_B_0039_TEST_EVIDENCE_DIR"
else
  T39_EVIDENCE_DIR="$APP_ROOT/backups/20260904-track-b-0039-preprod"
fi
readonly T39_EVIDENCE_DIR
readonly T39_BACKUP="$T39_EVIDENCE_DIR/lana_chatbot_pre_0039.dump"
readonly T39_BACKUP_SHA="$T39_BACKUP.sha256"
readonly T39_PREFLIGHT="$T39_EVIDENCE_DIR/target-preflight.txt"
readonly T39_MARKER="$T39_EVIDENCE_DIR/rehearsal.ok"
readonly T39_ROLLBACK="$T39_EVIDENCE_DIR/rollback-status.txt"

require_common_tools
if test "${TRACK_B_0039_OPERATOR_TEST_MODE:-}" != YES; then
  require_command node
  require_command pnpm
fi

t39_source_identity() {
  : "${SOURCE_REVISION:?SOURCE_REVISION is required}"
  [[ "$SOURCE_REVISION" =~ ^[a-f0-9]{40}$ ]] || die "source revision is invalid"
  test -s "$T39_UP" && test -s "$T39_DOWN" || die "0039 source artifacts missing"
  test "$(sha256sum "$T39_UP" | awk '{print $1}')" = "$T39_UP_SHA256" || die "0039 up checksum mismatch"
  test "$(sha256sum "$T39_DOWN" | awk '{print $1}')" = "$T39_DOWN_SHA256" || die "0039 down checksum mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_REVISION" || die "source revision checkout mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse refs/remotes/origin/main)" = "$SOURCE_REVISION" || die "source revision is not exact origin/main"
  test -z "$(git -C "$SOURCE_ROOT" status --porcelain)" || die "source worktree is dirty"
}

t39_pointer() { t37_pointer; }
t39_runtime_identity() {
  local startup_source
  startup_source="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/run/df13/commerce-startup.json"}}{{.Source}}{{end}}{{end}}' "$REALTIME_CONTAINER")"
  test -n "$startup_source" || die "0039 realtime startup mount missing"
  printf '%s|%s|%s|%s|%s\n' \
    "$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$REALTIME_CONTAINER")" \
    "$(docker inspect --format '{{index .Config.Labels "com.lana.runtime-config-hash"}}' "$REALTIME_CONTAINER")" \
    "$(sha256sum "$startup_source" | awk '{print $1}')" \
    "$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" \
    "$(docker inspect --format '{{.Image}}' "$REALTIME_CONTAINER")"
}
t39_cutover_fence_state() {
  database_query "SELECT count(*)::text||'|'||count(*) FILTER (WHERE released_at IS NULL)::text FROM df13_commerce_cutover_fences"
}
t39_ledger_sha_named() {
  database_copy_sha256_named "$1" "SELECT migration_name,checksum_sha256 FROM schema_migrations ORDER BY migration_name"
}
t39_catalog_sha_named() {
  database_copy_sha256_named "$1" "SELECT n.nspname,p.proname,p.pronargs,p.prorettype::regtype::text,p.proconfig::text,p.proacl::text,p.prosrc,l.lanname,pg_get_userbyid(p.proowner),pg_get_function_identity_arguments(p.oid),pg_get_function_result(p.oid),pg_get_functiondef(p.oid),obj_description(p.oid,'pg_proc') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity' ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)"
}

t39_expected_preflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$EXPECTED_HOST_MACHINE_ID_SHA256" \
    "POSTGRES_IMAGE_ID=$EXPECTED_POSTGRES_IMAGE_ID" \
    "POSTGRES_VOLUME=$EXPECTED_POSTGRES_VOLUME" \
    "REALTIME_IMAGE=$T39_REALTIME_IMAGE" \
    "REALTIME_IMAGE_ID=$T39_REALTIME_IMAGE_ID" \
    "REALTIME_IDENTITY=$T39_REALTIME_REVISION|$T39_RUNTIME_CONFIG_SHA256|$T39_STARTUP_FILE_SHA256|$T39_REALTIME_IMAGE|$T39_REALTIME_IMAGE_ID" \
    "REALTIME_HEALTH=healthy|0" \
    "DATABASE_ENGINE=$EXPECTED_DATABASE|$EXPECTED_POSTGRES_MAJOR" \
    "SYSTEM_IDENTIFIER=$EXPECTED_SYSTEM_IDENTIFIER" \
    "PAGE_COUNT=$EXPECTED_PAGE_COUNT" \
    "PAGE_SET_SHA256=$EXPECTED_PAGE_SET_SHA256" \
    "PREPROD_PAGE=1" \
    "LEDGER_COUNT=38" \
    "LEDGER_SHA256=$T39_PRE_LEDGER_SHA256" \
    "LATEST_LEDGER=$T39_PREVIOUS_MIGRATION|$T39_PREVIOUS_SHA256" \
    "POINTER=$T39_POINTER_REVISION|$T39_V2_VERSION|COMMERCE|LEGACY|$T39_V2_BUNDLE|$T39_V2_CONTENT" \
    "ROLE_STATE_SHA256=$EXPECTED_ROLE_STATE_SHA256" \
    "ROLE_MEMBERSHIP_SHA256=$EXPECTED_ROLE_MEMBERSHIP_SHA256" \
    "RELATION_ACL_SHA256=$T37_RELATION_ACL_SHA256" \
    "FUNCTION_ACL_SHA256=$T39_PRE_FUNCTION_ACL_SHA256" \
    "CUTOVER_GUARD_CATALOG_SHA256=$T39_PRE_CATALOG_SHA256" \
    "EXTENSIONS_SHA256=$EXPECTED_EXTENSIONS_SHA256" \
    "AUTHORITY_FENCES=0|0|0" \
    "CUTOVER_FENCES=3|0" \
    "INFLIGHT_CLAIMS=0|0|0" \
    "REHEARSAL_OWNER_MARKERS=0" \
    "MIGRATION_0039=0|1"
}

t39_observed_preflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$(sha256sum /etc/machine-id | awk '{print $1}')" \
    "POSTGRES_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" \
    "POSTGRES_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}|{{.Type}}|{{.RW}}{{end}}{{end}}' "$POSTGRES_CONTAINER")" \
    "REALTIME_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_IDENTITY=$(t39_runtime_identity)" \
    "REALTIME_HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}|{{.RestartCount}}' "$REALTIME_CONTAINER")" \
    "DATABASE_ENGINE=$(database_query "SELECT current_database()||'|'||split_part(current_setting('server_version'),'.',1)")" \
    "SYSTEM_IDENTIFIER=$(database_query "SELECT system_identifier FROM pg_control_system()")" \
    "PAGE_COUNT=$(database_query "SELECT count(*) FROM pages")" \
    "PAGE_SET_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT page_id,status,routing_owner,app_send_enabled,kill_switch FROM pages ORDER BY page_id")" \
    "PREPROD_PAGE=$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" \
    "LEDGER_COUNT=$(database_query "SELECT count(*) FROM schema_migrations")" \
    "LEDGER_SHA256=$(t39_ledger_sha_named "$EXPECTED_DATABASE")" \
    "LATEST_LEDGER=$(database_query "SELECT migration_name||'|'||checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" \
    "POINTER=$(t39_pointer)" \
    "ROLE_STATE_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" \
    "ROLE_MEMBERSHIP_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" \
    "RELATION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")" \
    "FUNCTION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")" \
    "CUTOVER_GUARD_CATALOG_SHA256=$(t39_catalog_sha_named "$EXPECTED_DATABASE")" \
    "EXTENSIONS_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" \
    "AUTHORITY_FENCES=$(database_query "SELECT (SELECT count(*) FROM df13_commerce_authority_fences)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fence_claims)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fences WHERE completed_at IS NULL AND token_hash IS NOT NULL AND lease_until>clock_timestamp())::text")" \
    "CUTOVER_FENCES=$(t39_cutover_fence_state)" \
    "INFLIGHT_CLAIMS=$(database_query "SELECT (SELECT count(*) FROM webhook_inbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='PROCESSING')::text||'|'||(SELECT count(*) FROM meta_outbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='SENDING')::text||'|'||(SELECT count(*) FROM pancake_tag_outbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='APPLYING')::text")" \
    "REHEARSAL_OWNER_MARKERS=$(database_query "SELECT count(*) FROM pg_namespace WHERE nspname='track_b_0039_operator_owner'")" \
    "MIGRATION_0039=$(database_query "SELECT (SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_MIGRATION')::text||'|'||(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity')::text")"
}
t39_preflight_matches() { test "$(t39_observed_preflight)" = "$(t39_expected_preflight)"; }
t39_require_preflight() { t39_preflight_matches || die "exact ENGINEERING_PREPROD pre-0039 target mismatch"; }

t39_expected_postflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$EXPECTED_HOST_MACHINE_ID_SHA256" \
    "POSTGRES_IMAGE_ID=$EXPECTED_POSTGRES_IMAGE_ID" \
    "POSTGRES_VOLUME=$EXPECTED_POSTGRES_VOLUME" \
    "REALTIME_IMAGE=$T39_REALTIME_IMAGE" \
    "REALTIME_IMAGE_ID=$T39_REALTIME_IMAGE_ID" \
    "REALTIME_IDENTITY=$T39_REALTIME_REVISION|$T39_RUNTIME_CONFIG_SHA256|$T39_STARTUP_FILE_SHA256|$T39_REALTIME_IMAGE|$T39_REALTIME_IMAGE_ID" \
    "REALTIME_HEALTH=healthy|0" \
    "DATABASE_ENGINE=$EXPECTED_DATABASE|$EXPECTED_POSTGRES_MAJOR" \
    "SYSTEM_IDENTIFIER=$EXPECTED_SYSTEM_IDENTIFIER" \
    "PAGE_COUNT=$EXPECTED_PAGE_COUNT" \
    "PAGE_SET_SHA256=$EXPECTED_PAGE_SET_SHA256" \
    "PREPROD_PAGE=1" \
    "LEDGER_COUNT=39" \
    "LEDGER_SHA256=$T39_POST_LEDGER_SHA256" \
    "LATEST_LEDGER=$T39_MIGRATION|$T39_UP_SHA256" \
    "POINTER=$T39_POINTER_REVISION|$T39_V2_VERSION|COMMERCE|LEGACY|$T39_V2_BUNDLE|$T39_V2_CONTENT" \
    "ROLE_STATE_SHA256=$EXPECTED_ROLE_STATE_SHA256" \
    "ROLE_MEMBERSHIP_SHA256=$EXPECTED_ROLE_MEMBERSHIP_SHA256" \
    "RELATION_ACL_SHA256=$T37_RELATION_ACL_SHA256" \
    "FUNCTION_ACL_SHA256=$(t39_marker_post_function_acl)" \
    "EXTENSIONS_SHA256=$EXPECTED_EXTENSIONS_SHA256" \
    "AUTHORITY_FENCES=0|0|0" \
    "CUTOVER_FENCES=3|0" \
    "INFLIGHT_CLAIMS=0|0|0" \
    "REHEARSAL_OWNER_MARKERS=0" \
    "MIGRATION_0039=1|1" \
    "CATALOG_0039_SHA256=$(t39_marker_post_catalog)"
}

t39_observed_postflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$(sha256sum /etc/machine-id | awk '{print $1}')" \
    "POSTGRES_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" \
    "POSTGRES_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}|{{.Type}}|{{.RW}}{{end}}{{end}}' "$POSTGRES_CONTAINER")" \
    "REALTIME_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_IDENTITY=$(t39_runtime_identity)" \
    "REALTIME_HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}|{{.RestartCount}}' "$REALTIME_CONTAINER")" \
    "DATABASE_ENGINE=$(database_query "SELECT current_database()||'|'||split_part(current_setting('server_version'),'.',1)")" \
    "SYSTEM_IDENTIFIER=$(database_query "SELECT system_identifier FROM pg_control_system()")" \
    "PAGE_COUNT=$(database_query "SELECT count(*) FROM pages")" \
    "PAGE_SET_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT page_id,status,routing_owner,app_send_enabled,kill_switch FROM pages ORDER BY page_id")" \
    "PREPROD_PAGE=$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" \
    "LEDGER_COUNT=$(database_query "SELECT count(*) FROM schema_migrations")" \
    "LEDGER_SHA256=$(t39_ledger_sha_named "$EXPECTED_DATABASE")" \
    "LATEST_LEDGER=$(database_query "SELECT migration_name||'|'||checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" \
    "POINTER=$(t39_pointer)" \
    "ROLE_STATE_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" \
    "ROLE_MEMBERSHIP_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" \
    "RELATION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")" \
    "FUNCTION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")" \
    "EXTENSIONS_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" \
    "AUTHORITY_FENCES=$(database_query "SELECT (SELECT count(*) FROM df13_commerce_authority_fences)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fence_claims)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fences WHERE completed_at IS NULL AND token_hash IS NOT NULL AND lease_until>clock_timestamp())::text")" \
    "CUTOVER_FENCES=$(t39_cutover_fence_state)" \
    "INFLIGHT_CLAIMS=$(database_query "SELECT (SELECT count(*) FROM webhook_inbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='PROCESSING')::text||'|'||(SELECT count(*) FROM meta_outbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='SENDING')::text||'|'||(SELECT count(*) FROM pancake_tag_outbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='APPLYING')::text")" \
    "REHEARSAL_OWNER_MARKERS=$(database_query "SELECT count(*) FROM pg_namespace WHERE nspname='track_b_0039_operator_owner'")" \
    "MIGRATION_0039=$(database_query "SELECT (SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_MIGRATION' AND checksum_sha256='$T39_UP_SHA256')::text||'|'||(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity')::text")" \
    "CATALOG_0039_SHA256=$(t39_catalog_sha_named "$EXPECTED_DATABASE")"
}
t39_postflight_matches() { test "$(t39_observed_postflight)" = "$(t39_expected_postflight)"; }

t39_apply_up_named() {
  local database="$1"
  { printf '%s\n' 'BEGIN;'; cat "$T39_UP"; printf '%s\n' "INSERT INTO schema_migrations(migration_name,checksum_sha256) VALUES (:'migration_name',:'migration_checksum');" 'COMMIT;'; } |
    database_stream_named "$database" -v migration_name="$T39_MIGRATION" -v migration_checksum="$T39_UP_SHA256" >/dev/null
}
t39_apply_down_named() {
  local database="$1"
  { printf '%s\n' 'BEGIN;'; cat "$T39_DOWN"; printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name=:'migration_name' AND checksum_sha256=:'migration_checksum';" 'COMMIT;'; } |
    database_stream_named "$database" -v migration_name="$T39_MIGRATION" -v migration_checksum="$T39_UP_SHA256" >/dev/null
}

t39_verify_pre_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_PREVIOUS_MIGRATION' AND checksum_sha256='$T39_PREVIOUS_SHA256'")" = 1 || die "0039 exact 0038 dependency missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity' AND encode(public.digest(p.prosrc,'sha256'),'hex')='c72ab14e75111ce7f216e516a6f2edc86cfd4bf53d50d9c2359d064f20bdd4e3'")" = 1 || die "0039 exact 0037 fence guard missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission' AND p.proconfig=ARRAY['search_path=pg_catalog']::text[] AND encode(public.digest(p.prosrc,'sha256'),'hex')='d083f18d4a62cf313af3baba8c3a145225e9ee7852e4192119b158d34c8ac5ba'")" = 1 || die "0039 exact 0038 admission guard missing"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission' AND t.tgenabled='A' AND NOT t.tgisinternal")" = 3 || die "0039 exact 0038 admission trigger set missing"
}

t39_verify_up_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_MIGRATION' AND checksum_sha256='$T39_UP_SHA256'")" = 1 || die "0039 ledger readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity' AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::regtype AND p.proconfig IS NULL AND l.lanname='plpgsql' AND encode(public.digest(p.prosrc,'sha256'),'hex')='28ec7165520b614e7a40ac2e80fc781ec6fdeef2ae08b3fd82ff995e20c73ddc'")" = 1 || die "0039 V2 LKG guard catalog identity mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity'")" = 1 || die "0039 unexpected V2 LKG guard overload"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity' AND NOT t.tgisinternal")" = 1 || die "0039 exact fence trigger dependency mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid WHERE c.relname='df13_commerce_cutover_fences' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity' AND t.tgenabled='O' AND NOT t.tgisinternal")" = 1 || die "0039 fence trigger state mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL")" = 0 || die "0039 unexpected unreleased fence"
}
t39_verify_down_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_MIGRATION'")" = 0 || die "0039 down ledger mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_df13_commerce_cutover_fence_insert_identity' AND encode(public.digest(p.prosrc,'sha256'),'hex')='c72ab14e75111ce7f216e516a6f2edc86cfd4bf53d50d9c2359d064f20bdd4e3'")" = 1 || die "0039 down did not restore exact 0037 guard"
}

t39_postgres_host() {
  local addresses count octet
  local -a octets
  addresses="$(docker inspect --format '{{range .NetworkSettings.Networks}}{{println .IPAddress}}{{end}}' "$POSTGRES_CONTAINER" | sed '/^$/d')"
  count="$(printf '%s\n' "$addresses" | wc -l | tr -d ' ')"
  test "$count" = 1 || die "ambiguous PostgreSQL container network identity"
  [[ "$addresses" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || die "invalid PostgreSQL container address identity"
  IFS=. read -r -a octets <<< "$addresses"
  for octet in "${octets[@]}"; do ((10#$octet <= 255)) || die "invalid PostgreSQL container address identity"; done
  printf '%s\n' "$addresses"
}

t39_run_postgres_acceptance() {
  local database="$1" host user password database_url
  host="$(t39_postgres_host)"
  user="$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_USER)"
  password="$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_PASSWORD)"
  database_url="$(T39_HOST="$host" T39_USER="$user" T39_PASSWORD="$password" T39_DATABASE="$database" node -e 'const u=new URL("postgresql://placeholder");u.hostname=process.env.T39_HOST;u.username=process.env.T39_USER;u.password=process.env.T39_PASSWORD;u.pathname=`/${process.env.T39_DATABASE}`;process.stdout.write(u.toString())')"
  unset password
  POLICY_STORE_TEST_DATABASE_URL="$database_url" node --test "$SOURCE_ROOT/apps/admin-api/dist/track-b-0039-v2-lkg.postgres-spec.js"
  unset database_url
}

t39_cleanup_evidence_target_is_exact() {
  if test "$T39_EVIDENCE_DIR" = "$APP_ROOT/backups/20260904-track-b-0039-preprod"; then return 0; fi
  test "${TRACK_B_0039_OPERATOR_TEST_MODE:-}" = YES || return 1
  test "$T39_EVIDENCE_DIR" = "${TRACK_B_0039_TEST_EVIDENCE_DIR:-}" || return 1
  case "$T39_EVIDENCE_DIR" in /tmp/tmp.*/evidence) return 0 ;; *) return 1 ;; esac
}
t39_finish_rehearsal() {
  local restore_database="$1" cleanup_evidence="$2" owner_token="$3"
  [[ "$restore_database" =~ ^lana_track_b_0039_rehearsal_[0-9]+$ ]] || die "refusing ambiguous 0039 rehearsal database cleanup"
  [[ "$owner_token" =~ ^[0-9a-f-]{36}$ ]] || die "refusing missing 0039 rehearsal ownership identity"
  case "$cleanup_evidence" in 0|1) ;; *) die "invalid 0039 evidence cleanup disposition" ;; esac
  test "$(database_query_named "$restore_database" "SELECT count(*) FROM track_b_0039_operator_owner.run_identity WHERE token='$owner_token'")" = 1 || die "refusing unowned 0039 rehearsal database cleanup"
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec dropdb --if-exists --force -U "$POSTGRES_USER" "$1"' sh "$restore_database" >/dev/null
  test "$(database_query "SELECT count(*) FROM pg_database WHERE datname='$restore_database'")" = 0 || die "0039 rehearsal database cleanup unverified"
  if test "$cleanup_evidence" = 1; then
    t39_cleanup_evidence_target_is_exact || die "refusing ambiguous 0039 evidence cleanup"
    rm -rf -- "$T39_EVIDENCE_DIR"
    test ! -e "$T39_EVIDENCE_DIR" || die "0039 evidence cleanup unverified"
  fi
}
t39_abort_rehearsal() {
  local status=$? restore_database="$1" owner_token="$2"
  trap - EXIT HUP INT TERM
  t39_finish_rehearsal "$restore_database" 1 "$owner_token"
  test "$status" -ne 0 || status=1
  exit "$status"
}

t39_backup_rehearse() {
  t39_source_identity
  acquire_mutation_lock
  t39_require_preflight
  t39_verify_pre_named "$EXPECTED_DATABASE"
  test ! -e "$T39_EVIDENCE_DIR" || die "0039 evidence directory already exists"
  install -d -m 0700 "$T39_EVIDENCE_DIR"
  t39_observed_preflight > "$T39_PREFLIGHT"
  chmod 600 "$T39_PREFLIGHT"
  test "$(cat "$T39_PREFLIGHT")" = "$(t39_expected_preflight)" || die "0039 recorded preflight mismatch"
  local pre_ledger_sha pre_catalog_sha pre_relation_acl pre_function_acl restore_database owner_token cleanup=1
  pre_ledger_sha="$(t39_ledger_sha_named "$EXPECTED_DATABASE")"
  test "$pre_ledger_sha" = "$T39_PRE_LEDGER_SHA256" || die "0039 exact pre-ledger mismatch"
  pre_catalog_sha="$(t39_catalog_sha_named "$EXPECTED_DATABASE")"
  pre_relation_acl="$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")"
  pre_function_acl="$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")"
  restore_database="lana_track_b_0039_rehearsal_$$"
  owner_token="$(node -e 'process.stdout.write(require("node:crypto").randomUUID())')"
  [[ "$owner_token" =~ ^[0-9a-f-]{36}$ ]] || die "0039 rehearsal ownership identity generation failed"
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$T39_BACKUP"
  test -s "$T39_BACKUP" || die "0039 backup is empty"
  chmod 600 "$T39_BACKUP"
  sha256sum "$T39_BACKUP" > "$T39_BACKUP_SHA"
  chmod 600 "$T39_BACKUP_SHA"
  docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$T39_BACKUP" >/dev/null
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec createdb -U "$POSTGRES_USER" "$1"' sh "$restore_database"
  database_query_named "$restore_database" "CREATE SCHEMA track_b_0039_operator_owner; CREATE TABLE track_b_0039_operator_owner.run_identity(token text PRIMARY KEY); INSERT INTO track_b_0039_operator_owner.run_identity(token) VALUES ('$owner_token')" >/dev/null
  trap "t39_abort_rehearsal '$restore_database' '$owner_token'" EXIT HUP INT TERM
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_restore --exit-on-error -U "$POSTGRES_USER" -d "$1"' sh "$restore_database" < "$T39_BACKUP"
  test "$(t39_ledger_sha_named "$restore_database")" = "$pre_ledger_sha" || die "0039 restored ledger mismatch"
  test "$(t39_catalog_sha_named "$restore_database")" = "$pre_catalog_sha" || die "0039 restored catalog mismatch"
  test "$(database_sql_file_sha256_named "$restore_database" "$RELATION_ACL_QUERY")" = "$pre_relation_acl" || die "0039 restored relation ACL mismatch"
  test "$(database_sql_file_sha256_named "$restore_database" "$FUNCTION_ACL_QUERY")" = "$pre_function_acl" || die "0039 restored function ACL mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0039 restored role attributes mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0039 restored role memberships mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0039 restored extensions mismatch"

  t39_apply_up_named "$restore_database"
  t39_verify_up_named "$restore_database"
  pnpm --filter @lana/admin-api build >/dev/null
  t39_run_postgres_acceptance "$restore_database"
  # The real-PostgreSQL acceptance covers exact same-identity V2 LKG admission,
  # stale/missing/ambiguous identity refusal, page isolation, and lock races.
  database_query_named "$restore_database" "INSERT INTO runtime_behavior_mode_versions(mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at) VALUES ('80000000-0000-4000-8000-000000000001','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',1,'V2_ACTIVE','COMMERCE','LEGACY','$T37_V2_BUNDLE','$T37_V2_CONTENT','TRACK_B_0039_REHEARSAL','down refusal probe',clock_timestamp()) ON CONFLICT DO NOTHING" >/dev/null
  database_query_named "$restore_database" "INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at) VALUES ('80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T39_V2_VERSION','$T39_V2_CONTENT',$T39_POINTER_REVISION,'$T39_V2_VERSION','$T39_V2_CONTENT','$T39_V2_BUNDLE',repeat('8',64),1,repeat('9',64),clock_timestamp()-interval '1 minute',clock_timestamp(),clock_timestamp())" >/dev/null
  if t39_apply_down_named "$restore_database" >/dev/null 2>&1; then die "0039 down accepted an unreleased fence"; fi
  database_query_named "$restore_database" "UPDATE df13_commerce_cutover_fences SET token_hash=NULL,lease_until=NULL,released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE fence_id='80000000-0000-4000-8000-000000000002'" >/dev/null
  t39_apply_down_named "$restore_database"
  t39_verify_down_named "$restore_database"
  t39_apply_up_named "$restore_database"
  t39_verify_up_named "$restore_database"
  test "$(database_sql_file_sha256_named "$restore_database" "$RELATION_ACL_QUERY")" = "$pre_relation_acl" || die "0039 up changed relation ACL"
  test "$(database_copy_sha256_named "$restore_database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0039 up changed role attributes"
  test "$(database_copy_sha256_named "$restore_database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0039 up changed role memberships"
  test "$(database_copy_sha256_named "$restore_database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0039 final up changed extensions"
  local post_catalog_sha post_function_acl post_ledger_sha
  post_catalog_sha="$(t39_catalog_sha_named "$restore_database")"
  post_function_acl="$(database_sql_file_sha256_named "$restore_database" "$FUNCTION_ACL_QUERY")"
  post_ledger_sha="$(t39_ledger_sha_named "$restore_database")"
  [[ "$post_catalog_sha" =~ ^[a-f0-9]{64}$ ]] || die "0039 post catalog identity missing"
  [[ "$post_function_acl" =~ ^[a-f0-9]{64}$ ]] || die "0039 post function ACL identity missing"
  test "$post_ledger_sha" = "$T39_POST_LEDGER_SHA256" || die "0039 exact post-ledger mismatch"
  printf '%s\n' \
    "SOURCE_REVISION=$SOURCE_REVISION" "UP_SHA256=$T39_UP_SHA256" "DOWN_SHA256=$T39_DOWN_SHA256" \
    "BACKUP_SHA256=$(awk '{print $1}' "$T39_BACKUP_SHA")" \
    "PREFLIGHT_SHA256=$(sha256sum "$T39_PREFLIGHT" | awk '{print $1}')" \
    "POST_CATALOG_SHA256=$post_catalog_sha" "POST_FUNCTION_ACL_SHA256=$post_function_acl" \
    "POST_LEDGER_SHA256=$post_ledger_sha" \
    'REHEARSAL=UP_DOWN_UP_PASS' > "$T39_MARKER"
  chmod 600 "$T39_MARKER"
  cleanup=0
  t39_finish_rehearsal "$restore_database" "$cleanup" "$owner_token"
  trap - EXIT HUP INT TERM
  printf '%s\n' 'TRACK_B_0039_BACKUP_REHEARSAL_PASS'
}

t39_marker_post_catalog() { sed -n 's/^POST_CATALOG_SHA256=//p' "$T39_MARKER"; }
t39_marker_post_function_acl() { sed -n 's/^POST_FUNCTION_ACL_SHA256=//p' "$T39_MARKER"; }
t39_marker_post_ledger() { sed -n 's/^POST_LEDGER_SHA256=//p' "$T39_MARKER"; }
t39_verify_marker_artifacts() {
  test -s "$T39_BACKUP" && test -s "$T39_BACKUP_SHA" && test -s "$T39_PREFLIGHT" && test -s "$T39_MARKER" || die "0039 rehearsal evidence missing"
  sha256sum -c "$T39_BACKUP_SHA" >/dev/null || die "0039 backup checksum mismatch"
  grep -Fx "SOURCE_REVISION=$SOURCE_REVISION" "$T39_MARKER" >/dev/null || die "0039 rehearsal source mismatch"
  grep -Fx "UP_SHA256=$T39_UP_SHA256" "$T39_MARKER" >/dev/null || die "0039 rehearsal up mismatch"
  grep -Fx "DOWN_SHA256=$T39_DOWN_SHA256" "$T39_MARKER" >/dev/null || die "0039 rehearsal down mismatch"
  grep -Fx "BACKUP_SHA256=$(awk '{print $1}' "$T39_BACKUP_SHA")" "$T39_MARKER" >/dev/null || die "0039 rehearsal backup identity mismatch"
  grep -Fx "PREFLIGHT_SHA256=$(sha256sum "$T39_PREFLIGHT" | awk '{print $1}')" "$T39_MARKER" >/dev/null || die "0039 rehearsal preflight mismatch"
  grep -Fx 'REHEARSAL=UP_DOWN_UP_PASS' "$T39_MARKER" >/dev/null || die "0039 rehearsal verdict missing"
  [[ "$(t39_marker_post_catalog)" =~ ^[a-f0-9]{64}$ ]] || die "0039 rehearsal catalog identity missing"
  [[ "$(t39_marker_post_function_acl)" =~ ^[a-f0-9]{64}$ ]] || die "0039 rehearsal function ACL identity missing"
  [[ "$(t39_marker_post_ledger)" =~ ^[a-f0-9]{64}$ ]] || die "0039 rehearsal ledger identity missing"
  test "$(t39_marker_post_ledger)" = "$T39_POST_LEDGER_SHA256" || die "0039 rehearsal exact ledger mismatch"
  test "$(cat "$T39_PREFLIGHT")" = "$(t39_expected_preflight)" || die "0039 recorded preflight is not approved target"
}
t39_verify_marker() {
  t39_verify_marker_artifacts
  test "$(t39_observed_preflight)" = "$(cat "$T39_PREFLIGHT")" || die "target changed since 0039 rehearsal"
}

t39_verify_live() {
  t39_source_identity
  t39_verify_marker_artifacts
  t39_verify_up_named "$EXPECTED_DATABASE"
  t39_postflight_matches || die "exact ENGINEERING_PREPROD post-0039 target mismatch"
  printf '%s\n' 'TRACK_B_0039_PREPROD_SCHEMA_VERIFIED'
}

t39_write_recovery() {
  local disposition="$1"
  printf '%s\n' "RECOVERY=$disposition" "BACKUP_FILE=$T39_BACKUP" \
    "OBSERVED_LEDGER_0039=$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_MIGRATION' AND checksum_sha256='$T39_UP_SHA256'" 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_POINTER=$(t39_pointer 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_CUTOVER_FENCES=$(t39_cutover_fence_state 2>/dev/null || printf UNAVAILABLE)" > "$T39_ROLLBACK" || return 1
  chmod 600 "$T39_ROLLBACK"
}
t39_post_apply_identity_matches() {
  (t39_verify_marker_artifacts) >/dev/null 2>&1 || return 1
  (t39_postflight_matches) >/dev/null 2>&1 || return 1
}
t39_recover_failed_apply() {
  local ledger pointer cutover_fences
  ledger="$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T39_MIGRATION' AND checksum_sha256='$T39_UP_SHA256'" 2>/dev/null || printf UNAVAILABLE)"
  if test "$ledger" = 0 && t39_preflight_matches; then t39_write_recovery VERIFIED_TRANSACTION_NOT_COMMITTED; return; fi
  pointer="$(t39_pointer 2>/dev/null || printf UNAVAILABLE)"
  cutover_fences="$(t39_cutover_fence_state 2>/dev/null || printf UNAVAILABLE)"
  if test "$ledger" = 1 && test "$cutover_fences" = '3|0' && test "$pointer" = "$T39_POINTER_REVISION|$T39_V2_VERSION|COMMERCE|LEGACY|$T39_V2_BUNDLE|$T39_V2_CONTENT" && t39_post_apply_identity_matches; then
    if t39_apply_down_named "$EXPECTED_DATABASE" && t39_preflight_matches; then t39_write_recovery VERIFIED_PRE_0039; return; fi
  fi
  t39_write_recovery BLOCKED_MANUAL_RESTORE_REQUIRED
}
t39_apply_live() {
  test "${MIGRATION_AUTHORIZED:-}" = YES_I_AM_AUTHORIZED || die "explicit 0039 migration authorization is required"
  t39_source_identity
  acquire_mutation_lock
  t39_require_preflight
  t39_verify_marker
  t39_verify_pre_named "$EXPECTED_DATABASE"
  local may_have_committed=0
  recover() { local status=$?; trap - EXIT HUP INT TERM; if test "$status" -ne 0 && test "$may_have_committed" = 1; then t39_recover_failed_apply || printf '%s\n' TRACK_B_0039_RECOVERY_EVIDENCE_WRITE_FAILED >&2; fi; exit "$status"; }
  trap recover EXIT HUP INT TERM
  may_have_committed=1
  t39_apply_up_named "$EXPECTED_DATABASE"
  t39_verify_live
  may_have_committed=0
  trap - EXIT HUP INT TERM
  printf '%s\n' 'TRACK_B_0039_PREPROD_APPLY_PASS'
}

if test "${BASH_SOURCE[0]}" = "$0"; then
  case "${1:-}" in
    preflight) t39_source_identity; t39_require_preflight; printf '%s\n' TRACK_B_0039_PREFLIGHT_PASS ;;
    backup-rehearse) t39_backup_rehearse ;;
    apply) t39_apply_live ;;
    verify) t39_verify_live ;;
    *) die "usage: $0 {preflight|backup-rehearse|apply|verify}" ;;
  esac
fi
