#!/usr/bin/env bash
set -euo pipefail
# Approved deployment automation only. A non-zero result leaves current.json untouched.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${RUNTIME_STATE_CANDIDATE:?candidate file is required}"
: "${RUNTIME_STATE_LIVE_PARITY_FILE:?fresh, secret-free live parity projection is required}"
: "${RUNTIME_STATE_ROOT:=/opt/lana-chatbot/runtime-state}"
if ! node "$script_dir/runtime-state.mjs" verify --candidate "$RUNTIME_STATE_CANDIDATE" --live "$RUNTIME_STATE_LIVE_PARITY_FILE"; then
  incident_dir="$RUNTIME_STATE_ROOT/incidents"; mkdir -p "$incident_dir"
  incident="$incident_dir/$(date -u +%Y%m%dT%H%M%SZ)-$(basename "$RUNTIME_STATE_CANDIDATE").json"
  ( set -C; : > "$incident" ) 2>/dev/null || { echo "incident already exists: $incident" >&2; exit 1; }
  printf '{"schemaVersion":1,"type":"RUNTIME_STATE_PARITY_MISMATCH","candidate":"%s","recordedAt":"%s"}\n' "$(basename "$RUNTIME_STATE_CANDIDATE")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$incident"
  exit 1
fi
