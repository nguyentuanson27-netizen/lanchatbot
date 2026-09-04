#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test_root="$(mktemp -d)"
cleanup() {
  case "$test_root" in
    /tmp/tmp.*) rm -rf -- "$test_root" ;;
    *) printf '%s\n' 'refusing unexpected test cleanup path' >&2; return 1 ;;
  esac
}
trap cleanup EXIT HUP INT TERM

export TRACK_B_0039_OPERATOR_TEST_MODE=YES
export TRACK_B_0039_TEST_EVIDENCE_DIR="$test_root/evidence"
# shellcheck source=track-b-0039-preprod-operator.sh
source "$script_dir/track-b-0039-preprod-operator.sh"
mkdir -p "$T39_EVIDENCE_DIR"
printf '%s\n' 'backup fixture' > "$T39_BACKUP"
sha256sum "$T39_BACKUP" > "$T39_BACKUP_SHA"
SOURCE_REVISION="$(printf 'a%.0s' {1..40})"

t39_expected_preflight() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'POINTER=V2'; }
t39_observed_preflight() { t39_expected_preflight; }
t39_preflight_matches
if (
  t39_observed_preflight() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'POINTER=DRIFT'; }
  t39_preflight_matches
) >/dev/null 2>&1; then
  printf '%s\n' 'preflight drift was not rejected' >&2
  exit 1
fi

(
  t39_expected_postflight() { printf '%s\n' 'PAGE_SET=exact' 'AUTHORITY_FENCES=0|0|0'; }
  t39_observed_postflight() { t39_expected_postflight; }
  t39_postflight_matches
)
if (
  t39_expected_postflight() { printf '%s\n' 'PAGE_SET=exact' 'AUTHORITY_FENCES=0|0|0'; }
  t39_observed_postflight() { printf '%s\n' 'PAGE_SET=drift' 'AUTHORITY_FENCES=0|0|0'; }
  t39_postflight_matches
) >/dev/null 2>&1; then
  printf '%s\n' 'postflight page-set drift was accepted' >&2
  exit 1
fi
if (
  t39_expected_postflight() { printf '%s\n' 'PAGE_SET=exact' 'AUTHORITY_FENCES=0|0|0'; }
  t39_observed_postflight() { printf '%s\n' 'PAGE_SET=exact' 'AUTHORITY_FENCES=1|0|0'; }
  t39_postflight_matches
) >/dev/null 2>&1; then
  printf '%s\n' 'postflight authority-fence drift was accepted' >&2
  exit 1
fi

t39_expected_preflight > "$T39_PREFLIGHT"
printf '%s\n' \
  "SOURCE_REVISION=$SOURCE_REVISION" \
  "UP_SHA256=$T39_UP_SHA256" \
  "DOWN_SHA256=$T39_DOWN_SHA256" \
  "BACKUP_SHA256=$(awk '{print $1}' "$T39_BACKUP_SHA")" \
  "PREFLIGHT_SHA256=$(sha256sum "$T39_PREFLIGHT" | awk '{print $1}')" \
  "POST_CATALOG_SHA256=$(printf 'b%.0s' {1..64})" \
  "POST_FUNCTION_ACL_SHA256=$(printf 'c%.0s' {1..64})" \
  "POST_LEDGER_SHA256=$T39_POST_LEDGER_SHA256" \
  'REHEARSAL=UP_DOWN_UP_PASS' > "$T39_MARKER"
t39_catalog_sha_named() { printf '%s\n' "$(printf 'b%.0s' {1..64})"; }
t39_verify_marker
printf '%s\n' 'POINTER=DRIFT' > "$T39_PREFLIGHT"
sed -i "s/^PREFLIGHT_SHA256=.*/PREFLIGHT_SHA256=$(sha256sum "$T39_PREFLIGHT" | awk '{print $1}')/" "$T39_MARKER"
if (t39_verify_marker) >/dev/null 2>&1; then
  printf '%s\n' 'recorded unauthorized preflight was accepted' >&2
  exit 1
fi

