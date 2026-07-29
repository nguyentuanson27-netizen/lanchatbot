#!/usr/bin/env sh
set -eu

npm_container=${NPM_CONTAINER:-n8n-docker_npm_1}
npm_data=$(
  docker inspect "$npm_container" \
    --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}'
)
test -n "$npm_data"

remove_block() {
  target=$1
  start_marker=$2
  end_marker=$3
  test -f "$target" || return 0
  tmp=$(mktemp)
  awk -v start="$start_marker" -v finish="$end_marker" '
    $0 == start { skipping = 1; next }
    $0 == finish { skipping = 0; next }
    !skipping { print }
  ' "$target" >"$tmp"
  cat "$tmp" >"$target"
  rm -f "$tmp"
}

remove_block \
  "$npm_data/nginx/custom/server_proxy.conf" \
  "# LANA_MCP_AUTH_DISCOVERY_BEGIN" \
  "# LANA_MCP_AUTH_DISCOVERY_END"
remove_block \
  "$npm_data/nginx/custom/http.conf" \
  "# LANA_MCP_DEV_HOST_BEGIN" \
  "# LANA_MCP_DEV_HOST_END"

docker exec "$npm_container" nginx -t
docker exec "$npm_container" nginx -s reload

echo "Lana MCP edge routes removed; certificate retained for recovery."
