#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in git docker tar install sha256sum node gzip; do
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
require_no_inherited_compose_overrides "" "$COMPOSE_FILE"
verify_prospective_delivery_env_parity "$COMPOSE_FILE"

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
  --tag "$TARGET_DELIVERY_IMAGE" \
  "$RELEASE_DIR"

install -d -m 0700 "$EVIDENCE_DIR"
docker image inspect --format '{{.Id}}' "$TARGET_DELIVERY_IMAGE" > "$EVIDENCE_DIR/image-id"
chmod 600 "$EVIDENCE_DIR/image-id"
image_id="$(cat "$EVIDENCE_DIR/image-id")"
repo_digests="$(docker image inspect --format '{{json .RepoDigests}}' "$TARGET_DELIVERY_IMAGE")"
rootfs_diff_ids="$(docker image inspect --format '{{json .RootFS.Layers}}' "$TARGET_DELIVERY_IMAGE")"
revision_label="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$TARGET_DELIVERY_IMAGE")"
release_label="$(docker image inspect --format '{{index .Config.Labels "lana.release.tag"}}' "$TARGET_DELIVERY_IMAGE")"
docker image save "$TARGET_DELIVERY_IMAGE" | gzip -n > "$EVIDENCE_DIR/image.tar.gz"
chmod 600 "$EVIDENCE_DIR/image.tar.gz"
image_archive_sha256="$(sha256sum "$EVIDENCE_DIR/image.tar.gz" | awk '{print $1}')"
printf '%s  %s\n' "$image_archive_sha256" "image.tar.gz" > "$EVIDENCE_DIR/image-archive.sha256"
chmod 600 "$EVIDENCE_DIR/image-archive.sha256"
node - "$EVIDENCE_DIR/image-metadata.json" "$image_id" "$repo_digests" "$rootfs_diff_ids" "$revision_label" "$release_label" "$image_archive_sha256" <<'NODE'
const [output, imageId, repoDigestsJson, rootfsDiffIdsJson, revision, release, archiveSha256] = process.argv.slice(2);
if (!/^sha256:[a-f0-9]{64}$/u.test(imageId) || !/^[a-f0-9]{40}$/u.test(revision)) throw new Error('IMAGE_METADATA_IDENTITY_INVALID');
const repoDigests = JSON.parse(repoDigestsJson);
if (repoDigests !== null && (!Array.isArray(repoDigests) || repoDigests.some((value) => typeof value !== 'string'))) {
  throw new Error('IMAGE_METADATA_REPO_DIGESTS_INVALID');
}
const rootfsDiffIds = JSON.parse(rootfsDiffIdsJson);
if (!Array.isArray(rootfsDiffIds) || rootfsDiffIds.some((value) => !/^sha256:[a-f0-9]{64}$/u.test(value)) ||
    !/^[a-f0-9]{64}$/u.test(archiveSha256)) throw new Error('IMAGE_METADATA_CONTENT_DIGEST_INVALID');
const metadata = {
  schemaVersion: 1,
  imageId,
  configDigest: imageId,
  repoDigests: repoDigests ?? [],
  rootfsDiffIds,
  immutableArchive: { path: 'image.tar.gz', compression: 'gzip-n', sha256: archiveSha256 },
  labels: { 'org.opencontainers.image.revision': revision, 'lana.release.tag': release },
};
await import('node:fs/promises').then(({ writeFile }) => writeFile(output, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx', mode: 0o600 }));
NODE
sha256sum "$COMPOSE_FILE" > "$EVIDENCE_DIR/compose.sha256"
chmod 600 "$EVIDENCE_DIR/compose.sha256"

"$RELEASE_SCRIPT_DIR/artifact-smoke.sh"
DELIVERY_IMAGE="$TARGET_DELIVERY_IMAGE" \
  docker compose --env-file "$INFRASTRUCTURE_ENV_FILE" -f "$COMPOSE_FILE" config --quiet
printf '%s\n' "BUILD_PASS tag=$RELEASE_TAG image=$TARGET_DELIVERY_IMAGE"
