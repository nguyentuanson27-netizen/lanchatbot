#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker sha256sum chmod; do
  require_command "$command_name"
done
require_release_identity
require_image_inputs
test -s "$DATABASE_BACKUP_FILE" || die "verified pre-migration database backup missing"
sha256sum -c "$DATABASE_BACKUP_SHA256_FILE" >/dev/null || die "database backup checksum verification failed"
test "$(sha256sum "$RELEASE_DIR/packages/database/migrations/0031_admin_policy_safe_deletion.up.sql" | awk '{print $1}')" = "$EXPECTED_MIGRATION_SHA256" || die "migration 0031 checksum mismatch"
test "$(container_image_id lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE_ID" || die "admin-api changed before migration"
test "$(docker image inspect --format '{{.Id}}' "$TARGET_ADMIN_IMAGE")" = "$(cat "$EVIDENCE_DIR/image-id")" || die "target migration image ID mismatch"

current_latest="$(database_latest_migration)"
case "$current_latest" in
  "$EXPECTED_PREVIOUS_MIGRATION")
    compose run --rm --no-deps --entrypoint sh admin-api -ec '
      export DATABASE_URL="$(cat /run/secrets/admin_control_database_url)"
      exec su-exec node node packages/database/dist/migrate.js up
    '
    ;;
  "$EXPECTED_LATEST_MIGRATION") ;;
  *) die "unexpected pre-migration database version: $current_latest" ;;
esac

test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "production migration latest version mismatch"
test "$(database_migration_checksum "$EXPECTED_LATEST_MIGRATION")" = "$EXPECTED_MIGRATION_SHA256" || die "production migration ledger checksum mismatch"
test "$(database_query "SELECT (to_regclass('public.admin_artifact_deletions') IS NOT NULL)::int || ':' || count(*) FROM pg_trigger WHERE tgname IN ('admin_artifact_deletions_no_mutation','admin_active_pointers_deleted_version_guard') AND NOT tgisinternal")" = "1:2" || die "production migration object verification failed"
printf '%s\n' "$EXPECTED_LATEST_MIGRATION $EXPECTED_MIGRATION_SHA256" > "$EVIDENCE_DIR/migration-applied.txt"
chmod 600 "$EVIDENCE_DIR/migration-applied.txt"
printf '%s\n' "MIGRATION_PASS name=$EXPECTED_LATEST_MIGRATION"
