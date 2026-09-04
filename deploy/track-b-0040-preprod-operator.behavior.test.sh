#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test_root="$(mktemp -d)"
cleanup() { case "$test_root" in /tmp/tmp.*) rm -rf -- "$test_root" ;; *) return 1 ;; esac; }
trap cleanup EXIT HUP INT TERM

export TRACK_B_0039_OPERATOR_TEST_MODE=YES
export TRACK_B_0039_TEST_EVIDENCE_DIR="$test_root/t39"
export TRACK_B_0040_OPERATOR_TEST_MODE=YES
export TRACK_B_0040_TEST_SECRET="$test_root/secrets/operator-url"
mkdir -p "$test_root/secrets"
# shellcheck source=track-b-0040-preprod-operator.sh
source "$script_dir/track-b-0040-preprod-operator.sh"

printf '%s\n' fixture > "$T40_SECRET"
TEST_EXACT=1 TEST_ANY=1
database_query() {
  case "$1" in
    *"checksum_sha256="*) printf '%s\n' "$TEST_EXACT" ;;
    *"migration_name='$T40_MIGRATION'"*) printf '%s\n' "$TEST_ANY" ;;
    *"rolname='$T40_ROLE'"*) printf '%s\n' 0 ;;
    *) : ;;
  esac
}
t40_recovery_identity_exact() { return 0; }
t40_apply_down_named() { printf '%s\n' called > "$test_root/down-called"; TEST_ANY=0; }
t40_recover_failed_apply
test ! -e "$T40_SECRET"
test -e "$test_root/down-called"

rm -f -- "$test_root/down-called"
TEST_EXACT=0 TEST_ANY=1
if (t40_recover_failed_apply) >/dev/null 2>&1; then
  printf '%s\n' 'ambiguous recovery was accepted' >&2; exit 1
fi
test ! -e "$test_root/down-called"

t40_role_exact_nologin() { return 0; }
openssl() { printf '%064d\n' 0; }
node() { return 1; }
if (t40_provision_secret) >/dev/null 2>&1; then
  printf '%s\n' 'failed verifier generation was accepted' >&2; exit 1
fi
test -z "$(find "$test_root/secrets" -mindepth 1 -maxdepth 1 -type f -print -quit)"

printf '%s\n' 'Track B 0040 PREPROD operator behavior test: PASS'
