#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker cp chmod chown readlink awk mktemp mv; do
  require_command "$command_name"
done
require_cutover_inputs
test -s "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" || die "RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE is missing"
test -f "$ENV_BACKUP" || die "rollback env backup missing"
test -f "$COMPOSE_FILE" || die "release compose missing"

cp --preserve=mode "$ENV_BACKUP" "$INFRASTRUCTURE_ENV_FILE"
chmod 600 "$INFRASTRUCTURE_ENV_FILE"
upsert_env_pin ADMIN_API_IMAGE "$ROLLBACK_ADMIN_API_IMAGE"
upsert_env_pin ADMIN_WEB_IMAGE "$ROLLBACK_ADMIN_WEB_IMAGE"
upsert_env_pin ADMIN_SIMULATION_IMAGE "$PRESERVED_ADMIN_SIMULATION_IMAGE"
compose config --quiet
compose up -d --no-deps admin-api admin-web
wait_healthy admin-api
wait_healthy admin-web

test "$(container_image_ref lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE" || die "admin-api rollback image mismatch"
test "$(container_image_ref lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE" || die "admin-web rollback image mismatch"
test "$(container_image_ref lana-chatbot-admin-simulation-worker)" = "$PRESERVED_ADMIN_SIMULATION_IMAGE" || die "admin-simulation-worker changed during rollback"
if test -s "$EVIDENCE_DIR/non-target-container-ids.before"; then
  verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
fi
verify_required_service_health

atomic_switch_current "$PREVIOUS_RELEASE_DIR"
"$script_dir/promote-runtime-state.sh" rollback
printf '%s\n' "ROLLBACK_PASS release=$PREVIOUS_RELEASE_DIR automatic=${AUTO_ROLLBACK:-0}"
