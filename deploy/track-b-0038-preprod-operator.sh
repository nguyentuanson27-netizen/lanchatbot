#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# Reuse the reviewed credential-safe database, ACL, catalog, and target helpers.
# shellcheck source=track-b-0037-preprod-operator.sh
source "$script_dir/track-b-0037-preprod-operator.sh"

readonly T38_MIGRATION="0038_track_b_commerce_admission_gate"
readonly T38_UP_SHA256="9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140"
readonly T38_DOWN_SHA256="5dd292a169a5ecce5f21896bf8e11f1d7727a34a55758c92b8abc98f3de64d9a"
readonly T38_PREVIOUS_MIGRATION="0037_track_b_commerce_authority_replacement"
readonly T38_PREVIOUS_SHA256="40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20"
readonly T38_PRE_LEDGER_SHA256="012d49a74043e6425e1f26ba874ff1cd458ae83684e6013fbda9aff73bcbc0ce"
readonly T38_POST_LEDGER_SHA256="f320a6892ff6a1b10aa1283e35577e673af78099357a1a2b8f791d35bbeed9be"
readonly T38_UP="$SOURCE_ROOT/packages/database/pending-migrations/$T38_MIGRATION.up.sql"
readonly T38_DOWN="$SOURCE_ROOT/packages/database/pending-migrations/$T38_MIGRATION.down.sql"
readonly T38_POINTER_REVISION="$T37_POINTER_REVISION"
readonly T38_V1_VERSION="$T37_V1_VERSION"
readonly T38_V1_BUNDLE="$T37_V1_BUNDLE"
readonly T38_V1_CONTENT="$T37_V1_CONTENT"
if test "${BASH_SOURCE[0]}" != "$0" && test "${TRACK_B_0038_OPERATOR_TEST_MODE:-}" = 'YES'; then
  : "${TRACK_B_0038_TEST_EVIDENCE_DIR:?test evidence directory is required}"
  T38_EVIDENCE_DIR="$TRACK_B_0038_TEST_EVIDENCE_DIR"
else
  T38_EVIDENCE_DIR="$APP_ROOT/backups/20260902-track-b-0038-preprod"
fi
readonly T38_EVIDENCE_DIR
readonly T38_BACKUP="$T38_EVIDENCE_DIR/lana_chatbot_pre_0038.dump"
readonly T38_BACKUP_SHA="$T38_BACKUP.sha256"
readonly T38_PREFLIGHT="$T38_EVIDENCE_DIR/target-preflight.txt"
readonly T38_MARKER="$T38_EVIDENCE_DIR/rehearsal.ok"
readonly T38_ROLLBACK="$T38_EVIDENCE_DIR/rollback-status.txt"

require_common_tools
if test "${TRACK_B_0038_OPERATOR_TEST_MODE:-}" != YES; then
  require_command node
  require_command pnpm
fi

t38_source_identity() {
  : "${SOURCE_REVISION:?SOURCE_REVISION is required}"
  [[ "$SOURCE_REVISION" =~ ^[a-f0-9]{40}$ ]] || die "source revision is invalid"
  test -s "$T38_UP" && test -s "$T38_DOWN" || die "0038 source artifacts missing"
  test "$(sha256sum "$T38_UP" | awk '{print $1}')" = "$T38_UP_SHA256" || die "0038 up checksum mismatch"
  test "$(sha256sum "$T38_DOWN" | awk '{print $1}')" = "$T38_DOWN_SHA256" || die "0038 down checksum mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_REVISION" || die "source revision checkout mismatch"
  test "$(git -C "$SOURCE_ROOT" rev-parse refs/remotes/origin/main)" = "$SOURCE_REVISION" || die "source revision is not exact origin/main"
  test -z "$(git -C "$SOURCE_ROOT" status --porcelain)" || die "source worktree is dirty"
}

