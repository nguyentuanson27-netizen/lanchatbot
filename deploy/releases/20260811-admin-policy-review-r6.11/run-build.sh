#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in git docker tar install sha256sum; do
  require_command "$command_name"
done
require_release_identity
require_image_inputs
test -f "$INFRASTRUCTURE_ENV_FILE" || die "production infrastructure env missing"
test ! -e "$RELEASE_DIR" || die "immutable release directory already exists"
test ! -e "$EVIDENCE_DIR" || die "release evidence directory already exists"

install -d -m 0750 "$RELEASE_DIR"
git -C "$REPOSITORY_DIR" archive "$RELEASE_TAG" | tar -x -C "$RELEASE_DIR"
test -f "$COMPOSE_FILE" || die "release materialization incomplete"
test "$(sha256sum "$COMPOSE_FILE" | awk '{print $1}')" = "$EXPECTED_COMPOSE_SHA256" || die "materialized Compose checksum mismatch"

RELEASE_SOURCE_DIR="$RELEASE_DIR" \
RELEASE_SOURCE_TAG="$RELEASE_TAG" \
RELEASE_SOURCE_COMMIT="$RELEASE_COMMIT" \
RELEASE_SOURCE_GIT_DIR="$REPOSITORY_DIR" \
RELEASE_SOURCE_APP_ROOT="$APP_ROOT" \
  "$RELEASE_DIR/deploy/runtime-state/create-release-source.sh"

docker build \
  --label "lana.release.tag=$RELEASE_TAG" \
  --label "org.opencontainers.image.revision=$RELEASE_COMMIT" \
  --file "$RELEASE_DIR/deploy/Dockerfile" \
  --tag "$TARGET_ADMIN_IMAGE" \
  "$RELEASE_DIR"

install -d -m 0700 "$EVIDENCE_DIR"
docker image inspect --format '{{.Id}}' "$TARGET_ADMIN_IMAGE" > "$EVIDENCE_DIR/image-id"
chmod 600 "$EVIDENCE_DIR/image-id"
sha256sum "$COMPOSE_FILE" > "$EVIDENCE_DIR/compose.sha256"
chmod 600 "$EVIDENCE_DIR/compose.sha256"

"$RELEASE_SCRIPT_DIR/artifact-smoke.sh"

ADMIN_API_IMAGE="$PRESERVED_ADMIN_API_IMAGE" \
ADMIN_WEB_IMAGE="$TARGET_ADMIN_IMAGE" \
ADMIN_SIMULATION_IMAGE="$PRESERVED_ADMIN_SIMULATION_IMAGE" \
  docker compose --env-file "$INFRASTRUCTURE_ENV_FILE" -f "$COMPOSE_FILE" config --quiet

printf '%s\n' "BUILD_PASS tag=$RELEASE_TAG image=$TARGET_ADMIN_IMAGE"
