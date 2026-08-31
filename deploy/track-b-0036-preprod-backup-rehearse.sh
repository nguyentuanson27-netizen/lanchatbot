#!/usr/bin/env bash
set -euo pipefail
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=track-b-0036-preprod-common.sh
source "$script_dir/track-b-0036-preprod-common.sh"

require_common_tools
for command_name in install chmod rm sleep; do require_command "$command_name"; done
require_source_identity
acquire_mutation_lock
require_target_identity
test ! -e "$EVIDENCE_DIR" || die "0036 evidence directory already exists"
install -d -m 0700 "$EVIDENCE_DIR"

restore_database="lana_track_b_0036_rehearsal_$$"
cleanup=1
drop_restore() {
  docker exec "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec dropdb --if-exists --force -U "$POSTGRES_USER" "$1"
  ' sh "$restore_database" >/dev/null
}
finish() {
  drop_restore >/dev/null 2>&1 || true
  if test "$cleanup" = "1"; then rm -rf -- "$EVIDENCE_DIR"; fi
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

docker exec "$POSTGRES_CONTAINER" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc
' > "$BACKUP_FILE"
test -s "$BACKUP_FILE" || die "database backup is empty"
chmod 600 "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$BACKUP_SHA256_FILE"
chmod 600 "$BACKUP_SHA256_FILE"
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$BACKUP_FILE" >/dev/null
docker exec "$POSTGRES_CONTAINER" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec createdb -U "$POSTGRES_USER" "$1"
' sh "$restore_database"
docker exec -i "$POSTGRES_CONTAINER" sh -ceu '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  exec pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$1"
' sh "$restore_database" < "$BACKUP_FILE"

restore_query() {
  local sql="$1"
  docker exec "$POSTGRES_CONTAINER" sh -ceu '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c "$2"
  ' sh "$restore_database" "$sql"
}
restore_stream() { database_stream_named "$restore_database" "$@"; }
apply_up() {
  {
    printf '%s\n' 'BEGIN;'
    cat "$MIGRATION_UP"
    printf '%s\n' "INSERT INTO schema_migrations (migration_name, checksum_sha256) VALUES (:'migration_name', :'migration_checksum');" 'COMMIT;'
  } | restore_stream -v migration_name="$EXPECTED_MIGRATION" -v migration_checksum="$EXPECTED_UP_SHA256" >/dev/null
}
apply_down() {
  {
    printf '%s\n' 'BEGIN;'
    cat "$MIGRATION_DOWN"
    printf '%s\n' "DELETE FROM schema_migrations WHERE migration_name = :'migration_name' AND checksum_sha256 = :'migration_checksum';" 'COMMIT;'
  } | restore_stream -v migration_name="$EXPECTED_MIGRATION" -v migration_checksum="$EXPECTED_UP_SHA256" >/dev/null
}

test "$(restore_query "SELECT migration_name || '|' || checksum_sha256 FROM schema_migrations ORDER BY migration_name DESC LIMIT 1")" = "$EXPECTED_PREVIOUS_MIGRATION|$EXPECTED_PREVIOUS_MIGRATION_SHA256" || die "restored ledger mismatch"
test "$(restore_query "SELECT split_part(current_setting('server_version'),'.',1)")" = "$EXPECTED_POSTGRES_MAJOR" || die "restored engine mismatch"

apply_up
verify_0036_schema_named "$restore_database"
apply_down
test "$(restore_query "SELECT count(*) FROM (VALUES (to_regclass('public.df13_commerce_authority_fences')),(to_regclass('public.df13_commerce_authority_fence_claims')),(to_regclass('public.df13_commerce_cutover_fences'))) AS objects(value) WHERE value IS NOT NULL")" = "0" || die "0036 rehearsal down failed"
apply_up
cat "$MIGRATION_UP" | restore_stream >/dev/null
test "$(restore_query "SELECT count(*) FROM schema_migrations WHERE migration_name='$EXPECTED_MIGRATION' AND checksum_sha256='$EXPECTED_UP_SHA256'")" = "1" || die "0036 rehearsal idempotency failed"
verify_0036_schema_named "$restore_database"

restore_stream >/dev/null <<SQL
UPDATE runtime_behavior_mode_pointers
SET active_version_id='b5611310-9ade-4bb1-9e89-0778bd6779de', pointer_revision=pointer_revision+1,
    updated_by='TRACK_B_0036_REHEARSAL', reason='isolated disposable rehearsal', updated_at=clock_timestamp()
WHERE page_id='$EXPECTED_PAGE_ID' AND channel='$EXPECTED_CHANNEL';
INSERT INTO df13_commerce_cutover_fences (
  fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
  pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
  request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at
)
SELECT '60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002',
       '$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',p.active_version_id,v.content_hash,p.pointer_revision,
       '$EXPECTED_MODE_VERSION','$EXPECTED_CONTENT_HASH','$EXPECTED_AUTHORITY_BUNDLE',repeat('a',64),1,repeat('b',64),
       clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp()
FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id
WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL';
DO \$\$ BEGIN
  BEGIN
    INSERT INTO df13_commerce_cutover_fences (
      fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
      pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
      request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at
    )
    SELECT '60000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000004',
           '$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',p.active_version_id,v.content_hash,p.pointer_revision,
           '$EXPECTED_MODE_VERSION','$EXPECTED_CONTENT_HASH','$EXPECTED_AUTHORITY_BUNDLE',repeat('c',64),1,repeat('d',64),
           clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp()
    FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id
    WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL';
    RAISE EXCEPTION 'expected live-scope conflict missing';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END \$\$;
UPDATE df13_commerce_cutover_fences
SET token_hash=NULL, lease_until=NULL, released_at=clock_timestamp(), updated_at=clock_timestamp()
WHERE fence_id='60000000-0000-4000-8000-000000000001' AND epoch=1;
SQL

test "$(restore_query "SELECT operation_id || '|' || target_version_id || '|' || target_content_hash || '|' || target_authority_bundle_hash FROM df13_commerce_cutover_fences WHERE fence_id='60000000-0000-4000-8000-000000000001'")" = "60000000-0000-4000-8000-000000000002|$EXPECTED_MODE_VERSION|$EXPECTED_CONTENT_HASH|$EXPECTED_AUTHORITY_BUNDLE" || die "durable cutover identity readback mismatch"

immutable_stderr="$(mktemp "$EVIDENCE_DIR/immutable-stderr.XXXXXX")"
if restore_query "UPDATE df13_commerce_cutover_fences SET target_content_hash='sha256:$(printf '0%.0s' {1..64})' WHERE fence_id='60000000-0000-4000-8000-000000000001'" >/dev/null 2>"$immutable_stderr"; then
  die "cutover immutable identity update unexpectedly succeeded"
fi
grep -q 'df13 commerce cutover fence identity is immutable' "$immutable_stderr" || die "cutover immutable identity refusal mismatch"
rm -f "$immutable_stderr"

concurrent_first="$(mktemp "$EVIDENCE_DIR/concurrent-first.XXXXXX")"
concurrent_second="$(mktemp "$EVIDENCE_DIR/concurrent-second.XXXXXX")"
(
  restore_stream >/dev/null 2>"$concurrent_first" <<SQL
BEGIN;
INSERT INTO df13_commerce_cutover_fences (
  fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
  pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
  request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at
)
SELECT '60000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000006',
       '$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',p.active_version_id,v.content_hash,p.pointer_revision,
       '$EXPECTED_MODE_VERSION','$EXPECTED_CONTENT_HASH','$EXPECTED_AUTHORITY_BUNDLE',repeat('e',64),1,repeat('f',64),
       clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp()
FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id
WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL';
SELECT pg_sleep(2);
COMMIT;
SQL
) &
concurrent_pid=$!
sleep 1
if restore_stream -c "SET statement_timeout='5s'; INSERT INTO df13_commerce_cutover_fences (fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at) SELECT '60000000-0000-4000-8000-000000000007','60000000-0000-4000-8000-000000000008','$EXPECTED_PAGE_ID','$EXPECTED_CHANNEL',p.active_version_id,v.content_hash,p.pointer_revision,'$EXPECTED_MODE_VERSION','$EXPECTED_CONTENT_HASH','$EXPECTED_AUTHORITY_BUNDLE',repeat('1',64),1,repeat('2',64),clock_timestamp()+interval '5 minutes',clock_timestamp(),clock_timestamp() FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='$EXPECTED_CHANNEL';" >/dev/null 2>"$concurrent_second"; then
  die "concurrent live-scope conflict unexpectedly succeeded"
fi
wait "$concurrent_pid" || die "concurrent winning fence transaction failed"
grep -q 'duplicate key value violates unique constraint.*df13_commerce_cutover_fences_live_scope_uk' "$concurrent_second" || die "concurrent live-scope refusal mismatch"
rm -f "$concurrent_first" "$concurrent_second"
restore_query "UPDATE df13_commerce_cutover_fences SET token_hash=NULL, lease_until=NULL, released_at=clock_timestamp(), updated_at=clock_timestamp() WHERE fence_id='60000000-0000-4000-8000-000000000005' AND epoch=1" >/dev/null

down_stdout="$(mktemp "$EVIDENCE_DIR/down-stdout.XXXXXX")"
down_stderr="$(mktemp "$EVIDENCE_DIR/down-stderr.XXXXXX")"
if cat "$MIGRATION_DOWN" | restore_stream >"$down_stdout" 2>"$down_stderr"; then
  die "0036 down unexpectedly erased durable fence evidence"
fi
grep -q 'DF13_COMMERCE_FENCE_ROLLBACK_BLOCKED' "$down_stderr" || die "0036 rollback refusal reason mismatch"
rm -f "$down_stdout" "$down_stderr"
test "$(restore_query "SELECT count(*) FROM df13_commerce_cutover_fences")" = "2" || die "durable fence evidence was not preserved"

backup_sha="$(awk '{print $1}' "$BACKUP_SHA256_FILE")"
printf '%s\n' \
  "SOURCE_REVISION=$SOURCE_REVISION" \
  "UP_SHA256=$EXPECTED_UP_SHA256" \
  "DOWN_SHA256=$EXPECTED_DOWN_SHA256" \
  "BACKUP_SHA256=$backup_sha" \
  "REHEARSAL=UP_DOWN_UP_PASS" > "$REHEARSAL_MARKER"
chmod 600 "$REHEARSAL_MARKER"
drop_restore
restore_database=""
cleanup=0
trap - EXIT HUP INT TERM
printf '%s\n' "TRACK_B_0036_BACKUP_REHEARSAL_PASS"
