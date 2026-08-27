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
git_attestation() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 /usr/bin/git "$@"
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
  test ! -L "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_SYMLINK"
  if test -e "$DEPLOYMENT_LOCK_FILE"; then
    test -f "$DEPLOYMENT_LOCK_FILE" || die "DEPLOYMENT_LOCK_NOT_REGULAR"
  fi
  resolved_lock="$(readlink -f "$DEPLOYMENT_LOCK_FILE")" || die "DEPLOYMENT_LOCK_UNRESOLVED"
  test "$(dirname "$resolved_lock")" = "$lock_directory" || die "DEPLOYMENT_LOCK_OUTSIDE_SHARED_ROOT"
  test "$(basename "$resolved_lock")" = "$(basename "$DEPLOYMENT_LOCK_FILE")" || die "DEPLOYMENT_LOCK_OUTSIDE_SHARED_ROOT"
  if test -e "/proc/$$/fd/9" && test "$(readlink -f "/proc/$$/fd/9")" = "$resolved_lock"; then
    flock -n 9 || die "INHERITED_DEPLOYMENT_LOCK_NOT_HELD"
    return
  fi
  exec 9>> "$DEPLOYMENT_LOCK_FILE"
  test "$(readlink -f "/proc/$$/fd/9")" = "$resolved_lock" || die "DEPLOYMENT_LOCK_DESCRIPTOR_MISMATCH"
  flock -n 9 || die "RELEASE_MATERIALIZATION_LOCK_UNAVAILABLE"
}

# This inline program is part of the private, blob-attested bootstrap body.
# It deliberately does not execute any program from the candidate directory.
create_bootstrap_release_source_pointer() {
  /usr/bin/env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 \
  RELEASE_SOURCE_FILE="$staged_release_dir/.release-source.json" \
  RELEASE_SOURCE_TAG="$release_tag" \
  RELEASE_SOURCE_COMMIT="$release_commit" \
  RELEASE_SOURCE_GIT_DIR="$repository_dir" \
  node --input-type=module <<'NODE'
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const repository = "https://github.com/nguyentuanson27-netizen/lanchatbot";
const commitPattern = /^[a-f0-9]{40}$/u;
const tagPattern = /^[A-Za-z0-9._-]+$/u;
const utcPattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/u;
const keys = ["schemaVersion", "release", "repository", "tag", "commit", "createdAt"];
const fail = (code) => { throw new Error(code); };
const sourceFile = process.env.RELEASE_SOURCE_FILE;
const tag = process.env.RELEASE_SOURCE_TAG;
const commit = process.env.RELEASE_SOURCE_COMMIT;
const gitDir = process.env.RELEASE_SOURCE_GIT_DIR;
try {
  if (!sourceFile || !tagPattern.test(tag ?? "") || !commitPattern.test(commit ?? "") || !gitDir) fail("RELEASE_SOURCE_ARGUMENT_INVALID");
  try {
    lstatSync(sourceFile);
    fail("RELEASE_SOURCE_ALREADY_EXISTS");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const observedCommit = execFileSync("/usr/bin/git", ["-C", gitDir, "rev-parse", `${tag}^{commit}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (observedCommit !== commit) fail("RELEASE_SOURCE_GIT_READBACK_MISMATCH");
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
test ! -e "$release_dir" && test ! -L "$release_dir" || die "RELEASE_DIRECTORY_ALREADY_EXISTS"
test ! -e "$materializing_dir" && test ! -L "$materializing_dir" || die "MATERIALIZING_DIRECTORY_EXISTS"

# A remote tag is fetched only into its named ref. Existing divergent tags are
# rejected by Git; source is then re-attested before extraction.
git_attestation -C "$repository_dir" fetch --no-tags origin "refs/tags/$release_tag:refs/tags/$release_tag" || die "RELEASE_TAG_FETCH_FAILED"
test "$(git_attestation -C "$repository_dir" cat-file -t "$release_tag")" = "tag" || die "RELEASE_TAG_NOT_ANNOTATED"
test "$(git_attestation -C "$repository_dir" rev-parse "${release_tag}^{commit}")" = "$release_commit" || die "RELEASE_TAG_COMMIT_MISMATCH"
test "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}^{tree}")" = "$release_tree" || die "RELEASE_TAG_TREE_MISMATCH"

mkdir -m 0750 -- "$materializing_dir" || die "MATERIALIZING_DIRECTORY_CREATE_FAILED"
mkdir -m 0750 -- "$staged_release_dir" || die "STAGED_RELEASE_DIRECTORY_CREATE_FAILED"
git_attestation -C "$repository_dir" archive --format=tar "$release_commit" | tar -x -f - -C "$staged_release_dir" --no-same-owner --no-same-permissions || die "RELEASE_ARCHIVE_EXTRACT_FAILED"
test "$(git_attestation -C "$repository_dir" hash-object -- "$staged_release_dir/deploy/df13-first-preprod-release-materialize.sh")" = "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.sh")" || die "RELEASE_ENTRYPOINT_HASH_MISMATCH"
test "$(git_attestation -C "$repository_dir" hash-object -- "$staged_release_dir/deploy/df13-first-preprod-release-materialize.body.sh")" = "$(git_attestation -C "$repository_dir" rev-parse "${release_commit}:deploy/df13-first-preprod-release-materialize.body.sh")" || die "RELEASE_BODY_HASH_MISMATCH"

create_bootstrap_release_source_pointer >/dev/null || die "RELEASE_SOURCE_BOOTSTRAP_FAILED"
test -f "$staged_release_dir/.release-source.json" && test ! -L "$staged_release_dir/.release-source.json" || die "RELEASE_SOURCE_POINTER_MISSING"

mv -T -- "$staged_release_dir" "$release_dir" || die "RELEASE_DIRECTORY_PROMOTION_FAILED"
rmdir -- "$materializing_dir" || die "MATERIALIZING_DIRECTORY_CLEANUP_FAILED"
trap - HUP INT TERM
cleanup_private
trap - EXIT

printf '%s\n' "DF13_RELEASE_MATERIALIZED:$release_tag:$release_commit:$release_tree"
