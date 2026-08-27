#!/bin/sh
set -eu

# This source-controlled bootstrap verifies its own immutable tag blobs before
# it starts Bash. It only materializes a new inactive release directory; it
# cannot deploy, migrate, select authority, or change a runtime pointer.
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
git_attestation() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 /usr/bin/git "$@"
}
test -d "$repository_dir" && test ! -L "$repository_dir" || exit 1
test "$(git_attestation -C "$repository_dir" rev-parse "${release_tag}^{commit}")" = "$release_commit" || exit 1
test "$(git_attestation -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || exit 1
test "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}^{tree}")" = "$release_tree" || exit 1

body_path="${script_path%.sh}.body.sh"
test -f "$body_path" && test ! -L "$body_path" || exit 1
expected_entrypoint_blob="$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.sh")" || exit 1
actual_entrypoint_blob="$(git_attestation -C "$repository_dir" hash-object -- "$script_path")" || exit 1
test "$actual_entrypoint_blob" = "$expected_entrypoint_blob" || {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:MATERIALIZER_ENTRYPOINT_HASH_MISMATCH" >&2
  exit 1
}
expected_body_blob="$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.body.sh")" || exit 1
actual_body_blob="$(git_attestation -C "$repository_dir" hash-object -- "$body_path")" || exit 1
test "$actual_body_blob" = "$expected_body_blob" || {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:MATERIALIZER_BODY_HASH_MISMATCH" >&2
  exit 1
}

exec /usr/bin/env -i \
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  DF13_RELEASE_TAG="$release_tag" \
  DF13_RELEASE_COMMIT="$release_commit" \
  DF13_RELEASE_TREE="$release_tree" \
  /usr/bin/bash --noprofile --norc "$body_path"
