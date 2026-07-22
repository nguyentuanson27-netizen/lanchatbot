#!/bin/sh
set -eu

ROOT=${ROOT:-/opt/lana-chatbot}
SECRETS_DIR=${SECRETS_DIR:-$ROOT/shared/secrets}
COMPOSE_FILE=${COMPOSE_FILE:-$ROOT/current/deploy/docker-compose.authentik.yml}

test -f "$COMPOSE_FILE"
install -d -m 0750 "$SECRETS_DIR"

for name in authentik_postgres_password authentik_secret_key; do
  path="$SECRETS_DIR/$name"
  if [ ! -s "$path" ]; then
    umask 077
    openssl rand -hex 48 > "$path"
  fi
  # Compose mounts each secret only into its declared services. Read-only mode
  # is needed because PostgreSQL and Authentik run with different container UIDs.
  chmod 0444 "$path"
done

docker compose -f "$COMPOSE_FILE" config --quiet
docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d

echo "Authentik is running internally. No DNS record or public Nginx host was created."
