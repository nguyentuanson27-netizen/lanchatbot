import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const deployDir = resolve(import.meta.dirname);
const entrypoint = resolve(deployDir, "df13-first-preprod-release-materialize.sh");
const body = resolve(deployDir, "df13-first-preprod-release-materialize.body.sh");
const releaseIntegrityGuard = resolve(deployDir, "runtime-state", "release-integrity-guard.mjs");

assert.ok(existsSync(entrypoint), "DF13 immutable release materialization entrypoint is missing");
assert.ok(existsSync(body), "DF13 immutable release materialization body is missing");

const entrypointSource = readFileSync(entrypoint, "utf8");
const bodySource = readFileSync(body, "utf8");
const guardSource = readFileSync(releaseIntegrityGuard, "utf8");
for (const relativePath of [
  "deploy/df13-first-preprod-release-materialize.sh",
  "deploy/df13-first-preprod-release-materialize.body.sh",
]) {
  const mode = spawnSync("git", ["ls-files", "--stage", "--", relativePath], {
    cwd: resolve(deployDir, ".."),
    encoding: "utf8",
  }).stdout.trim().split(/\s+/u, 1)[0];
  assert.equal(mode, "100755", `${relativePath} must be executable in an immutable release`);
}

assert.match(entrypointSource, /^#!\/bin\/sh\nset -eu\n/u, "the public materialization entrypoint must avoid caller Bash startup hooks");
assert.match(entrypointSource, /exec \/usr\/bin\/env -i/u, "the public materialization entrypoint must clear caller environment state");
assert.match(entrypointSource, /\/usr\/bin\/bash --noprofile --norc/u, "the public materialization entrypoint must start the reviewed body without startup files");
assert.match(entrypointSource, /MATERIALIZER_ENTRYPOINT_HASH_MISMATCH/u, "the public materialization entrypoint must attest itself before extraction");
assert.match(entrypointSource, /MATERIALIZER_BODY_HASH_MISMATCH/u, "the public materialization entrypoint must attest its body before extraction");

assert.match(bodySource, /^#!\/usr\/bin\/bash\nset -euo pipefail\n/u, "the materialization body must use the reviewed Bash interpreter");
assert.match(bodySource, /fetch --no-tags origin/u, "materialization must fetch only the named immutable tag");
assert.match(bodySource, /cat-file -t "\$release_tag"/u, "materialization must require an annotated release tag");
assert.match(bodySource, /\^\{tree\}/u, "materialization must bind the exact release tree");
assert.match(bodySource, /archive --format=tar "\$release_commit"/u, "materialization must extract the exact reviewed commit");
assert.match(bodySource, /create-release-source\.sh/u, "materialization must create the release source pointer exactly once");
assert.match(bodySource, /readonly DEPLOYMENT_LOCK_FILE=/u, "materialization must use the canonical deployment lock");
assert.match(bodySource, /flock -n 9/u, "concurrent materialization must fail closed");
assert.match(bodySource, /RELEASE_DIRECTORY_ALREADY_EXISTS/u, "an existing immutable release directory must fail closed");
assert.match(bodySource, /RELEASE_SOURCE_CREATE_FAILED/u, "a missing source pointer must not be mistaken for a materialized release");
assert.doesNotMatch(bodySource, /\bdocker(?:\s+compose)?\b|\bpsql\b|\bmigrate(?:-vps)?\b|\bcurrent\.next\b|\bln -s\b/u, "materialization must not deploy, migrate, change current, or start services");
assert.doesNotMatch(bodySource, /\beval\b/u, "materialization must not evaluate operator input");
assert.match(guardSource, /df13-first-preprod-release-materialize\.test\.mjs/u, "release-integrity must execute the materialization contract");

const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
for (const script of [entrypoint, body]) {
  const syntax = spawnSync(bash, ["-n", script], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
}

console.log("DF13 immutable release materialization contract: PASS");
