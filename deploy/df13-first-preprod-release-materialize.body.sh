#!/usr/bin/bash
set -euo pipefail
set -E
trap - DEBUG RETURN ERR EXIT
unset BASH_ENV ENV CDPATH

readonly TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
PATH="$TRUSTED_PATH"
export PATH
readonly PATH

die() {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:$1" >&2
  exit 1
}
git_attestation() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 /usr/bin/git "$@"
}
assert_regular() {
  test -f "$1" && test ! -L "$1" || die "$2"
}

script_path="$(/usr/bin/readlink -f -- "$0")" || die "MATERIALIZER_BODY_UNRESOLVED"
case "$script_path" in
  */repository/deploy/df13-first-preprod-release-materialize.body.sh) ;;
  *) die "MATERIALIZER_BODY_REPOSITORY_MISMATCH" ;;
esac
repository_dir="${script_path%/deploy/df13-first-preprod-release-materialize.body.sh}"
app_root="${repository_dir%/repository}"
test "$repository_dir" = "$app_root/repository" && test "$app_root" = "/opt/lana-chatbot" || die "MATERIALIZER_TRUST_ROOT_INVALID"

readonly release_tag="${DF13_RELEASE_TAG:?MATERIALIZER_TAG_REQUIRED}"
readonly release_commit="${DF13_RELEASE_COMMIT:?MATERIALIZER_COMMIT_REQUIRED}"
readonly release_tree="${DF13_RELEASE_TREE:?MATERIALIZER_TREE_REQUIRED}"
case "$release_tag" in *[!A-Za-z0-9._-]*|'') die "MATERIALIZER_TAG_INVALID" ;; esac
[[ "$release_commit" =~ ^[a-f0-9]{40}$ ]] || die "MATERIALIZER_COMMIT_INVALID"
[[ "$release_tree" =~ ^[a-f0-9]{40}$ ]] || die "MATERIALIZER_TREE_INVALID"

readonly releases_dir="$app_root/releases"
readonly release_dir="$releases_dir/$release_tag"
readonly materializing_dir="$releases_dir/.${release_tag}.materializing.$$"
readonly DEPLOYMENT_LOCK_FILE="$app_root/shared/lana-chatbot-deployment.lock"
test -d "$releases_dir" && test ! -L "$releases_dir" || die "RELEASES_DIRECTORY_INVALID"
test -d "$app_root/shared" && test ! -L "$app_root/shared" || die "SHARED_DIRECTORY_INVALID"
test ! -e "$DEPLOYMENT_LOCK_FILE" || test ! -L "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_SYMLINK"
exec 9>> "$DEPLOYMENT_LOCK_FILE"
flock -n 9 || die "DEPLOYMENT_LOCK_CONTENDED"

test ! -e "$release_dir" && test ! -L "$release_dir" || die "RELEASE_DIRECTORY_ALREADY_EXISTS"
test ! -e "$materializing_dir" && test ! -L "$materializing_dir" || die "MATERIALIZING_DIRECTORY_EXISTS"
cleanup_materializing() {
  if test -d "$materializing_dir" && test ! -L "$materializing_dir"; then
    /usr/bin/rm -rf -- "$materializing_dir"
  fi
}
trap cleanup_materializing EXIT
trap 'cleanup_materializing; exit 1' HUP INT TERM

# A remote tag is fetched only into its named ref. Existing divergent tags are
# rejected by Git; source is then re-attested before extraction.
git_attestation -C "$repository_dir" fetch --no-tags origin "refs/tags/$release_tag:refs/tags/$release_tag" || die "RELEASE_TAG_FETCH_FAILED"
test "$(git_attestation -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || die "RELEASE_TAG_NOT_ANNOTATED"
test "$(git_attestation -C "$repository_dir" rev-parse "${release_tag}^{commit}")" = "$release_commit" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}^{tree}")" = "$release_tree" || die "RELEASE_TAG_TREE_MISMATCH"

/usr/bin/mkdir -m 0750 -- "$materializing_dir" || die "MATERIALIZING_DIRECTORY_CREATE_FAILED"
git_attestation -C "$repository_dir" archive --format=tar "$release_commit" | /usr/bin/tar -x -f - -C "$materializing_dir" --no-same-owner --no-same-permissions || die "RELEASE_ARCHIVE_EXTRACT_FAILED"
assert_regular "$materializing_dir/deploy/runtime-state/create-release-source.sh" "RELEASE_SOURCE_AUTOMATION_MISSING"
assert_regular "$materializing_dir/deploy/runtime-state/release-source.mjs" "RELEASE_SOURCE_VALIDATOR_MISSING"
test "$(git_attestation -C "$repository_dir" hash-object -- "$materializing_dir/deploy/df13-first-preprod-release-materialize.sh")" = "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.sh")" || die "RELEASE_ENTRYPOINT_HASH_MISMATCH"
test "$(git_attestation -C "$repository_dir" hash-object -- "$materializing_dir/deploy/df13-first-preprod-release-materialize.body.sh")" = "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.body.sh")" || die "RELEASE_BODY_HASH_MISMATCH"

/usr/bin/mv -- "$materializing_dir" "$release_dir" || die "RELEASE_DIRECTORY_PROMOTION_FAILED"
trap - EXIT HUP INT TERM
RELEASE_SOURCE_DIR="$release_dir" \
RELEASE_SOURCE_TAG="$release_tag" \
RELEASE_SOURCE_COMMIT="$release_commit" \
RELEASE_SOURCE_GIT_DIR="$repository_dir" \
RELEASE_SOURCE_APP_ROOT="$app_root" \
/usr/bin/bash --noprofile --norc "$release_dir/deploy/runtime-state/create-release-source.sh" || die "RELEASE_SOURCE_CREATE_FAILED"
/usr/bin/node "$release_dir/deploy/runtime-state/release-source.mjs" validate \
  --file "$release_dir/.release-source.json" \
  --release "$release_tag" || die "RELEASE_SOURCE_VALIDATE_FAILED"

printf '%s\n' "DF13_RELEASE_MATERIALIZED:$release_tag:$release_commit:$release_tree"
