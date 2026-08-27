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
readonly DEPLOY_APP_ROOT="/opt/lana-chatbot"
case "$release_tag" in
  *[!A-Za-z0-9._-]*|'')
    printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_INVALID" >&2
    exit 1
    ;;
esac
test "$app_root" = "$DEPLOY_APP_ROOT" && \
  test "$release_dir" = "$DEPLOY_APP_ROOT/releases/$release_tag" && \
  test "$repository_dir" = "$DEPLOY_APP_ROOT/repository" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_TRUST_ROOT_INVALID" >&2
  exit 1
}
TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
PATH="$TRUSTED_PATH"
export PATH
readonly TRUSTED_PATH PATH
readonly DEPLOY_GIT_USER="lana-deploy"
readonly DEPLOY_GIT_PRIVATE_KEY="/home/lana-deploy/.ssh/lana_chatbot_github_ed25519"
readonly DEPLOY_GIT_KNOWN_HOSTS="/home/lana-deploy/.ssh/known_hosts"
readonly DEPLOY_GIT_SSH_COMMAND="/usr/bin/ssh -F /dev/null -i $DEPLOY_GIT_PRIVATE_KEY -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$DEPLOY_GIT_KNOWN_HOSTS"
assert_deploy_git_identity() {
  deploy_uid="$(/usr/bin/id -u "$DEPLOY_GIT_USER")" || {
    printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_DEPLOY_USER_UNAVAILABLE" >&2
    exit 1
  }
  for deploy_file in "$DEPLOY_GIT_PRIVATE_KEY" "$DEPLOY_GIT_KNOWN_HOSTS"; do
    test -f "$deploy_file" && test ! -L "$deploy_file" && \
      test "$(/usr/bin/stat -c '%u:%a' -- "$deploy_file")" = "$deploy_uid:600" || {
      printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_DEPLOY_GIT_IDENTITY_INVALID" >&2
      exit 1
    }
  done
}
git_as_deploy() {
  test "$(/usr/bin/id -u)" -eq 0 || {
    printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_ROOT_REQUIRED" >&2
    exit 1
  }
  assert_deploy_git_identity
  /usr/sbin/runuser -u "$DEPLOY_GIT_USER" -- /usr/bin/env -i \
    PATH="$TRUSTED_PATH" HOME="/home/lana-deploy" \
    GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_COUNT=1 \
    GIT_CONFIG_KEY_0=core.sshCommand GIT_CONFIG_VALUE_0="$DEPLOY_GIT_SSH_COMMAND" \
    /usr/bin/git "$@"
}
hash_release_file() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 \
    /usr/bin/git hash-object --no-filters -- "$1"
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
release_commit="$(git_as_deploy -C "$repository_dir" rev-parse "${release_tag}^{commit}")" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_COMMIT_UNRESOLVED" >&2
  exit 1
}
test "$(git_as_deploy -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_NOT_ANNOTATED" >&2
  exit 1
}
test "$release_commit" = "${DF13_RELEASE_COMMIT:-}" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RELEASE_TAG_COMMIT_MISMATCH" >&2
  exit 1
}
expected_body_blob="$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-reconcile.body.sh")" || {
  printf '%s\n' "DF13_RELEASE_RECONCILIATION_BLOCKED:RECONCILIATION_BODY_GIT_BLOB_MISSING" >&2
  exit 1
}
actual_body_blob="$(hash_release_file "$body_path")" || {
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
