#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker sha256sum install chmod rm; do
  require_command "$command_name"
done
require_release_identity
require_image_inputs

readonly postgres_container="lana-chatbot-postgres"
readonly migration_up="$RELEASE_DIR/packages/database/migrations/0031_admin_policy_safe_deletion.up.sql"
readonly migration_down="$RELEASE_DIR/packages/database/migrations/0031_admin_policy_safe_deletion.down.sql"
test -f "$migration_up" || die "migration up file missing"
test -f "$migration_down" || die "migration down file missing"
test "$(sha256sum "$migration_up" | awk '{print $1}')" = "$EXPECTED_MIGRATION_SHA256" || die "migration 0031 checksum mismatch"
test ! -e "$DATABASE_BACKUP_DIR" || die "database backup directory already exists"

install -d -m 0700 "$DATABASE_BACKUP_DIR"
cleanup_failed_backup=1
restore_database="lana_r68_restore_$$"
drop_restore_database() {
  docker exec "$postgres_container" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    dropdb --if-exists --force -U "$POSTGRES_USER" "$1"
  ' sh "$restore_database" >/dev/null
}
cleanup_restore() {
  if test -n "$restore_database"; then drop_restore_database >/dev/null 2>&1 || true; fi
  if test "$cleanup_failed_backup" = "1"; then rm -rf -- "$DATABASE_BACKUP_DIR"; fi
}
trap cleanup_restore EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

docker exec "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc
' > "$DATABASE_BACKUP_FILE"
test -s "$DATABASE_BACKUP_FILE" || die "database backup is empty"
chmod 600 "$DATABASE_BACKUP_FILE"
sha256sum "$DATABASE_BACKUP_FILE" > "$DATABASE_BACKUP_SHA256_FILE"
chmod 600 "$DATABASE_BACKUP_SHA256_FILE"

docker exec -i "$postgres_container" pg_restore --list < "$DATABASE_BACKUP_FILE" >/dev/null
docker exec "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec createdb -U "$POSTGRES_USER" "$1"
' sh "$restore_database"
docker exec -i "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$1"
' sh "$restore_database" < "$DATABASE_BACKUP_FILE"

restored_latest="$(docker exec "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c \
    "SELECT migration_name FROM schema_migrations ORDER BY migration_name DESC LIMIT 1"
' sh "$restore_database")"
test "$restored_latest" = "$EXPECTED_PREVIOUS_MIGRATION" || die "restored backup migration baseline mismatch"

docker exec -i "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"
' sh "$restore_database" < "$migration_up" >/dev/null
test "$(docker exec "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c \
    "SELECT (to_regclass('"'"'public.admin_artifact_deletions'"'"') IS NOT NULL)::int || '"'"':'"'"' || count(*) FROM pg_trigger WHERE tgname IN ('"'"'admin_artifact_deletions_no_mutation'"'"','"'"'admin_active_pointers_deleted_version_guard'"'"') AND NOT tgisinternal"
' sh "$restore_database")" = "1:2" || die "migration 0031 restore compatibility verification failed"

docker exec -i "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"
' sh "$restore_database" < "$migration_down" >/dev/null
test "$(docker exec "$postgres_container" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c \
    "SELECT (to_regclass('"'"'public.admin_artifact_deletions'"'"') IS NULL)::int"
' sh "$restore_database")" = "1" || die "migration 0031 down compatibility verification failed"

drop_restore_database
restore_database=""
cleanup_failed_backup=0
trap - EXIT HUP INT TERM
printf '%s\n' "BACKUP_RESTORE_TEST_PASS file=$DATABASE_BACKUP_FILE"
