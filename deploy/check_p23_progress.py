#!/usr/bin/env python3
import json
import subprocess
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: check_p23_progress.py RUN_GROUP SHARD_COUNT')

run_group = sys.argv[1]
count = int(sys.argv[2])
rows = []
for index in range(count):
    key = f'ingest:progress:lana_multimodal_data_v2:shard:{index}:of:{count}'
    result = subprocess.run(
        ['docker', 'exec', 'n8n-docker-redis-1', 'redis-cli', '--raw', 'GET', key],
        check=True, capture_output=True, text=True,
    )
    raw = result.stdout.strip()
    if not raw:
        raise SystemExit(f'MISSING_PROGRESS_SHARD_{index}')
    value = json.loads(raw)
    if value.get('run_group') != run_group:
        raise SystemExit(f'STALE_PROGRESS_SHARD_{index}:{value.get("run_group")}')
    if int(value.get('fatal_failed', 0)) > 0:
        raise SystemExit(f'FATAL_PROGRESS_SHARD_{index}:{value.get("fatal_failed")}')
    rows.append(value)

remaining = sum(int(row.get('remaining', 0)) for row in rows)
selected = sum(int(row.get('selected', 0)) for row in rows)
success = sum(int(row.get('success', 0)) for row in rows)
deleted = sum(int(row.get('deleted', 0)) for row in rows)
skipped = sum(int(row.get('skipped', 0)) for row in rows)
failed = sum(int(row.get('failed', 0)) for row in rows)
retryable = sum(int(row.get('retryable_failed', 0)) for row in rows)
print(f'REMAINING={remaining}')
print(f'SELECTED={selected}')
print(f'SUCCESS={success}')
print(f'DELETED={deleted}')
print(f'SKIPPED={skipped}')
print(f'FAILED={failed}')
print(f'RETRYABLE_FAILED={retryable}')
print('DETAIL=' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')))
