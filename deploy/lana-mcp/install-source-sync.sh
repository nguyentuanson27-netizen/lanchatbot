#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BIN_DIR="${LANA_MCP_BIN_DIR:-/opt/lana-chatbot/bin}"
STATE_DIR="${LANA_MCP_SOURCE_STATE_DIR:-/opt/lana-chatbot/mcp-source}"
SYSTEMD_DIR="${LANA_MCP_SYSTEMD_DIR:-/etc/systemd/system}"

[[ "$(id -u)" -eq 0 ]] || {
  printf 'install-source-sync.sh must run as root\n' >&2
  exit 1
}

install -d -o root -g root -m 0755 "${BIN_DIR}" "${STATE_DIR}" "${STATE_DIR}/releases"
install -o root -g root -m 0755 \
  "${SOURCE_ROOT}/deploy/lana-mcp/update-current-source.sh" \
  "${BIN_DIR}/lana-mcp-update-current-source.sh"
for unit in lana-mcp-source-sync.service lana-mcp-source-sync.path lana-mcp-source-sync.timer; do
  install -o root -g root -m 0644 \
    "${SOURCE_ROOT}/deploy/lana-mcp/${unit}" \
    "${SYSTEMD_DIR}/${unit}"
done

systemctl daemon-reload
systemctl start lana-mcp-source-sync.service
systemctl enable --now lana-mcp-source-sync.path lana-mcp-source-sync.timer
systemctl is-active --quiet lana-mcp-source-sync.path
systemctl is-active --quiet lana-mcp-source-sync.timer

printf '{"event":"lana_mcp_source_sync_installed","state_dir":"%s"}\n' "${STATE_DIR}"
