#!/usr/bin/env bash
set -euo pipefail
set +x

readonly SOURCE_ROOT="${SOURCE_ROOT:-/opt/lana-chatbot/repository}"
readonly POSTGRES_CONTAINER='lana-chatbot-postgres'
readonly DATABASE_NAME='lana_chatbot'
readonly LOGIN_ROLE='lana_admin_readonly'
readonly READER_ROLE='lana_gate_e_evidence_reader'
readonly WRITER_ROLE='lana_gate_e_evidence_writer'
readonly REGISTRATION_WRITER_ROLE='lana_gate_e_registration_writer'
readonly GATE_E_MIGRATION='0034_gate_e_evidence_store_v2'
readonly GATE_E_MIGRATION_FILE="$SOURCE_ROOT/packages/database/migrations/$GATE_E_MIGRATION.up.sql"
readonly EXPECTED_HOST_MACHINE_ID_SHA256='862432ed3b8433b43cee858d3ef8ed54949d2a829b1f77f9b89150d7cd343fde'
readonly EXPECTED_POSTGRES_IMAGE_ID='sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193'
readonly EXPECTED_POSTGRES_VOLUME='lana-chatbot-postgres-data|volume|true'
readonly EXPECTED_POSTGRES_MAJOR='17'
readonly EXPECTED_SYSTEM_IDENTIFIER='7662301595202035746'
readonly EXPECTED_PAGE_ID='1198992073286645'
readonly EXPECTED_PAGE_COUNT='1'


die() {
  printf '%s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command missing: $1"
}

db_query() {
  local sql="$1"
  docker exec "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec psql -X -q -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$1" -c "$2"
  ' sh "$DATABASE_NAME" "$sql"
}

require_source_identity() {
  : "${SOURCE_REVISION:?SOURCE_REVISION is required}"
  [[ "$SOURCE_REVISION" =~ ^[a-f0-9]{40}$ ]] || die 'Gate E reader access source revision invalid'
  test "$(git -C "$SOURCE_ROOT" rev-parse HEAD)" = "$SOURCE_REVISION" ||
    die 'Gate E reader access checkout mismatch'
  test "$(git -C "$SOURCE_ROOT" rev-parse refs/remotes/origin/main)" = "$SOURCE_REVISION" ||
    die 'Gate E reader access source is not exact origin/main'
  test -z "$(git -C "$SOURCE_ROOT" status --porcelain)" ||
    die 'Gate E reader access source worktree dirty'
  test -s "$GATE_E_MIGRATION_FILE" || die 'Gate E migration source missing'
}

expected_target_record() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$EXPECTED_HOST_MACHINE_ID_SHA256" \
    "POSTGRES_CONTAINER=$POSTGRES_CONTAINER" \
    "POSTGRES_IMAGE_ID=$EXPECTED_POSTGRES_IMAGE_ID" \
    "POSTGRES_VOLUME=$EXPECTED_POSTGRES_VOLUME" \
    "DATABASE_ENGINE=$DATABASE_NAME|$EXPECTED_POSTGRES_MAJOR" \
    "SYSTEM_IDENTIFIER=$EXPECTED_SYSTEM_IDENTIFIER" \
    "PAGE_COUNT=$EXPECTED_PAGE_COUNT" \
    "PREPROD_PAGE=1"
}

observed_target_record() {
  printf '%s\n' \
    "HOST_MACHINE_ID_SHA256=$(sha256sum /etc/machine-id | awk '{print $1}')" \
    "POSTGRES_CONTAINER=$POSTGRES_CONTAINER" \
    "POSTGRES_IMAGE_ID=$(docker inspect --format '{{.Image}}' "$POSTGRES_CONTAINER")" \
    "POSTGRES_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}|{{.Type}}|{{.RW}}{{end}}{{end}}' "$POSTGRES_CONTAINER")" \
    "DATABASE_ENGINE=$(db_query "SELECT current_database()||'|'||split_part(current_setting('server_version'),'.',1)")" \
    "SYSTEM_IDENTIFIER=$(db_query "SELECT system_identifier FROM pg_control_system()")" \
    "PAGE_COUNT=$(db_query "SELECT count(*) FROM pages")" \
    "PREPROD_PAGE=$(db_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")"
}

require_preprod_target_identity() {
  local health expected_checksum
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$POSTGRES_CONTAINER")" ||
    die 'Gate E PostgreSQL identity readback failed'
  test "$health" = healthy || die 'Gate E PostgreSQL is not healthy'
  test "$(observed_target_record)" = "$(expected_target_record)" ||
    die 'exact ENGINEERING_PREPROD Gate E target mismatch'

  expected_checksum="$(sha256sum "$GATE_E_MIGRATION_FILE" | awk '{print $1}')"
  test "$(db_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$GATE_E_MIGRATION' AND checksum_sha256='$expected_checksum'")" = 1 ||
    die 'exact Gate E migration 0034 is not applied'
}