t38_pointer() { t37_pointer; }
t38_ledger_sha_named() {
  database_copy_sha256_named "$1" "SELECT migration_name,checksum_sha256 FROM schema_migrations ORDER BY migration_name"
}
t38_catalog_sha_named() {
  database_copy_sha256_named "$1" "SELECT pn.nspname,p.proname,p.pronargs,p.pronargdefaults,p.prorettype::regtype::text,p.proargtypes::text,p.proallargtypes::text,p.proargmodes::text,p.proargnames::text,p.prokind,p.prosecdef,p.proleakproof,p.proisstrict,p.proretset,p.provolatile,p.proparallel,p.procost,p.prorows,p.proconfig::text,p.proacl::text,p.protrftypes::text,p.prosupport::regproc::text,p.prosrc,p.probin,p.prosqlbody::text,l.lanname,pg_get_userbyid(p.proowner),pg_get_function_identity_arguments(p.oid),pg_get_function_result(p.oid),pg_get_functiondef(p.oid),obj_description(p.oid,'pg_proc'),tn.nspname,c.relname,t.tgname,t.tgenabled,t.tgtype,t.tgqual::text,t.tgattr::text,t.tgnargs,t.tgisinternal,pg_get_triggerdef(t.oid,false) FROM pg_proc p JOIN pg_namespace pn ON pn.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang LEFT JOIN pg_trigger t ON t.tgfoid=p.oid LEFT JOIN pg_class c ON c.oid=t.tgrelid LEFT JOIN pg_namespace tn ON tn.oid=c.relnamespace WHERE pn.nspname='public' AND p.proname='guard_track_b_cutover_admission' ORDER BY p.proname,pg_get_function_identity_arguments(p.oid),tn.nspname,c.relname,t.tgname"
}

t38_expected_preflight() {
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
    "LEDGER_COUNT=37" \
    "LEDGER_SHA256=$T38_PRE_LEDGER_SHA256" \
    "LATEST_LEDGER=$T38_PREVIOUS_MIGRATION|$T38_PREVIOUS_SHA256" \
    "POINTER=$T38_POINTER_REVISION|$T38_V1_VERSION|COMMERCE|LEGACY|$T38_V1_BUNDLE|$T38_V1_CONTENT" \
    "ROLE_STATE_SHA256=$EXPECTED_ROLE_STATE_SHA256" \
    "ROLE_MEMBERSHIP_SHA256=$EXPECTED_ROLE_MEMBERSHIP_SHA256" \
    "RELATION_ACL_SHA256=$T37_RELATION_ACL_SHA256" \
    "FUNCTION_ACL_SHA256=$T37_FUNCTION_ACL_SHA256" \
    "EXTENSIONS_SHA256=$EXPECTED_EXTENSIONS_SHA256" \
    "AUTHORITY_FENCES=0|0|0" \
    "CUTOVER_FENCES=0|0" \
    "INFLIGHT_CLAIMS=0|0|0" \
    "REHEARSAL_OWNER_MARKERS=0" \
    "MIGRATION_0038=0|0|0"
}

