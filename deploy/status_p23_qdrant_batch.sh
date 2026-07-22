#!/bin/sh
set -eu

COUNT="${1:-3}"
echo LOCKS
index=0
while [ "$index" -lt "$COUNT" ]; do
  key="lock:ingest:lana_multimodal_data_v2:shard:${index}:of:${COUNT}"
  exists="$(docker exec n8n-docker-redis-1 redis-cli exists "$key")"
  ttl="$(docker exec n8n-docker-redis-1 redis-cli pttl "$key")"
  echo "shard_${index}=exists:${exists},ttl_ms:${ttl}"
  index=$((index + 1))
done
echo PROCESSES
docker top n8n-docker-n8n-1 -eo pid,ppid,etimes,pcpu,pmem,args | grep P23QDRANTLANA001 || true
echo RECENT_LOGS
docker exec n8n-docker-n8n-1 sh -lc 'for file in $(ls -1t /home/node/.n8n/p23-logs/*.log 2>/dev/null | head -6); do echo "--- $file"; tail -n 4 "$file"; done'
