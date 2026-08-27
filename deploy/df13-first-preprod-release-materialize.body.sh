#!/usr/bin/bash
set -euo pipefail
set -E

trap - DEBUG RETURN ERR EXIT
unset BASH_ENV ENV CDPATH
unalias -a 2>/dev/null || :
unset -f git readlink flock tar mkdir mv rmdir rm dirname basename env stat id node chmod 2>/dev/null || :

readonly TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
PATH="$TRUSTED_PATH"
export PATH
readonly PATH

die() {
  printf '%s\n' "DF13_RELEASE_MATERIALIZATION_BLOCKED:$1" >&2
  exit 1
}
require_command() {
  command -v "$1" >/dev/null 2>&1 || die "COMMAND_MISSING:$1"
}
readonly DEPLOY_GIT_USER="lana-deploy"
readonly DEPLOY_GIT_HOME="/home/lana-deploy"
readonly DEPLOY_GIT_SSH_DIRECTORY="/home/lana-deploy/.ssh"
readonly DEPLOY_GIT_PRIVATE_KEY="/home/lana-deploy/.ssh/lana_chatbot_github_ed25519"
readonly DEPLOY_GIT_KNOWN_HOSTS="/home/lana-deploy/.ssh/known_hosts"
readonly DEPLOY_GIT_SSH_COMMAND="/usr/bin/ssh -F /dev/null -i $DEPLOY_GIT_PRIVATE_KEY -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$DEPLOY_GIT_KNOWN_HOSTS"
assert_deploy_git_identity() {
  local deploy_uid=""
  local deploy_directory=""
  local deploy_file=""
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
assert_private_regular_file() {
  local candidate="$1"
  local failure_code="$2"
  local owner=""
  local mode=""
  test -f "$candidate" && test ! -L "$candidate" || die "$failure_code"
  owner="$(stat -c '%u' -- "$candidate")" || die "$failure_code"
  mode="$(stat -c '%a' -- "$candidate")" || die "$failure_code"
  test "$owner" = "$(id -u)" || die "$failure_code"
  [[ "$mode" =~ ^[0-7]{3,4}$ ]] || die "$failure_code"
  (( (8#$mode & 8#77) == 0 )) || die "$failure_code"
}
assert_path_in_parent() {
  local candidate="$1"
  local expected_parent="$2"
  local expected_prefix="$3"
  local failure_code="$4"
  local resolved=""
  local parent=""
  local name=""
  resolved="$(readlink -f -- "$candidate")" || die "$failure_code"
  parent="$(dirname "$resolved")"
  name="$(basename "$resolved")"
  test "$parent" = "$expected_parent" || die "$failure_code"
  [[ "$name" = "$expected_prefix"* ]] || die "$failure_code"
  printf '%s\n' "$resolved"
}

for command_name in git readlink flock tar mkdir mv rmdir rm dirname basename env stat id node chmod; do
  require_command "$command_name"
done

readonly release_tag="${DF13_RELEASE_TAG:?MATERIALIZER_TAG_REQUIRED}"
readonly release_commit="${DF13_RELEASE_COMMIT:?MATERIALIZER_COMMIT_REQUIRED}"
readonly release_tree="${DF13_RELEASE_TREE:?MATERIALIZER_TREE_REQUIRED}"
readonly app_root_input="${DF13_MATERIALIZER_APP_ROOT:?MATERIALIZER_APP_ROOT_REQUIRED}"
readonly repository_dir_input="${DF13_MATERIALIZER_REPOSITORY_DIR:?MATERIALIZER_REPOSITORY_REQUIRED}"
readonly private_dir_input="${DF13_MATERIALIZER_PRIVATE_DIR:?MATERIALIZER_PRIVATE_DIRECTORY_REQUIRED}"
case "$release_tag" in *[!A-Za-z0-9._-]*|'') die "MATERIALIZER_TAG_INVALID" ;; esac
[[ "$release_commit" =~ ^[a-f0-9]{40}$ ]] || die "MATERIALIZER_COMMIT_INVALID"
[[ "$release_tree" =~ ^[a-f0-9]{40}$ ]] || die "MATERIALIZER_TREE_INVALID"

app_root="$(readlink -f -- "$app_root_input")" || die "MATERIALIZER_APP_ROOT_UNRESOLVED"
repository_dir="$(readlink -f -- "$repository_dir_input")" || die "MATERIALIZER_REPOSITORY_UNRESOLVED"
test "$app_root" = "/opt/lana-chatbot" || die "MATERIALIZER_TRUST_ROOT_INVALID"
test "$repository_dir" = "$app_root/repository" && test -d "$repository_dir" && test ! -L "$repository_dir" || die "MATERIALIZER_REPOSITORY_INVALID"
readonly app_root repository_dir

readonly releases_dir="$app_root/releases"
readonly release_dir="$releases_dir/$release_tag"
readonly materializing_dir="$releases_dir/.${release_tag}.materializing.$$"
readonly staged_release_dir="$materializing_dir/$release_tag"
readonly shared_dir="$app_root/shared"
readonly DEPLOYMENT_LOCK_FILE="$shared_dir/lana-chatbot-deployment.lock"
test -d "$releases_dir" && test ! -L "$releases_dir" || die "RELEASES_DIRECTORY_INVALID"
test -d "$shared_dir" && test ! -L "$shared_dir" || die "SHARED_DIRECTORY_INVALID"

private_dir="$(assert_path_in_parent "$private_dir_input" "$shared_dir" ".df13-materializer." "MATERIALIZER_PRIVATE_DIRECTORY_OUTSIDE_SHARED_ROOT")"
test -d "$private_dir" && test ! -L "$private_dir" || die "MATERIALIZER_PRIVATE_DIRECTORY_INVALID"
private_body_path="$(readlink -f -- "$0")" || die "MATERIALIZER_PRIVATE_BODY_UNRESOLVED"
test "$private_body_path" = "$private_dir/materialize.body.sh" || die "MATERIALIZER_PRIVATE_BODY_OUTSIDE_PRIVATE_ROOT"
assert_private_regular_file "$private_body_path" "MATERIALIZER_PRIVATE_BODY_INVALID"
readonly private_dir private_body_path

acquire_deployment_lock() {
  local lock_directory="$shared_dir"
  local resolved_lock=""
  local expected_lock_identity=""
  local descriptor_lock_identity=""
  test ! -L "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_SYMLINK"
  if test ! -e "$DEPLOYMENT_LOCK_FILE"; then
    (umask 077; set -C; : > "$DEPLOYMENT_LOCK_FILE") 2>/dev/null || :
  fi
  test ! -L "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_SYMLINK"
  test -f "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_NOT_REGULAR"
  resolved_lock="$(readlink -f "$DEPLOYMENT_LOCK_FILE")" || die "DEPLOYMENT_LOCK_UNRESOLVED"
  test "$(dirname "$resolved_lock")" = "$lock_directory" || die "DEPLOYMENT_LOCK_OUTSIDE_SHARED_ROOT"
  test "$(basename "$resolved_lock")" = "$(basename "$DEPLOYMENT_LOCK_FILE")" || die "DEPLOYMENT_LOCK_OUTSIDE_SHARED_ROOT"
  expected_lock_identity="$(lock_identity "$DEPLOYMENT_LOCK_FILE")"
  if test -e "/proc/$$/fd/9" && test "$(readlink -f "/proc/$$/fd/9")" = "$resolved_lock"; then
    descriptor_lock_identity="$(lock_identity "/proc/$$/fd/9")"
    test "$descriptor_lock_identity" = "$expected_lock_identity" || die "DEPLOYMENT_LOCK_IDENTITY_MISMATCH"
    flock -n 9 || die "INHERITED_DEPLOYMENT_LOCK_NOT_HELD"
    readonly deployment_lock_identity="$descriptor_lock_identity"
    return
  fi
  exec 9>> "$DEPLOYMENT_LOCK_FILE"
  test "$(readlink -f "/proc/$$/fd/9")" = "$resolved_lock" || die "DEPLOYMENT_LOCK_DESCRIPTOR_MISMATCH"
  descriptor_lock_identity="$(lock_identity "/proc/$$/fd/9")"
  test "$descriptor_lock_identity" = "$expected_lock_identity" || die "DEPLOYMENT_LOCK_IDENTITY_MISMATCH"
  flock -n 9 || die "RELEASE_MATERIALIZATION_LOCK_UNAVAILABLE"
  readonly deployment_lock_identity="$descriptor_lock_identity"
}

lock_identity() {
  local identity=""
  identity="$(stat -Lc '%d:%i' -- "$1")" || die "DEPLOYMENT_LOCK_IDENTITY_UNAVAILABLE"
  [[ "$identity" =~ ^[0-9]+:[0-9]+$ ]] || die "DEPLOYMENT_LOCK_IDENTITY_INVALID"
  printf '%s\n' "$identity"
}

verify_deployment_lock() {
  test ! -L "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_SYMLINK"
  test "$(lock_identity "$DEPLOYMENT_LOCK_FILE")" = "$deployment_lock_identity" || die "DEPLOYMENT_LOCK_IDENTITY_MISMATCH"
  test "$(lock_identity "/proc/$$/fd/9")" = "$deployment_lock_identity" || die "DEPLOYMENT_LOCK_IDENTITY_MISMATCH"
  flock -n 9 || die "RELEASE_MATERIALIZATION_LOCK_UNAVAILABLE"
}

# This inline program is part of the private, blob-attested bootstrap body.
# It deliberately does not execute any program from the candidate directory.
create_bootstrap_release_source_pointer() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 \
  RELEASE_SOURCE_FILE="$staged_release_dir/.release-source.json" \
  RELEASE_SOURCE_TAG="$release_tag" \
  RELEASE_SOURCE_COMMIT="$release_commit" \
  RELEASE_SOURCE_OBSERVED_COMMIT="$release_source_observed_commit" \
  node --input-type=module <<'NODE'
import { lstatSync, readFileSync, writeFileSync } from "node:fs";

const repository = "https://github.com/nguyentuanson27-netizen/lanchatbot";
const commitPattern = /^[a-f0-9]{40}$/u;
const tagPattern = /^[A-Za-z0-9._-]+$/u;
const utcPattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u;
const keys = ["schemaVersion", "release", "repository", "tag", "commit", "createdAt"];
const fail = (code) => { throw new Error(code); };
const sourceFile = process.env.RELEASE_SOURCE_FILE;
const tag = process.env.RELEASE_SOURCE_TAG;
const commit = process.env.RELEASE_SOURCE_COMMIT;
const observedCommit = process.env.RELEASE_SOURCE_OBSERVED_COMMIT;
try {
  if (!sourceFile || !tagPattern.test(tag ?? "") || !commitPattern.test(commit ?? "") || observedCommit !== commit) fail("RELEASE_SOURCE_ARGUMENT_INVALID");
  try {
    lstatSync(sourceFile);
    fail("RELEASE_SOURCE_ALREADY_EXISTS");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const pointer = { schemaVersion: 1, release: tag, repository, tag, commit, createdAt: new Date().toISOString() };
  if (Object.keys(pointer).length !== keys.length || keys.some((key) => !Object.hasOwn(pointer, key)) || !utcPattern.test(pointer.createdAt) || !Number.isFinite(Date.parse(pointer.createdAt))) fail("RELEASE_SOURCE_INVALID");
  writeFileSync(sourceFile, `${JSON.stringify(pointer, null, 2)}\n`, { encoding: "utf8", mode: 0o640, flag: "wx" });
  const stat = lstatSync(sourceFile);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("RELEASE_SOURCE_READBACK_FILE_INVALID");
  const readback = JSON.parse(readFileSync(sourceFile, "utf8"));
  if (!readback || typeof readback !== "object" || Array.isArray(readback) || Object.keys(readback).some((key) => !keys.includes(key)) || readback.schemaVersion !== 1 || readback.release !== tag || readback.repository !== repository || readback.tag !== tag || readback.commit !== commit || !utcPattern.test(readback.createdAt) || !Number.isFinite(Date.parse(readback.createdAt))) fail("RELEASE_SOURCE_READBACK_INVALID");
  if (JSON.stringify(readback) !== JSON.stringify(pointer)) fail("RELEASE_SOURCE_READBACK_MISMATCH");
} catch (error) {
  process.stderr.write(`DF13_RELEASE_MATERIALIZATION_BLOCKED:${error instanceof Error ? error.message : "RELEASE_SOURCE_BOOTSTRAP_UNKNOWN"}\n`);
  process.exitCode = 1;
}
NODE
}

cleanup_materializing() {
  if test -d "$materializing_dir" && test ! -L "$materializing_dir"; then
    rm -rf -- "$materializing_dir"
  fi
}
cleanup_private() {
  if test -d "$private_dir" && test ! -L "$private_dir"; then
    rm -rf -- "$private_dir"
  fi
}
cleanup_all() {
  cleanup_materializing
  cleanup_private
}
trap cleanup_all EXIT
trap 'cleanup_all; exit 1' HUP INT TERM

acquire_deployment_lock
verify_deployment_lock
test ! -e "$release_dir" && test ! -L "$release_dir" || die "RELEASE_DIRECTORY_ALREADY_EXISTS"
test ! -e "$materializing_dir" && test ! -L "$materializing_dir" || die "MATERIALIZING_DIRECTORY_EXISTS"

# A remote tag is fetched only into its named ref. Existing divergent tags are
# rejected by Git; source is then re-attested before extraction.
git_as_deploy -C "$repository_dir" fetch --no-tags origin "refs/tags/$release_tag:refs/tags/$release_tag" || die "RELEASE_TAG_FETCH_FAILED"
test "$(git_as_deploy -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || die "RELEASE_TAG_NOT_ANNOTATED"
release_source_observed_commit="$(git_as_deploy -C "$repository_dir" rev-parse "${release_tag}^{commit}")" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$release_source_observed_commit" = "$release_commit" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}^{tree}")" = "$release_tree" || die "RELEASE_TAG_TREE_MISMATCH"
readonly release_source_observed_commit

mkdir -m 0750 -- "$materializing_dir" || die "MATERIALIZING_DIRECTORY_CREATE_FAILED"
mkdir -m 0750 -- "$staged_release_dir" || die "STAGED_RELEASE_DIRECTORY_CREATE_FAILED"
git_as_deploy -C "$repository_dir" archive --format=tar "$release_commit" | tar -x -f - -C "$staged_release_dir" --no-same-owner --no-same-permissions || die "RELEASE_ARCHIVE_EXTRACT_FAILED"
test "$(hash_private_file "$staged_release_dir/deploy/df13-first-preprod-release-materialize.sh")" = "$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.sh")" || die "RELEASE_ENTRYPOINT_HASH_MISMATCH"
test "$(hash_private_file "$staged_release_dir/deploy/df13-first-preprod-release-materialize.body.sh")" = "$(git_as_deploy -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.body.sh")" || die "RELEASE_BODY_HASH_MISMATCH"

create_bootstrap_release_source_pointer >/dev/null || die "RELEASE_SOURCE_BOOTSTRAP_FAILED"
test -f "$staged_release_dir/.release-source.json" && test ! -L "$staged_release_dir/.release-source.json" || die "RELEASE_SOURCE_POINTER_MISSING"

verify_deployment_lock
mv -nT -- "$staged_release_dir" "$release_dir" || die "RELEASE_DIRECTORY_PROMOTION_FAILED"
test ! -e "$staged_release_dir" && test ! -L "$staged_release_dir" || die "RELEASE_DIRECTORY_PROMOTION_TARGET_EXISTS"
rmdir -- "$materializing_dir" || die "MATERIALIZING_DIRECTORY_CLEANUP_FAILED"
trap - HUP INT TERM
cleanup_private
trap - EXIT

printf '%s\n' "DF13_RELEASE_MATERIALIZED:$release_tag:$release_commit:$release_tree"
