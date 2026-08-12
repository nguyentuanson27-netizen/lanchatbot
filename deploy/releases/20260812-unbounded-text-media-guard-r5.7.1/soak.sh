#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
readonly iterations=3
previous="${1:?usage: soak.sh <initial-operational-state>}"
test -s "$previous" || { printf '%s\n' "initial operational sample missing" >&2; exit 1; }
for iteration in $(seq 1 "$iterations"); do
  sleep 20
  output="$(dirname -- "$previous")/operational-state.soak.$iteration.json"
  "$script_dir/postcheck.sh" "$previous" "$output"
  printf '%s\n' "SOAK_SAMPLE_PASS sample=$iteration/$iterations evidence=$output"
  previous="$output"
done
printf '%s\n' "SOAK_PASS samples=$iterations"
