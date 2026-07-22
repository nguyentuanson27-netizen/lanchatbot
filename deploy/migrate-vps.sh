#!/bin/sh
set -eu

ROOT=/opt/lana-chatbot
ENV_FILE="$ROOT/shared/.env.infrastructure"

test -f "$ENV_FILE"
set -a
. "$ENV_FILE"
set +a

for _attempt in $(seq 1 30); do
  HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' lana-chatbot-postgres)
  [ "$HEALTH" = "healthy" ] && break
  sleep 2
done
[ "${HEALTH:-}" = "healthy" ]

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@lana-chatbot-postgres:5432/${POSTGRES_DB}"
export DATABASE_URL

docker run --rm \
  --name lana-chatbot-migrator \
  --network lana-chatbot-backend \
  --mount "type=bind,src=$ROOT/current,dst=/app" \
  --workdir /app \
  --env DATABASE_URL \
  node:22-alpine \
  sh -lc 'npm install --global pnpm@10.12.4 --silent && pnpm install --frozen-lockfile && pnpm --filter @lana/database build && pnpm --filter @lana/database migrate'

docker exec lana-chatbot-postgres sh -lc '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql --set ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
SELECT lana_create_history_partitions(date_trunc('"'"'month'"'"', current_date)::date);
SELECT lana_create_history_partitions((date_trunc('"'"'month'"'"', current_date) + interval '"'"'1 month'"'"')::date);
SQL
'

echo "Database migrations and initial monthly partitions are ready"

