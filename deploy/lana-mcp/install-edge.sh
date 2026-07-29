#!/usr/bin/env sh
set -eu

release_dir=${1:?Usage: install-edge.sh RELEASE_DIR}
npm_container=${NPM_CONTAINER:-n8n-docker_npm_1}
domain=${LANA_MCP_DOMAIN:-dev.lanadesign.vn}
expected_ipv4=${LANA_MCP_EXPECTED_IPV4:-156.67.214.197}
cert_name=${LANA_MCP_CERT_NAME:-lana-mcp-dev}

source_dir="$release_dir/deploy/lana-mcp/nginx"
auth_block="$source_dir/auth-discovery-location.conf"
bootstrap_block="$source_dir/dev-http-bootstrap.conf"
https_block="$source_dir/dev-https.conf"

for file in "$auth_block" "$bootstrap_block" "$https_block"; do
  test -f "$file"
done

docker inspect "$npm_container" >/dev/null
docker inspect lana-chatbot-mcp >/dev/null

resolved_ipv4=$(getent ahostsv4 "$domain" | awk 'NR == 1 { print $1 }')
if test "$resolved_ipv4" != "$expected_ipv4"; then
  echo "DNS mismatch for $domain: expected $expected_ipv4, got ${resolved_ipv4:-none}" >&2
  exit 1
fi

docker exec "$npm_container" curl -fsS http://lana-chatbot-mcp:8080/health |
  grep -q '"oauth_configured":true'

npm_data=$(
  docker inspect "$npm_container" \
    --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}'
)
test -n "$npm_data"
custom_dir="$npm_data/nginx/custom"
mkdir -p "$custom_dir"

server_proxy="$custom_dir/server_proxy.conf"
http_custom="$custom_dir/http.conf"
touch "$server_proxy" "$http_custom"

backup_dir="/opt/lana-chatbot/backups/lana-mcp-edge-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
cp -a "$server_proxy" "$backup_dir/server_proxy.conf"
cp -a "$http_custom" "$backup_dir/http.conf"

replace_block() {
  target=$1
  block=$2
  start_marker=$3
  end_marker=$4
  tmp=$(mktemp)
  awk -v start="$start_marker" -v finish="$end_marker" '
    $0 == start { skipping = 1; next }
    $0 == finish { skipping = 0; next }
    !skipping { print }
  ' "$target" >"$tmp"
  {
    cat "$tmp"
    printf '\n'
    cat "$block"
    printf '\n'
  } >"$target"
  rm -f "$tmp"
  chmod 644 "$target"
}

replace_block \
  "$server_proxy" \
  "$auth_block" \
  "# LANA_MCP_AUTH_DISCOVERY_BEGIN" \
  "# LANA_MCP_AUTH_DISCOVERY_END"
replace_block \
  "$http_custom" \
  "$bootstrap_block" \
  "# LANA_MCP_DEV_HOST_BEGIN" \
  "# LANA_MCP_DEV_HOST_END"

docker exec "$npm_container" nginx -t
docker exec "$npm_container" nginx -s reload

docker exec "$npm_container" certbot certonly \
  --config-dir /etc/letsencrypt \
  --work-dir /tmp/letsencrypt-lib \
  --logs-dir /data/logs \
  --webroot \
  --webroot-path /data/letsencrypt-acme-challenge \
  --cert-name "$cert_name" \
  --domain "$domain" \
  --non-interactive \
  --agree-tos \
  --no-eff-email \
  --keep-until-expiring \
  --key-type ecdsa \
  --elliptic-curve secp384r1

docker exec "$npm_container" test -s "/etc/letsencrypt/live/$cert_name/fullchain.pem"
docker exec "$npm_container" test -s "/etc/letsencrypt/live/$cert_name/privkey.pem"

replace_block \
  "$http_custom" \
  "$https_block" \
  "# LANA_MCP_DEV_HOST_BEGIN" \
  "# LANA_MCP_DEV_HOST_END"

docker exec "$npm_container" nginx -t
docker exec "$npm_container" nginx -s reload

curl -fsS "https://$domain/health" |
  grep -q '"oauth_configured":true'
curl -fsS \
  "https://auth.lanadesign.vn/application/o/lana-chatgpt-mcp/.well-known/openid-configuration" |
  grep -q '"registration_endpoint"'

echo "Lana MCP edge installed; backup: $backup_dir"
