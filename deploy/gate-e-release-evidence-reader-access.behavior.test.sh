#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=gate-e-release-evidence-reader-access.sh
source "$script_dir/gate-e-release-evidence-reader-access.sh"

fail() { printf '%s\n' "$*" >&2; exit 1; }
ORIGINAL_REQUIRE_PREPROD_TARGET_IDENTITY="$(declare -f require_preprod_target_identity)"

# Cluster-level ACL mutations must stay pinned to the exact PREPROD target.
test "$POSTGRES_CONTAINER" = 'lana-chatbot-postgres'
test "$DATABASE_NAME" = 'lana_chatbot'

EDGE_STATE='0|||'
ANY_MEMBERSHIP=0
READER_EFFECTIVE_STATE='0|0|0'
READER_WRITE_ACL='0|0|0|0|0|0|0|0|0|0|0|0'
MUTATING_FUNCTION_ACL=0
LOGIN_APPEND_ACL=0
LOGIN_WRITE_ACL='0|0|0|0|0|0|0|0|0|0|0|0'
QUERY_LOG="$(mktemp)"
cleanup() { rm -f -- "$QUERY_LOG"; }
trap cleanup EXIT HUP INT TERM

reset_safe_no_edge() {
  EDGE_STATE='0|||'
  ANY_MEMBERSHIP=0
  READER_EFFECTIVE_STATE='0|0|0'
  READER_WRITE_ACL='0|0|0|0|0|0|0|0|0|0|0|0'
  MUTATING_FUNCTION_ACL=0
  LOGIN_APPEND_ACL=0
  LOGIN_WRITE_ACL='0|0|0|0|0|0|0|0|0|0|0|0'
}

reset_safe_exact_edge() {
  EDGE_STATE='1|0|0|1'
  ANY_MEMBERSHIP=1
  READER_EFFECTIVE_STATE='0|1|0'
  READER_WRITE_ACL='0|0|0|0|0|0|0|0|0|0|0|0'
  MUTATING_FUNCTION_ACL=0
  LOGIN_APPEND_ACL=0
  LOGIN_WRITE_ACL='0|0|0|0|0|0|0|0|0|0|0|0'
}

db_query() {
  local sql="$1"
  printf '%s\n' "$sql" >> "$QUERY_LOG"
  case "$sql" in
    "SELECT count(*)::text||'|'||coalesce(max(m.admin_option::int)::text,'')"*) printf '%s\n' "$EDGE_STATE" ;;
    "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER')::int") printf '%s\n' "$ANY_MEMBERSHIP" ;;
    "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','USAGE')::int"*) printf '%s\n' "$READER_EFFECTIVE_STATE" ;;
    "GRANT $READER_ROLE TO $LOGIN_ROLE WITH ADMIN FALSE, INHERIT FALSE, SET TRUE")
      EDGE_STATE='1|0|0|1'; ANY_MEMBERSHIP=1; READER_EFFECTIVE_STATE='0|1|0'
      ;;
    "REVOKE $READER_ROLE FROM $LOGIN_ROLE")
      EDGE_STATE='0|||'; ANY_MEMBERSHIP=0; READER_EFFECTIVE_STATE='0|0|0'
      ;;
    *"FROM pg_roles WHERE rolname='"*) printf '%s\n' 1 ;;
    *"has_function_privilege('$READER_ROLE','public.lana_gate_e_read_population_anchor_v1(text)'"*) printf '%s\n' '1|1|0|0' ;;
    *"has_table_privilege('$READER_ROLE','public.gate_e_registered_population_anchors_v1','SELECT')"*) printf '%s\n' '0|0|0' ;;
    *"has_table_privilege('$READER_ROLE','public.gate_e_registered_population_anchors_v1','INSERT')"*) printf '%s\n' "$READER_WRITE_ACL" ;;
    "SELECT has_schema_privilege('$READER_ROLE','public','USAGE')::int") printf '%s\n' 1 ;;
    *"has_function_privilege('$WRITER_ROLE','public.lana_gate_e_append_evidence_v2"*) printf '%s\n' 1 ;;
    *"has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_register_population_anchor_v1(text,text)'"*) printf '%s\n' "$MUTATING_FUNCTION_ACL" ;;
    *"has_function_privilege('$LOGIN_ROLE','public.lana_gate_e_append_evidence_v2"*) printf '%s\n' "$LOGIN_APPEND_ACL" ;;
    *"has_table_privilege('$LOGIN_ROLE','public.gate_e_registered_population_anchors_v1','INSERT')"*) printf '%s\n' "$LOGIN_WRITE_ACL" ;;
    *"pg_has_role('$LOGIN_ROLE','$WRITER_ROLE','MEMBER')"*) printf '%s\n' '0|0' ;;
    *"has_table_privilege('$LOGIN_ROLE','public.gate_e_registered_population_anchors_v1','SELECT')"*) printf '%s\n' '0|0|0' ;;
    "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT current_user") printf '%s\n' "$READER_ROLE" ;;
    "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT count(*)"*) printf '%s\n' 0 ;;
    *) fail "unexpected db_query in behavior test: $sql" ;;
  esac
}

