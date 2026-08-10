#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

for command_name in docker node cat gzip sha256sum; do
  require_command "$command_name"
done

require_release_identity
require_image_inputs
test -s "$EVIDENCE_DIR/image-id" || die "built image evidence missing"
test -s "$EVIDENCE_DIR/image-metadata.json" || die "immutable image metadata evidence missing"
test -s "$EVIDENCE_DIR/image.tar.gz" || die "immutable image archive missing"
test -s "$EVIDENCE_DIR/image-archive.sha256" || die "immutable image archive digest missing"
expected_id="$(cat "$EVIDENCE_DIR/image-id")"
test "$(docker image inspect --format '{{.Id}}' "$TARGET_REALTIME_IMAGE")" = "$expected_id" || die "built image ID drift"
test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$TARGET_REALTIME_IMAGE")" = "$RELEASE_COMMIT" || die "OCI revision mismatch"
test "$(docker image inspect --format '{{index .Config.Labels "lana.release.tag"}}' "$TARGET_REALTIME_IMAGE")" = "$RELEASE_TAG" || die "release label mismatch"
gzip -t "$EVIDENCE_DIR/image.tar.gz"
(cd "$EVIDENCE_DIR" && sha256sum -c image-archive.sha256)
node - "$EVIDENCE_DIR/image-metadata.json" "$expected_id" "$RELEASE_COMMIT" "$RELEASE_TAG" "$(sha256sum "$EVIDENCE_DIR/image.tar.gz" | awk '{print $1}')" <<'NODE'
const [path, expectedId, expectedRevision, expectedRelease, expectedArchiveSha256] = process.argv.slice(2);
const metadata = JSON.parse(await import('node:fs/promises').then(({ readFile }) => readFile(path, 'utf8')));
if (metadata.schemaVersion !== 1 || metadata.imageId !== expectedId || metadata.configDigest !== expectedId ||
    !Array.isArray(metadata.repoDigests) || metadata.labels?.['org.opencontainers.image.revision'] !== expectedRevision ||
    !Array.isArray(metadata.rootfsDiffIds) || metadata.immutableArchive?.sha256 !== expectedArchiveSha256 ||
    metadata.labels?.['lana.release.tag'] !== expectedRelease) throw new Error('IMAGE_METADATA_EVIDENCE_MISMATCH');
NODE
docker run --rm --network none --entrypoint node "$TARGET_REALTIME_IMAGE" --check apps/worker/dist/realtime-server.js
docker run --rm --network none --entrypoint node "$TARGET_REALTIME_IMAGE" -e '
  import("node:fs").then(({ accessSync }) => {
    for (const path of ["apps/worker/dist/realtime-server.js", "apps/worker/dist/media-resolution.js", "apps/worker/dist/customer-url-policy.js", "apps/worker/dist/multi-product-clarification.js"]) accessSync(path);
  }).then(() => Promise.all([
    import("./apps/worker/dist/media-resolution.js"),
    import("./apps/worker/dist/customer-url-policy.js"),
    import("./apps/worker/dist/multi-product-clarification.js"),
  ])).catch((error) => { console.error(error); process.exit(1); });
'
printf '%s\n' "REALTIME_ARTIFACT_SMOKE_PASS image=$TARGET_REALTIME_IMAGE"