reader_direct_edge_state() {
  db_query "SELECT count(*)::text||'|'||coalesce(max(m.admin_option::int)::text,'')||'|'||coalesce(max(m.inherit_option::int)::text,'')||'|'||coalesce(max(m.set_option::int)::text,'') FROM pg_auth_members m JOIN pg_roles granted_role ON granted_role.oid=m.roleid JOIN pg_roles member_role ON member_role.oid=m.member WHERE granted_role.rolname='$READER_ROLE' AND member_role.rolname='$LOGIN_ROLE'"
}

reader_any_membership() {
  db_query "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER')::int"
}

reader_effective_state() {
  db_query "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','USAGE')::int||'|'||pg_has_role('$LOGIN_ROLE','$READER_ROLE','SET')::int||'|'||pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER WITH ADMIN OPTION')::int"
}

gate_e_relation_write_acl() {
  local role="$1"
  db_query "SELECT has_table_privilege('$role','public.gate_e_registered_population_anchors_v1','INSERT')::int||'|'||has_table_privilege('$role','public.gate_e_registered_population_anchors_v1','UPDATE')::int||'|'||has_table_privilege('$role','public.gate_e_registered_population_anchors_v1','DELETE')::int||'|'||has_table_privilege('$role','public.gate_e_registered_population_anchors_v1','TRUNCATE')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_records_v2','INSERT')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_records_v2','UPDATE')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_records_v2','DELETE')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_records_v2','TRUNCATE')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_admissions_v2','INSERT')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_admissions_v2','UPDATE')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_admissions_v2','DELETE')::int||'|'||has_table_privilege('$role','public.gate_e_evidence_admissions_v2','TRUNCATE')::int"
}

verify_login_gate_e_readonly_contract() {
  local edge effective_state mutation_function_acl relation_write_acl

  edge="$(reader_direct_edge_state)"
  effective_state="$(reader_effective_state)"
  case "$edge" in
    '0|||')
      test "$effective_state" = '0|0|0' ||
        die 'PREPROD readonly login has unexpected effective Gate E reader capability'
      ;;
    '1|0|0|1')
      test "$effective_state" = '0|1|0' ||
        die 'PREPROD readonly login Gate E reader capability is not explicit-SET-only'
      ;;
    *) die 'Gate E reader direct membership edge options mismatch' ;;
  esac

  mutation_function_acl="$(db_query "SELECT has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_register_population_anchor_v1(text,text)','EXECUTE')::int")"
  test "$mutation_function_acl" = 0 ||
    die 'PREPROD readonly login has mutating Gate E function privilege'
  test "$(db_query "SELECT has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")" = 0 ||
    die 'PREPROD readonly login already has Gate E append privilege'

  relation_write_acl="$(gate_e_relation_write_acl "$LOGIN_ROLE")"
  test "$relation_write_acl" = '0|0|0|0|0|0|0|0|0|0|0|0' ||
    die 'PREPROD readonly login has raw Gate E table write privilege'
}

