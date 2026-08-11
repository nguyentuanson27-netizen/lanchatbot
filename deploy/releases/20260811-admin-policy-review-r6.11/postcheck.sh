#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker curl readlink grep mktemp cat; do
  require_command "$command_name"
done
require_cutover_inputs
test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$RELEASE_DIR")" || die "postcheck current release mismatch"
test -s "$EVIDENCE_DIR/image-id" || die "image evidence missing"
expected_image_id="$(cat "$EVIDENCE_DIR/image-id")"

for service in admin-web; do
  wait_healthy "$service"
  id="$(compose ps -q "$service")"
  test "$(docker inspect --format '{{.RestartCount}}' "$id")" = "0" || die "target service restarted: $service"
  test "$(docker inspect --format '{{.Image}}' "$id")" = "$expected_image_id" || die "target image mismatch: $service"
  pid1_uid="$(docker exec "$id" awk '/^Uid:/{print $2}' /proc/1/status)"
  test "$pid1_uid" = "1000" || die "target PID1 is not UID 1000: $service"
done

test "$(container_image_ref lana-chatbot-admin-api)" = "$PRESERVED_ADMIN_API_IMAGE" || die "admin-api image ref changed"
test "$(container_image_id lana-chatbot-admin-api)" = "$PRESERVED_ADMIN_API_IMAGE_ID" || die "admin-api image ID changed"
docker exec lana-chatbot-admin-api node -e "fetch('http://127.0.0.1:8081/health/ready').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"
docker exec lana-chatbot-admin-web node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"
public_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 20 "${PUBLIC_ADMIN_URL:-https://admin.lanadesign.vn}")"
test "$public_status" = "302" || die "public admin route did not return Authentik redirect"

test "$(container_image_ref lana-chatbot-admin-simulation-worker)" = "$PRESERVED_ADMIN_SIMULATION_IMAGE" || die "admin-simulation-worker image changed"
verify_non_target_ids "$EVIDENCE_DIR/non-target-container-ids.before"
verify_required_service_health
docker exec lana-chatbot-delivery-worker node -e "fetch('http://127.0.0.1:8091/health/queue').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"
cutover_started_at="$(cat "$EVIDENCE_DIR/cutover-started-at")"
for container_name in lana-chatbot-admin-web; do
  log_file="$(mktemp "${TMPDIR:-/tmp}/lana-admin-postcheck.XXXXXX.log")"
  if ! docker logs --since "$cutover_started_at" "$container_name" > "$log_file" 2>&1; then
    rm -f "$log_file"
    die "unable to read target logs: $container_name"
  fi
  if grep -Eiq '(^|[^a-z])(fatal|uncaught|unhandled|\[error\])([^a-z]|$)' "$log_file"; then
    rm -f "$log_file"
    die "new fatal/error log detected: $container_name"
  fi
  rm -f "$log_file"
done
printf '%s\n' "POSTCHECK_PASS tag=$RELEASE_TAG readiness=200 public=302"
