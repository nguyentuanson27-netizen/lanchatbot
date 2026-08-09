#!/usr/bin/env bash
set -euo pipefail
set -E

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker node sha256sum readlink cp chmod chown date awk mktemp mv cat flock; do
  require_command "$command_name"
done
acquire_deployment_lock
require_cutover_inputs
test -f "$RELEASE_DIR/.release-source.json" || die "release source pointer missing"
node "$script_dir/validate-release-pointer.mjs" "$RELEASE_DIR/.release-source.json" "$RELEASE_TAG" "$RELEASE_COMMIT"
test -s "$EVIDENCE_DIR/image-id" || die "built image evidence missing"
test ! -e "$ENV_BACKUP" || die "release env backup already exists"
test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$PREVIOUS_RELEASE_DIR")" || die "current release drifted before cutover"
test "$(container_image_ref lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE" || die "admin-api changed after preflight"
test "$(container_image_id lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE_ID" || die "admin-api image ID changed after preflight"
test "$(container_image_ref lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE" || die "admin-web changed after preflight"
test "$(container_image_id lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE_ID" || die "admin-web image ID changed after preflight"
test "$(container_image_ref lana-chatbot-admin-simulation-worker)" = "$PRESERVED_ADMIN_SIMULATION_IMAGE" || die "admin-simulation-worker changed after preflight"

target_image_id="$(cat "$EVIDENCE_DIR/image-id")"
simulation_image_id="$(container_image_id lana-chatbot-admin-simulation-worker)"
node "$script_dir/validate-target-evidence.mjs" \
  "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" \
  "$RELEASE_DIR/deploy/runtime-state/service-inventory.json" \
  "$target_image_id" \
  "$ROLLBACK_ADMIN_API_IMAGE" "$ROLLBACK_ADMIN_API_IMAGE_ID" \
  "$ROLLBACK_ADMIN_WEB_IMAGE" "$ROLLBACK_ADMIN_WEB_IMAGE_ID" \
  "$PRESERVED_ADMIN_SIMULATION_IMAGE" "$simulation_image_id"

precutover_candidate_id="$RELEASE_TAG-precutover-rollback-$(date -u +%Y%m%dT%H%M%SZ)-$$"
precutover_candidate="$APP_ROOT/runtime-state/candidates/$precutover_candidate_id.json"
RUNTIME_STATE_APP_ROOT="$APP_ROOT" \
RUNTIME_STATE_ROOT="$APP_ROOT/runtime-state" \
RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" \
RUNTIME_STATE_CANDIDATE_ID="$precutover_candidate_id" \
RUNTIME_STATE_GIT_DIR="$REPOSITORY_DIR" \
  "$RELEASE_DIR/deploy/runtime-state/capture-current.sh"
RUNTIME_STATE_APP_ROOT="$APP_ROOT" \
RUNTIME_STATE_ROOT="$APP_ROOT/runtime-state" \
RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" \
RUNTIME_STATE_CANDIDATE="$precutover_candidate" \
RUNTIME_STATE_GIT_DIR="$REPOSITORY_DIR" \
  "$RELEASE_DIR/deploy/runtime-state/verify-current.sh"

PRECUTOVER_RUNTIME_STATE_FILE="$EVIDENCE_DIR/precutover-runtime-state.json"
export PRECUTOVER_RUNTIME_STATE_FILE
cp --preserve=mode "$precutover_candidate" "$PRECUTOVER_RUNTIME_STATE_FILE"
chmod 600 "$PRECUTOVER_RUNTIME_STATE_FILE"
node "$script_dir/capture-deployment-boundary.mjs" \
  "$INFRASTRUCTURE_ENV_FILE" "$EVIDENCE_DIR/deployment-boundary.before.json"

sha256sum "$ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE" > "$EVIDENCE_DIR/admin-ui-walkthrough.sha256"
chmod 600 "$EVIDENCE_DIR/admin-ui-walkthrough.sha256"
cp --preserve=mode "$INFRASTRUCTURE_ENV_FILE" "$ENV_BACKUP"
chmod 600 "$ENV_BACKUP"

arm_automatic_rollback

upsert_env_pin ADMIN_API_IMAGE "$TARGET_ADMIN_IMAGE"
upsert_env_pin ADMIN_WEB_IMAGE "$TARGET_ADMIN_IMAGE"
upsert_env_pin ADMIN_SIMULATION_IMAGE "$PRESERVED_ADMIN_SIMULATION_IMAGE"
compose config --quiet
save_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
date -u +%Y-%m-%dT%H:%M:%SZ > "$EVIDENCE_DIR/cutover-started-at"
chmod 600 "$EVIDENCE_DIR/cutover-started-at"

compose up -d --no-deps admin-api admin-web
wait_healthy admin-api
wait_healthy admin-web

expected_image_id="$target_image_id"
test "$(container_image_id lana-chatbot-admin-api)" = "$expected_image_id" || die "admin-api image id mismatch"
test "$(container_image_id lana-chatbot-admin-web)" = "$expected_image_id" || die "admin-web image id mismatch"
test "$(container_image_ref lana-chatbot-admin-simulation-worker)" = "$PRESERVED_ADMIN_SIMULATION_IMAGE" || die "admin-simulation-worker image changed"
verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
verify_required_service_health
node "$script_dir/capture-deployment-boundary.mjs" \
  "$INFRASTRUCTURE_ENV_FILE" "$EVIDENCE_DIR/deployment-boundary.after.json"
node "$script_dir/validate-deployment-boundary.mjs" \
  "$EVIDENCE_DIR/deployment-boundary.before.json" "$EVIDENCE_DIR/deployment-boundary.after.json"

atomic_switch_current "$RELEASE_DIR"
"$script_dir/promote-runtime-state.sh" deployment
"$script_dir/postcheck.sh"
"$script_dir/soak.sh"
disarm_automatic_rollback
printf '%s\n' "CUTOVER_PASS tag=$RELEASE_TAG targets=admin-api,admin-web"