t38_observed_preflight() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$(sha256sum /etc/machine-id | awk '{print $1}')" \
    "POSTGRES_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" \
    "POSTGRES_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}|{{.Type}}|{{.RW}}{{end}}{{end}}' "$POSTGRES_CONTAINER")" \
    "REALTIME_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$REALTIME_CONTAINER")" \
    "REALTIME_HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}|{{.RestartCount}}' "$REALTIME_CONTAINER")" \
    "DATABASE_ENGINE=$(database_query "SELECT current_database()||'|'||split_part(current_setting('server_version'),'.',1)")" \
    "SYSTEM_IDENTIFIER=$(database_query "SELECT system_identifier FROM pg_control_system()")" \
    "PAGE_COUNT=$(database_query "SELECT count(*) FROM pages")" \
    "PAGE_SET_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT page_id,status,routing_owner,app_send_enabled,kill_switch FROM pages ORDER BY page_id")" \
    "PREPROD_PAGE=$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" \
    "LEDGER_COUNT=$(database_query "SELECT count(*) FROM schema_migrations")" \
    "LEDGER_SHA256=$(t38_ledger_sha_named "$EXPECTED_DATABASE")" \
    "LATEST_LEDGER=$(database_query "SELECT migration_name||'|'||checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" \
    "POINTER=$(t38_pointer)" \
    "ROLE_STATE_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" \
    "ROLE_MEMBERSHIP_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" \
    "RELATION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")" \
    "FUNCTION_ACL_SHA256=$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")" \
    "EXTENSIONS_SHA256=$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" \
    "AUTHORITY_FENCES=$(database_query "SELECT (SELECT count(*) FROM df13_commerce_authority_fences)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fence_claims)::text||'|'||(SELECT count(*) FROM df13_commerce_authority_fences WHERE completed_at IS NULL AND token_hash IS NOT NULL AND lease_until>clock_timestamp())::text")" \
    "CUTOVER_FENCES=$(database_query "SELECT count(*)::text||'|'||count(*) FILTER (WHERE released_at IS NULL)::text FROM df13_commerce_cutover_fences")" \
    "INFLIGHT_CLAIMS=$(database_query "SELECT (SELECT count(*) FROM webhook_inbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='PROCESSING')::text||'|'||(SELECT count(*) FROM meta_outbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='SENDING')::text||'|'||(SELECT count(*) FROM pancake_tag_outbox WHERE page_id='$EXPECTED_PAGE_ID' AND status='APPLYING')::text")" \
    "REHEARSAL_OWNER_MARKERS=$(database_query "SELECT count(*) FROM pg_namespace WHERE nspname='track_b_0038_operator_owner'")" \
    "MIGRATION_0038=$(database_query "SELECT (SELECT count(*) FROM schema_migrations WHERE migration_name='$T38_MIGRATION')::text||'|'||(SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'track_b_cutover_admission_%' AND NOT tgisinternal)::text||'|'||(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission')::text")"
}
t38_preflight_matches() { test "$(t38_observed_preflight)" = "$(t38_expected_preflight)"; }
t38_require_preflight() { t38_preflight_matches || die "exact ENGINEERING_PREPROD pre-0038 target mismatch"; }

t38_apply_up_named() {
  local database="$1"
  { printf '%s\n' 'BEGIN;'; cat "$T38_UP"; printf '%s\n' "INSERT INTO schema_migrations(migration_name,checksum_sha256) VALUES (:'migration_name',:'migration_checksum');" 'COMMIT;'; } |
    database_stream_named "$database" -v migration_name="$T38_MIGRATION" -v migration_checksum="$T38_UP_SHA256" >/dev/null
}
t38_apply_down_named() {
  local database="$1"
  { printf '%s\n' 'BEGIN;'; cat "$T38_DOWN"; printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name=:'migration_name' AND checksum_sha256=:'migration_checksum';" 'COMMIT;'; } |
    database_stream_named "$database" -v migration_name="$T38_MIGRATION" -v migration_checksum="$T38_UP_SHA256" >/dev/null
}

t38_verify_up_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T38_MIGRATION' AND checksum_sha256='$T38_UP_SHA256'")" = 1 || die "0038 ledger readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE n.nspname='public' AND c.relname IN ('webhook_inbox','meta_outbox','pancake_tag_outbox') AND t.tgname='track_b_cutover_admission_'||c.relname AND t.tgenabled='A' AND t.tgtype=19 AND t.tgqual IS NULL AND t.tgattr::text='' AND t.tgnargs=0 AND pn.nspname='public' AND p.proname='guard_track_b_cutover_admission' AND p.proconfig=ARRAY['search_path=pg_catalog']::text[] AND NOT t.tgisinternal")" = 3 || die "0038 trigger identity ENABLE ALWAYS readback mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'track_b_cutover_admission_%' AND NOT tgisinternal")" = 3 || die "0038 unexpected prefixed trigger dependency"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission' AND NOT t.tgisinternal")" = 3 || die "0038 unexpected function trigger dependency"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission' AND p.pronargs=0 AND p.pronargdefaults=0 AND p.prorettype='pg_catalog.trigger'::regtype AND p.prokind='f' AND NOT p.prosecdef AND NOT p.proleakproof AND NOT p.proisstrict AND NOT p.proretset AND p.provolatile='v' AND p.proparallel='u' AND p.proconfig=ARRAY['search_path=pg_catalog']::text[] AND p.proacl IS NULL AND l.lanname='plpgsql' AND encode(public.digest(p.prosrc,'sha256'),'hex')='d083f18d4a62cf313af3baba8c3a145225e9ee7852e4192119b158d34c8ac5ba'")" = 1 || die "0038 function catalog identity mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission'")" = 1 || die "0038 unexpected function overload"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission' AND r.rolname='lana_app'")" = 1 || die "0038 function owner mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL")" = 0 || die "0038 unexpected unreleased fence"
}
t38_verify_down_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T38_MIGRATION'")" = 0 || die "0038 down ledger mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'track_b_cutover_admission_%' AND NOT tgisinternal")" = 0 || die "0038 down trigger cleanup mismatch"
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_track_b_cutover_admission'")" = 0 || die "0038 down function cleanup mismatch"
  t37_verify_up_named "$database"
}

