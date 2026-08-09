#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
iterations="${SOAK_ITERATIONS:-3}"
interval_seconds="${SOAK_INTERVAL_SECONDS:-60}"
[[ "$iterations" =~ ^[1-9][0-9]*$ ]] || { printf '%s\n' "invalid SOAK_ITERATIONS" >&2; exit 1; }
[[ "$interval_seconds" =~ ^[1-9][0-9]*$ ]] || { printf '%s\n' "invalid SOAK_INTERVAL_SECONDS" >&2; exit 1; }
(( iterations <= 12 )) || { printf '%s\n' "SOAK_ITERATIONS exceeds 12" >&2; exit 1; }
(( interval_seconds <= 300 )) || { printf '%s\n' "SOAK_INTERVAL_SECONDS exceeds 300" >&2; exit 1; }

for ((index = 1; index <= iterations; index += 1)); do
  "$script_dir/postcheck.sh"
  printf '%s\n' "SOAK_SAMPLE_PASS $index/$iterations"
  if (( index < iterations )); then sleep "$interval_seconds"; fi
done
printf '%s\n' "SOAK_PASS samples=$iterations"
