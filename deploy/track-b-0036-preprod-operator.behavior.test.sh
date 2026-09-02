#!/usr/bin/env bash
set -euo pipefail
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=track-b-0036-preprod-common.sh
source "$script_dir/track-b-0036-preprod-common.sh"

test_root="$(mktemp -d)"
cleanup() {
  case "$test_root" in
    /tmp/tmp.*) rm -rf -- "$test_root" ;;
    *) printf '%s\n' "refusing unexpected test cleanup path" >&2; return 1 ;;
  esac
}
trap cleanup EXIT HUP INT TERM

expected_target_record() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'LEDGER_SHA256=expected'; }
observed_target_record() { expected_target_record; }
require_target_identity

if (
  observed_target_record() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'LEDGER_SHA256=wrong'; }
  require_target_identity
) >/dev/null 2>&1; then
  printf '%s\n' 'target mismatch was not rejected' >&2
  exit 1
fi

evidence="$test_root/evidence"
mkdir -p "$evidence"
printf '%s\n' 'backup fixture' > "$evidence/lana_chatbot_pre_0036.dump"
sha256sum "$evidence/lana_chatbot_pre_0036.dump" > "$evidence/lana_chatbot_pre_0036.dump.sha256"
expected_target_record > "$evidence/target-preflight.txt"
backup_sha="$(awk '{print $1}' "$evidence/lana_chatbot_pre_0036.dump.sha256")"
preflight_sha="$(sha256sum "$evidence/target-preflight.txt" | awk '{print $1}')"
printf '%s\n' \
  'SOURCE_REVISION=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
  "UP_SHA256=$EXPECTED_UP_SHA256" \
  "DOWN_SHA256=$EXPECTED_DOWN_SHA256" \
  "BACKUP_SHA256=$backup_sha" \
  "PREFLIGHT_SHA256=$preflight_sha" \
  'REHEARSAL=UP_DOWN_UP_PASS' > "$evidence/rehearsal.ok"
verify_rehearsal_evidence "$evidence" 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

if (verify_rehearsal_evidence "$evidence" 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb') >/dev/null 2>&1; then
  printf '%s\n' 'stale rehearsal source was not rejected' >&2
  exit 1
fi

printf '%s\n' 'tamper' >> "$evidence/lana_chatbot_pre_0036.dump"
if (verify_rehearsal_evidence "$evidence" 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') >/dev/null 2>&1; then
  printf '%s\n' 'tampered backup was not rejected' >&2
  exit 1
fi
printf '%s\n' 'backup fixture' > "$evidence/lana_chatbot_pre_0036.dump"

BACKUP_FILE="$evidence/lana_chatbot_pre_0036.dump"
BACKUP_SHA256_FILE="$evidence/lana_chatbot_pre_0036.dump.sha256"
rollback_pass="$test_root/rollback-pass.txt"
rollback_schema() { return 0; }
perform_verified_schema_rollback "$rollback_pass"
grep -Fx 'RECOVERY=VERIFIED_PRE_0036' "$rollback_pass" >/dev/null

rollback_blocked="$test_root/rollback-blocked.txt"
rollback_schema() { return 0; }
require_target_identity() { return 1; }
observed_recovery_record() { printf '%s\n' 'OBSERVED_LEDGER_COUNT=36' 'OBSERVED_0036_OBJECTS=1'; }
if perform_verified_schema_rollback "$rollback_blocked" >/dev/null 2>&1; then
  printf '%s\n' 'unverified rollback was not blocked' >&2
  exit 1
fi
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$rollback_blocked" >/dev/null
grep -Fx "BACKUP_FILE=$BACKUP_FILE" "$rollback_blocked" >/dev/null
grep -Fx 'OBSERVED_0036_OBJECTS=1' "$rollback_blocked" >/dev/null

mock_bin="$test_root/mock-bin"
mkdir -p "$mock_bin"
printf '%s\n' \
  '#!/usr/bin/env sh' \
  'case "${FAKE_PSQL_MODE:-row}" in' \
  '  fail) exit 23 ;;' \
  '  empty) exit 0 ;;' \
  '  row) printf "%s\n" row ;;' \
  '  *) exit 24 ;;' \
  'esac' > "$mock_bin/psql"
chmod +x "$mock_bin/psql"

docker() {
  test "$1" = exec || return 90
  shift
  if test "${1:-}" = -i; then shift; fi
  test "$1" = "$POSTGRES_CONTAINER" || return 91
  shift
  POSTGRES_PASSWORD=test POSTGRES_USER=test PATH="$mock_bin:$PATH" command "$@"
}

hash_sql="$test_root/hash.sql"
printf '%s\n' 'SELECT 1;' > "$hash_sql"
for hash_mode in fail empty; do
  FAKE_PSQL_MODE="$hash_mode"
  export FAKE_PSQL_MODE
  if database_copy_sha256_named fixture 'SELECT 1' >/dev/null 2>&1; then
    printf '%s\n' "COPY hashing accepted psql mode: $hash_mode" >&2
    exit 1
  fi
  if database_sql_file_sha256_named fixture "$hash_sql" >/dev/null 2>&1; then
    printf '%s\n' "SQL-file hashing accepted psql mode: $hash_mode" >&2
    exit 1
  fi
done

FAKE_PSQL_MODE=row
export FAKE_PSQL_MODE
expected_row_sha="$(printf '%s\n' row | sha256sum | awk '{print $1}')"
test "$(database_copy_sha256_named fixture 'SELECT 1')" = "$expected_row_sha"
test "$(database_sql_file_sha256_named fixture "$hash_sql")" = "$expected_row_sha"

printf '%s\n' 'Track B 0036 PREPROD operator behavior test: PASS'