t38_postgres_host() {
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

t38_run_postgres_acceptance() {
  local database="$1" host user password database_url
  host="$(t38_postgres_host)"
  user="$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_USER)"
  password="$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_PASSWORD)"
  database_url="$(T38_HOST="$host" T38_USER="$user" T38_PASSWORD="$password" T38_DATABASE="$database" node -e 'const u=new URL("postgresql://placeholder");u.hostname=process.env.T38_HOST;u.username=process.env.T38_USER;u.password=process.env.T38_PASSWORD;u.pathname=`/${process.env.T38_DATABASE}`;process.stdout.write(u.toString())')"
  unset password
  POLICY_STORE_TEST_DATABASE_URL="$database_url" node --test "$SOURCE_ROOT/apps/admin-api/dist/track-b-0038-admission.postgres-spec.js"
  unset database_url
}

t38_cleanup_evidence_target_is_exact() {
  if test "$T38_EVIDENCE_DIR" = "$APP_ROOT/backups/20260902-track-b-0038-preprod"; then return 0; fi
  test "${TRACK_B_0038_OPERATOR_TEST_MODE:-}" = YES || return 1
  test "$T38_EVIDENCE_DIR" = "${TRACK_B_0038_TEST_EVIDENCE_DIR:-}" || return 1
  case "$T38_EVIDENCE_DIR" in /tmp/tmp.*/evidence) return 0 ;; *) return 1 ;; esac
}
t38_finish_rehearsal() {
  local restore_database="$1" cleanup_evidence="$2" owner_token="$3"
  [[ "$restore_database" =~ ^lana_track_b_0038_rehearsal_[0-9]+$ ]] || die "refusing ambiguous 0038 rehearsal database cleanup"
  [[ "$owner_token" =~ ^[0-9a-f-]{36}$ ]] || die "refusing missing 0038 rehearsal ownership identity"
  case "$cleanup_evidence" in 0|1) ;; *) die "invalid 0038 evidence cleanup disposition" ;; esac
  test "$(database_query_named "$restore_database" "SELECT count(*) FROM track_b_0038_operator_owner.run_identity WHERE token='$owner_token'")" = 1 || die "refusing unowned 0038 rehearsal database cleanup"
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec dropdb --if-exists --force -U "$POSTGRES_USER" "$1"' sh "$restore_database" >/dev/null
  test "$(database_query "SELECT count(*) FROM pg_database WHERE datname='$restore_database'")" = 0 || die "0038 rehearsal database cleanup unverified"
  if test "$cleanup_evidence" = 1; then
    t38_cleanup_evidence_target_is_exact || die "refusing ambiguous 0038 evidence cleanup"
    rm -rf -- "$T38_EVIDENCE_DIR"
    test ! -e "$T38_EVIDENCE_DIR" || die "0038 evidence cleanup unverified"
  fi
}
t38_abort_rehearsal() {
  local status=$? restore_database="$1" owner_token="$2"
  trap - EXIT HUP INT TERM
  t38_finish_rehearsal "$restore_database" 1 "$owner_token"
  test "$status" -ne 0 || status=1
  exit "$status"
}

