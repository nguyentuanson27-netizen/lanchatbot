#!/bin/sh
set -eu

INDEX="${1:?shard index required}"
COUNT="${2:-3}"
POINT_BATCH_SIZE="${3:-6}"
RUN_GROUP="${4:?run group required}"
WORKFLOW_ID='P23QDRANTLANA001'
CONTAINER='n8n-docker-n8n-1'
LOCK_KEY="lock:ingest:lana_multimodal_data_v2:shard:${INDEX}:of:${COUNT}"
LOG_DIR='/home/node/.n8n/p23-logs'
LOG_FILE="${LOG_DIR}/${RUN_GROUP}-shard-${INDEX}-of-${COUNT}.log"
BROKER_PORT="$((5680 + INDEX))"
NICE_LEVEL="${P23C_NICE_LEVEL:-10}"
RUNNERS_ENABLED="${P23C_RUNNERS_ENABLED:-false}"

case "$INDEX:$COUNT:$POINT_BATCH_SIZE" in
  *[!0-9:]*|'') echo 'INVALID_NUMERIC_ARGUMENT'; exit 2 ;;
esac
if [ "$INDEX" -ge "$COUNT" ] || [ "$COUNT" -gt 6 ]; then
  echo 'INVALID_SHARD_TOPOLOGY'
  exit 2
fi
case "$NICE_LEVEL" in
  *[!0-9]*|'') echo 'INVALID_NICE_LEVEL'; exit 2 ;;
esac
if [ "$NICE_LEVEL" -gt 19 ]; then
  echo 'NICE_LEVEL_MUST_BE_0_TO_19'
  exit 2
fi
if [ "$(docker exec n8n-docker-redis-1 redis-cli exists "$LOCK_KEY")" = '1' ]; then
  echo "SHARD_ALREADY_LOCKED=${INDEX}/${COUNT}"
  exit 3
fi

docker exec "$CONTAINER" sh -lc "mkdir -p '$LOG_DIR' && find '$LOG_DIR' -type f -mtime +3 -delete"
docker exec -d \
  -e "INGEST_SHARD_COUNT=$COUNT" \
  -e "INGEST_SHARD_INDEX=$INDEX" \
  -e "INGEST_POINT_BATCH_SIZE=$POINT_BATCH_SIZE" \
  -e "INGEST_RUN_GROUP=$RUN_GROUP" \
  -e "VERTEX_MIN_INTERVAL_MS=${VERTEX_MIN_INTERVAL_MS:-8000}" \
  -e "N8N_RUNNERS_ENABLED=$RUNNERS_ENABLED" \
  -e "N8N_RUNNERS_BROKER_PORT=$BROKER_PORT" \
  "$CONTAINER" \
  sh -lc "exec nice -n '$NICE_LEVEL' n8n execute --id=$WORKFLOW_ID >/dev/null 2>>'$LOG_FILE'"

attempt=0
while [ "$attempt" -lt 30 ]; do
  if [ "$(docker exec n8n-docker-redis-1 redis-cli exists "$LOCK_KEY")" = '1' ]; then
    value="$(docker exec n8n-docker-redis-1 redis-cli --raw get "$LOCK_KEY")"
    execution_id="${value%%:*}"
    echo "SHARD_STARTED=${INDEX}/${COUNT}"
    echo "EXECUTION_ID=$execution_id"
    echo "LOG_FILE=$LOG_FILE"
    exit 0
  fi
  progress_key="ingest:progress:lana_multimodal_data_v2:shard:${INDEX}:of:${COUNT}"
  progress="$(docker exec n8n-docker-redis-1 redis-cli --raw get "$progress_key" 2>/dev/null || true)"
  if [ -n "$progress" ] && printf '%s' "$progress" | grep -Fq "\"run_group\":\"$RUN_GROUP\""; then
    echo "SHARD_COMPLETED=${INDEX}/${COUNT}"
    echo "LOG_FILE=$LOG_FILE"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "SHARD_START_TIMEOUT=${INDEX}/${COUNT}"
docker exec "$CONTAINER" sh -lc "tail -n 80 '$LOG_FILE'" 2>&1 \
  | sed -E 's/(api[_-]?key|token|password|secret)([=: ]+)[^ ,}]*/\1\2***/Ig'
exit 4
