#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=gate-e-release-evidence-reader-access.sh
source "$script_dir/gate-e-release-evidence-reader-access.sh"

fail() { printf '%s\n' "$*" >&2; exit 1; }

# The operator must not allow callers to redirect a cluster-level GRANT to another container/database.
test "$POSTGRES_CONTAINER" = 'lana-chatbot-postgres'
test "$DATABASE_NAME" = 'lana_chatbot'

EDGE_STATE='0|||'
ANY_MEMBERSHIP=0
QUERY_LOG="$(mktemp)"
cleanup() { rm -f -- "$QUERY_LOG"; }
trap cleanup EXIT HUP INT TERM

db_query() {
  local sql="$1"
  printf '%s\n' "$sql" >> "$QUERY_LOG"
  case "$sql" in
    "SELECT count(*)::text||'|'||coalesce(max(m.admin_option::int)::text,'')"*) printf '%s\n' "$EDGE_STATE" ;;
    "SELECT pg_has_role('$LOGIN_ROLE','$READER_ROLE','MEMBER')::int") printf '%s\n' "$ANY_MEMBERSHIP" ;;
    "GRANT $READER_ROLE TO $LOGIN_ROLE WITH ADMIN FALSE, INHERIT FALSE, SET TRUE") EDGE_STATE='1|0|0|1'; ANY_MEMBERSHIP=1 ;;
    "REVOKE $READER_ROLE FROM $LOGIN_ROLE") EDGE_STATE='0|||'; ANY_MEMBERSHIP=0 ;;
    *"has_table_privilege('$LOGIN_ROLE'"*) printf '%s\n' '0|0|0' ;;
    "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT current_user") printf '%s\n' "$READER_ROLE" ;;
    "SET SESSION AUTHORIZATION $LOGIN_ROLE; SET ROLE $READER_ROLE; SELECT count(*)"*) printf '%s\n' 0 ;;
    *"pg_has_role('$LOGIN_ROLE','$WRITER_ROLE'"*) printf '%s\n' '0|0' ;;
    *) printf '%s\n' 1 ;;
  esac
}
require_role_contract() { return 0; }

assert_rejected_without_grant() {
  local state="$1" any="$2" label="$3"
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

assert_rejected_without_grant '1|1|0|1' 1 'ADMIN TRUE membership'
assert_rejected_without_grant '1|0|1|1' 1 'INHERIT TRUE membership'
assert_rejected_without_grant '1|0|0|0' 1 'SET FALSE membership'
assert_rejected_without_grant '0|||' 1 'indirect reader membership'

EDGE_STATE='0|||'
ANY_MEMBERSHIP=0
: > "$QUERY_LOG"
apply_reader_access
count="$(grep -Fc "GRANT $READER_ROLE TO $LOGIN_ROLE WITH ADMIN FALSE, INHERIT FALSE, SET TRUE" "$QUERY_LOG")"
test "$count" = 1 || fail 'happy path did not issue one exact reader grant'
test "$EDGE_STATE" = '1|0|0|1' || fail 'happy path direct edge readback mismatch'

# Target mismatch must fail before apply reaches any ACL mutation.
require_source_identity() { return 0; }
require_command() { return 0; }
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

# An environment override cannot redirect the pinned PostgreSQL container.
if env POSTGRES_CONTAINER=wrong bash -c 'source "$1"; test "$POSTGRES_CONTAINER" = lana-chatbot-postgres' sh "$script_dir/gate-e-release-evidence-reader-access.sh"; then
  :
else
  fail 'POSTGRES_CONTAINER environment override changed the pinned target'
fi

printf '%s\n' 'Gate E release-evidence reader access behavior test: PASS'