t38_backup_rehearse() {
  t38_source_identity
  acquire_mutation_lock
  t38_require_preflight
  t37_verify_live >/dev/null
  test ! -e "$T38_EVIDENCE_DIR" || die "0038 evidence directory already exists"
  install -d -m 0700 "$T38_EVIDENCE_DIR"
  t38_observed_preflight > "$T38_PREFLIGHT"
  chmod 600 "$T38_PREFLIGHT"
  test "$(cat "$T38_PREFLIGHT")" = "$(t38_expected_preflight)" || die "0038 recorded preflight mismatch"
  local pre_ledger_sha pre_catalog_sha pre_relation_acl pre_function_acl restore_database owner_token cleanup=1
  pre_ledger_sha="$(t38_ledger_sha_named "$EXPECTED_DATABASE")"
  test "$pre_ledger_sha" = "$T38_PRE_LEDGER_SHA256" || die "0038 exact pre-ledger mismatch"
  pre_catalog_sha="$(t37_catalog_sha_named "$EXPECTED_DATABASE")"
  pre_relation_acl="$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")"
  pre_function_acl="$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")"
  restore_database="lana_track_b_0038_rehearsal_$$"
  owner_token="$(node -e 'process.stdout.write(require("node:crypto").randomUUID())')"
  [[ "$owner_token" =~ ^[0-9a-f-]{36}$ ]] || die "0038 rehearsal ownership identity generation failed"
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$T38_BACKUP"
  test -s "$T38_BACKUP" || die "0038 backup is empty"
  chmod 600 "$T38_BACKUP"
  sha256sum "$T38_BACKUP" > "$T38_BACKUP_SHA"
  chmod 600 "$T38_BACKUP_SHA"
  docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$T38_BACKUP" >/dev/null
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec createdb -U "$POSTGRES_USER" "$1"' sh "$restore_database"
  database_query_named "$restore_database" "CREATE SCHEMA track_b_0038_operator_owner; CREATE TABLE track_b_0038_operator_owner.run_identity(token text PRIMARY KEY); INSERT INTO track_b_0038_operator_owner.run_identity(token) VALUES ('$owner_token')" >/dev/null
  trap "t38_abort_rehearsal '$restore_database' '$owner_token'" EXIT HUP INT TERM
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_restore --exit-on-error -U "$POSTGRES_USER" -d "$1"' sh "$restore_database" < "$T38_BACKUP"
  test "$(t38_ledger_sha_named "$restore_database")" = "$pre_ledger_sha" || die "0038 restored ledger mismatch"
  test "$(t37_catalog_sha_named "$restore_database")" = "$pre_catalog_sha" || die "0038 restored catalog mismatch"
  test "$(database_sql_file_sha256_named "$restore_database" "$RELATION_ACL_QUERY")" = "$pre_relation_acl" || die "0038 restored relation ACL mismatch"
  test "$(database_sql_file_sha256_named "$restore_database" "$FUNCTION_ACL_QUERY")" = "$pre_function_acl" || die "0038 restored function ACL mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0038 restored role attributes mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0038 restored role memberships mismatch"
  test "$(database_copy_sha256_named "$restore_database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0038 restored extensions mismatch"

  t38_apply_up_named "$restore_database"
  t38_verify_up_named "$restore_database"
  pnpm --filter @lana/admin-api build >/dev/null
  t38_run_postgres_acceptance "$restore_database"
  # The real-PostgreSQL acceptance covers page isolation, concurrency/races,
  # queued inbound hold, in-flight drain, expired-but-unreleased fail-closed,
  # all three claim transitions, and exact release unblock behavior.
  database_query_named "$restore_database" "INSERT INTO runtime_behavior_mode_versions(mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at) VALUES ('80000000-0000-4000-8000-000000000001','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',1,'V2_ACTIVE','COMMERCE','LEGACY','$T37_V2_BUNDLE','$T37_V2_CONTENT','TRACK_B_0038_REHEARSAL','down refusal probe',clock_timestamp()) ON CONFLICT DO NOTHING" >/dev/null
  database_query_named "$restore_database" "INSERT INTO df13_commerce_cutover_fences(fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at) VALUES ('80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL','$T38_V1_VERSION','$T38_V1_CONTENT',$T38_POINTER_REVISION,'80000000-0000-4000-8000-000000000001','$T37_V2_CONTENT','$T37_V2_BUNDLE',repeat('8',64),1,repeat('9',64),clock_timestamp()-interval '1 minute',clock_timestamp(),clock_timestamp())" >/dev/null
  if t38_apply_down_named "$restore_database" >/dev/null 2>&1; then die "0038 down accepted an unreleased fence"; fi
  database_query_named "$restore_database" "UPDATE df13_commerce_cutover_fences SET token_hash=NULL,lease_until=NULL,released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE fence_id='80000000-0000-4000-8000-000000000002'" >/dev/null
  t38_apply_down_named "$restore_database"
  t38_verify_down_named "$restore_database"
  t38_apply_up_named "$restore_database"
  cat "$T38_UP" | database_stream_named "$restore_database" >/dev/null
  t38_verify_up_named "$restore_database"
  test "$(database_sql_file_sha256_named "$restore_database" "$RELATION_ACL_QUERY")" = "$pre_relation_acl" || die "0038 up changed relation ACL"
  test "$(database_copy_sha256_named "$restore_database" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0038 up changed role attributes"
  test "$(database_copy_sha256_named "$restore_database" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0038 up changed role memberships"
  test "$(database_copy_sha256_named "$restore_database" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0038 up changed extensions"
  local post_catalog_sha post_function_acl post_ledger_sha
  post_catalog_sha="$(t38_catalog_sha_named "$restore_database")"
  post_function_acl="$(database_sql_file_sha256_named "$restore_database" "$FUNCTION_ACL_QUERY")"
  post_ledger_sha="$(t38_ledger_sha_named "$restore_database")"
  [[ "$post_catalog_sha" =~ ^[a-f0-9]{64}$ ]] || die "0038 post catalog identity missing"
  [[ "$post_function_acl" =~ ^[a-f0-9]{64}$ ]] || die "0038 post function ACL identity missing"
  test "$post_ledger_sha" = "$T38_POST_LEDGER_SHA256" || die "0038 exact post-ledger mismatch"
  printf '%s\n' \
    "SOURCE_REVISION=$SOURCE_REVISION" "UP_SHA256=$T38_UP_SHA256" "DOWN_SHA256=$T38_DOWN_SHA256" \
    "BACKUP_SHA256=$(awk '{print $1}' "$T38_BACKUP_SHA")" \
    "PREFLIGHT_SHA256=$(sha256sum "$T38_PREFLIGHT" | awk '{print $1}')" \
    "POST_CATALOG_SHA256=$post_catalog_sha" "POST_FUNCTION_ACL_SHA256=$post_function_acl" \
    "POST_LEDGER_SHA256=$post_ledger_sha" \
    'REHEARSAL=UP_DOWN_UP_PASS' > "$T38_MARKER"
  chmod 600 "$T38_MARKER"
  cleanup=0
  t38_finish_rehearsal "$restore_database" "$cleanup" "$owner_token"
  trap - EXIT HUP INT TERM
  printf '%s\n' 'TRACK_B_0038_BACKUP_REHEARSAL_PASS'
}

