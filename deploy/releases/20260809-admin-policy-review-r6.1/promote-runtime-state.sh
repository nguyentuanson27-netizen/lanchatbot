#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

require_command node
require_cutover_inputs
mode="${1:-}"
case "$mode" in
  deployment)
    evidence_file="$RUNTIME_STATE_SERVICE_EVIDENCE_FILE"
    expected_current="$RELEASE_DIR"
    ;;
  rollback)
    evidence_file="$RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE"
    expected_current="$PREVIOUS_RELEASE_DIR"
    ;;
  *) die "usage: promote-runtime-state.sh deployment|rollback" ;;
esac
test "$(readlink -f "$APP_ROOT/current")" = "$(readlink -f "$expected_current")" || die "runtime-state current release mismatch"

candidate_id="$RELEASE_TAG-$mode-$(date -u +%Y%m%dT%H%M%SZ)-$$"
candidate_file="$APP_ROOT/runtime-state/candidates/$candidate_id.json"
RUNTIME_STATE_APP_ROOT="$APP_ROOT" \
RUNTIME_STATE_ROOT="$APP_ROOT/runtime-state" \
RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$evidence_file" \
RUNTIME_STATE_CANDIDATE_ID="$candidate_id" \
RUNTIME_STATE_GIT_DIR="$REPOSITORY_DIR" \
  "$RELEASE_DIR/deploy/runtime-state/capture-current.sh"
RUNTIME_STATE_APP_ROOT="$APP_ROOT" \
RUNTIME_STATE_ROOT="$APP_ROOT/runtime-state" \
RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$evidence_file" \
RUNTIME_STATE_CANDIDATE="$candidate_file" \
RUNTIME_STATE_GIT_DIR="$REPOSITORY_DIR" \
  "$RELEASE_DIR/deploy/runtime-state/verify-current.sh"
RUNTIME_STATE_APP_ROOT="$APP_ROOT" \
RUNTIME_STATE_ROOT="$APP_ROOT/runtime-state" \
RUNTIME_STATE_SERVICE_EVIDENCE_FILE="$evidence_file" \
RUNTIME_STATE_CANDIDATE="$candidate_file" \
RUNTIME_STATE_GIT_DIR="$REPOSITORY_DIR" \
  "$RELEASE_DIR/deploy/runtime-state/promote-current.sh"
printf '%s\n' "RUNTIME_STATE_PROMOTION_PASS mode=$mode candidate=$candidate_id"
