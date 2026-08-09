#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

require_command docker
require_release_identity
test -s "$EVIDENCE_DIR/image-id" || die "built image evidence missing"
test "$(docker image inspect --format '{{.Id}}' "$TARGET_ADMIN_IMAGE")" = "$(cat "$EVIDENCE_DIR/image-id")" || die "built image identity drift"

docker run --rm --entrypoint sh "$TARGET_ADMIN_IMAGE" -ec '
  test -s apps/admin-api/dist/server.js
  test -s apps/admin-web/server.mjs
  test -s apps/admin-web/dist/index.html
  test -n "$(find apps/admin-web/dist/assets -maxdepth 1 -type f -name "*.js" -print -quit)"
  node --check apps/admin-api/dist/server.js
  node --check apps/admin-web/server.mjs
  node -e "import(\"sharp\").then(m=>{if(typeof m.default!==\"function\")process.exit(1)}).catch(()=>process.exit(1))"
'

printf '%s\n' "ARTIFACT_SMOKE_PASS targets=admin-api,admin-web"