t38_marker_post_catalog() { sed -n 's/^POST_CATALOG_SHA256=//p' "$T38_MARKER"; }
t38_marker_post_function_acl() { sed -n 's/^POST_FUNCTION_ACL_SHA256=//p' "$T38_MARKER"; }
t38_marker_post_ledger() { sed -n 's/^POST_LEDGER_SHA256=//p' "$T38_MARKER"; }
t38_verify_marker_artifacts() {
  test -s "$T38_BACKUP" && test -s "$T38_BACKUP_SHA" && test -s "$T38_PREFLIGHT" && test -s "$T38_MARKER" || die "0038 rehearsal evidence missing"
  sha256sum -c "$T38_BACKUP_SHA" >/dev/null || die "0038 backup checksum mismatch"
  grep -Fx "SOURCE_REVISION=$SOURCE_REVISION" "$T38_MARKER" >/dev/null || die "0038 rehearsal source mismatch"
  grep -Fx "UP_SHA256=$T38_UP_SHA256" "$T38_MARKER" >/dev/null || die "0038 rehearsal up mismatch"
  grep -Fx "DOWN_SHA256=$T38_DOWN_SHA256" "$T38_MARKER" >/dev/null || die "0038 rehearsal down mismatch"
  grep -Fx "BACKUP_SHA256=$(awk '{print $1}' "$T38_BACKUP_SHA")" "$T38_MARKER" >/dev/null || die "0038 rehearsal backup identity mismatch"
  grep -Fx "PREFLIGHT_SHA256=$(sha256sum "$T38_PREFLIGHT" | awk '{print $1}')" "$T38_MARKER" >/dev/null || die "0038 rehearsal preflight mismatch"
  grep -Fx 'REHEARSAL=UP_DOWN_UP_PASS' "$T38_MARKER" >/dev/null || die "0038 rehearsal verdict missing"
  [[ "$(t38_marker_post_catalog)" =~ ^[a-f0-9]{64}$ ]] || die "0038 rehearsal catalog identity missing"
  [[ "$(t38_marker_post_function_acl)" =~ ^[a-f0-9]{64}$ ]] || die "0038 rehearsal function ACL identity missing"
  [[ "$(t38_marker_post_ledger)" =~ ^[a-f0-9]{64}$ ]] || die "0038 rehearsal ledger identity missing"
  test "$(t38_marker_post_ledger)" = "$T38_POST_LEDGER_SHA256" || die "0038 rehearsal exact ledger mismatch"
  test "$(cat "$T38_PREFLIGHT")" = "$(t38_expected_preflight)" || die "0038 recorded preflight is not approved target"
}
t38_verify_marker() {
  t38_verify_marker_artifacts
  test "$(t38_observed_preflight)" = "$(cat "$T38_PREFLIGHT")" || die "target changed since 0038 rehearsal"
}

