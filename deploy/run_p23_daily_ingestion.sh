#!/bin/sh
set -eu

CONTAINER='n8n-docker-n8n-1'
REGISTRY_WORKFLOW='P23REGSYNCLANA01'
SHARD_COUNT="${P23_SHARD_COUNT:-1}"
POINTS_PER_SHARD="${P23_POINTS_PER_SHARD:-50}"
MAX_BATCHES="${P23_MAX_BATCHES:-80}"
BATCH_TIMEOUT_SECONDS="${P23_BATCH_TIMEOUT_SECONDS:-5400}"
LOG_ROOT='/opt/lana-chatbot/logs/catalog-ingestion'
LOCK_FILE='/run/lock/lana-p23-daily.lock'
START_BATCH='/opt/lana-chatbot/bin/start_p23_qdrant_batch.sh'
CHECK_PROGRESS='/opt/lana-chatbot/bin/check_p23_progress.py'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$LOG_ROOT"
find "$LOG_ROOT" -type f -mtime +7 -delete 2>/dev/null || true
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo 'DAILY_INGESTION_ALREADY_RUNNING'
  exit 0
fi

echo "RUN_STARTED=$STAMP"
echo 'STEP=REGISTRY_SYNC'
REGISTRY_LOG="$LOG_ROOT/${STAMP}-registry.log"
if ! docker exec -e N8N_RUNNERS_BROKER_PORT=5695 "$CONTAINER" n8n execute --id="$REGISTRY_WORKFLOW" >"$REGISTRY_LOG" 2>&1; then
  echo "REGISTRY_SYNC_FAILED=$REGISTRY_LOG"
  tail -n 40 "$REGISTRY_LOG"
  exit 10
fi
if ! grep -q '"status": "success"' "$REGISTRY_LOG"; then
  echo "REGISTRY_SUCCESS_MARKER_MISSING=$REGISTRY_LOG"
  tail -n 40 "$REGISTRY_LOG"
  exit 11
fi

batch=1
while [ "$batch" -le "$MAX_BATCHES" ]; do
  group="daily-${STAMP}-batch-${batch}"
  echo "STEP=QDRANT_BATCH GROUP=$group"
  index=0
  while [ "$index" -lt "$SHARD_COUNT" ]; do
    docker exec n8n-docker-redis-1 redis-cli del "ingest:progress:lana_multimodal_data_v2:shard:${index}:of:${SHARD_COUNT}" >/dev/null
    index=$((index + 1))
  done
  "$START_BATCH" "$SHARD_COUNT" "$POINTS_PER_SHARD" "$group"

  deadline=$(( $(date +%s) + BATCH_TIMEOUT_SECONDS ))
  while :; do
    active=0
    index=0
    while [ "$index" -lt "$SHARD_COUNT" ]; do
      exists="$(docker exec n8n-docker-redis-1 redis-cli exists "lock:ingest:lana_multimodal_data_v2:shard:${index}:of:${SHARD_COUNT}")"
      active=$((active + exists))
      index=$((index + 1))
    done
    [ "$active" -eq 0 ] && break
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "BATCH_TIMEOUT=$group"
      exit 20
    fi
    sleep 15
  done

  progress="$($CHECK_PROGRESS "$group" "$SHARD_COUNT")" || {
    echo "BATCH_PROGRESS_INVALID=$group"
    exit 21
  }
  printf '%s\n' "$progress"
  remaining="$(printf '%s\n' "$progress" | sed -n 's/^REMAINING=//p')"
  retryable="$(printf '%s\n' "$progress" | sed -n 's/^RETRYABLE_FAILED=//p')"
  if [ "$remaining" = '0' ]; then
    echo "RUN_COMPLETE=$group"
    exit 0
  fi
  if [ -n "$retryable" ] && [ "$retryable" -gt 0 ]; then
    echo "TRANSIENT_RETRY_COOLDOWN=30s COUNT=$retryable"
    sleep 30
  fi
  batch=$((batch + 1))
done

echo "MAX_BATCHES_REACHED=$MAX_BATCHES"
exit 22
