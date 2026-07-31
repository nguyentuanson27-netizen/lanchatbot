#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_LINK="${LANA_MCP_CURRENT_LINK:-/opt/lana-chatbot/current}"
RELEASES_ROOT="${LANA_MCP_RELEASES_ROOT:-/opt/lana-chatbot/releases}"
REPOSITORY="${LANA_MCP_GIT_REPOSITORY:-/opt/lana-chatbot/repository}"
STATE_DIR="${LANA_MCP_SOURCE_STATE_DIR:-/opt/lana-chatbot/mcp-source}"
SNAPSHOTS_ROOT="${LANA_MCP_SOURCE_RELEASES_DIR:-${STATE_DIR}/releases}"
POINTER_FILE="${LANA_MCP_SOURCE_POINTER_FILE:-${STATE_DIR}/current.json}"
LOCK_FILE="${LANA_MCP_SOURCE_LOCK_FILE:-/run/lock/lana-mcp-source-sync.lock}"
GIT_USER="${LANA_MCP_GIT_USER:-lana-deploy}"
FETCH_TAGS="${LANA_MCP_FETCH_TAGS:-true}"
SKIP_LOCK="${LANA_MCP_SKIP_LOCK:-false}"

fail() {
  printf '{"event":"lana_mcp_source_sync_failed","error":"%s"}\n' "$1" >&2
  exit 1
}

git_as_deploy() {
  if [[ "$(id -un)" == "${GIT_USER}" ]]; then
    git "$@"
  elif [[ "$(id -u)" -eq 0 ]]; then
    runuser -u "${GIT_USER}" -- git "$@"
  else
    fail "git_user_unavailable"
  fi
}

install -d -m 0755 "$(dirname "${LOCK_FILE}")" "${STATE_DIR}" "${SNAPSHOTS_ROOT}"
if [[ "${SKIP_LOCK}" != "true" ]]; then
  command -v flock >/dev/null 2>&1 || fail "flock_unavailable"
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    printf '{"event":"lana_mcp_source_sync_skipped","reason":"lock_busy"}\n'
    exit 0
  fi
fi

[[ -L "${CURRENT_LINK}" ]] || fail "current_link_missing"
current_target="$(readlink -f -- "${CURRENT_LINK}")"
releases_root="$(readlink -f -- "${RELEASES_ROOT}")"
[[ -n "${current_target}" && -n "${releases_root}" ]] || fail "source_path_unresolved"
case "${current_target}" in
  "${releases_root}"/*) ;;
  *) fail "current_outside_releases_root" ;;
esac

release="${current_target#${releases_root}/}"
[[ "${release}" != */* ]] || fail "nested_release_path"
[[ "${release}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$ ]] ||
  fail "release_name_invalid"
[[ -d "${current_target}" ]] || fail "release_directory_missing"
for required in README.md AGENTS.md apps/lana-mcp/server.mjs deploy/lana-mcp/docker-compose.production.yml; do
  [[ -f "${current_target}/${required}" ]] || fail "release_file_missing"
done

if [[ "${FETCH_TAGS}" == "true" ]]; then
  git_as_deploy -C "${REPOSITORY}" fetch --force origin \
    "refs/tags/${release}:refs/tags/${release}"
fi
source_commit="$(git_as_deploy -C "${REPOSITORY}" rev-list -n 1 "${release}")"
[[ "${source_commit}" =~ ^[0-9a-f]{40}$ ]] || fail "source_commit_invalid"

for required in README.md AGENTS.md apps/lana-mcp/server.mjs deploy/lana-mcp/docker-compose.production.yml; do
  if ! git_as_deploy -C "${REPOSITORY}" show "${release}:${required}" |
    cmp -s - "${current_target}/${required}"; then
    fail "release_source_mismatch"
  fi
done

snapshot="${SNAPSHOTS_ROOT}/${release}"
snapshot_tmp=""
pointer_tmp=""
cleanup() {
  if [[ -n "${snapshot_tmp}" && -d "${snapshot_tmp}" ]]; then
    case "${snapshot_tmp}" in
      "${SNAPSHOTS_ROOT}"/.staging.*) rm -rf -- "${snapshot_tmp}" ;;
      *) fail "snapshot_cleanup_path_invalid" ;;
    esac
  fi
  if [[ -n "${pointer_tmp}" ]]; then
    rm -f -- "${pointer_tmp}"
  fi
}
trap cleanup EXIT

if [[ ! -d "${snapshot}" ]]; then
  snapshot_tmp="$(mktemp -d "${SNAPSHOTS_ROOT}/.staging.${release}.XXXXXX")"
  if ! git_as_deploy -C "${REPOSITORY}" archive "${release}" |
    tar -x -C "${snapshot_tmp}"; then
    fail "source_snapshot_create_failed"
  fi
  printf '{"release":"%s","source_commit":"%s"}\n' \
    "${release}" "${source_commit}" >"${snapshot_tmp}/.lana-mcp-source.json"
  find "${snapshot_tmp}" -type d -exec chmod 0555 {} +
  find "${snapshot_tmp}" -type f -exec chmod 0444 {} +
  if [[ "$(id -u)" -eq 0 ]]; then
    chown -R root:root "${snapshot_tmp}"
  fi
  mv -- "${snapshot_tmp}" "${snapshot}"
  snapshot_tmp=""
fi

grep -Fq "\"source_commit\":\"${source_commit}\"" \
  "${snapshot}/.lana-mcp-source.json" || fail "source_snapshot_commit_mismatch"
for required in README.md AGENTS.md apps/lana-mcp/server.mjs deploy/lana-mcp/docker-compose.production.yml; do
  if ! git_as_deploy -C "${REPOSITORY}" show "${release}:${required}" |
    cmp -s - "${snapshot}/${required}"; then
    fail "source_snapshot_mismatch"
  fi
done

if [[ -f "${POINTER_FILE}" ]] &&
  grep -Fq "\"release\":\"${release}\"" "${POINTER_FILE}" &&
  grep -Fq "\"source_commit\":\"${source_commit}\"" "${POINTER_FILE}"; then
  printf '{"event":"lana_mcp_source_sync_unchanged","release":"%s"}\n' "${release}"
  exit 0
fi

updated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
pointer_tmp="$(mktemp "${STATE_DIR}/.current.XXXXXX")"
printf '{"release":"%s","source_commit":"%s","source_ref":"%s","updated_at":"%s"}\n' \
  "${release}" "${source_commit}" "${release}" "${updated_at}" >"${pointer_tmp}"
chmod 0444 "${pointer_tmp}"
if [[ "$(id -u)" -eq 0 ]]; then
  chown root:root "${pointer_tmp}"
fi
mv -f -- "${pointer_tmp}" "${POINTER_FILE}"
trap - EXIT

printf '{"event":"lana_mcp_source_sync_updated","release":"%s","source_commit":"%s","updated_at":"%s"}\n' \
  "${release}" "${source_commit}" "${updated_at}"
