#!/usr/bin/env bash
set -euo pipefail
# Recaptures and verifies the host immediately before one atomic current.json promotion.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${RUNTIME_STATE_CANDIDATE:?candidate file is required}"
: "${RUNTIME_STATE_ROOT:=/opt/lana-chatbot/runtime-state}"
: "${RUNTIME_STATE_APP_ROOT:=/opt/lana-chatbot}"
: "${RUNTIME_STATE_SERVICE_EVIDENCE_FILE:?versioned service evidence and rollback map is required}"
: "${RUNTIME_STATE_GIT_DIR:=/opt/lana-chatbot/repository}"
observed="$(mktemp "${TMPDIR:-/tmp}/lana-runtime-promote.XXXXXX.json")"
rm -f "$observed"
trap 'rm -f "$observed"' EXIT
node "$script_dir/runtime-state.mjs" capture \
  --runtime-root "$RUNTIME_STATE_APP_ROOT" \
  --service-evidence-file "$RUNTIME_STATE_SERVICE_EVIDENCE_FILE" \
  --candidate-id "promotion-readback-$(date -u +%Y%m%dT%H%M%SZ)-$$" \
  --git-dir "$RUNTIME_STATE_GIT_DIR" \
  --output "$observed"
if ! node "$script_dir/runtime-state.mjs" promote --candidate "$RUNTIME_STATE_CANDIDATE" --observed "$observed" --runtime-root "$RUNTIME_STATE_ROOT"; then
  node "$script_dir/runtime-state.mjs" incident --incident-dir "$RUNTIME_STATE_ROOT/incidents" --candidate "$RUNTIME_STATE_CANDIDATE" --reason PROMOTION_OR_READBACK_FAILED >&2
  exit 1
fi
