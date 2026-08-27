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
release_dir="${script_path%/deploy/df13-first-preprod-release-reconcile.sh}"
releases_dir="${release_dir%/*}"
case "$releases_dir" in
  */releases) ;;
  *)
    printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_ENTRYPOINT_OUTSIDE_RELEASES" >&2
    exit 1
    ;;
esac
app_root="${releases_dir%/releases}"
repository_dir="$app_root/repository"
release_tag="${release_dir##*/}"
case "$release_tag" in
  *[!A-Za-z0-9._-]*|'')
    printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_INVALID" >&2
    exit 1
    ;;
esac
TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
PATH="$TRUSTED_PATH"
export PATH
readonly TRUSTED_PATH PATH
git_attestation() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 /usr/bin/git -c "safe.directory=$repository_dir" "$@"
}
test -d "$repository_dir" && test ! -L "$repository_dir" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:REPOSITORY_DIRECTORY_INVALID" >&2
  exit 1
}
body_path="${script_path%.sh}.body.sh"
test -f "$body_path" && test ! -L "$body_path" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_BODY_MISSING_OR_SYMLINK" >&2
  exit 1
}
release_commit="$(git_attestation -C "$repository_dir" rev-parse "${release_tag}^{commit}")" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_COMMIT_UNRESOLVED" >&2
  exit 1
}
test "$(git_attestation -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_NOT_ANNOTATED" >&2
  exit 1
}
test "$release_commit" = "${DF13_RELEASE_COMMIT:-}" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_COMMIT_MISMATCH" >&2
  exit 1
}
expected_body_blob="$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-reconcile.body.sh")" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_BODY_GIT_BLOB_MISSING" >&2
  exit 1
}
actual_body_blob="$(git_attestation -C "$repository_dir" hash-object -- "$body_path")" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_BODY_HASH_UNAVAILABLE" >&2
  exit 1
}
test "$actual_body_blob" = "$expected_body_blob" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_BODY_HASH_MISMATCH" >&2
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
