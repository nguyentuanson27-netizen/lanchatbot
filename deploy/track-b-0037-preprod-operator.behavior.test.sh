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

export TRACK_B_0037_OPERATOR_TEST_MODE=YES
export TRACK_B_0037_TEST_EVIDENCE_DIR="$test_root/evidence"
# shellcheck source=track-b-0037-preprod-operator.sh
source "$script_dir/track-b-0037-preprod-operator.sh"
mkdir -p "$T37_EVIDENCE_DIR"
printf '%s\n' 'backup fixture' > "$T37_BACKUP"
sha256sum "$T37_BACKUP" > "$T37_BACKUP_SHA"
SOURCE_REVISION="$(printf 'a%.0s' {1..40})"
t37_catalog_sha_named() { printf '%s\n' "$(printf 'a%.0s' {1..64})"; }

t37_expected_preflight() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'POINTER=V1'; }
t37_observed_preflight() { t37_expected_preflight; }
t37_preflight_matches
if (
  t37_observed_preflight() { printf '%s\n' 'TARGET=ENGINEERING_PREPROD' 'POINTER=DRIFT'; }
  t37_preflight_matches
) >/dev/null 2>&1; then
  printf '%s\n' 'preflight drift was not rejected' >&2
  exit 1
fi

t37_expected_preflight > "$T37_PREFLIGHT"
printf '%s\n' \
  "SOURCE_REVISION=$SOURCE_REVISION" \
  "UP_SHA256=$T37_UP_SHA256" \
  "DOWN_SHA256=$T37_DOWN_SHA256" \
  "BACKUP_SHA256=$(awk '{print $1}' "$T37_BACKUP_SHA")" \
  "PREFLIGHT_SHA256=$(sha256sum "$T37_PREFLIGHT" | awk '{print $1}')" \
  "PRE_CATALOG_SHA256=$(printf 'a%.0s' {1..64})" \
  "POST_CATALOG_SHA256=$(printf 'b%.0s' {1..64})" \
  'REHEARSAL=UP_DOWN_UP_PASS' > "$T37_MARKER"
t37_verify_marker
printf '%s\n' 'POINTER=DRIFT' > "$T37_PREFLIGHT"
sed -i "s/^PREFLIGHT_SHA256=.*/PREFLIGHT_SHA256=$(sha256sum "$T37_PREFLIGHT" | awk '{print $1}')/" "$T37_MARKER"
if (t37_verify_marker) >/dev/null 2>&1; then
  printf '%s\n' 'recorded unauthorized preflight was accepted' >&2
  exit 1
fi
t37_expected_preflight > "$T37_PREFLIGHT"

if (t37_verify_down_named 'fixture' 'not-a-sha256') >/dev/null 2>&1; then
  printf '%s\n' 'invalid rollback catalog identity was accepted' >&2
  exit 1
fi
database_query_named() {
  case "$2" in
    *schema_migrations*) printf '%s\n' '0' ;;
    *pg_get_functiondef*) printf '%s\n' '1' ;;
    *) return 1 ;;
  esac
}
t37_catalog_sha_named() { printf '%s\n' "$(printf 'c%.0s' {1..64})"; }
if (t37_verify_down_named 'fixture' "$(printf 'a%.0s' {1..64})") >/dev/null 2>&1; then
  printf '%s\n' 'rollback catalog mismatch was accepted' >&2
  exit 1
fi
t37_catalog_sha_named() { printf '%s\n' "$(printf 'a%.0s' {1..64})"; }

t37_pointer() { printf '%s\n' "$T37_POINTER_REVISION|$T37_V1_VERSION|COMMERCE|LEGACY|$T37_V1_BUNDLE|$T37_V1_CONTENT"; }
t37_observed_preflight() { t37_expected_preflight; }
database_query() {
  case "$1" in
    *schema_migrations*) printf '%s\n' "${TEST_LEDGER_STATE:-0}" ;;
    *df13_commerce_cutover_fences*) printf '%s\n' '0' ;;
    *) return 1 ;;
  esac
}

TEST_LEDGER_STATE=0
t37_recover_failed_apply
grep -Fx 'RECOVERY=VERIFIED_TRANSACTION_NOT_COMMITTED' "$T37_ROLLBACK" >/dev/null
grep -Fx "BACKUP_SHA256=$(awk '{print $1}' "$T37_BACKUP_SHA")" "$T37_ROLLBACK" >/dev/null

TEST_LEDGER_STATE=1
t37_apply_down_named() { return 1; }
t37_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T37_ROLLBACK" >/dev/null
grep -Fx 'OBSERVED_LEDGER_0037=1' "$T37_ROLLBACK" >/dev/null

t37_apply_down_named() { return 0; }
t37_preflight_matches() { return 1; }
t37_recover_failed_apply
grep -Fx 'RECOVERY=BLOCKED_MANUAL_RESTORE_REQUIRED' "$T37_ROLLBACK" >/dev/null

TEST_LEDGER_STATE=0
t37_preflight_matches() { return 0; }
t37_write_recovery() { return 9; }
if t37_recover_failed_apply >/dev/null 2>&1; then
  printf '%s\n' 'recovery-record write failure was swallowed' >&2
  exit 1
fi

if (
  t37_source_identity() { return 0; }
  t37_verify_up_named() { return 0; }
  t37_catalog_sha_named() { printf '%s\n' "$(printf 'c%.0s' {1..64})"; }
  t37_marker_post_catalog() { printf '%s\n' "$(printf 'd%.0s' {1..64})"; }
  t37_verify_live
) >/dev/null 2>&1; then
  printf '%s\n' 'live catalog mismatch was accepted' >&2
  exit 1
fi

cleanup_database='lana_track_b_0037_rehearsal_4242'
docker() { printf '%s\n' "$*" > "$test_root/cleanup-docker.args"; }
database_query() {
  case "$1" in
    *pg_database*) printf '%s\n' '0' ;;
    *) return 1 ;;
  esac
}
t37_finish_rehearsal "$cleanup_database" 1
test ! -e "$T37_EVIDENCE_DIR"
grep -F -- "$cleanup_database" "$test_root/cleanup-docker.args" >/dev/null
mkdir -p "$T37_EVIDENCE_DIR"
TRACK_B_0037_TEST_EVIDENCE_DIR="$test_root/other"
if t37_cleanup_evidence_target_is_exact; then
  printf '%s\n' 'broad rehearsal evidence cleanup target was accepted' >&2
  exit 1
fi
TRACK_B_0037_TEST_EVIDENCE_DIR="$T37_EVIDENCE_DIR"
if (t37_finish_rehearsal 'lana_chatbot' 1) >/dev/null 2>&1; then
  printf '%s\n' 'broad rehearsal database cleanup target was accepted' >&2
  exit 1
fi
test -d "$T37_EVIDENCE_DIR"

printf '%s\n' 'Track B 0037 PREPROD operator behavior test: PASS'
