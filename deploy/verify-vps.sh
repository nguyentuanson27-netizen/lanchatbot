#!/bin/sh
set -eu

ROOT=/opt/lana-chatbot
ENV_FILE="$ROOT/shared/.env.infrastructure"

test -L "$ROOT/current"
test -f "$ROOT/current/deploy/docker-compose.vps.yml"
test -f "$ENV_FILE"
[ "$(stat -c '%a' "$ENV_FILE")" = "600" ]

STATUS=$(docker inspect --format '{{.State.Status}}' lana-chatbot-postgres)
HEALTH=$(docker inspect --format '{{.State.Health.Status}}' lana-chatbot-postgres)
[ "$STATUS" = "running" ]
[ "$HEALTH" = "healthy" ]

REDIS_STATUS=$(docker inspect --format '{{.State.Status}}' lana-chatbot-redis)
REDIS_HEALTH=$(docker inspect --format '{{.State.Health.Status}}' lana-chatbot-redis)
[ "$REDIS_STATUS" = "running" ]
[ "$REDIS_HEALTH" = "healthy" ]

API_STATUS=$(docker inspect --format '{{.State.Status}}' lana-chatbot-api)
API_HEALTH=$(docker inspect --format '{{.State.Health.Status}}' lana-chatbot-api)
[ "$API_STATUS" = "running" ]
[ "$API_HEALTH" = "healthy" ]

WORKER_STATUS=$(docker inspect --format '{{.State.Status}}' lana-chatbot-shadow-worker)
WORKER_HEALTH=$(docker inspect --format '{{.State.Health.Status}}' lana-chatbot-shadow-worker)
[ "$WORKER_STATUS" = "running" ]
[ "$WORKER_HEALTH" = "healthy" ]

if [ -n "$(docker port lana-chatbot-postgres)" ]; then
  echo "PostgreSQL unexpectedly publishes a host port" >&2
  exit 10
fi

if [ -n "$(docker port lana-chatbot-redis)" ]; then
  echo "Redis unexpectedly publishes a host port" >&2
  exit 11
fi

docker exec lana-chatbot-redis sh -lc '
  export REDISCLI_AUTH="$REDIS_PASSWORD"
  [ "$(redis-cli --raw CONFIG GET appendonly | tail -n 1)" = "yes" ]
  [ "$(redis-cli --raw CONFIG GET appendfsync | tail -n 1)" = "everysec" ]
  [ "$(redis-cli --raw CONFIG GET maxmemory-policy | tail -n 1)" = "noeviction" ]
  [ "$(redis-cli --raw PING)" = "PONG" ]
'

docker exec lana-chatbot-api node -e '
  fetch("http://127.0.0.1:8080/health/phase5-ready")
    .then(async response => {
      const body = await response.json();
      if (!response.ok || body.mode !== "shadow-business-facts" || body.send !== false) process.exit(1);
    })
    .catch(() => process.exit(1));
'

docker exec lana-chatbot-postgres sh -lc '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql --set ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At <<SQL
SELECT current_database() || '"'"'|'"'"' || current_user;
SELECT migration_name FROM schema_migrations ORDER BY migration_name;
SELECT '"'"'meta_outbox='"'"' || count(*) FROM meta_outbox;
SELECT '"'"'shadow_jobs='"'"' || count(*) FROM shadow_evaluations;
SELECT '"'"'worker_healthy='"'"' || EXISTS (
  SELECT 1 FROM shadow_worker_status
  WHERE last_seen_at >= now() - interval '"'"'60 seconds'"'"'
    AND status IN ('"'"'IDLE'"'"', '"'"'PROCESSING'"'"')
);
SELECT '"'"'worker_can_insert_meta_outbox='"'"' || has_table_privilege('"'"'lana_shadow_worker'"'"', '"'"'meta_outbox'"'"', '"'"'INSERT'"'"');
SELECT '"'"'business_fact_columns='"'"' || count(*) FROM information_schema.columns
  WHERE table_schema = '"'"'public'"'"' AND table_name = '"'"'shadow_evaluations'"'"'
    AND column_name LIKE '"'"'business_fact_%'"'"';
SELECT count(*) FROM pg_tables WHERE schemaname = '"'"'public'"'"';
SELECT tablename FROM pg_tables WHERE schemaname = '"'"'public'"'"' AND (tablename LIKE '"'"'messages_20%'"'"' OR tablename LIKE '"'"'conversation_events_20%'"'"') ORDER BY tablename;
SQL
'

docker exec n8n-docker-n8n-1 n8n list:workflow --active=true | grep -q '^C4Qn7aNuUNCHJJ9c|'

echo "VPS PostgreSQL, Redis, shadow business-fact worker and API verification passed"
