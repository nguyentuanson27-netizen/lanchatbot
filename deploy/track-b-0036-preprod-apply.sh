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
verify_rehearsal_evidence "$EVIDENCE_DIR" "$SOURCE_REVISION"

migration_may_have_committed=0
rollback_schema() {
  {
    printf '%s\n' 'BEGIN;'
    cat "$MIGRATION_DOWN"
    printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name = :'migration_name' AND checksum_sha256 = :'migration_checksum';" 'COMMIT;'
  } | database_stream -v migration_name="$EXPECTED_MIGRATION" -v migration_checksum="$EXPECTED_UP_SHA256" >/dev/null
}
on_exit() {
  local status=$? ledger_state
  trap - EXIT HUP INT TERM
  if test "$status" -ne 0 && test "$migration_may_have_committed" = "1"; then
    ledger_state="$(database_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$EXPECTED_MIGRATION' AND checksum_sha256='$EXPECTED_UP_SHA256'" 2>/dev/null)" || ledger_state="UNAVAILABLE"
    if test "$ledger_state" = "1"; then
      perform_verified_schema_rollback "$ROLLBACK_RECORD" || printf '%s\n' "TRACK_B_0036_AUTOMATIC_SCHEMA_ROLLBACK_BLOCKED" >&2
    elif test "$ledger_state" = "0" && (require_target_identity); then
      printf '%s\n' "RECOVERY=VERIFIED_TRANSACTION_NOT_COMMITTED" "BACKUP_FILE=$BACKUP_FILE" "BACKUP_SHA256=$(awk '{print $1}' "$BACKUP_SHA256_FILE")" > "$ROLLBACK_RECORD"
      chmod 600 "$ROLLBACK_RECORD"
    else
      write_blocked_schema_recovery "$ROLLBACK_RECORD"
      printf '%s\n' "TRACK_B_0036_RECOVERY_STATE_AMBIGUOUS" >&2
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
