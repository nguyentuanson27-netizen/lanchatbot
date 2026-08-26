import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const deployDir = resolve(import.meta.dirname);
const script = resolve(deployDir, "df13-first-preprod-release-reconcile.sh");
const releaseIntegrityGuard = resolve(deployDir, "runtime-state", "release-integrity-guard.mjs");
const captureCurrent = resolve(deployDir, "runtime-state", "capture-current.sh");
const runtimeStateProgram = resolve(deployDir, "runtime-state", "runtime-state.mjs");

assert.ok(existsSync(script), "DF13 fresh-process release reconciliation automation is missing");
const source = readFileSync(script, "utf8");
assert.match(source, /^#!\/usr\/bin\/env bash\nset -euo pipefail\nset -E\n/u);
assert.doesNotMatch(source, /\beval\b/u, "reconciliation automation must not evaluate caller input");
for (const required of ["DF13_RELEASE_DIR", "DF13_RELEASE_TAG", "DF13_RELEASE_COMMIT", "DF13_RELEASE_TREE", "DF13_PREVIOUS_RELEASE_DIR", ".release-source.json", "RELEASE_SOURCE_COMMIT_MISMATCH", "current.next", "runtime-state/capture-current.sh", "runtime-state/verify-current.sh", "runtime-state/promote-current.sh"]) {
  assert.match(source, new RegExp(required.replaceAll(".", "\\."), "u"), `missing reconciliation binding: ${required}`);
}
assert.match(source, /cat-file.*\$\{DF13_RELEASE_TAG\}/u, "annotated tag validation is required");
assert.match(source, /\^\{tree\}/u, "exact release tree validation is required");
assert.match(source, /com\.docker\.compose\.project\.config_files/u, "running worker must be bound to the immutable release compose file");
assert.match(source, /org\.opencontainers\.image\.revision/u, "running worker revision must be checked");
assert.match(source, /\.State\.Running/u, "the reconciled realtime worker must be running");
assert.match(source, /setsid "\$@"/u, "runtime-state helpers must have an independently terminable process group");
assert.match(source, /ln -s /u, "current promotion must create a temporary symlink");
assert.match(source, /mv -Tf /u, "current promotion must be atomic");
assert.match(source, /readonly DEPLOYMENT_LOCK_FILE=/u, "the global deployment lock must be canonical");
assert.match(source, /\/proc\/\$\$\/fd\/9/u, "an inherited global deployment lock must be verified, not replaced");
assert.match(source, /flock -n 9/u, "concurrent release reconciliation must fail closed");
assert.doesNotMatch(source, /df13-release-reconcile\.lock/u, "a separate reconciliation lock would not serialize deployment automation");
assert.match(source, /trap 'abort_reconciliation 130' INT/u, "an interrupt must restore the prior current pointer and terminate");
assert.match(source, /trap 'abort_reconciliation 143' TERM/u, "a termination signal must restore the prior current pointer and terminate");
assert.match(source, /trap 'abort_reconciliation 129' HUP/u, "a hangup must restore the prior current pointer and terminate");
assert.doesNotMatch(source, /docker compose|psql|sales_authority_mode|COMMERCE/u, "reconciliation must not deploy, alter authority, or expose a direct database operator");
assert.match(readFileSync(captureCurrent, "utf8"), /runtime-state\.mjs" capture/u, "runtime-state must be captured through the reviewed helper");
const runtimeStateSource = readFileSync(runtimeStateProgram, "utf8");
const databaseCaptureStart = runtimeStateSource.indexOf("function captureLiveDatabase");
const databaseCaptureEnd = runtimeStateSource.indexOf("export function postgresQueryInvocation", databaseCaptureStart);
assert.notEqual(databaseCaptureStart, -1, "runtime-state database capture is missing");
const databaseCapture = runtimeStateSource.slice(databaseCaptureStart, databaseCaptureEnd);
assert.match(databaseCapture, /SELECT migration_name/u, "reconciliation must capture the reviewed migration ledger read-only");
assert.match(databaseCapture, /SELECT page_id/u, "reconciliation must capture the reviewed routing read-only");
assert.doesNotMatch(databaseCapture, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/u, "reconciliation must not delegate database mutation");
assert.match(readFileSync(releaseIntegrityGuard, "utf8"), /df13-first-preprod-release-reconcile\.test\.mjs/u, "the canonical release-integrity gate must execute this reconciliation contract");

const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const syntax = spawnSync(bash, ["-n", script], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr);

const commit = "a".repeat(40);
const tree = "b".repeat(40);
const imageId = `sha256:${"c".repeat(64)}`;
const tag = "20260826-df13-reconcile-test";
const image = "lana-chatbot-app:20260826-df13-reconcile-test";
const runsPosixHarness = process.platform !== "win32";
const scratch = runsPosixHarness ? mkdtempSync(join(deployDir, ".df13-release-reconcile-")) : null;
let harnessId = 0;
const toBashPath = (value) => value.replaceAll("\\", "/").replace(/^([A-Za-z]):/u, (_, drive) => `/${drive.toLowerCase()}`);
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function canonicalBashPath(value) {
  const result = spawnSync(bash, ["-c", `readlink -f ${quote(toBashPath(value))}`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function writeHarness({ captureFails = false, captureWaits = false, running = true, sourceCommit = commit } = {}) {
  const id = `scenario-${harnessId++}`;
  const appRoot = join(scratch, `${id}-root`);
  const release = join(appRoot, "releases", tag);
  const previous = join(appRoot, "releases", "known-good-legacy");
  const repo = join(scratch, `${id}-repo`);
  const bin = join(scratch, `${id}-bin`);
  const evidence = join(scratch, `${id}-evidence.json`);
  const log = join(scratch, `${id}.log`);
  const captureStarted = join(scratch, `${id}.capture-started`);
  mkdirSync(join(release, "deploy", "runtime-state"), { recursive: true });
  mkdirSync(join(appRoot, "runtime-state", "candidates"), { recursive: true });
  mkdirSync(join(appRoot, "shared"), { recursive: true });
  mkdirSync(previous, { recursive: true });
  mkdirSync(repo, { recursive: true });
  mkdirSync(bin, { recursive: true });
  symlinkSync(previous, join(appRoot, "current"));
  writeFileSync(join(release, ".release-source.json"), JSON.stringify({ schemaVersion: 1, release: tag, repository: "https://github.com/nguyentuanson27-netizen/lanchatbot", tag, commit: sourceCommit, createdAt: "2026-08-26T00:00:00Z" }));
  writeFileSync(join(release, "deploy", "docker-compose.vps.yml"), "services: {}\n");
  for (const name of ["capture-current.sh", "verify-current.sh", "promote-current.sh"]) {
    const capture = name === "capture-current.sh";
    const action = capture && captureFails ? "exit 1" : capture ? "mkdir -p \"$RUNTIME_STATE_ROOT/candidates\"; printf '{}' > \"$RUNTIME_STATE_ROOT/candidates/$RUNTIME_STATE_CANDIDATE_ID.json\"" : "";
    const wait = capture && captureWaits ? "touch \"$DF13_TEST_CAPTURE_STARTED\"; while :; do sleep 1; done" : "";
    const path = join(release, "deploy", "runtime-state", name);
    writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' '${name}' >> "$DF13_TEST_LOG"\n${wait}\n${action}\n`);
    chmodSync(path, 0o700);
  }
  writeFileSync(evidence, "{}\n");
  writeFileSync(join(bin, "git"), `#!/usr/bin/env bash\ncase "$*" in\n  *"cat-file -t"*) printf '%s\\n' tag ;;\n  *"^{commit}"*) printf '%s\\n' '${commit}' ;;\n  *"rev-parse"*) printf '%s\\n' '${tree}' ;;\n  *) exit 2 ;;\nesac\n`);
  writeFileSync(join(bin, "node"), "#!/usr/bin/env bash\nprintf '%s\\n' node >> \"$DF13_TEST_LOG\"\nif [ \"$1\" = \"--input-type=module\" ]; then grep -F \"\\\"commit\\\":\\\"$DF13_RELEASE_EXPECTED_COMMIT\\\"\" \"$DF13_RELEASE_SOURCE_FILE\" >/dev/null; fi\n");
  writeFileSync(join(bin, "docker"), `#!/usr/bin/env bash\nif [ "$1" = inspect ]; then\n  case "$3" in\n    *config_files*) printf '%s\\n' '${canonicalBashPath(join(release, "deploy", "docker-compose.vps.yml"))}' ;;\n    *Config.Image*) printf '%s\\n' '${image}' ;;\n    *State.Running*) printf '%s\\n' '${running ? "true" : "false"}' ;;\n    *Image*) printf '%s\\n' '${imageId}' ;;\n    *) exit 2 ;;\n  esac\nelif [ "$1" = image ]; then\n  printf '%s\\n' '${commit}'\nelse\n  exit 2\nfi\n`);
  for (const executable of ["git", "node", "docker"]) chmodSync(join(bin, executable), 0o700);
  return { appRoot, release, previous, repo, bin, evidence, log, captureStarted };
}

function harnessCommand(harness) {
  const env = [
    `PATH=${quote(canonicalBashPath(harness.bin))}:$PATH`,
    `DF13_TEST_LOG=${quote(canonicalBashPath(harness.log))}`,
    `DF13_TEST_CAPTURE_STARTED=${quote(canonicalBashPath(harness.captureStarted))}`,
    `DF13_APP_ROOT=${quote(canonicalBashPath(harness.appRoot))}`,
    `DF13_REPOSITORY_DIR=${quote(canonicalBashPath(harness.repo))}`,
    `DF13_RELEASE_DIR=${quote(canonicalBashPath(harness.release))}`,
    `DF13_RELEASE_TAG=${quote(tag)}`,
    `DF13_RELEASE_COMMIT=${quote(commit)}`,
    `DF13_RELEASE_TREE=${quote(tree)}`,
    `DF13_PREVIOUS_RELEASE_DIR=${quote(canonicalBashPath(harness.previous))}`,
    `DF13_RELEASE_REALTIME_IMAGE=${quote(image)}`,
    `DF13_RELEASE_REALTIME_IMAGE_ID=${quote(imageId)}`,
    `DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE=${quote(canonicalBashPath(harness.evidence))}`,
  ].join(" ");
  return `${env} ${quote(toBashPath(script))}`;
}

function runHarness(harness) {
  return spawnSync(bash, ["-c", harnessCommand(harness)], { encoding: "utf8" });
}

async function waitForFile(path, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
}

try {
  if (runsPosixHarness) {
    const successful = writeHarness();
    const result = runHarness(successful);
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.equal(realpathSync(join(successful.appRoot, "current")), realpathSync(successful.release));
    assert.deepEqual(readFileSync(successful.log, "utf8").trim().split("\n"), ["node", "node", "capture-current.sh", "verify-current.sh", "promote-current.sh"]);

    const mismatchedSource = writeHarness({ sourceCommit: "d".repeat(40) });
    assert.notEqual(runHarness(mismatchedSource).status, 0, "a mismatched release-source commit must fail closed");
    assert.equal(realpathSync(join(mismatchedSource.appRoot, "current")), realpathSync(mismatchedSource.previous), "source-pointer mismatch must not switch current");

    const failing = writeHarness({ captureFails: true });
    assert.notEqual(runHarness(failing).status, 0, "a runtime-state capture failure must fail closed");
    assert.equal(realpathSync(join(failing.appRoot, "current")), realpathSync(failing.previous), "capture failure must restore the previous current pointer");

    const stopped = writeHarness({ running: false });
    assert.notEqual(runHarness(stopped).status, 0, "a stopped realtime worker must fail closed");
    assert.equal(realpathSync(join(stopped.appRoot, "current")), realpathSync(stopped.previous), "a stopped realtime worker must not switch current");

    const contended = writeHarness();
    const lock = canonicalBashPath(join(contended.appRoot, "shared", "lana-chatbot-deployment.lock"));
    const contention = spawnSync(bash, ["-c", `flock -n ${quote(lock)} sleep 3 & holder=$!; sleep 0.1; ${harnessCommand(contended)}; status=$?; wait "$holder" || true; exit "$status"`], { encoding: "utf8" });
    assert.notEqual(contention.status, 0, "a contended global deployment lock must fail closed");
    assert.equal(realpathSync(join(contended.appRoot, "current")), realpathSync(contended.previous), "a contended lock must not switch current");

    const inherited = writeHarness();
    const inheritedLock = canonicalBashPath(join(inherited.appRoot, "shared", "lana-chatbot-deployment.lock"));
    const inheritedResult = spawnSync(bash, ["-c", `exec 9> ${quote(inheritedLock)}; flock -n 9; ${harnessCommand(inherited)}`], { encoding: "utf8" });
    assert.equal(inheritedResult.status, 0, `${inheritedResult.stderr}\n${inheritedResult.stdout}`);
    assert.equal(realpathSync(join(inherited.appRoot, "current")), realpathSync(inherited.release), "the inherited canonical lock must remain usable");

    const interrupted = writeHarness({ captureWaits: true });
    const running = spawn(bash, ["-c", harnessCommand(interrupted)], { stdio: "ignore" });
    await waitForFile(interrupted.captureStarted);
    running.kill("SIGTERM");
    const interruptResult = await new Promise((resolveResult) => running.once("close", (code, signal) => resolveResult({ code, signal })));
    assert.notEqual(interruptResult.code, 0, "a signal must terminate reconciliation nonzero after restoration");
    assert.equal(realpathSync(join(interrupted.appRoot, "current")), realpathSync(interrupted.previous), "a signal must restore the previous current pointer");
  }
} finally {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
}

console.log("DF13 first-preprod release reconciliation contract: PASS");
