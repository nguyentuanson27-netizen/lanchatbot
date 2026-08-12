#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker node cp chmod readlink flock mktemp rm mv; do
  require_command "$command_name"
done
acquire_deployment_lock
require_rollback_inputs
require_no_inherited_compose_overrides "ROLLBACK_DELIVERY_IMAGE" "$PREVIOUS_COMPOSE_FILE" "$ROLLBACK_COMPOSE_OVERRIDE"
test -f "$ENV_BACKUP" || die "rollback env backup missing"
test -f "$COMPOSE_FILE" || die "release compose missing"
: "${PRECUTOVER_RUNTIME_STATE_FILE:=$EVIDENCE_DIR/precutover-runtime-state.json}"
export PRECUTOVER_RUNTIME_STATE_FILE
test -s "$PRECUTOVER_RUNTIME_STATE_FILE" || die "pre-cutover runtime-state baseline missing"

cp --preserve=mode "$ENV_BACKUP" "$INFRASTRUCTURE_ENV_FILE"
chmod 600 "$INFRASTRUCTURE_ENV_FILE"
rollback_compose config --quiet
rollback_compose up -d --no-deps delivery-worker
wait_healthy

test "$(container_image_ref lana-chatbot-delivery-worker)" = "$ROLLBACK_DELIVERY_IMAGE" || die "delivery rollback image mismatch"
test "$(container_image_id lana-chatbot-delivery-worker)" = "$ROLLBACK_DELIVERY_IMAGE_ID" || die "delivery rollback image ID mismatch"
test "$(docker inspect --format '{{.RestartCount}}' lana-chatbot-delivery-worker)" = "0" || die "delivery rollback restart count is not zero"
test "$(docker exec lana-chatbot-delivery-worker awk '/^Uid:/{print $2}' /proc/1/status)" = "1000" || die "rollback PID1 is not UID 1000"

# Restore source/runtime identity immediately after the exact BF-01 target is back.
# Parity gates below may fail on the original stop condition; in that case
# runtime-state is intentionally not promoted, but the source symlink stays rolled back.
atomic_switch_current "$PREVIOUS_RELEASE_DIR"
wait_delivery_ready
if test -s "$EVIDENCE_DIR/non-target-container-ids.before"; then
  verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
fi
verify_required_service_health
verify_delivery_health rollback
test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "migration ledger changed during rollback"

rollback_boundary_candidate="$(mktemp "$EVIDENCE_DIR/deployment-boundary.rollback.XXXXXX.json")"
rm -f "$rollback_boundary_candidate"
cleanup_rollback_boundary() { rm -f "$rollback_boundary_candidate"; }
trap cleanup_rollback_boundary EXIT
node "$script_dir/capture-deployment-boundary.mjs" "$INFRASTRUCTURE_ENV_FILE" "$rollback_boundary_candidate"
node "$script_dir/validate-deployment-boundary.mjs" \
  "$EVIDENCE_DIR/deployment-boundary.before.json" "$rollback_boundary_candidate"
mv -f "$rollback_boundary_candidate" "$EVIDENCE_DIR/deployment-boundary.rollback.json"
trap - EXIT

operational="$(mktemp "$EVIDENCE_DIR/operational-state.rollback.XXXXXX.json")"
rm -f "$operational"
"$script_dir/capture-operational-state.sh" "$operational" - report
node "$script_dir/validate-operational-state.mjs" "$operational" "$EVIDENCE_DIR/operational-state.before.json" rollback

"$script_dir/promote-runtime-state.sh" rollback
printf '%s\n' "ROLLBACK_PASS release=$PREVIOUS_RELEASE_DIR automatic=${AUTO_ROLLBACK:-0}"
