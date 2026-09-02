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

export TRACK_B_0038_OPERATOR_TEST_MODE=YES
export TRACK_B_0038_TEST_EVIDENCE_DIR="$test_root/evidence"
# shellcheck source=track-b-0038-preprod-operator.sh
source "$script_dir/track-b-0038-preprod-operator.sh"
mkdir -p "$T38_EVIDENCE_DIR"
printf '%s\n' 'backup fixture' > "$T38_BACKUP"
sha256sum "$T38_BACKUP" > "$T38_BACKUP_SHA"
SOURCE_REVISION="$(printf 'a%.0s' {1..40})"

t38_expected_preflight() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'POINTER=V1'; }
t38_observed_preflight() { t38_expected_preflight; }
t38_preflight_matches
if (
  t38_observed_preflight() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'POINTER=DRIFT'; }
  t38_preflight_matches
) >/dev/null 2>&1; then
  printf '%s\n' 'preflight drift was not rejected' >&2
  exit 1
fi

t38_expected_preflight > "$T38_PREFLIGHT"
printf '%s\n' \
  "SOURCE_REVISION=$SOURCE_REVISION" \
  "UP_SHA256=$T38_UP_SHA256" \
  "DOWN_SHA256=$T38_DOWN_SHA256" \
  "BACKUP_SHA256=$(awk '{print $1}' "$T38_BACKUP_SHA")" \
  "PREFLIGHT_SHA256=$(sha256sum "$T38_PREFLIGHT" | awk '{print $1}')" \
  "POST_CATALOG_SHA256=$(printf 'b%.0s' {1..64})" \
  "POST_FUNCTION_ACL_SHA256=$(printf 'c%.0s' {1..64})" \
  "POST_LEDGER_SHA256=$T38_POST_LEDGER_SHA256" \
  'REHEARSAL=UP_DOWN_UP_PASS' > "$T38_MARKER"
t38_catalog_sha_named() { printf '%s\n' "$(printf 'b%.0s' {1..64})"; }
t38_verify_marker
printf '%s\n' 'POINTER=DRIFT' > "$T38_PREFLIGHT"
sed -i "s/^PREFLIGHT_SHA256=.*/PREFLIGHT_SHA256=$(sha256sum "$T38_PREFLIGHT" | awk '{print $1}')/" "$T38_MARKER"
if (t38_verify_marker) >/dev/null 2>&1; then
  printf '%s\n' 'recorded unauthorized preflight was accepted' >&2
  exit 1
fi

t38_pointer() { printf '%s\n' "$T38_POINTER_REVISION|$T38_V1_VERSION|COMMERCE|LEGACY|$T38_V1_BUNDLE|$T38_V1_CONTENT"; }
t38_preflight_matches() { return 0; }
database_query() {
  case "$1" in
    *schema_migrations*) printf '%s\n' "${TEST_LEDGER_STATE:-0}" ;;
    *df13_commerce_cutover_fences*) printf '%s\n' '0' ;;
    *) return 1 ;;
  esac
}

TEST_LEDGER_STATE=0
t38_recover_failed_apply
grep -Fx 'RECOVERY=VERIFIED_TRANSACTION_NOT_COMMITTED' "$T38_ROLLBACK" >/dev/null

TEST_LEDGER_STATE=1
t38_apply_down_named() { printf '%s\n' called > "$test_root/down-called"; return 0; }
t38_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T38_ROLLBACK" >/dev/null
test ! -e "$test_root/down-called"

t38_post_apply_identity_matches() { return 0; }
t38_preflight_matches() { return 0; }
t38_recover_failed_apply
grep -Fx 'RECOVERY=VERIFIED_PRE_0038' "$T38_ROLLBACK" >/dev/null
test -e "$test_root/down-called"
rm -f -- "$test_root/down-called"

t38_post_apply_identity_matches() { return 1; }
t38_preflight_matches() { return 1; }
t38_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T38_ROLLBACK" >/dev/null

cleanup_database='lana_track_b_0038_rehearsal_4242'
cleanup_token='10000000-0000-4000-8000-000000000001'
docker() { printf '%s\n' "$*" > "$test_root/cleanup-docker.args"; }
database_query_named() {
  case "$2" in
    *track_b_0038_operator_owner.run_identity*) printf '%s\n' "${TEST_OWNER_COUNT:-1}" ;;
    *) return 1 ;;
  esac
}
database_query() {
  case "$1" in
    *pg_database*) printf '%s\n' '0' ;;
    *) return 1 ;;
  esac
}
t38_finish_rehearsal "$cleanup_database" 1 "$cleanup_token"
test ! -e "$T38_EVIDENCE_DIR"
grep -F -- "$cleanup_database" "$test_root/cleanup-docker.args" >/dev/null
mkdir -p "$T38_EVIDENCE_DIR"
TRACK_B_0038_TEST_EVIDENCE_DIR="$test_root/other"
if t38_cleanup_evidence_target_is_exact; then
  printf '%s\n' 'broad rehearsal evidence cleanup target was accepted' >&2
  exit 1
fi
TRACK_B_0038_TEST_EVIDENCE_DIR="$T38_EVIDENCE_DIR"
if (t38_finish_rehearsal 'lana_chatbot' 1 "$cleanup_token") >/dev/null 2>&1; then
  printf '%s\n' 'broad rehearsal database cleanup target was accepted' >&2
  exit 1
fi
TEST_OWNER_COUNT=0
if (t38_finish_rehearsal "$cleanup_database" 0 "$cleanup_token") >/dev/null 2>&1; then
  printf '%s\n' 'unowned rehearsal database cleanup was accepted' >&2
  exit 1
fi
TEST_OWNER_COUNT=1

docker() { printf '%s\n' '10.0.0.2' '10.0.0.3'; }
if (t38_postgres_host) >/dev/null 2>&1; then
  printf '%s\n' 'ambiguous PostgreSQL network identity was accepted' >&2
  exit 1
fi
docker() { printf '%s\n' '10.0.0.2'; }
test "$(t38_postgres_host)" = '10.0.0.2'
docker() { printf '%s\n' '999.0.0.2'; }
if (t38_postgres_host) >/dev/null 2>&1; then
  printf '%s\n' 'invalid PostgreSQL network identity was accepted' >&2
  exit 1
fi

printf '%s\n' 'Track B 0038 PREPROD operator behavior test: PASS'