t38_verify_live() {
  t38_source_identity
  t38_verify_marker_artifacts
  t38_verify_up_named "$EXPECTED_DATABASE"
  test "$(database_query "SELECT count(*) FROM schema_migrations")" = 38 || die "0038 live ledger count mismatch"
  test "$(t38_ledger_sha_named "$EXPECTED_DATABASE")" = "$T38_POST_LEDGER_SHA256" || die "0038 live exact ledger mismatch"
  test "$(t38_ledger_sha_named "$EXPECTED_DATABASE")" = "$(t38_marker_post_ledger)" || die "0038 live ledger identity mismatch"
  test "$(t38_pointer)" = "$T38_POINTER_REVISION|$T38_V1_VERSION|COMMERCE|LEGACY|$T38_V1_BUNDLE|$T38_V1_CONTENT" || die "0038 changed behavior pointer"
  test "$(database_query "SELECT count(*)::text||'|'||count(*) FILTER (WHERE released_at IS NULL)::text FROM df13_commerce_cutover_fences")" = '0|0' || die "0038 changed cutover fence state"
  test "$(t38_catalog_sha_named "$EXPECTED_DATABASE")" = "$(t38_marker_post_catalog)" || die "0038 live trigger catalog mismatch"
  test "$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")" = "$T37_RELATION_ACL_SHA256" || die "0038 live relation ACL mismatch"
  test "$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")" = "$(t38_marker_post_function_acl)" || die "0038 live function ACL mismatch"
  test "$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname")" = "$EXPECTED_ROLE_STATE_SHA256" || die "0038 live role attributes drift"
  test "$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || die "0038 live role memberships drift"
  test "$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname")" = "$EXPECTED_EXTENSIONS_SHA256" || die "0038 live extensions drift"
  printf '%s\n' 'TRACK_B_0038_PREPROD_SCHEMA_VERIFIED'
}

