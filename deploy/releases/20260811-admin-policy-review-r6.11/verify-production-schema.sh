#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in sha256sum chmod; do
  require_command "$command_name"
done
require_release_identity
require_image_inputs
test -s "$DATABASE_BACKUP_FILE" || die "verified pre-cutover database backup missing"
sha256sum -c "$DATABASE_BACKUP_SHA256_FILE" >/dev/null || die "database backup checksum verification failed"
test "$(container_image_id lana-chatbot-admin-api)" = "$PRESERVED_ADMIN_API_IMAGE_ID" || die "admin-api changed before cutover"
test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "production migration baseline mismatch"
test "$(database_migration_checksum "$EXPECTED_LATEST_MIGRATION")" = "$EXPECTED_MIGRATION_SHA256" || die "production migration ledger checksum mismatch"
test "$(database_query "SELECT (to_regclass('public.admin_artifact_deletions') IS NOT NULL)::int || ':' || count(*) FROM pg_trigger WHERE tgname IN ('admin_artifact_deletions_no_mutation','admin_active_pointers_deleted_version_guard') AND NOT tgisinternal")" = "1:2" || die "production migration object verification failed"
printf '%s\n' "$EXPECTED_LATEST_MIGRATION $EXPECTED_MIGRATION_SHA256" > "$EVIDENCE_DIR/schema-verified.txt"
chmod 600 "$EVIDENCE_DIR/schema-verified.txt"
printf '%s\n' "SCHEMA_VERIFICATION_PASS name=$EXPECTED_LATEST_MIGRATION"
