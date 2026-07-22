#!/bin/sh
set -eu

ARCHIVE=${1:?archive path is required}
EXPECTED_SHA256=${2:?expected sha256 is required}
RELEASE_ID=${3:?release id is required}
ROOT=/opt/lana-chatbot
RELEASE_DIR="$ROOT/releases/$RELEASE_ID"
SHARED_ENV="$ROOT/shared/.env.infrastructure"

case "$RELEASE_ID" in
  *[!A-Za-z0-9._-]*|'')
    echo "Invalid release id" >&2
    exit 2
    ;;
esac

ACTUAL_SHA256=$(sha256sum "$ARCHIVE" | awk '{print toupper($1)}')
EXPECTED_SHA256=$(printf '%s' "$EXPECTED_SHA256" | tr '[:lower:]' '[:upper:]')
if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
  echo "Archive checksum mismatch" >&2
  exit 3
fi

if [ -e "$RELEASE_DIR" ]; then
  echo "Release already exists: $RELEASE_DIR" >&2
  exit 4
fi

install -d -m 0750 "$ROOT/releases" "$ROOT/shared" "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
test -f "$RELEASE_DIR/deploy/docker-compose.vps.yml"
chmod 700 \
  "$RELEASE_DIR/deploy/install-vps.sh" \
  "$RELEASE_DIR/deploy/migrate-vps.sh" \
  "$RELEASE_DIR/deploy/prepare-phase4-vps.sh" \
  "$RELEASE_DIR/deploy/verify-vps.sh"

if [ ! -f "$SHARED_ENV" ]; then
  umask 077
  DB_PASSWORD=$(openssl rand -hex 32)
  REDIS_PASSWORD=$(openssl rand -hex 32)
  printf 'POSTGRES_DB=lana_chatbot\nPOSTGRES_USER=lana_app\nPOSTGRES_PASSWORD=%s\nREDIS_PASSWORD=%s\n' \
    "$DB_PASSWORD" "$REDIS_PASSWORD" > "$SHARED_ENV"
elif ! grep -q '^REDIS_PASSWORD=' "$SHARED_ENV"; then
  umask 077
  REDIS_PASSWORD=$(openssl rand -hex 32)
  printf 'REDIS_PASSWORD=%s\n' "$REDIS_PASSWORD" >> "$SHARED_ENV"
fi
chmod 600 "$SHARED_ENV"

if [ -e "$ROOT/current" ] && [ ! -L "$ROOT/current" ]; then
  echo "$ROOT/current exists and is not a symlink" >&2
  exit 5
fi

ln -s "$RELEASE_DIR" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"

docker compose \
  --env-file "$SHARED_ENV" \
  -f "$ROOT/current/deploy/docker-compose.vps.yml" \
  up -d postgres redis

"$ROOT/current/deploy/migrate-vps.sh"
"$ROOT/current/deploy/prepare-phase4-vps.sh"

docker compose \
  --env-file "$SHARED_ENV" \
  -f "$ROOT/current/deploy/docker-compose.vps.yml" \
  config --quiet

docker compose \
  --env-file "$SHARED_ENV" \
  -f "$ROOT/current/deploy/docker-compose.vps.yml" \
  up -d --build api shadow-worker

rm -f "$ARCHIVE"
echo "Release installed: $RELEASE_ID"
