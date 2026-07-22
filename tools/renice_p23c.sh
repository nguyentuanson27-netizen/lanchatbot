#!/bin/sh
set -eu

NICE_LEVEL="${P23C_NICE_LEVEL:-10}"
roots="$(pgrep -f '[P]23QDRANTLANA001' || true) $(pgrep -f '[r]un_p23c_approved_full.sh' || true)"
pids=''

for root in $roots; do
  pids="$pids $root"
  children="$(pgrep -P "$root" || true)"
  pids="$pids $children"
  for child in $children; do
    pids="$pids $(pgrep -P "$child" || true)"
  done
done

unique="$(printf '%s\n' $pids | awk 'NF && !seen[$1]++ {print $1}')"
if [ -z "$unique" ]; then
  echo 'P23C_PROCESS_NOT_FOUND'
  exit 0
fi

for pid in $unique; do
  [ -d "/proc/$pid" ] || continue
  renice -n "$NICE_LEVEL" -p "$pid" >/dev/null 2>&1 || true
  ionice -c 3 -p "$pid" >/dev/null 2>&1 || true
done

echo "P23C_PRIORITY_APPLIED nice=$NICE_LEVEL"
ps -o pid,ppid,ni,pcpu,pmem,rss,etime,args -p "$(printf '%s,' $unique | sed 's/,$//')" --sort=-pcpu
