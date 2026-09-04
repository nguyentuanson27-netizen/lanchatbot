#!/usr/bin/env bash
set -euo pipefail
set +x

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=track-b-0039-preprod-operator.sh
source "$script_dir/track-b-0039-preprod-operator.sh"

readonly T40_MIGRATION='0040_track_b_operator_role_boundary'
readonly T40_PREVIOUS='0039_track_b_v2_lkg_cutover_fence'
readonly T40_PREVIOUS_SHA='f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca'
readonly T40_ROLE='lana_track_b_authority_operator'
if test "${TRACK_B_0040_OPERATOR_TEST_MODE:-}" = YES; then
  : "${TRACK_B_0040_TEST_SECRET:?TRACK_B_0040_TEST_SECRET is required}"
  T40_SECRET="$TRACK_B_0040_TEST_SECRET"
else
  T40_SECRET='/opt/lana-chatbot/shared/secrets/track_b_authority_operator_database_url'
fi
readonly T40_SECRET
readonly T40_UP="$SOURCE_ROOT/packages/database/pending-migrations/$T40_MIGRATION.up.sql"
readonly T40_DOWN="$SOURCE_ROOT/packages/database/pending-migrations/$T40_MIGRATION.down.sql"
readonly T40_EVIDENCE="$APP_ROOT/backups/20260904-track-b-0040-preprod"
readonly T40_BACKUP="$T40_EVIDENCE/lana_chatbot_pre_0040.dump"
readonly T40_MARKER="$T40_EVIDENCE/rehearsal.ok"

