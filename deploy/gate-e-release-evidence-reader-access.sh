#!/usr/bin/env bash
set -euo pipefail
set +x

readonly SOURCE_ROOT="${SOURCE_ROOT:-/opt/lana-chatbot/repository}"
readonly POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-lana-chatbot-postgres}"
readonly DATABASE_NAME="${DATABASE_NAME:-lana_chatbot}"
readonly LOGIN_ROLE='lana_admin_readonly'
readonly READER_ROLE='lana_gate_e_evidence_reader'
readonly WRITER_ROLE='lana_gate_e_evidence_writer'
readonly REGISTRATION_WRITER_ROLE='lana_gate_e_registration_writer'
readonly GATE_E_MIGRATION='0034_gate_e_evidence_store_v2'
readonly GATE_E_MIGRATION_FILE="$SOURCE_ROOT/packages/database/migrations/$GATE_E_MIGRATION.up.sql"

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

require_database_identity() {
  local health expected_checksum
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$POSTGRES_CONTAINER")" ||
    die 'Gate E PostgreSQL identity readback failed'
  test "$health" = healthy || die 'Gate E PostgreSQL is not healthy'

  expected_checksum="$(sha256sum "$GATE_E_MIGRATION_FILE" | awk '{print $1}')"
  test "$(db_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$GATE_E_MIGRATION' AND checksum_sha256='$expected_checksum'")" = 1 ||
    die 'exact Gate E migration 0034 is not applied'
}

require_role_contract() {
  local exact_nologin exact_login function_acl relation_acl dangerous_memberships

  exact_nologin="NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolcanlogin AND NOT rolreplication AND NOT rolbypassrls"
  exact_login="NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND rolcanlogin AND NOT rolreplication AND NOT rolbypassrls"

  for role in "$READER_ROLE" "$WRITER_ROLE" "$REGISTRATION_WRITER_ROLE"; do
    test "$(db_query "SELECT count(*) FROM pg_roles WHERE rolname='$role' AND $exact_nologin")" = 1 ||
      die "Gate E role identity mismatch: $role"
  done
  test "$(db_query "SELECT count(*) FROM pg_roles WHERE rolname='$LOGIN_ROLE' AND $exact_login")" = 1 ||
    die 'PREPROD readonly login identity mismatch'

  function_acl="$(db_query "SELECT has_function_privilege('$READER_ROLE','public.lana_gate_e_read_population_anchor_v1(text)','EXECUTE')::int||'|'||has_function_privilege('$READER_ROLE','public.lana_gate_e_read_evidence_by_hash_v2(text)','EXECUTE')::int||'|'||has_function_privilege('$READER_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")"
  test "$function_acl" = '1|1|0' || die 'Gate E reader function ACL mismatch'

  relation_acl="$(db_query "SELECT has_table_privilege('$READER_ROLE','public.gate_e_registered_population_anchors_v1','SELECT')::int||'|'||has_table_privilege('$READER_ROLE','public.gate_e_evidence_records_v2','SELECT')::int||'|'||has_table_privilege('$READER_ROLE','public.gate_e_evidence_admissions_v2','SELECT')::int")"
  test "$relation_acl" = '0|0|0' || die 'Gate E reader has raw table SELECT privilege'

  test "$(db_query "SELECT has_schema_privilege('$READER_ROLE','public','USAGE')::int")" = 1 ||
    die 'Gate E reader schema USAGE missing'
  test "$(db_query "SELECT has_function_privilege('$WRITER_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")" = 1 ||
    die 'Gate E writer append contract mismatch'
  test "$(db_query "SELECT has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")" = 0 ||
    die 'PREPROD readonly login already has Gate E append privilege'

  dangerous_memberships="$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$WRITER_ROLE','MEMBER')::int||'|'||pg_has_role('$LOGIN_ROLE','$REGISTRATION_WRITER_ROLE','MEMBER')::int")"
  test "$dangerous_memberships" = '0|0' ||
    die 'PREPROD readonly login has forbidden Gate E writer membership'
}

verify_reader_access() {
  local memberships function_acl relation_acl current_role

  memberships="$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER')::int||'|'||pg_has_role('$LOGIN_ROLE','$WRITER_ROLE','MEMBER')::int||'|'||pg_has_role('$LOGIN_ROLE','$REGISTRATION_WRITER_ROLE','MEMBER')::int")"
  test "$memberships" = '1|0|0' || die 'Gate E reader membership readback mismatch'

  function_acl="$(db_query "SELECT has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_read_population_anchor_v1(text)','EXECUTE')::int||'|'||has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_read_evidence_by_hash_v2(text)','EXECUTE')::int||'|'||has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_append_evidence_v2(text,text,text,text,text,text,text,text,text,timestamptz)','EXECUTE')::int")"
  test "$function_acl" = '1|1|0' || die 'PREPROD readonly login Gate E function ACL mismatch'

  relation_acl="$(db_query "SELECT has_table_privilege('$LOGIN_ROLE','public.gate_e_registered_population_anchors_v1','SELECT')::int||'|'||has_table_privilege('$LOGIN_ROLE','public.gate_e_evidence_records_v2','SELECT')::int||'|'||has_table_privilege('$LOGIN_ROLE','public.gate_e_evidence_admissions_v2','SELECT')::int")"
  test "$relation_acl" = '0|0|0' || die 'PREPROD readonly login gained raw Gate E table SELECT'

  current_role="$(db_query "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT current_user")"
  test "$current_role" = "$READER_ROLE" || die 'PREPROD readonly login cannot SET ROLE Gate E reader'

  db_query "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT count(*) FROM public.lana_gate_e_read_population_anchor_v1(repeat('0',64)); SELECT count(*) FROM public.lana_gate_e_read_evidence_by_hash_v2(repeat('0',64))" >/dev/null ||
    die 'Gate E reader function probe failed'
}

verify_reader_absent() {
  test "$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER')::int")" = 0 ||
    die 'Gate E reader membership rollback mismatch'
  test "$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$WRITER_ROLE','MEMBER')::int||'|'||pg_has_role('$LOGIN_ROLE','$REGISTRATION_WRITER_ROLE','MEMBER')::int")" = '0|0' ||
    die 'forbidden Gate E writer membership detected after rollback'
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
  require_database_identity
  require_role_contract

  case "$action" in
    verify)
      verify_reader_access
      printf '%s\n' GATE_E_RELEASE_EVIDENCE_READER_ACCESS_VERIFIED
      ;;
    apply)
      if test "$(db_query "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER')::int")" = 0; then
        db_query "GRANT $READER_ROLE TO $LOGIN_ROLE" >/dev/null
      fi
      require_role_contract
      verify_reader_access
      printf '%s\n' GATE_E_RELEASE_EVIDENCE_READER_ACCESS_APPLIED
      ;;
    revoke)
      db_query "REVOKE $READER_ROLE FROM $LOGIN_ROLE" >/dev/null
      require_role_contract
      verify_reader_absent
      printf '%s\n' GATE_E_RELEASE_EVIDENCE_READER_ACCESS_REVOKED
      ;;
  esac
}

main "$@"
