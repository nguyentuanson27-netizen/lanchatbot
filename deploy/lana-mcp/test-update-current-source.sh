#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(mktemp -d)"
cleanup() {
  rm -rf -- "${TEST_ROOT}"
}
trap cleanup EXIT

REPOSITORY="${TEST_ROOT}/repository"
RELEASES_ROOT="${TEST_ROOT}/releases"
STATE_DIR="${TEST_ROOT}/state"
CURRENT_LINK="${TEST_ROOT}/current"
mkdir -p "${REPOSITORY}" "${RELEASES_ROOT}" "${STATE_DIR}"
git -C "${REPOSITORY}" init -q
git -C "${REPOSITORY}" config user.name "Lana MCP Test"
git -C "${REPOSITORY}" config user.email "mcp-test@invalid.local"

write_release_source() {
  local marker="$1"
  mkdir -p \
    "${REPOSITORY}/apps/lana-mcp" \
    "${REPOSITORY}/deploy/lana-mcp"
  printf '# Lana %s\n' "${marker}" >"${REPOSITORY}/README.md"
  printf 'Read README %s\n' "${marker}" >"${REPOSITORY}/AGENTS.md"
  printf 'export const marker = "%s";\n' "${marker}" \
    >"${REPOSITORY}/apps/lana-mcp/server.mjs"
  printf 'services: {}\n# %s\n' "${marker}" \
    >"${REPOSITORY}/deploy/lana-mcp/docker-compose.production.yml"
}

commit_release() {
  local release="$1"
  git -C "${REPOSITORY}" add .
  git -C "${REPOSITORY}" commit -qm "${release}"
  git -C "${REPOSITORY}" tag "${release}"
  mkdir -p "${RELEASES_ROOT}/${release}"
  git -C "${REPOSITORY}" archive "${release}" |
    tar -x -C "${RELEASES_ROOT}/${release}"
}

run_sync() {
  LANA_MCP_CURRENT_LINK="${CURRENT_LINK}" \
    LANA_MCP_RELEASES_ROOT="${RELEASES_ROOT}" \
    LANA_MCP_GIT_REPOSITORY="${REPOSITORY}" \
    LANA_MCP_SOURCE_STATE_DIR="${STATE_DIR}" \
    LANA_MCP_SOURCE_LOCK_FILE="${TEST_ROOT}/sync.lock" \
    LANA_MCP_GIT_USER="$(id -un)" \
    LANA_MCP_FETCH_TAGS=false \
    LANA_MCP_SKIP_LOCK=true \
    "${SCRIPT_DIR}/update-current-source.sh"
}

write_release_source "A"
commit_release "release-a"
ln -s "${RELEASES_ROOT}/release-a" "${CURRENT_LINK}"
if [[ ! -L "${CURRENT_LINK}" ]]; then
  printf '{"event":"lana_mcp_source_sync_test_skipped","reason":"symlink_unavailable"}\n'
  exit 0
fi
run_sync
grep -Fq '"release":"release-a"' "${STATE_DIR}/current.json"
grep -Fq '# Lana A' "${STATE_DIR}/releases/release-a/README.md"
grep -Fq '"source_commit":"' \
  "${STATE_DIR}/releases/release-a/.lana-mcp-source.json"

write_release_source "B"
commit_release "release-b"
ln -sfn "${RELEASES_ROOT}/release-b" "${CURRENT_LINK}"
run_sync
grep -Fq '"release":"release-b"' "${STATE_DIR}/current.json"
grep -Fq '# Lana B' "${STATE_DIR}/releases/release-b/README.md"
pointer_before="$(sha256sum "${STATE_DIR}/current.json" | cut -d' ' -f1)"

printf 'tampered\n' >>"${RELEASES_ROOT}/release-a/README.md"
ln -sfn "${RELEASES_ROOT}/release-a" "${CURRENT_LINK}"
if run_sync; then
  printf 'expected release source mismatch\n' >&2
  exit 1
fi
pointer_after="$(sha256sum "${STATE_DIR}/current.json" | cut -d' ' -f1)"
[[ "${pointer_before}" == "${pointer_after}" ]]

mkdir -p "${TEST_ROOT}/outside"
ln -sfn "${TEST_ROOT}/outside" "${CURRENT_LINK}"
if run_sync; then
  printf 'expected outside-root rejection\n' >&2
  exit 1
fi
[[ "${pointer_before}" == "$(sha256sum "${STATE_DIR}/current.json" | cut -d' ' -f1)" ]]

printf '{"event":"lana_mcp_source_sync_test_passed"}\n'
