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
test -f "$ENV_BACKUP" || die "rollback env backup missing"
test -f "$COMPOSE_FILE" || die "release compose missing"
: "${PRECUTOVER_RUNTIME_STATE_FILE:=$EVIDENCE_DIR/precutover-runtime-state.json}"
export PRECUTOVER_RUNTIME_STATE_FILE
test -s "$PRECUTOVER_RUNTIME_STATE_FILE" || die "pre-cutover runtime-state baseline missing"

cp --preserve=mode "$ENV_BACKUP" "$INFRASTRUCTURE_ENV_FILE"
chmod 600 "$INFRASTRUCTURE_ENV_FILE"
rollback_compose config --quiet
rollback_compose up -d --no-deps admin-api admin-web
wait_healthy admin-api
wait_healthy admin-web

test "$(container_image_ref lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE" || die "admin-api rollback image mismatch"
test "$(container_image_id lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE_ID" || die "admin-api rollback image ID mismatch"
test "$(container_image_ref lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE" || die "admin-web rollback image mismatch"
test "$(container_image_id lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE_ID" || die "admin-web rollback image ID mismatch"
test "$(container_image_ref lana-chatbot-admin-simulation-worker)" = "$PRESERVED_ADMIN_SIMULATION_IMAGE" || die "admin-simulation-worker changed during rollback"
if test -s "$EVIDENCE_DIR/non-target-container-ids.before"; then
  verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
fi
verify_required_service_health
rollback_boundary_candidate="$(mktemp "$EVIDENCE_DIR/deployment-boundary.rollback.XXXXXX.json")"
rm -f "$rollback_boundary_candidate"
cleanup_rollback_boundary() { rm -f "$rollback_boundary_candidate"; }
trap cleanup_rollback_boundary EXIT
node "$script_dir/capture-deployment-boundary.mjs" \
  "$INFRASTRUCTURE_ENV_FILE" "$rollback_boundary_candidate"
node "$script_dir/validate-deployment-boundary.mjs" \
  "$EVIDENCE_DIR/deployment-boundary.before.json" "$rollback_boundary_candidate"
mv -f "$rollback_boundary_candidate" "$EVIDENCE_DIR/deployment-boundary.rollback.json"
trap - EXIT

atomic_switch_current "$PREVIOUS_RELEASE_DIR"
"$script_dir/promote-runtime-state.sh" rollback
printf '%s\n' "ROLLBACK_PASS release=$PREVIOUS_RELEASE_DIR automatic=${AUTO_ROLLBACK:-0}"