t40_hash() { sha256sum "$1" | awk '{print $1}'; }
t40_require_source() {
  : "${SOURCE_REVISION:?SOURCE_REVISION is required}"
  [[ "$SOURCE_REVISION" =~ ^[a-f0-9]{40}$ ]] || die '0040 source revision invalid'
  test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_REVISION" || die '0040 checkout mismatch'
  test "$(git -C "$SOURCE_ROOT" rev-parse refs/remotes/origin/main)" = "$SOURCE_REVISION" || die '0040 source is not exact origin/main'
  test -z "$(git -C "$SOURCE_ROOT" status --porcelain)" || die '0040 source worktree dirty'
  test -s "$T40_UP" && test -s "$T40_DOWN" || die '0040 migration source missing'
}
t40_role_exact_nologin() {
  test "$(database_query "SELECT count(*) FROM pg_roles WHERE rolname='$T40_ROLE' AND NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolcanlogin AND NOT rolreplication AND NOT rolbypassrls")" = 1
}
t40_role_exact_login() {
  test "$(database_query "SELECT count(*) FROM pg_roles WHERE rolname='$T40_ROLE' AND NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND rolcanlogin AND NOT rolreplication AND NOT rolbypassrls")" = 1
}
t40_require_secret_unmounted() {
  local mounts
  mounts="$(docker inspect --format '{{range .Mounts}}{{println .Source}}{{end}}' "$REALTIME_CONTAINER")" || die '0040 realtime mount readback failed'
  if printf '%s\n' "$mounts" | grep -Fx -- "$T40_SECRET" >/dev/null; then
    die '0040 operator secret mounted into realtime'
  fi
}
t40_preflight() {
  local role_count
  role_count="$(database_query "SELECT count(*) FROM pg_roles WHERE rolname='$T40_ROLE'")"
  if test "$role_count" = 0; then
    t39_postflight_matches || die '0040 exact post-0039 target identity mismatch'
  elif test "$role_count" = 1 && t40_role_exact_nologin; then
    test "$(t39_observed_postflight | grep -v '^ROLE_STATE_SHA256=')" = "$(t39_expected_postflight | grep -v '^ROLE_STATE_SHA256=')" || die '0040 post-rehearsal target identity mismatch'
  else
    die '0040 operator role identity ambiguous'
  fi
  test "$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID'")" = 1 || die '0040 approved page mismatch'
  test "$(database_query "SELECT count(*) FROM pages")" = 1 || die '0040 target is not isolated ENGINEERING_PREPROD'
  test "$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_PREVIOUS' AND checksum_sha256='$T40_PREVIOUS_SHA'")" = 1 || die '0040 exact 0039 dependency missing'
  test "$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_MIGRATION'")" = 0 || die '0040 already applied'
  test "$(database_query "SELECT count(*) FROM df13_commerce_cutover_fences WHERE released_at IS NULL")" = 0 || die '0040 unreleased fence exists'
  test "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}|{{.RestartCount}}' "$REALTIME_CONTAINER")" = 'healthy|0' || die '0040 realtime unhealthy'
  t40_require_secret_unmounted
}
t40_create_nologin_role() {
  test "$(database_query "SELECT count(*) FROM pg_roles WHERE rolname='$T40_ROLE'")" = 0 || die '0040 operator role already exists or is ambiguous'
  database_query "CREATE ROLE $T40_ROLE NOLOGIN NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS" >/dev/null
  t40_role_exact_nologin || die '0040 NOLOGIN role readback mismatch'
}
t40_apply_up_named() {
  local database="$1"
  { printf '%s\n' 'BEGIN;'; cat "$T40_UP"; printf '%s\n' "INSERT INTO schema_migrations(migration_name,checksum_sha256) VALUES (:'migration_name',:'migration_checksum');" 'COMMIT;'; } |
    database_stream_named "$database" -v migration_name="$T40_MIGRATION" -v migration_checksum="$(t40_hash "$T40_UP")" >/dev/null
}
t40_apply_down_named() {
  local database="$1"
  { printf '%s\n' 'BEGIN;'; cat "$T40_DOWN"; printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name=:'migration_name' AND checksum_sha256=:'migration_checksum';" 'COMMIT;'; } |
    database_stream_named "$database" -v migration_name="$T40_MIGRATION" -v migration_checksum="$(t40_hash "$T40_UP")" >/dev/null
}
t40_verify_named() {
  local database="$1"
  test "$(database_query_named "$database" "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_MIGRATION' AND checksum_sha256='$(t40_hash "$T40_UP")'")" = 1 || die '0040 ledger readback mismatch'
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_policies WHERE policyname IN ('track_b_existing_access','track_b_operator_scope')")" = 16 || die '0040 RLS policy set mismatch'
  test "$(database_query_named "$database" "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('runtime_behavior_mode_versions','runtime_behavior_mode_pointers','runtime_behavior_mode_activation_audit','runtime_behavior_mode_resolution_audit','df13_commerce_cutover_fences','webhook_inbox','meta_outbox','pancake_tag_outbox') AND c.relrowsecurity")" = 8 || die '0040 RLS enablement mismatch'
  test "$(database_query_named "$database" "SELECT has_table_privilege('$T40_ROLE','runtime_behavior_mode_pointers','UPDATE')::int||'|'||has_table_privilege('$T40_ROLE','df13_commerce_cutover_fences','INSERT,UPDATE')::int||'|'||has_table_privilege('$T40_ROLE','runtime_behavior_mode_activation_audit','INSERT')::int")" = '0|0|0' || die '0040 raw mutation privilege detected'
  test "$(database_query_named "$database" "SELECT has_function_privilege('$T40_ROLE','track_b_operator_acquire_fence(uuid,uuid,uuid,text,bigint,text,text,text,integer)','EXECUTE')::int||'|'||has_function_privilege('$T40_ROLE','track_b_operator_release_fence(uuid,bigint,text)','EXECUTE')::int||'|'||has_function_privilege('$T40_ROLE','track_b_operator_cas_pointer(uuid,bigint,text,uuid,text,bigint,uuid,text,text,text)','EXECUTE')::int")" = '1|1|1' || die '0040 reviewed function privilege missing'
  test "$(database_query_named "$database" "SELECT has_table_privilege('lana_runtime_behavior_reader','runtime_behavior_mode_pointers','SELECT')::int||'|'||has_table_privilege('lana_runtime_behavior_reader','runtime_behavior_mode_pointers','INSERT,UPDATE,DELETE')::int")" = '1|0' || die '0040 runtime reader privilege changed'
}
t40_rehearse() {
  for tool in install openssl stat chown mv; do require_command "$tool"; done
  t40_require_source; t40_preflight; acquire_mutation_lock
  test ! -e "$T40_EVIDENCE" || die '0040 evidence directory already exists'
  install -d -m 700 "$T40_EVIDENCE"
  t40_create_nologin_role
  local pre_relation_acl pre_function_acl pre_role_membership
  pre_relation_acl="$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$RELATION_ACL_QUERY")"
  pre_function_acl="$(database_sql_file_sha256_named "$EXPECTED_DATABASE" "$FUNCTION_ACL_QUERY")"
  pre_role_membership="$(database_copy_sha256_named "$EXPECTED_DATABASE" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")"
  local rehearsal=''
  cleanup() { local status=$?; trap - EXIT HUP INT TERM; if test -n "$rehearsal"; then database_query "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$rehearsal'" >/dev/null 2>&1 || true; database_query "DROP DATABASE IF EXISTS $rehearsal" >/dev/null 2>&1 || true; fi; if test "$status" -ne 0; then database_query "DROP ROLE IF EXISTS $T40_ROLE" >/dev/null 2>&1 || true; fi; exit "$status"; }
  trap cleanup EXIT HUP INT TERM
  docker exec "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$T40_BACKUP"
  test -s "$T40_BACKUP" || die '0040 backup empty'
  rehearsal="lana_track_b_0040_rehearsal_$$"
  [[ "$rehearsal" =~ ^lana_track_b_0040_rehearsal_[0-9]+$ ]] || die '0040 rehearsal identity invalid'
  database_query "CREATE DATABASE $rehearsal" >/dev/null
  docker exec -i "$POSTGRES_CONTAINER" sh -ceu 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --role="$POSTGRES_USER"' sh "$rehearsal" < "$T40_BACKUP"
  test "$(database_sql_file_sha256_named "$rehearsal" "$RELATION_ACL_QUERY")" = "$pre_relation_acl" || die '0040 restored relation ACL mismatch'
  test "$(database_sql_file_sha256_named "$rehearsal" "$FUNCTION_ACL_QUERY")" = "$pre_function_acl" || die '0040 restored function ACL mismatch'
  test "$(database_copy_sha256_named "$rehearsal" "SELECT member_role.rolname,granted_role.rolname,m.admin_option FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid=m.member JOIN pg_roles granted_role ON granted_role.oid=m.roleid ORDER BY 1,2,3")" = "$pre_role_membership" || die '0040 restored role membership mismatch'
  t40_apply_up_named "$rehearsal"; t40_verify_named "$rehearsal"
  t40_apply_down_named "$rehearsal"
  test "$(database_query_named "$rehearsal" "SELECT count(*) FROM pg_policies WHERE policyname IN ('track_b_existing_access','track_b_operator_scope')")" = 0 || die '0040 down policy cleanup mismatch'
  t40_apply_up_named "$rehearsal"; t40_verify_named "$rehearsal"
  database_query "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$rehearsal'" >/dev/null
  database_query "DROP DATABASE $rehearsal" >/dev/null
  test "$(database_query "SELECT count(*) FROM pg_database WHERE datname='$rehearsal'")" = 0 || die '0040 rehearsal cleanup mismatch'
  printf '%s\n' "SOURCE_REVISION=$SOURCE_REVISION" "UP_SHA256=$(t40_hash "$T40_UP")" "DOWN_SHA256=$(t40_hash "$T40_DOWN")" "BACKUP_SHA256=$(t40_hash "$T40_BACKUP")" "RELATION_ACL_SHA256=$pre_relation_acl" "FUNCTION_ACL_SHA256=$pre_function_acl" "ROLE_MEMBERSHIP_SHA256=$pre_role_membership" 'CLEANUP=VERIFIED' 'REHEARSAL=UP_DOWN_UP_PASS' > "$T40_MARKER"
  chmod 600 "$T40_MARKER"
  trap - EXIT HUP INT TERM
  printf '%s\n' TRACK_B_0040_BACKUP_REHEARSAL_PASS
}
t40_provision_secret() (
  test ! -e "$T40_SECRET" || die '0040 operator secret already exists'
  t40_role_exact_nologin || die '0040 role must be exact NOLOGIN before provisioning'
  local password temporary verifier_file verifier
  cleanup_secret_temporaries() { rm -f -- "${verifier_file:-}" "${temporary:-}"; }
  trap cleanup_secret_temporaries EXIT HUP INT TERM
  password="$(openssl rand -hex 32)"; test "${#password}" = 64 || die '0040 secret generation failed'
  verifier_file="$(mktemp "$(dirname "$T40_SECRET")/.track-b-operator-verifier.XXXXXX")"
  chmod 600 "$verifier_file"
  printf '%s' "$password" | node -e '
    const c=require("node:crypto"); let p=""; process.stdin.setEncoding("utf8");
    process.stdin.on("data",d=>p+=d); process.stdin.on("end",()=>{
      const salt=c.randomBytes(16), iterations=4096;
      const salted=c.pbkdf2Sync(p,salt,iterations,32,"sha256");
      const client=c.createHmac("sha256",salted).update("Client Key").digest();
      const stored=c.createHash("sha256").update(client).digest();
      const server=c.createHmac("sha256",salted).update("Server Key").digest();
      process.stdout.write(`SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${stored.toString("base64")}:${server.toString("base64")}`);
    });' > "$verifier_file"
  verifier="$(cat "$verifier_file")"
  [[ "$verifier" =~ ^SCRAM-SHA-256\$4096: ]] || die '0040 SCRAM verifier generation failed'
  printf "ALTER ROLE %s LOGIN PASSWORD '%s';\n" "$T40_ROLE" "$verifier" | database_stream >/dev/null
  rm -f -- "$verifier_file"; unset verifier
  temporary="$(mktemp "$(dirname "$T40_SECRET")/.track-b-operator.XXXXXX")"
  chmod 600 "$temporary"
  printf 'postgresql://%s:%s@postgres:5432/%s\n' "$T40_ROLE" "$password" "$EXPECTED_DATABASE" > "$temporary"
  chown root:root "$temporary"; chmod 400 "$temporary"; mv -T "$temporary" "$T40_SECRET"
  unset password
  t40_role_exact_login || die '0040 LOGIN role readback mismatch'
  test "$(stat -c '%U|%G|%a' "$T40_SECRET")" = 'root|root|400' || die '0040 secret file ownership mismatch'
  t40_require_secret_unmounted
  (cd "$SOURCE_ROOT" && pnpm --filter @lana/worker build >/dev/null) || die '0040 exact endpoint resolver build failed'
  test -s "$SOURCE_ROOT/apps/worker/dist/track-b-commerce-authority-preprod-cli.js" || die '0040 reviewed endpoint resolver build missing'
  (cd "$SOURCE_ROOT/packages/database" && TRACK_B_RESOLVER_FILE="$SOURCE_ROOT/apps/worker/dist/track-b-commerce-authority-preprod-cli.js" node --input-type=module -e '
    import { execFile as callback } from "node:child_process"; import { readFile } from "node:fs/promises"; import { promisify } from "node:util"; import { pathToFileURL } from "node:url"; import { Pool } from "pg";
    const { resolveTrackBPreprodDatabaseUrl } = await import(pathToFileURL(process.env.TRACK_B_RESOLVER_FILE).href);
    const value=(await readFile("/opt/lana-chatbot/shared/secrets/track_b_authority_operator_database_url","utf8")).trim();
    const inspected=JSON.parse((await promisify(callback)("docker",["inspect","lana-chatbot-postgres"],{encoding:"utf8",windowsHide:true,maxBuffer:1048576})).stdout)[0];
    const connectionString=resolveTrackBPreprodDatabaseUrl(value,inspected);
    const pool=new Pool({connectionString,max:1});
    try { const r=await pool.query("SELECT current_user AS role,p.page_id,p.channel,v.confirmation_mode,v.sales_authority_mode,v.authority_bundle_hash FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id=$1 AND p.channel=$2",["1198992073286645","MESSENGER"]); const x=r.rows[0]; if(r.rows.length!==1||x.role!=="lana_track_b_authority_operator"||x.confirmation_mode!=="V2_ACTIVE"||x.sales_authority_mode!=="COMMERCE"||x.authority_bundle_hash!=="56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8") throw new Error("TRACK_B_OPERATOR_AUTH_PROBE_MISMATCH"); } finally { await pool.end(); }
  ' >/dev/null) || die '0040 authenticated fixed-scope probe failed'
)
t40_recovery_identity_exact() {
  test "$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_MIGRATION' AND checksum_sha256='$(t40_hash "$T40_UP")'")" = 1 || return 1
  test "$(database_query "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('track_b_operator_acquire_fence','track_b_operator_release_fence','track_b_operator_cas_pointer') AND p.prosecdef AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]")" = 3 || return 1
  test "$(database_query "SELECT count(*) FROM pg_policies WHERE policyname IN ('track_b_existing_access','track_b_operator_scope')")" = 16
}
t40_recover_failed_apply() {
  rm -f -- "$T40_SECRET"
  database_query "ALTER ROLE $T40_ROLE NOLOGIN" >/dev/null
  local exact_applied
  exact_applied="$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_MIGRATION' AND checksum_sha256='$(t40_hash "$T40_UP")'")"
  if test "$exact_applied" = 1; then
    t40_recovery_identity_exact || die '0040 recovery refused ambiguous catalog identity'
    t40_apply_down_named "$EXPECTED_DATABASE"
    database_query "DROP ROLE $T40_ROLE" >/dev/null
    test "$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_MIGRATION'")" = 0 || die '0040 recovery ledger mismatch'
    test "$(database_query "SELECT count(*) FROM pg_roles WHERE rolname='$T40_ROLE'")" = 0 || die '0040 recovery role mismatch'
  elif test "$exact_applied" != 0 || test "$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$T40_MIGRATION'")" != 0; then
    die '0040 recovery refused ambiguous ledger identity'
  else
    database_query "DROP ROLE $T40_ROLE" >/dev/null
  fi
}
t40_apply_live() {
  for tool in install openssl stat chown mv; do require_command "$tool"; done
  : "${MIGRATION_AUTHORIZED:?MIGRATION_AUTHORIZED is required}"
  test "$MIGRATION_AUTHORIZED" = YES_I_AM_AUTHORIZED || die '0040 live apply not authorized'
  t40_require_source; t40_preflight; acquire_mutation_lock
  test -s "$T40_MARKER" && grep -Fx 'REHEARSAL=UP_DOWN_UP_PASS' "$T40_MARKER" >/dev/null || die '0040 rehearsal evidence missing'
  grep -Fx 'CLEANUP=VERIFIED' "$T40_MARKER" >/dev/null || die '0040 rehearsal cleanup evidence missing'
  grep -Fx "SOURCE_REVISION=$SOURCE_REVISION" "$T40_MARKER" >/dev/null || die '0040 rehearsal source mismatch'
  grep -Fx "UP_SHA256=$(t40_hash "$T40_UP")" "$T40_MARKER" >/dev/null || die '0040 rehearsal up hash mismatch'
  grep -Fx "DOWN_SHA256=$(t40_hash "$T40_DOWN")" "$T40_MARKER" >/dev/null || die '0040 rehearsal down hash mismatch'
  grep -Fx "BACKUP_SHA256=$(t40_hash "$T40_BACKUP")" "$T40_MARKER" >/dev/null || die '0040 rehearsal backup mismatch'
  t40_role_exact_nologin || die '0040 role state changed after rehearsal'
  local apply_attempted=0
  recover() {
    local status=$?
    trap - EXIT HUP INT TERM
    if test "$status" -ne 0 && test "$apply_attempted" = 1; then
      t40_recover_failed_apply
    fi
    exit "$status"
  }
  trap recover EXIT HUP INT TERM
  apply_attempted=1
  t40_apply_up_named "$EXPECTED_DATABASE"; t40_verify_named "$EXPECTED_DATABASE"
  t40_provision_secret
  trap - EXIT HUP INT TERM
  printf '%s\n' TRACK_B_0040_PREPROD_APPLY_PASS
}

if test "${BASH_SOURCE[0]}" = "$0"; then
  case "${1:-}" in
    preflight) t40_require_source; t40_preflight; printf '%s\n' TRACK_B_0040_PREFLIGHT_PASS ;;
    rehearse) t40_rehearse ;;
    apply) t40_apply_live ;;
    *) die 'usage: track-b-0040-preprod-operator.sh preflight|rehearse|apply' ;;
  esac
fi