t38_write_recovery() {
  local disposition="$1"
  printf '%s\n' "RECOVERY=$disposition" "BACKUP_FILE=$T38_BACKUP" \
    "OBSERVED_LEDGER_0038=$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T38_MIGRATION' AND checksum_sha256='$T38_UP_SHA256'" 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_POINTER=$(t38_pointer 2>/dev/null || printf UNAVAILABLE)" \
    "OBSERVED_LIVE_CUTOVER_FENCES=$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL" 2>/dev/null || printf UNAVAILABLE)" > "$T38_ROLLBACK" || return 1
  chmod 600 "$T38_ROLLBACK"
}
t38_post_apply_identity_matches() {
  (t38_verify_marker_artifacts) >/dev/null 2>&1 || return 1
  test "$(database_query "SELECT count(*) FROM schema_migrations" 2>/dev/null)" = 38 || return 1
  test "$(t38_ledger_sha_named "$EXPECTED_DATABASE" 2>/dev/null)" = "$T38_POST_LEDGER_SHA256" || return 1
  test "$(t38_pointer 2>/dev/null)" = "$T38_POINTER_REVISION|$T38_V1_VERSION|COMMERCE|LEGACY|$T38_V1_BUNDLE|$T38_V1_CONTENT" || return 1
  test "$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL" 2>/dev/null)" = 0 || return 1
  test "$(t38_catalog_sha_named "$EXPECTED_DATABASE" 2>/dev/null)" = "$(t38_marker_post_catalog)" || return 1
  test "$(t37_catalog_sha_named "$EXPECTED_DATABASE" 2>/dev/null)" = "$(t37_marker_post_catalog)" || return 1
  test "$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY" 2>/dev/null)" = "$T37_RELATION_ACL_SHA256" || return 1
  test "$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY" 2>/dev/null)" = "$(t38_marker_post_function_acl)" || return 1
  test "$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE left(rolname,3) <> chr(112)||chr(103)||chr(95) ORDER BY rolname" 2>/dev/null)" = "$EXPECTED_ROLE_STATE_SHA256" || return 1
  test "$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3" 2>/dev/null)" = "$EXPECTED_ROLE_MEMBERSHIP_SHA256" || return 1
  test "$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT extname,extversion FROM pg_extension ORDER BY extname" 2>/dev/null)" = "$EXPECTED_EXTENSIONS_SHA256" || return 1
}
t38_recover_failed_apply() {
  local ledger pointer live_fences
  ledger="$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T38_MIGRATION' AND checksum_sha256='$T38_UP_SHA256'" 2>/dev/null || printf UNAVAILABLE)"
  if test "$ledger" = 0 && t38_preflight_matches; then t38_write_recovery VERIFIED_TRANSACTION_NOT_COMMITTED; return; fi
  pointer="$(t38_pointer 2>/dev/null || printf UNAVAILABLE)"
  live_fences="$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL" 2>/dev/null || printf UNAVAILABLE)"
  if test "$ledger" = 1 && test "$live_fences" = 0 && test "$pointer" = "$T38_POINTER_REVISION|$T38_V1_VERSION|COMMERCE|LEGACY|$T38_V1_BUNDLE|$T38_V1_CONTENT" && t38_post_apply_identity_matches; then
    if t38_apply_down_named "$EXPECTED_DATABASE" && t38_preflight_matches; then t38_write_recovery VERIFIED_PRE_0038; return; fi
  fi
  t38_write_recovery BLOCKED_MANUAL_RESTORE_REQUIRED
}
t38_apply_live() {
  test "${MIGRATION_AUTHORIZED:-}" = YES_I_AM_AUTHORIZED || die "explicit 0038 migration authorization is required"
  t38_source_identity
  acquire_mutation_lock
  t38_require_preflight
  t38_verify_marker
  local may_have_committed=0
  recover() { local status=$?; trap - EXIT HUP INT TERM; if test "$status" -ne 0 && test "$may_have_committed" = 1; then t38_recover_failed_apply || printf '%s\n' TRACK_B_0038_RECOVERY_EVIDENCE_WRITE_FAILED >&2; fi; exit "$status"; }
  trap recover EXIT HUP INT TERM
  may_have_committed=1
  t38_apply_up_named "$EXPECTED_DATABASE"
  t38_verify_live
  may_have_committed=0
  trap - EXIT HUP INT TERM
  printf '%s\n' 'TRACK_B_0038_PREPROD_APPLY_PASS'
}

if test "${BASH_SOURCE[0]}" = "$0"; then
  case "${1:-}" in
    preflight) t38_source_identity; t38_require_preflight; printf '%s\n' TRACK_B_0038_PREFLIGHT_PASS ;;
    backup-rehearse) t38_backup_rehearse ;;
    apply) t38_apply_live ;;
    verify) t38_verify_live ;;
    *) die "usage: $0 {preflight|backup-rehearse|apply|verify}" ;;
  esac
fi