require_role_contract() {
  local exact_nologin exact_login function_acl relation_acl dangerous_memberships

  exact_nologin="NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolcanlogin AND NOT rolreplication AND NOT rolbypassrls"
  exact_login="NOT rolsuper AND rolcreaterole = false AND rolcreatedb = false AND rolcanlogin AND NOT rolreplication AND NOT rolbypassrls"

  for role in "$READER_ROLE" "$WRITER_ROLE" "$REGISTRATION_WRITER_ROLE"; do
    test "$(db_query "SELECT count(*) FROM pg_roles WHERE rolname='$role' AND $exact_nologin")" = 1 ||
      die "Gate E role identity mismatch: $role"
  done
  test "$(db_query "SELECT count(*) FROM pg_roles WHERE rolname='$LOGIN_ROLE' AND $exact_login")" = 1 ||
    die 'PREPROD readonly login identity mismatch'

  function_acl="$(db_query "SELECT has_function_privilege('$READER_ROLE','public.lana_gate_e_read_population_anchor_v1(text)','EXECUTE')::int||'|'||has_function_privilege('$READER_ROLE','public.lana_gate_e_read_evidence_by_hash_v2(text)','EXECUTE')::int||'|'||has_function_privilege('$READER_ROLE','public.lana_gate_e_register_population_anchor_v1(text,text)','EXECUTE')::int||'|'||has_function_privilege('$READER_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")"
  test "$function_acl" = '1|1|0|0' || die 'Gate E reader function ACL mismatch'

  relation_acl="$(db_query "SELECT has_table_privilege('$READER_ROLE','public.gate_e_registered_population_anchors_v1','SELECT')::int||'|'||has_table_privilege('$READER_ROLE','public.gate_e_evidence_records_v2','SELECT')::int||'|'||has_table_privilege('$READER_ROLE','public.gate_e_evidence_admissions_v2','SELECT')::int")"
  test "$relation_acl" = '0|0|0' || die 'Gate E reader has raw table SELECT privilege'
  test "$(gate_e_relation_write_acl "$READER_ROLE")" = '0|0|0|0|0|0|0|0|0|0|0|0' ||
    die 'Gate E reader has raw table write privilege'

  test "$(db_query "SELECT has_schema_privilege('$READER_ROLE','public','USAGE')::int")" = 1 ||
    die 'Gate E reader schema USAGE missing'
  test "$(db_query "SELECT has_function_privilege('$WRITER_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")" = 1 ||
    die 'Gate E writer append contract mismatch'
  verify_login_gate_e_readonly_contract

  dangerous_memberships="$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$WRITER_ROLE','MEMBER')::int||'|'||pg_has_role('$LOGIN_ROLE','$REGISTRATION_WRITER_ROLE','MEMBER')::int")"
  test "$dangerous_memberships" = '0|0' ||
    die 'PREPROD readonly login has forbidden Gate E writer membership'
}

verify_reader_access() {
  local edge relation_acl current_role

  edge="$(reader_direct_edge_state)"
  test "$edge" = '1|0|0|1' || die 'Gate E reader direct membership edge mismatch'
  test "$(reader_any_membership)" = 1 || die 'Gate E reader membership is not effective'
  test "$(reader_effective_state)" = '0|1|0' ||
    die 'PREPROD readonly login Gate E reader capability is not explicit-SET-only'

  relation_acl="$(db_query "SELECT has_table_privilege('$LOGIN_ROLE','public.gate_e_registered_population_anchors_v1','SELECT')::int||'|'||has_table_privilege('$LOGIN_ROLE','public.gate_e_evidence_records_v2','SELECT')::int||'|'||has_table_privilege('$LOGIN_ROLE','public.gate_e_evidence_admissions_v2','SELECT')::int")"
  test "$relation_acl" = '0|0|0' || die 'PREPROD readonly login gained raw Gate E table SELECT'

  current_role="$(db_query "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT current_user")"
  test "$current_role" = "$READER_ROLE" || die 'PREPROD readonly login cannot SET ROLE Gate E reader'

  db_query "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT count(*) FROM public.lana_gate_e_read_population_anchor_v1(repeat('0',64)); SELECT count(*) FROM public.lana_gate_e_read_evidence_by_hash_v2(repeat('0',64))" >/dev/null ||
    die 'Gate E reader function probe failed'
}

verify_reader_absent() {
  test "$(reader_direct_edge_state)" = '0|||' ||
    die 'Gate E reader direct membership rollback mismatch'
  test "$(reader_any_membership)" = 0 ||
    die 'indirect Gate E reader membership detected after rollback'
  test "$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$WRITER_ROLE','MEMBER')::int||'|'||pg_has_role('$LOGIN_ROLE','$REGISTRATION_WRITER_ROLE','MEMBER')::int")" = '0|0' ||
    die 'forbidden Gate E writer membership detected after rollback'
}

apply_reader_access() {
  local edge granted_reader=0
  edge="$(reader_direct_edge_state)"
  case "$edge" in
    '1|0|0|1') ;;
    '0|||')
      test "$(reader_any_membership)" = 0 ||
        die 'indirect Gate E reader membership blocks direct grant'
      db_query "GRANT $READER_ROLE TO $LOGIN_ROLE WITH ADMIN FALSE, INHERIT FALSE, SET TRUE" >/dev/null
      granted_reader=1
      ;;
    *) die 'Gate E reader direct membership edge options mismatch' ;;
  esac

  if ! (require_role_contract && verify_reader_access); then
    if test "$granted_reader" = 1; then
      db_query "REVOKE $READER_ROLE FROM $LOGIN_ROLE" >/dev/null || true
    fi
    die 'Gate E reader access apply verification failed'
  fi
}

revoke_reader_access() {
  local edge
  edge="$(reader_direct_edge_state)"
  case "$edge" in
    '1|0|0|1') db_query "REVOKE $READER_ROLE FROM $LOGIN_ROLE" >/dev/null ;;
    '0|||')
      test "$(reader_any_membership)" = 0 ||
        die 'indirect Gate E reader membership blocks revoke verification'
      ;;
    *) die 'Gate E reader direct membership edge options mismatch before revoke' ;;
  esac
  require_role_contract
  verify_reader_absent
}

main() {
  local action="${1:-verify}"
  case "$action" in
    verify|apply|revoke) ;;
    *) die 'usage: gate-e-release-evidence-reader-access.sh [verify|apply|revoke]' ;;
  esac

  for tool in docker git sha256sum awk; do
    require_command "$tool"
  done
  require_source_identity
  require_preprod_target_identity
  require_role_contract

  case "$action" in
    verify)
      verify_reader_access
      printf '%s\n' GATE_E_RELEASE_EVIDENCE_READER_ACCESS_VERIFIED
      ;;
    apply)
      apply_reader_access
      printf '%s\n' GATE_E_RELEASE_EVIDENCE_READER_ACCESS_APPLIED
      ;;
    revoke)
      revoke_reader_access
      printf '%s\n' GATE_E_RELEASE_EVIDENCE_READER_ACCESS_REVOKED
      ;;
  esac
}

if test "${BASH_SOURCE[0]}" = "$0"; then
  main "$@"
fi
