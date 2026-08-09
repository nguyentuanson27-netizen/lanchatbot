#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
readonly iterations=3
readonly interval_seconds=60

for ((index = 1; index <= iterations; index += 1)); do
  "$script_dir/postcheck.sh"
  printf '%s\n' "SOAK_SAMPLE_PASS $index/$iterations"
  if (( index < iterations )); then sleep "$interval_seconds"; fi
done
printf '%s\n' "SOAK_PASS samples=$iterations"
