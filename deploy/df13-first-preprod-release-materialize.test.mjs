import assert from "node:assert/strict";
import { chmodSync, copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const deployDir = resolve(import.meta.dirname);
const entrypoint = resolve(deployDir, "df13-first-preprod-release-materialize.sh");
const body = resolve(deployDir, "df13-first-preprod-release-materialize.body.sh");
const releaseIntegrityGuard = resolve(deployDir, "runtime-state", "release-integrity-guard.mjs");

assert.ok(existsSync(entrypoint), "DF13 immutable release materialization entrypoint is missing");
assert.ok(existsSync(body), "DF13 immutable release materialization body is missing");

const entrypointSource = readFileSync(entrypoint, "utf8");
const bodySource = readFileSync(body, "utf8");
const guardSource = readFileSync(releaseIntegrityGuard, "utf8");
for (const [relativePath, expectedMode] of [
  ["deploy/df13-first-preprod-release-materialize.sh", "100755"],
  ["deploy/df13-first-preprod-release-materialize.body.sh", "100755"],
]) {
  const mode = spawnSync("git", ["ls-files", "--stage", "--", relativePath], {
    cwd: resolve(deployDir, ".."),
    encoding: "utf8",
  }).stdout.trim().split(/\s+/u, 1)[0];
  assert.equal(mode, expectedMode, `${relativePath} must retain its reviewed immutable-release mode`);
}

assert.match(entrypointSource, /^#!\/bin\/sh\nset -eu\n/u, "the public materialization entrypoint must avoid caller Bash startup hooks");
assert.match(entrypointSource, /exec \/usr\/bin\/env -i/u, "the public materialization entrypoint must clear caller environment state");
assert.match(entrypointSource, /\/usr\/bin\/bash --noprofile --norc/u, "the public materialization entrypoint must start the reviewed body without startup files");
assert.match(entrypointSource, /MATERIALIZER_ENTRYPOINT_HASH_MISMATCH/u, "the public materialization entrypoint must attest itself before extraction");
assert.match(entrypointSource, /copy_attested_blob "\$expected_body_blob" "\$private_body" "MATERIALIZER_BODY"/u, "the public materialization entrypoint must attest its body before extraction");
assert.match(entrypointSource, /cat-file blob/u, "the public materialization entrypoint must execute immutable Git-blob bytes, not a mutable body pathname");
assert.doesNotMatch(entrypointSource, /DF13_MATERIALIZER_RELEASE_SOURCE_BOOTSTRAP/u, "the public materialization entrypoint must not execute a separately candidate-selected source-pointer program");
assert.doesNotMatch(entrypointSource, /hash-object -- "\$body_path"/u, "hashing a mutable body pathname before reopening it leaves a hash-to-execution race");

assert.match(bodySource, /^#!\/usr\/bin\/bash\nset -euo pipefail\n/u, "the materialization body must use the reviewed Bash interpreter");
assert.match(bodySource, /fetch --no-tags origin/u, "materialization must fetch only the named immutable tag");
assert.match(bodySource, /cat-file -t "\$release_tag"/u, "materialization must require an annotated release tag");
assert.match(bodySource, /\^\{tree\}/u, "materialization must bind the exact release tree");
assert.match(bodySource, /archive --format=tar "\$release_commit"/u, "materialization must extract the exact reviewed commit");
assert.match(bodySource, /create_bootstrap_release_source_pointer\(\)/u, "materialization must create the source pointer in the attested bootstrap body");
assert.match(bodySource, /node --input-type=module/u, "source-pointer parsing and readback must run from attested inline bootstrap code");
assert.doesNotMatch(bodySource, /\$staged_release_dir\/deploy\/runtime-state\/(?:create-release-source\.sh|release-source\.mjs)/u, "materialization must not execute candidate-controlled source-pointer helpers");
assert.match(bodySource, /readonly DEPLOYMENT_LOCK_FILE=/u, "materialization must use the canonical deployment lock");
assert.match(bodySource, /test ! -L "\$DEPLOYMENT_LOCK_FILE"/u, "a dangling deployment-lock symlink must fail closed before opening it");
assert.match(bodySource, /DEPLOYMENT_LOCK_DESCRIPTOR_MISMATCH/u, "the lock descriptor must remain bound to the canonical lock file");
assert.match(bodySource, /flock -n 9/u, "concurrent materialization must fail closed");
assert.match(bodySource, /RELEASE_DIRECTORY_ALREADY_EXISTS/u, "an existing immutable release directory must fail closed");
assert.match(bodySource, /RELEASE_SOURCE_BOOTSTRAP_FAILED/u, "a missing or invalid source pointer must not be mistaken for a materialized release");
assert.match(bodySource, /\$materializing_dir\/\$release_tag/u, "the source pointer must be complete in staging before immutable release promotion");
assert.match(bodySource, /mv -T -- "\$staged_release_dir" "\$release_dir"/u, "promotion must reject a concurrently-created target instead of nesting into it");
assert.match(bodySource, /flag: "wx"/u, "the source pointer must be created exactly once");
assert.match(bodySource, /RELEASE_SOURCE_READBACK_MISMATCH/u, "the bootstrap-owned source pointer must validate a full readback");
assert.doesNotMatch(bodySource, /\bdocker(?:\s+compose)?\b|\bpsql\b|\bmigrate(?:-vps)?\b|\bcurrent\.next\b|\bln -s\b/u, "materialization must not deploy, migrate, change current, or start services");
assert.doesNotMatch(bodySource, /\beval\b/u, "materialization must not evaluate operator input");
assert.match(guardSource, /df13-first-preprod-release-materialize\.test\.mjs/u, "release-integrity must execute the materialization contract");

const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
for (const script of [entrypoint, body]) {
  const syntax = spawnSync(bash, ["-n", script], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
}

if (process.platform === "linux") {
  const scratch = mkdtempSync(join(deployDir, ".df13-materialize-"));
  const tag = "20260827-df13-materialize-test";
  let fixtureNumber = 0;
  const pause = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);

  function git(cwd, args) {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }

  function fixture({ bootstrapFails = false, danglingLock = false, existingRelease = false, tamperWorkingTreeBody = false } = {}) {
    const appRoot = join(scratch, `root-${fixtureNumber++}`);
    const repository = join(appRoot, "repository");
    const remote = join(scratch, `${tag}-${fixtureNumber}.remote.git`);
    const releases = join(appRoot, "releases");
    const shared = join(appRoot, "shared");
    const candidateHelperMarker = join(scratch, `candidate-helper-${fixtureNumber}`);
    const tamperedBodyMarker = join(scratch, `tampered-body-${fixtureNumber}`);
    mkdirSync(join(repository, "deploy", "runtime-state"), { recursive: true });
    mkdirSync(releases, { recursive: true });
    mkdirSync(shared, { recursive: true });
    const entrypointCopy = join(repository, "deploy", "df13-first-preprod-release-materialize.sh");
    const bodyCopy = join(repository, "deploy", "df13-first-preprod-release-materialize.body.sh");
    copyFileSync(entrypoint, entrypointCopy);
    copyFileSync(body, bodyCopy);
    const sourceRoot = appRoot.replaceAll("\\", "/");
    writeFileSync(entrypointCopy, readFileSync(entrypointCopy, "utf8").replaceAll("/opt/lana-chatbot", sourceRoot));
    writeFileSync(bodyCopy, readFileSync(bodyCopy, "utf8").replaceAll("/opt/lana-chatbot", sourceRoot));
    if (bootstrapFails) writeFileSync(bodyCopy, readFileSync(bodyCopy, "utf8").replace("if (JSON.stringify(readback) !== JSON.stringify(pointer)) fail(\"RELEASE_SOURCE_READBACK_MISMATCH\");", "fail(\"RELEASE_SOURCE_READBACK_MISMATCH\");"));
    writeFileSync(join(repository, "deploy", "runtime-state", "create-release-source.sh"), `#!/usr/bin/bash\ntouch ${JSON.stringify(candidateHelperMarker)}\n`);
    chmodSync(entrypointCopy, 0o755);
    chmodSync(bodyCopy, 0o755);
    chmodSync(join(repository, "deploy", "runtime-state", "create-release-source.sh"), 0o755);
    git(repository, ["init"]);
    git(repository, ["config", "user.email", "df13-test@example.invalid"]);
    git(repository, ["config", "user.name", "DF13 test"]);
    git(repository, ["add", "."]);
    git(repository, ["commit", "-m", "materializer fixture"]);
    git(repository, ["tag", "-a", tag, "-m", "immutable candidate"]);
    git(scratch, ["init", "--bare", remote]);
    git(repository, ["remote", "add", "origin", remote]);
    git(repository, ["push", "origin", "HEAD:refs/heads/main", `refs/tags/${tag}`]);
    const commit = git(repository, ["rev-parse", `${tag}^{commit}`]);
    const tree = git(repository, ["rev-parse", `${commit}^{tree}`]);
    if (tamperWorkingTreeBody) writeFileSync(bodyCopy, `#!/usr/bin/bash\ntouch ${JSON.stringify(tamperedBodyMarker)}\nexit 88\n`);
    const release = join(releases, tag);
    if (existingRelease) {
      mkdirSync(release, { recursive: true });
      writeFileSync(join(release, "must-remain"), "immutable\n");
    }
    const lock = join(shared, "lana-chatbot-deployment.lock");
    if (danglingLock) symlinkSync(join(scratch, "missing-lock-target"), lock);
    return { appRoot, repository, releases, shared, release, lock, commit, tree, candidateHelperMarker, tamperedBodyMarker };
  }

  function run(fixtureState) {
    return spawnSync(join(fixtureState.repository, "deploy", "df13-first-preprod-release-materialize.sh"), [], {
      encoding: "utf8",
      env: { ...process.env, DF13_RELEASE_TAG: tag, DF13_RELEASE_COMMIT: fixtureState.commit, DF13_RELEASE_TREE: fixtureState.tree },
    });
  }

  try {
    const successful = fixture({ tamperWorkingTreeBody: true });
    const success = run(successful);
    assert.equal(success.status, 0, success.stderr);
    assert.match(success.stdout, /DF13_RELEASE_MATERIALIZED/u, "the exact tagged candidate must materialize once");
    const sourcePointer = JSON.parse(readFileSync(join(successful.release, ".release-source.json"), "utf8"));
    assert.equal(sourcePointer.release, tag, "the staged source pointer must become the promoted release identity");
    assert.equal(sourcePointer.commit, successful.commit, "the staged source pointer must bind the tagged commit");
    assert.ok(!existsSync(successful.candidateHelperMarker), "candidate-controlled create-release-source automation must never execute");
    assert.ok(!existsSync(successful.tamperedBodyMarker), "a mutable working-tree body must never execute after its tag has been attested");
    assert.ok(readdirSync(successful.releases).every((name) => !name.includes(".materializing.")), "a successful promotion must leave no incomplete staging directory");
    const sourcePointerBytes = readFileSync(join(successful.release, ".release-source.json"), "utf8");
    const repeated = run(successful);
    assert.notEqual(repeated.status, 0, "an immutable release directory must not be overwritten on retry");
    assert.match(repeated.stderr, /RELEASE_DIRECTORY_ALREADY_EXISTS/u);
    assert.equal(readFileSync(join(successful.release, ".release-source.json"), "utf8"), sourcePointerBytes, "a rejected retry must preserve the exact first source pointer");

    const failedBootstrap = fixture({ bootstrapFails: true });
    const bootstrapResult = run(failedBootstrap);
    assert.notEqual(bootstrapResult.status, 0, "a failed staged source-pointer readback must fail closed");
    assert.match(bootstrapResult.stderr, /RELEASE_SOURCE_BOOTSTRAP_FAILED/u);
    assert.ok(!existsSync(failedBootstrap.release), "a failed staged source-pointer operation must never publish a final release directory");
    assert.ok(readdirSync(failedBootstrap.releases).every((name) => !name.includes(".materializing.")), "a failed staged source-pointer operation must clean its incomplete staging directory");

    const dangling = fixture({ danglingLock: true });
    const danglingResult = run(dangling);
    assert.notEqual(danglingResult.status, 0, "a dangling deployment-lock symlink must fail closed");
    assert.match(danglingResult.stderr, /DEPLOYMENT_LOCK_SYMLINK/u);
    assert.ok(!existsSync(dangling.release), "a dangling deployment-lock symlink must prevent any release publication");

    const existing = fixture({ existingRelease: true });
    const existingResult = run(existing);
    assert.notEqual(existingResult.status, 0, "an existing immutable release must fail closed");
    assert.match(existingResult.stderr, /RELEASE_DIRECTORY_ALREADY_EXISTS/u);
    assert.equal(readFileSync(join(existing.release, "must-remain"), "utf8"), "immutable\n", "an existing immutable release must remain unchanged");

    const contended = fixture();
    const ready = join(scratch, "lock-holder-ready");
    const holder = spawn("bash", ["-c", "exec 9>>\"$1\"; flock -n 9; touch \"$2\"; sleep 10", "bash", contended.lock, ready], { stdio: "ignore" });
    for (let attempts = 0; attempts < 100 && !existsSync(ready); attempts += 1) pause(10);
    assert.ok(existsSync(ready), "the contention fixture must acquire the canonical deployment lock");
    const contendedResult = run(contended);
    holder.kill("SIGTERM");
    assert.notEqual(contendedResult.status, 0, "a held canonical deployment lock must reject concurrent materialization");
    assert.match(contendedResult.stderr, /RELEASE_MATERIALIZATION_LOCK_UNAVAILABLE/u);
    assert.ok(!existsSync(contended.release), "a contended materialization must not publish a release directory");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

console.log("DF13 immutable release materialization contract: PASS");
