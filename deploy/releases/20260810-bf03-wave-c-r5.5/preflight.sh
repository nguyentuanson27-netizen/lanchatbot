#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in git docker awk sha256sum stat readlink corepack node mktemp; do
  require_command "$command_name"
done

origin_url="$(git -C "$REPOSITORY_DIR" remote get-url origin)"
case "$origin_url" in
  "$EXPECTED_ORIGIN_SSH"|"$EXPECTED_ORIGIN_HTTPS") ;;
  *) die "unexpected GitHub origin before fetch" ;;
esac
git -C "$REPOSITORY_DIR" fetch --no-tags origin \
  "+refs/tags/$RELEASE_TAG:refs/tags/$RELEASE_TAG" \
  "+refs/tags/$EXPECTED_CANDIDATE_TAG:refs/tags/$EXPECTED_CANDIDATE_TAG" \
  "+refs/heads/main:refs/remotes/origin/main"
require_release_identity
require_image_inputs
test "$(git -C "$REPOSITORY_DIR" rev-parse HEAD)" = "$RELEASE_COMMIT" || die "repository worktree is not the exact release commit"
test -z "$(git -C "$REPOSITORY_DIR" status --short)" || die "repository worktree is not clean"

test -f "$INFRASTRUCTURE_ENV_FILE" || die "production infrastructure env missing"
test "$(stat -c '%a' "$INFRASTRUCTURE_ENV_FILE")" = "600" || die "production infrastructure env must be mode 600"
test ! -e "$RELEASE_DIR" || die "immutable release directory already exists"
test ! -e "$EVIDENCE_DIR" || die "release evidence directory already exists"
test ! -e "$ENV_BACKUP" || die "release env backup already exists"
test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$PREVIOUS_RELEASE_DIR")" || die "current release drifted from rollback target"

test "$(container_image_ref lana-chatbot-realtime-worker)" = "$ROLLBACK_REALTIME_IMAGE" || die "realtime rollback image drift"
test "$(container_image_id lana-chatbot-realtime-worker)" = "$ROLLBACK_REALTIME_IMAGE_ID" || die "realtime rollback image ID drift"
test "$(container_env_value lana-chatbot-realtime-worker REALTIME_RELEASE_ID)" = "$ROLLBACK_REALTIME_RELEASE_ID" || die "realtime rollback release ID drift"
test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$ROLLBACK_REALTIME_IMAGE_ID")" = "$EXPECTED_ROLLBACK_REALTIME_REVISION" || die "realtime rollback OCI revision drift"
test "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' lana-chatbot-realtime-worker)" = "healthy" || die "realtime-worker unhealthy before release"
test "$(docker inspect --format '{{.RestartCount}}' lana-chatbot-realtime-worker)" = "0" || die "realtime-worker restart count is not zero"
test "$(docker exec lana-chatbot-realtime-worker awk '/^Uid:/{print $2}' /proc/1/status)" = "1000" || die "realtime PID1 is not non-root UID 1000"
wait_realtime_ready
test "$(database_latest_migration)" = "$EXPECTED_LATEST_MIGRATION" || die "migration ledger drift"
test "$(database_query "SELECT count(*) FROM pages WHERE page_id='$EXPECTED_PAGE_ID' AND status='ACTIVE' AND routing_owner='APP' AND app_send_enabled AND NOT kill_switch")" = "1" || die "approved page routing/readback mismatch"
test "$(database_query "SELECT count(*) FROM pages")" = "1" || die "page allowlist cardinality drift"
verify_delivery_health strict

operational="$(mktemp "${TMPDIR:-/tmp}/lana-wave-c-preflight.XXXXXX.json")"
rm -f "$operational"
trap 'rm -f "$operational"' EXIT
"$script_dir/capture-operational-state.sh" "$operational"

(cd "$REPOSITORY_DIR" && corepack pnpm@10.12.4 audit --audit-level high)
printf '%s\n' "PRECHECK_PASS tag=$RELEASE_TAG commit=$RELEASE_COMMIT target=realtime-worker policy=OFF"
