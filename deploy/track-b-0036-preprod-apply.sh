#!/usr/bin/env bash
set -euo pipefail
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=track-b-0036-preprod-common.sh
source "$script_dir/track-b-0036-preprod-common.sh"

require_common_tools
test "${MIGRATION_AUTHORIZED:-}" = "YES_I_AM_AUTHORIZED" || die "explicit migration authorization is required"
require_source_identity
acquire_mutation_lock
require_target_identity
test -s "$BACKUP_FILE" && test -s "$BACKUP_SHA256_FILE" && test -s "$REHEARSAL_MARKER" || die "verified backup/rehearsal evidence missing"
sha256sum -c "$BACKUP_SHA256_FILE" >/dev/null || die "backup checksum verification failed"
grep -Fx "SOURCE_REVISION=$SOURCE_REVISION" "$REHEARSAL_MARKER" >/dev/null || die "rehearsal source mismatch"
grep -Fx "UP_SHA256=$EXPECTED_UP_SHA256" "$REHEARSAL_MARKER" >/dev/null || die "rehearsal up hash mismatch"
grep -Fx "DOWN_SHA256=$EXPECTED_DOWN_SHA256" "$REHEARSAL_MARKER" >/dev/null || die "rehearsal down hash mismatch"
grep -Fx "BACKUP_SHA256=$(awk '{print $1}' "$BACKUP_SHA256_FILE")" "$REHEARSAL_MARKER" >/dev/null || die "rehearsal backup hash mismatch"
grep -Fx "REHEARSAL=UP_DOWN_UP_PASS" "$REHEARSAL_MARKER" >/dev/null || die "rehearsal verdict missing"

migration_may_have_committed=0
rollback_schema() {
  {
    printf '%s\n' 'BEGIN;'
    cat "$MIGRATION_DOWN"
    printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name = :'migration_name' AND checksum_sha256 = :'migration_checksum';" 'COMMIT;'
  } | database_stream -v migration_name="$EXPECTED_MIGRATION" -v migration_checksum="$EXPECTED_UP_SHA256" >/dev/null
}
on_exit() {
  local status=$?
  trap - EXIT HUP INT TERM
  if test "$status" -ne 0 && test "$migration_may_have_committed" = "1"; then
    if test "$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$EXPECTED_MIGRATION' AND checksum_sha256='$EXPECTED_UP_SHA256'" 2>/dev/null || true)" = "1"; then
      rollback_schema || printf '%s\n' "TRACK_B_0036_AUTOMATIC_SCHEMA_ROLLBACK_FAILED" >&2
    fi
  fi
  exit "$status"
}
trap on_exit EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

migration_may_have_committed=1
{
  printf '%s\n' 'BEGIN;'
  cat "$MIGRATION_UP"
  printf '%s\n' "INSERT INTO schema_migrations (migration_name, checksum_sha256) VALUES (:'migration_name', :'migration_checksum');" 'COMMIT;'
} | database_stream -v migration_name="$EXPECTED_MIGRATION" -v migration_checksum="$EXPECTED_UP_SHA256" >/dev/null
"$script_dir/track-b-0036-preprod-verify.sh"
migration_may_have_committed=0
trap - EXIT HUP INT TERM
printf '%s\n' "TRACK_B_0036_PREPROD_APPLY_PASS"
