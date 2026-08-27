#!/bin/sh
set -eu

# This bootstrap copies the exact tagged Git blobs into a private directory
# before it starts Bash. It only materializes an inactive release directory;
# it cannot deploy, migrate, select authority, or change a runtime pointer.
script_path=$(/usr/bin/readlink -f -- "$0") || {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:MATERIALIZER_ENTRYPOINT_UNRESOLVED" >&2
  exit 1
}
case "$script_path" in
  */repository/deploy/df13-first-preprod-release-materialize.sh) ;;
  *)
    printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:MATERIALIZER_ENTRYPOINT_REPOSITORY_MISMATCH" >&2
    exit 1
    ;;
esac
repository_dir="${script_path%/deploy/df13-first-preprod-release-materialize.sh}"
app_root="${repository_dir%/repository}"
test "$repository_dir" = "$app_root/repository" && test "$app_root" = "/opt/lana-chatbot" || {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:MATERIALIZER_TRUST_ROOT_INVALID" >&2
  exit 1
}
release_tag="${DF13_RELEASE_TAG:-}"
release_commit="${DF13_RELEASE_COMMIT:-}"
release_tree="${DF13_RELEASE_TREE:-}"
case "$release_tag" in *[!A-Za-z0-9._-]*|'') exit 1 ;; esac
case "$release_commit" in ????????* ) ;; *) exit 1 ;; esac
case "$release_tree" in ????????* ) ;; *) exit 1 ;; esac
case "$release_commit" in *[!0123456789abcdef]* ) exit 1 ;; esac
case "$release_tree" in *[!0123456789abcdef]* ) exit 1 ;; esac
test "${#release_commit}" = 40 && test "${#release_tree}" = 40 || exit 1

TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
PATH="$TRUSTED_PATH"
export PATH
readonly TRUSTED_PATH PATH
readonly DEPLOY_GIT_USER="lana-deploy"
readonly DEPLOY_GIT_HOME="/home/lana-deploy"
readonly DEPLOY_GIT_SSH_DIRECTORY="/home/lana-deploy/.ssh"
readonly DEPLOY_GIT_PRIVATE_KEY="/home/lana-deploy/.ssh/lana_chatbot_github_ed25519"
readonly DEPLOY_GIT_KNOWN_HOSTS="/home/lana-deploy/.ssh/known_hosts"
readonly DEPLOY_GIT_SSH_COMMAND="/usr/bin/ssh -F /dev/null -i $DEPLOY_GIT_PRIVATE_KEY -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$DEPLOY_GIT_KNOWN_HOSTS"
assert_deploy_git_identity() {
  deploy_uid="$(/usr/bin/id -u "$DEPLOY_GIT_USER")" || die "MATERIALIZER_DEPLOY_USER_UNAVAILABLE"
  for deploy_directory in "$DEPLOY_GIT_HOME" "$DEPLOY_GIT_SSH_DIRECTORY"; do
    test -d "$deploy_directory" && test ! -L "$deploy_directory" && \
      test "$(/usr/bin/readlink -f -- "$deploy_directory")" = "$deploy_directory" || die "MATERIALIZER_DEPLOY_GIT_IDENTITY_INVALID"
  done
  for deploy_file in "$DEPLOY_GIT_PRIVATE_KEY" "$DEPLOY_GIT_KNOWN_HOSTS"; do
    test -f "$deploy_file" && test ! -L "$deploy_file" && \
      test "$(/usr/bin/readlink -f -- "$deploy_file")" = "$deploy_file" || die "MATERIALIZER_DEPLOY_GIT_IDENTITY_INVALID"
    test "$(/usr/bin/stat -c '%u:%a' -- "$deploy_file")" = "$deploy_uid:600" || die "MATERIALIZER_DEPLOY_GIT_IDENTITY_INVALID"
  done
}
git_as_deploy() {
  test "$(/usr/bin/id -u)" -eq 0 || die "MATERIALIZER_ROOT_REQUIRED"
  assert_deploy_git_identity
  /usr/sbin/runuser -u "$DEPLOY_GIT_USER" -- /usr/bin/env -i \
    PATH="$TRUSTED_PATH" HOME="$DEPLOY_GIT_HOME" \
    GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_COUNT=1 \
    GIT_CONFIG_KEY_0=core.sshCommand GIT_CONFIG_VALUE_0="$DEPLOY_GIT_SSH_COMMAND" \
    /usr/bin/git "$@"
}
hash_private_file() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 \
    /usr/bin/git hash-object --no-filters -- "$1"
}
die() {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:$1" >&2
  exit 1
}
test -d "$repository_dir" && test ! -L "$repository_dir" || die "MATERIALIZER_REPOSITORY_INVALID"
test "$(git_as_deploy -C "$repository_dir" rev-parse "${release_tag}^{commit}")" = "$release_commit" || die "MATERIALIZER_TAG_COMMIT_MISMATCH"
test "$(git_as_deploy -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || die "MATERIALIZER_TAG_NOT_ANNOTATED"
test "$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}^{tree}")" = "$release_tree" || die "MATERIALIZER_TAG_TREE_MISMATCH"

