#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

previous_operational="${1:?usage: postcheck.sh <previous-operational-state> <output-operational-state>}"
operational="${2:?usage: postcheck.sh <previous-operational-state> <output-operational-state>}"
test -s "$previous_operational" || die "previous operational sample missing"
test ! -e "$operational" || die "operational sample path already exists"

for command_name in docker readlink grep mktemp cat; do
  require_command "$command_name"
done
require_cutover_inputs
test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$RELEASE_DIR")" || die "postcheck current release mismatch"
test -s "$EVIDENCE_DIR/image-id" || die "image evidence missing"
expected_image_id="$(cat "$EVIDENCE_DIR/image-id")"

wait_healthy
wait_realtime_ready
id="$(compose ps -q realtime-worker)"
test "$(docker inspect --format '{{.RestartCount}}' "$id")" = "0" || die "realtime-worker restarted"
test "$(docker inspect --format '{{.Image}}' "$id")" = "$expected_image_id" || die "realtime target image mismatch"
test "$(docker exec "$id" awk '/^Uid:/{print $2}' /proc/1/status)" = "1000" || die "realtime PID1 is not UID 1000"
test "$(container_env_value "$id" REALTIME_RELEASE_ID)" = "$RELEASE_TAG" || die "realtime release readback mismatch"
test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "migration ledger changed"
verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
verify_required_service_health
verify_delivery_health strict

"$script_dir/capture-operational-state.sh" "$operational" "$previous_operational" strict

boundary="${operational%.json}.deployment-boundary.json"
test "$boundary" != "$operational" || die "operational sample must end in .json"
test ! -e "$boundary" || die "deployment boundary sample path already exists"
node "$script_dir/capture-deployment-boundary.mjs" "$INFRASTRUCTURE_ENV_FILE" "$boundary"
node "$script_dir/validate-deployment-boundary.mjs" \
  "$EVIDENCE_DIR/deployment-boundary.before.json" "$boundary"

cutover_started_at="$(cat "$EVIDENCE_DIR/cutover-started-at")"
log_file="$(mktemp "${TMPDIR:-/tmp}/lana-realtime-postcheck.XXXXXX.log")"
if ! docker logs --since "$cutover_started_at" lana-chatbot-realtime-worker > "$log_file" 2>&1; then
  rm -f "$log_file"
  die "unable to read realtime logs"
fi
if grep -Eiq '(^|[^a-z])(fatal|uncaught|unhandled|\[error\])([^a-z]|$)' "$log_file"; then
  rm -f "$log_file"
  die "new fatal/error realtime log detected"
fi
rm -f "$log_file"
printf '%s\n' "POSTCHECK_PASS tag=$RELEASE_TAG target=realtime-worker policy=OFF operational=$operational boundary=$boundary"
