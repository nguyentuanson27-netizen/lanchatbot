#!/bin/sh
set -eu

SHARD_COUNT="${P23C_SHARD_COUNT:-2}"
POINTS_PER_SHARD="${P23C_POINTS_PER_SHARD:-50}"
MAX_BATCHES="${P23C_MAX_BATCHES:-20}"
BATCH_TIMEOUT_SECONDS="${P23C_BATCH_TIMEOUT_SECONDS:-5400}"
START_BATCH='/opt/lana-chatbot/bin/start_p23_qdrant_batch.sh'
CHECK_PROGRESS='/opt/lana-chatbot/bin/check_p23_progress.py'
LOCK_FILE='/run/lock/lana-p23c-approved-full.lock'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

exec 9>"$LOCK_FILE"
flock -n 9 || { echo 'P23C_APPROVED_FULL_ALREADY_RUNNING'; exit 3; }

echo "P23C_RUN_STARTED=$STAMP SHARDS=$SHARD_COUNT POINTS_PER_SHARD=$POINTS_PER_SHARD"
batch=1
while [ "$batch" -le "$MAX_BATCHES" ]; do
  group="p23c-full-${STAMP}-batch-${batch}"
  echo "P23C_BATCH_START=$batch GROUP=$group"

  index=0
  while [ "$index" -lt "$SHARD_COUNT" ]; do
    docker exec n8n-docker-redis-1 redis-cli del \
      "ingest:progress:lana_multimodal_data_v2:shard:${index}:of:${SHARD_COUNT}" >/dev/null
    index=$((index + 1))
  done

  "$START_BATCH" "$SHARD_COUNT" "$POINTS_PER_SHARD" "$group"
  deadline=$(( $(date +%s) + BATCH_TIMEOUT_SECONDS ))
  while :; do
    active=0
    index=0
    while [ "$index" -lt "$SHARD_COUNT" ]; do
      exists="$(docker exec n8n-docker-redis-1 redis-cli exists \
        "lock:ingest:lana_multimodal_data_v2:shard:${index}:of:${SHARD_COUNT}")"
      active=$((active + exists))
      index=$((index + 1))
    done
    [ "$active" -eq 0 ] && break
    [ "$(date +%s)" -lt "$deadline" ] || { echo "P23C_BATCH_TIMEOUT=$group"; exit 20; }
    sleep 15
  done

  progress="$($CHECK_PROGRESS "$group" "$SHARD_COUNT")" || {
    echo "P23C_BATCH_PROGRESS_INVALID=$group"
    exit 21
  }
  printf '%s\n' "$progress"
  remaining="$(printf '%s\n' "$progress" | sed -n 's/^REMAINING=//p')"
  retryable="$(printf '%s\n' "$progress" | sed -n 's/^RETRYABLE_FAILED=//p')"
  if [ "$remaining" = '0' ]; then
    echo "P23C_RUN_COMPLETE=$group"
    exit 0
  fi
  if [ -n "$retryable" ] && [ "$retryable" -gt 0 ]; then
    echo "P23C_RETRY_COOLDOWN=30s COUNT=$retryable"
    sleep 30
  fi
  batch=$((batch + 1))
done

echo "P23C_MAX_BATCHES_REACHED=$MAX_BATCHES"
exit 22