t39_pointer() { printf '%s\n' "$T39_POINTER_REVISION|$T39_V2_VERSION|COMMERCE|LEGACY|$T39_V2_BUNDLE|$T39_V2_CONTENT"; }
t39_cutover_fence_state() { printf '%s\n' "${TEST_CUTOVER_FENCES:-3|0}"; }
t39_preflight_matches() { return 0; }
database_query() {
  case "$1" in
    *schema_migrations*) printf '%s\n' "${TEST_LEDGER_STATE:-0}" ;;
    *df13_commerce_cutover_fences*) printf '%s\n' '0' ;;
    *) return 1 ;;
  esac
}

TEST_LEDGER_STATE=0
t39_recover_failed_apply
grep -Fx 'RECOVERY=VERIFIED_TRANSACTION_NOT_COMMITTED' "$T39_ROLLBACK" >/dev/null

TEST_LEDGER_STATE=1
t39_apply_down_named() { printf '%s\n' called > "$test_root/down-called"; return 0; }
t39_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T39_ROLLBACK" >/dev/null
test ! -e "$test_root/down-called"

t39_post_apply_identity_matches() { return 0; }
t39_preflight_matches() { return 0; }
t39_recover_failed_apply
grep -Fx 'RECOVERY=VERIFIED_PRE_0039' "$T39_ROLLBACK" >/dev/null
test -e "$test_root/down-called"
rm -f -- "$test_root/down-called"

t39_post_apply_identity_matches() { return 1; }
t39_preflight_matches() { return 1; }
t39_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T39_ROLLBACK" >/dev/null

t39_post_apply_identity_matches() { return 0; }
t39_preflight_matches() { return 0; }
TEST_CUTOVER_FENCES='4|1'
t39_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T39_ROLLBACK" >/dev/null
test ! -e "$test_root/down-called"
TEST_CUTOVER_FENCES='3|0'

cleanup_database='lana_track_b_0039_rehearsal_4242'
cleanup_token='10000000-0000-4000-8000-000000000001'
docker() { printf '%s\n' "$*" > "$test_root/cleanup-docker.args"; }
database_query_named() {
  case "$2" in
    *track_b_0039_operator_owner.run_identity*) printf '%s\n' "${TEST_OWNER_COUNT:-1}" ;;
    *) return 1 ;;
  esac
}
database_query() {
  case "$1" in
    *pg_database*) printf '%s\n' '0' ;;
    *) return 1 ;;
  esac
}
t39_finish_rehearsal "$cleanup_database" 1 "$cleanup_token"
test ! -e "$T39_EVIDENCE_DIR"
grep -F -- "$cleanup_database" "$test_root/cleanup-docker.args" >/dev/null
mkdir -p "$T39_EVIDENCE_DIR"
TRACK_B_0039_TEST_EVIDENCE_DIR="$test_root/other"
if t39_cleanup_evidence_target_is_exact; then
  printf '%s\n' 'broad rehearsal evidence cleanup target was accepted' >&2
  exit 1
fi
TRACK_B_0039_TEST_EVIDENCE_DIR="$T39_EVIDENCE_DIR"
if (t39_finish_rehearsal 'lana_chatbot' 1 "$cleanup_token") >/dev/null 2>&1; then
  printf '%s\n' 'broad rehearsal database cleanup target was accepted' >&2
  exit 1
fi
TEST_OWNER_COUNT=0
if (t39_finish_rehearsal "$cleanup_database" 0 "$cleanup_token") >/dev/null 2>&1; then
  printf '%s\n' 'unowned rehearsal database cleanup was accepted' >&2
  exit 1
fi
TEST_OWNER_COUNT=1

docker() { printf '%s\n' '10.0.0.2' '10.0.0.3'; }
if (t39_postgres_host) >/dev/null 2>&1; then
  printf '%s\n' 'ambiguous PostgreSQL network identity was accepted' >&2
  exit 1
fi
docker() { printf '%s\n' '10.0.0.2'; }
test "$(t39_postgres_host)" = '10.0.0.2'
docker() { printf '%s\n' '999.0.0.2'; }
if (t39_postgres_host) >/dev/null 2>&1; then
  printf '%s\n' 'invalid PostgreSQL network identity was accepted' >&2
  exit 1
fi

printf '%s\n' 'Track B 0039 PREPROD operator behavior test: PASS'
