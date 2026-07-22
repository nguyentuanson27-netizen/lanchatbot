#!/bin/sh
set -eu

SHARD_COUNT="${1:-3}"
BATCH_SIZE="${2:-50}"
MAX_ROUNDS="${3:-20}"
ALLOW_INCOMPLETE="${4:-false}"
WORKFLOW_ID='P23IMGMETALANA01'
CONTAINER='n8n-docker-n8n-1'
REDIS='n8n-docker-redis-1'
DB='/var/lib/docker/volumes/n8n-docker_n8n_data/_data/database.sqlite'
LOG_DIR='/home/node/.n8n/p23-metadata-logs'
HOST_LOCK='/var/lock/lana-p23-metadata-full.lock'
RUN_GROUP="metadata-full-$(date -u +%Y%m%dT%H%M%SZ)"

case "$SHARD_COUNT:$BATCH_SIZE:$MAX_ROUNDS" in
  *[!0-9:]*) echo 'INVALID_NUMERIC_ARGUMENT'; exit 2 ;;
esac
[ "$SHARD_COUNT" -ge 1 ] && [ "$SHARD_COUNT" -le 6 ] || { echo 'SHARD_COUNT_OUT_OF_RANGE'; exit 2; }
[ "$BATCH_SIZE" -ge 1 ] && [ "$BATCH_SIZE" -le 50 ] || { echo 'BATCH_SIZE_OUT_OF_RANGE'; exit 2; }
[ "$MAX_ROUNDS" -ge 1 ] && [ "$MAX_ROUNDS" -le 50 ] || { echo 'MAX_ROUNDS_OUT_OF_RANGE'; exit 2; }

exec 9>"$HOST_LOCK"
flock -n 9 || { echo 'METADATA_ORCHESTRATOR_ALREADY_RUNNING'; exit 3; }

mkdir -p /opt/lana-chatbot/state
docker exec "$CONTAINER" mkdir -p "$LOG_DIR"

if docker exec "$CONTAINER" ps -eo args | grep "n8n execute --id=${WORKFLOW_ID}" | grep -v grep >/dev/null; then
  echo 'METADATA_WORKFLOW_PROCESS_ALREADY_RUNNING'
  exit 3
fi

round=1
total_staged=0
while [ "$round" -le "$MAX_ROUNDS" ]; do
  echo "ROUND_START=$round RUN_GROUP=$RUN_GROUP SHARDS=$SHARD_COUNT BATCH=$BATCH_SIZE"
  shard=0
  pids=''
  while [ "$shard" -lt "$SHARD_COUNT" ]; do
    lock_key="lock:ingest:image_metadata_staging:shard:${shard}:of:${SHARD_COUNT}"
    [ "$(docker exec "$REDIS" redis-cli exists "$lock_key")" = '0' ] || { echo "SHARD_LOCKED=$shard"; exit 4; }
    progress_key="ingest:progress:image_metadata_staging:shard:${shard}:of:${SHARD_COUNT}"
    docker exec "$REDIS" redis-cli del "$progress_key" >/dev/null
    broker_port="$((5710 + shard))"
    log_file="$LOG_DIR/${RUN_GROUP}-round-${round}-shard-${shard}-of-${SHARD_COUNT}.log"
    docker exec \
      -e "INGEST_SHARD_COUNT=$SHARD_COUNT" \
      -e "INGEST_SHARD_INDEX=$shard" \
      -e "IMAGE_METADATA_BATCH_SIZE=$BATCH_SIZE" \
      -e "IMAGE_METADATA_RUN_GROUP=$RUN_GROUP" \
      -e "N8N_RUNNERS_BROKER_PORT=$broker_port" \
      "$CONTAINER" sh -lc "n8n execute --rawOutput --id=$WORKFLOW_ID >$log_file 2>&1" &
    pids="$pids $!"
    shard=$((shard + 1))
    # Starting multiple CLI executions at the exact same instant can make all
    # processes contend for n8n's SQLite execution tables. Stagger startup while
    # keeping the image-processing phase parallel.
    if [ "$shard" -lt "$SHARD_COUNT" ]; then
      sleep "${SHARD_START_DELAY_SECONDS:-4}"
    fi
  done

  process_failed=0
  for pid in $pids; do
    if ! wait "$pid"; then process_failed=$((process_failed + 1)); fi
  done
  [ "$process_failed" -eq 0 ] || { echo "ROUND_PROCESS_FAILURES=$process_failed"; exit 5; }

  result="$(python3 - "$DB" "$RUN_GROUP" "$SHARD_COUNT" <<'PY'
