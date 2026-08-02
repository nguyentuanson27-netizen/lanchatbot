#!/usr/bin/env bash
set -euo pipefail
# Invoke only after explicit production authorization and successful verify-current.sh.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${RUNTIME_STATE_CANDIDATE:?candidate file is required}"
: "${RUNTIME_STATE_LIVE_PARITY_FILE:?fresh, secret-free live parity projection is required}"
: "${RUNTIME_STATE_ROOT:=/opt/lana-chatbot/runtime-state}"
node "$script_dir/runtime-state.mjs" promote --candidate "$RUNTIME_STATE_CANDIDATE" --live "$RUNTIME_STATE_LIVE_PARITY_FILE" --runtime-root "$RUNTIME_STATE_ROOT"
