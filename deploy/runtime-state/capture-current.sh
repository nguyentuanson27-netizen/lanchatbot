#!/usr/bin/env bash
set -euo pipefail
# Approved deployment automation only. It captures a new candidate; it never promotes or edits a release directory.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${RUNTIME_STATE_ROOT:=/opt/lana-chatbot/runtime-state}"
: "${RUNTIME_STATE_MIGRATION_FILE:?approved automation must provide a secret-free migration JSON projection}"
: "${RUNTIME_STATE_ROUTING_FILE:?approved automation must provide a secret-free routing JSON projection}"
: "${RUNTIME_STATE_ROLLBACK_FILE:?approved automation must provide a per-service rollback JSON map}"
: "${RUNTIME_STATE_CANDIDATE_ID:?candidate id is required}"
: "${RUNTIME_STATE_GIT_DIR:=/opt/lana-chatbot/repository}"
output="$RUNTIME_STATE_ROOT/candidates/$RUNTIME_STATE_CANDIDATE_ID.json"
test ! -e "$output" || { echo "candidate already exists: $output" >&2; exit 1; }
node "$script_dir/runtime-state.mjs" capture --runtime-root /opt/lana-chatbot --migration-file "$RUNTIME_STATE_MIGRATION_FILE" --routing-file "$RUNTIME_STATE_ROUTING_FILE" --rollback-file "$RUNTIME_STATE_ROLLBACK_FILE" --candidate-id "$RUNTIME_STATE_CANDIDATE_ID" --git-dir "$RUNTIME_STATE_GIT_DIR" --output "$output"
