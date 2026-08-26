#!/bin/sh
set -eu

# The public operator entrypoint deliberately is not Bash: it derives the
# reviewed body from its own immutable release path, then starts it with only
# the explicit operational inputs. BASH_ENV, PATH functions and aliases from
# the invoking shell cannot reach the release-attestation body.
script_path=$(/usr/bin/readlink -f -- "$0") || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_ENTRYPOINT_UNRESOLVED" >&2
  exit 1
}
case "$script_path" in
  */deploy/df13-first-preprod-release-reconcile.sh) ;;
  *)
    printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_ENTRYPOINT_RELEASE_MISMATCH" >&2
    exit 1
    ;;
esac
body_path="${script_path%.sh}.body.sh"
test -f "$body_path" && test ! -L "$body_path" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_BODY_MISSING_OR_SYMLINK" >&2
  exit 1
}
exec /usr/bin/env -i \
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  DF13_RELEASE_COMMIT="${DF13_RELEASE_COMMIT:-}" \
  DF13_RELEASE_TREE="${DF13_RELEASE_TREE:-}" \
  DF13_RELEASE_REALTIME_IMAGE="${DF13_RELEASE_REALTIME_IMAGE:-}" \
  DF13_RELEASE_REALTIME_IMAGE_ID="${DF13_RELEASE_REALTIME_IMAGE_ID:-}" \
  DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE="${DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE:-}" \
  DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256="${DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256:-}" \
  /usr/bin/bash --noprofile --norc "$body_path" "$@"