expected_entrypoint_blob="$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.sh")" || die "MATERIALIZER_ENTRYPOINT_BLOB_MISSING"
actual_entrypoint_blob="$(git_as_deploy -C "$repository_dir" hash-object -- "$script_path")" || die "MATERIALIZER_ENTRYPOINT_HASH_UNAVAILABLE"
test "$actual_entrypoint_blob" = "$expected_entrypoint_blob" || die "MATERIALIZER_ENTRYPOINT_HASH_MISMATCH"
expected_body_blob="$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.body.sh")" || die "MATERIALIZER_BODY_BLOB_MISSING"

shared_dir="$app_root/shared"
test -d "$shared_dir" && test ! -L "$shared_dir" || die "MATERIALIZER_SHARED_DIRECTORY_INVALID"
private_dir=""
cleanup_private() {
  case "$private_dir" in
    "$shared_dir"/.df13-materializer.*)
      if test -d "$private_dir" && test ! -L "$private_dir"; then
        /usr/bin/rm -rf -- "$private_dir"
      fi
      ;;
  esac
}
trap cleanup_private 0
trap 'cleanup_private; exit 1' 1 2 15
private_dir="$(umask 077; /usr/bin/mktemp -d "$shared_dir/.df13-materializer.XXXXXXXX")" || die "MATERIALIZER_PRIVATE_DIRECTORY_CREATE_FAILED"
test -d "$private_dir" && test ! -L "$private_dir" || die "MATERIALIZER_PRIVATE_DIRECTORY_INVALID"
test "$(/usr/bin/stat -c '%u' -- "$private_dir")" = "$(/usr/bin/id -u)" || die "MATERIALIZER_PRIVATE_DIRECTORY_OWNER_INVALID"

copy_attested_blob() {
  expected_blob="$1"
  destination="$2"
  failure_prefix="$3"
  git_as_deploy -C "$repository_dir" cat-file blob "$expected_blob" > "$destination" || die "${failure_prefix}_COPY_FAILED"
  test -f "$destination" && test ! -L "$destination" || die "${failure_prefix}_PRIVATE_ARTIFACT_INVALID"
  actual_blob="$(hash_private_file "$destination")" || die "${failure_prefix}_HASH_UNAVAILABLE"
  test "$actual_blob" = "$expected_blob" || die "${failure_prefix}_HASH_MISMATCH"
  /usr/bin/chmod 0700 -- "$destination" || die "${failure_prefix}_MODE_FAILED"
}

private_body="$private_dir/materialize.body.sh"
copy_attested_blob "$expected_body_blob" "$private_body" "MATERIALIZER_BODY"

exec /usr/bin/env -i \
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  DF13_RELEASE_TAG="$release_tag" \
  DF13_RELEASE_COMMIT="$release_commit" \
  DF13_RELEASE_TREE="$release_tree" \
  DF13_MATERIALIZER_APP_ROOT="$app_root" \
  DF13_MATERIALIZER_REPOSITORY_DIR="$repository_dir" \
  DF13_MATERIALIZER_PRIVATE_DIR="$private_dir" \
  /usr/bin/bash --noprofile --norc "$private_body"