assert_edge_rejected_without_grant() {
  local state="$1" any="$2" label="$3"
  reset_safe_no_edge
  EDGE_STATE="$state"
  ANY_MEMBERSHIP="$any"
  : > "$QUERY_LOG"
  if (apply_reader_access) >/dev/null 2>&1; then
    fail "$label was accepted"
  fi
  if grep -Fq "GRANT $READER_ROLE TO $LOGIN_ROLE" "$QUERY_LOG"; then
    fail "$label reached GRANT"
  fi
}

assert_edge_rejected_without_grant '1|1|0|1' 1 'ADMIN TRUE membership'
assert_edge_rejected_without_grant '1|0|1|1' 1 'INHERIT TRUE membership'
assert_edge_rejected_without_grant '1|0|0|0' 1 'SET FALSE membership'
assert_edge_rejected_without_grant '0|||' 1 'indirect reader membership'

reset_safe_no_edge
: > "$QUERY_LOG"
apply_reader_access
count="$(grep -Fc "GRANT $READER_ROLE TO $LOGIN_ROLE WITH ADMIN FALSE, INHERIT FALSE, SET TRUE" "$QUERY_LOG")"
test "$count" = 1 || fail 'happy path did not issue one exact reader grant'
test "$EDGE_STATE" = '1|0|0|1' || fail 'happy path direct edge readback mismatch'
test "$READER_EFFECTIVE_STATE" = '0|1|0' || fail 'happy path did not remain explicit-SET-only'

# Exercise the real effective ACL contract before main() can reach the grant.
require_command() { return 0; }
require_source_identity() { return 0; }
require_preprod_target_identity() { return 0; }

assert_acl_rejected_before_grant() {
  local label="$1"
  : > "$QUERY_LOG"
  if (main apply) >/dev/null 2>&1; then
    fail "$label was accepted"
  fi
  if grep -Fq "GRANT $READER_ROLE TO $LOGIN_ROLE" "$QUERY_LOG"; then
    fail "$label reached GRANT"
  fi
}

reset_safe_no_edge
MUTATING_FUNCTION_ACL=1
assert_acl_rejected_before_grant 'direct registration EXECUTE'

reset_safe_no_edge
LOGIN_WRITE_ACL='1|0|0|0|0|0|0|0|0|0|0|0'
assert_acl_rejected_before_grant 'raw Gate E INSERT'

reset_safe_exact_edge
READER_EFFECTIVE_STATE='1|1|0'
assert_acl_rejected_before_grant 'inherited indirect reader path'

# Target mismatch must fail before apply reaches any ACL mutation.
eval "$ORIGINAL_REQUIRE_PREPROD_TARGET_IDENTITY"
require_role_contract() { return 0; }
apply_reader_access() { printf '%s\n' GRANT_REACHED >> "$QUERY_LOG"; }
revoke_reader_access() { printf '%s\n' REVOKE_REACHED >> "$QUERY_LOG"; }

docker() {
  if test "$1" = inspect && test "$2" = --format; then
    case "$3" in
      *Health*) printf '%s\n' healthy ;;
      *) return 1 ;;
    esac
  else
    return 1
  fi
}

assert_target_rejected_before_mutation() {
  local label="$1"
  : > "$QUERY_LOG"
  if (main apply) >/dev/null 2>&1; then
    fail "$label target was accepted"
  fi
  if grep -Fq GRANT_REACHED "$QUERY_LOG"; then
    fail "$label target reached GRANT"
  fi
}

observed_target_record() {
  expected_target_record | sed "s/SYSTEM_IDENTIFIER=$EXPECTED_SYSTEM_IDENTIFIER/SYSTEM_IDENTIFIER=wrong/"
}
assert_target_rejected_before_mutation 'wrong cluster'

observed_target_record() {
  expected_target_record | sed 's/PREPROD_PAGE=1/PREPROD_PAGE=0/'
}
assert_target_rejected_before_mutation 'wrong page'

# Environment cannot redirect the pinned PostgreSQL container.
if env POSTGRES_CONTAINER=wrong bash -c 'source "$1"; test "$POSTGRES_CONTAINER" = lana-chatbot-postgres' sh "$script_dir/gate-e-release-evidence-reader-access.sh"; then
  :
else
  fail 'POSTGRES_CONTAINER environment override changed the pinned target'
fi

printf '%s\n' 'Gate E release-evidence reader access behavior test: PASS'
