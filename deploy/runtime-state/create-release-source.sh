#!/usr/bin/env bash
set -euo pipefail
# Approved deployment automation only: create exactly once inside a newly materialized, inactive release.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
: "${RELEASE_SOURCE_DIR:?new release directory is required}"
: "${RELEASE_SOURCE_TAG:?immutable release tag is required}"
: "${RELEASE_SOURCE_COMMIT:?full release commit is required}"
: "${RELEASE_SOURCE_GIT_DIR:=/opt/lana-chatbot/repository}"
: "${RELEASE_SOURCE_APP_ROOT:=/opt/lana-chatbot}"
resolved_release="$(readlink -f "$RELEASE_SOURCE_DIR")"
expected_release="$RELEASE_SOURCE_APP_ROOT/releases/$RELEASE_SOURCE_TAG"
test "$resolved_release" = "$expected_release" || { echo "release directory/tag mismatch" >&2; exit 1; }
current_release="$(readlink -f "$RELEASE_SOURCE_APP_ROOT/current" 2>/dev/null || true)"
test "$resolved_release" != "$current_release" || { echo "source pointer must be created before activation" >&2; exit 1; }
node "$script_dir/release-source.mjs" create \
  --release-dir "$RELEASE_SOURCE_DIR" \
  --repository "https://github.com/nguyentuanson27-netizen/lanchatbot" \
  --tag "$RELEASE_SOURCE_TAG" \
  --commit "$RELEASE_SOURCE_COMMIT" \
  --git-dir "$RELEASE_SOURCE_GIT_DIR"