import datetime, json, sqlite3, subprocess, sys
db, run_group, shard_count_raw = sys.argv[1:]
shard_count=int(shard_count_raw)
rows=[]
for shard in range(shard_count):
    key=f'ingest:progress:image_metadata_staging:shard:{shard}:of:{shard_count}'
    raw=subprocess.check_output(['docker','exec','n8n-docker-redis-1','redis-cli','--raw','get',key],text=True).strip()
    if not raw:
        raise SystemExit(f'PROGRESS_MISSING:{shard}')
    item=json.loads(raw)
    if str(item.get('run_group')) != run_group:
        raise SystemExit(f'PROGRESS_RUN_GROUP_MISMATCH:{shard}')
    rows.append(item)

execution_ids=[str(item.get('run_id') or '') for item in rows if str(item.get('run_id') or '').isdigit()]
now=datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
conn=sqlite3.connect(db,timeout=30)
if execution_ids:
    placeholders=','.join('?' for _ in execution_ids)
    conn.execute(f"update execution_entity set status='success',stoppedAt=? where id in ({placeholders}) and workflowId=? and status='running'",[now,*execution_ids,'P23IMGMETALANA01'])
    conn.commit()
conn.close()

summary={
  'pending_before':sum(int(item.get('pending_before') or 0) for item in rows),
  'selected':sum(int(item.get('selected') or 0) for item in rows),
  'remaining':sum(int(item.get('remaining') or 0) for item in rows),
  'staged':sum(int(item.get('staged') or 0) for item in rows),
  'failed':sum(int(item.get('failed') or 0) for item in rows),
  'execution_ids':execution_ids,
}
print(json.dumps(summary,separators=(',',':')))
PY
)"
  echo "ROUND_RESULT=$result"
  remaining="$(printf '%s' "$result" | python3 -c 'import json,sys; print(json.load(sys.stdin)["remaining"])')"
  staged="$(printf '%s' "$result" | python3 -c 'import json,sys; print(json.load(sys.stdin)["staged"])')"
  failed="$(printf '%s' "$result" | python3 -c 'import json,sys; print(json.load(sys.stdin)["failed"])')"
  total_staged=$((total_staged + staged))

  if [ "$remaining" -eq 0 ] && [ "$failed" -eq 0 ]; then
    finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '{"status":"complete","run_group":"%s","rounds":%s,"staged":%s,"finished_at":"%s"}\n' "$RUN_GROUP" "$round" "$total_staged" "$finished_at" >/opt/lana-chatbot/state/p23-metadata-full.json
    echo "METADATA_COMPLETE=true ROUNDS=$round TOTAL_STAGED=$total_staged"
    exit 0
  fi

  if [ "$failed" -gt 0 ]; then sleep 30; else sleep 5; fi
  round=$((round + 1))
done

finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"status":"incomplete","run_group":"%s","rounds":%s,"staged":%s,"finished_at":"%s"}\n' "$RUN_GROUP" "$MAX_ROUNDS" "$total_staged" "$finished_at" >/opt/lana-chatbot/state/p23-metadata-full.json
echo "METADATA_COMPLETE=false MAX_ROUNDS=$MAX_ROUNDS TOTAL_STAGED=$total_staged"
[ "$ALLOW_INCOMPLETE" = 'true' ] && exit 0
exit 6
