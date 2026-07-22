#!/bin/sh
set -eu

COUNT="${1:-3}"
POINTS_PER_SHARD="${2:-6}"
RUN_GROUP="${3:-p23-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
HELPER='/opt/lana-chatbot/bin/start_p23_qdrant_shard.sh'

case "$COUNT:$POINTS_PER_SHARD" in
  *[!0-9:]*|'') echo 'INVALID_NUMERIC_ARGUMENT'; exit 2 ;;
esac
if [ "$COUNT" -lt 1 ] || [ "$COUNT" -gt 6 ]; then
  echo 'SHARD_COUNT_MUST_BE_1_TO_6'
  exit 2
fi

echo "RUN_GROUP=$RUN_GROUP"
echo "POINT_CAPACITY=$((COUNT * POINTS_PER_SHARD))"
index=0
pids=''
while [ "$index" -lt "$COUNT" ]; do
  "$HELPER" "$index" "$COUNT" "$POINTS_PER_SHARD" "$RUN_GROUP" &
  pids="$pids $!"
  index=$((index + 1))
  if [ "$index" -lt "$COUNT" ]; then
    sleep "${SHARD_START_DELAY_SECONDS:-4}"
  fi
done

status=0
for pid in $pids; do
  wait "$pid" || status=1
done
exit "$status"
