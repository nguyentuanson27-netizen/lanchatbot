#!/usr/bin/env bash
set -euo pipefail
set -E

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker node sha256sum readlink cp chmod date awk mktemp mv cat flock; do
  require_command "$command_name"
done
acquire_deployment_lock
require_cutover_inputs
require_no_inherited_compose_overrides "" "$COMPOSE_FILE"
verify_prospective_delivery_env_parity "$COMPOSE_FILE" "$TARGET_DELIVERY_IMAGE"
test -f "$RELEASE_DIR/.release-source.json" || die "release source pointer missing"
node "$script_dir/validate-release-pointer.mjs" "$RELEASE_DIR/.release-source.json" "$RELEASE_TAG" "$RELEASE_COMMIT"
test -s "$EVIDENCE_DIR/image-id" || die "built image evidence missing"
test ! -e "$ENV_BACKUP" || die "release env backup already exists"
test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$PREVIOUS_RELEASE_DIR")" || die "current release drifted before cutover"
test "$(container_image_ref lana-chatbot-delivery-worker)" = "$ROLLBACK_DELIVERY_IMAGE" || die "delivery image changed after preflight"
test "$(container_image_id lana-chatbot-delivery-worker)" = "$ROLLBACK_DELIVERY_IMAGE_ID" || die "delivery image ID changed after preflight"
test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "migration ledger changed after preflight"

target_image_id="$(cat "$EVIDENCE_DIR/image-id")"
node "$script_dir/validate-target-evidence.mjs" \
  "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  "$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE" \
  "$RELEASE_DIR/deploy/runtime-state/service-inventory.json" \
  "$target_image_id" "$ROLLBACK_DELIVERY_IMAGE" "$ROLLBACK_DELIVERY_IMAGE_ID" \
  "$EXPECTED_ROLLBACK_DELIVERY_RELEASE" "$EXPECTED_ROLLBACK_DELIVERY_REVISION"

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
"$script_dir/capture-operational-state.sh" "$EVIDENCE_DIR/operational-state.before.json"
node "$script_dir/capture-deployment-boundary.mjs" \
  "$INFRASTRUCTURE_ENV_FILE" "$EVIDENCE_DIR/deployment-boundary.before.json"
save_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"

cp --preserve=mode "$INFRASTRUCTURE_ENV_FILE" "$ENV_BACKUP"
chmod 600 "$ENV_BACKUP"
arm_automatic_rollback

upsert_env_pin DELIVERY_IMAGE "$TARGET_DELIVERY_IMAGE"
compose config --quiet
node "$script_dir/capture-deployment-boundary.mjs" \
  "$INFRASTRUCTURE_ENV_FILE" "$EVIDENCE_DIR/deployment-boundary.pinned-before-recreate.json"
node "$script_dir/validate-deployment-boundary.mjs" \
  "$EVIDENCE_DIR/deployment-boundary.before.json" "$EVIDENCE_DIR/deployment-boundary.pinned-before-recreate.json"

date -u +%Y-%m-%dT%H:%M:%SZ > "$EVIDENCE_DIR/cutover-started-at"
chmod 600 "$EVIDENCE_DIR/cutover-started-at"
compose up -d --no-deps delivery-worker
wait_healthy
wait_delivery_ready

test "$(container_image_ref lana-chatbot-delivery-worker)" = "$TARGET_DELIVERY_IMAGE" || die "delivery image ref mismatch"
test "$(container_image_id lana-chatbot-delivery-worker)" = "$target_image_id" || die "delivery image ID mismatch"
test "$(docker inspect --format '{{.RestartCount}}' lana-chatbot-delivery-worker)" = "0" || die "delivery restart count is not zero"
test "$(docker exec lana-chatbot-delivery-worker awk '/^Uid:/{print $2}' /proc/1/status)" = "1000" || die "delivery PID1 is not UID 1000"
verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
verify_required_service_health
test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "migration ledger changed during cutover"
node "$script_dir/capture-deployment-boundary.mjs" \
  "$INFRASTRUCTURE_ENV_FILE" "$EVIDENCE_DIR/deployment-boundary.after.json"
node "$script_dir/validate-deployment-boundary.mjs" \
  "$EVIDENCE_DIR/deployment-boundary.before.json" "$EVIDENCE_DIR/deployment-boundary.after.json"

atomic_switch_current "$RELEASE_DIR"
initial_postcheck_operational="$EVIDENCE_DIR/operational-state.postcheck.initial.json"
"$script_dir/postcheck.sh" "$EVIDENCE_DIR/operational-state.before.json" "$initial_postcheck_operational"
"$script_dir/soak.sh" "$initial_postcheck_operational"
"$script_dir/promote-runtime-state.sh" deployment
disarm_automatic_rollback
printf '%s\n' "CUTOVER_PASS tag=$RELEASE_TAG target=delivery-worker"
