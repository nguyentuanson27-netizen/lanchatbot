#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in git docker awk sha256sum stat readlink corepack; do
  require_command "$command_name"
done

release_fetch_source="${RELEASE_FETCH_SOURCE:-origin}"
git -C "$REPOSITORY_DIR" fetch --no-tags "$release_fetch_source" \
  "+refs/tags/$RELEASE_TAG:refs/tags/$RELEASE_TAG" \
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

test "$(container_image_ref lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE" || die "admin-api rollback image drift"
test "$(container_image_id lana-chatbot-admin-api)" = "$ROLLBACK_ADMIN_API_IMAGE_ID" || die "admin-api rollback image ID drift"
test "$(container_image_ref lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE" || die "admin-web rollback image drift"
test "$(container_image_id lana-chatbot-admin-web)" = "$ROLLBACK_ADMIN_WEB_IMAGE_ID" || die "admin-web rollback image ID drift"
test "$(container_image_ref lana-chatbot-admin-simulation-worker)" = "$PRESERVED_ADMIN_SIMULATION_IMAGE" || die "admin-simulation-worker image drift"

for container_name in lana-chatbot-admin-api lana-chatbot-admin-web lana-chatbot-admin-simulation-worker; do
  test "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name")" = "healthy" || die "unhealthy preflight container: $container_name"
done

(cd "$REPOSITORY_DIR" && corepack pnpm@10.12.4 audit --audit-level high)

printf '%s\n' "PRECHECK_PASS tag=$RELEASE_TAG commit=$RELEASE_COMMIT targets=admin-api,admin-web"
