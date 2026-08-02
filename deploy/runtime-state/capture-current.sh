#!/usr/bin/env bash
set -euo pipefail
# Approved deployment automation only. Creates one diagnostic candidate and never promotes it.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${RUNTIME_STATE_ROOT:=/opt/lana-chatbot/runtime-state}"
: "${RUNTIME_STATE_APP_ROOT:=/opt/lana-chatbot}"
: "${RUNTIME_STATE_SERVICE_EVIDENCE_FILE:?versioned service evidence and rollback map is required}"
: "${RUNTIME_STATE_CANDIDATE_ID:?candidate id is required}"
: "${RUNTIME_STATE_GIT_DIR:=/opt/lana-chatbot/repository}"
output="$RUNTIME_STATE_ROOT/candidates/$RUNTIME_STATE_CANDIDATE_ID.json"
test ! -e "$output" || { echo "candidate already exists: $output" >&2; exit 1; }
node "$script_dir/runtime-state.mjs" capture \
  --runtime-root "$RUNTIME_STATE_APP_ROOT" \
  --service-evidence-file "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  --candidate-id "$RUNTIME_STATE_CANDIDATE_ID" \
  --git-dir "$RUNTIME_STATE_GIT_DIR" \
  --output "$output"
