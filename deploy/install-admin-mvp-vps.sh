#!/bin/sh
set -eu

ROOT=${ROOT:-/opt/lana-chatbot}
ENV_FILE=${ENV_FILE:-$ROOT/shared/.env.infrastructure}
COMPOSE_FILE=${COMPOSE_FILE:-$ROOT/current/deploy/docker-compose.vps.yml}

test -f "$ENV_FILE"
test -f "$COMPOSE_FILE"

chmod 700 \
  "$ROOT/current/deploy/migrate-vps.sh" \
  "$ROOT/current/deploy/prepare-admin-vps.sh"

# This migration only adds PII-safe read views. Existing chatbot services and
# n8n workflows are not restarted or changed by this installer.
"$ROOT/current/deploy/migrate-vps.sh"
"$ROOT/current/deploy/prepare-admin-vps.sh"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --no-deps admin-api
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build admin-web

echo "Read-only admin MVP is running internally behind the Authentik integration boundary."
