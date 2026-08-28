import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { postgresQueryInvocation, resolveTrustedDeployRepository } from "./runtime-state/runtime-state.mjs";
import { assertReviewedReleaseFileMode } from "./release-artifact-mode.mjs";

const deployDir = resolve(import.meta.dirname);
const entrypoint = resolve(deployDir, "df13-first-preprod-release-reconcile.sh");
const script = resolve(deployDir, "df13-first-preprod-release-reconcile.body.sh");
const releaseIntegrityGuard = resolve(deployDir, "runtime-state", "release-integrity-guard.mjs");
const captureCurrent = resolve(deployDir, "runtime-state", "capture-current.sh");
const runtimeStateProgram = resolve(deployDir, "runtime-state", "runtime-state.mjs");

assert.ok(existsSync(entrypoint), "DF13 fresh-process release reconciliation entrypoint is missing");
assert.ok(existsSync(script), "DF13 fresh-process release reconciliation body is missing");
const source = readFileSync(script, "utf8");
const entrypointSource = readFileSync(entrypoint, "utf8");
assert.match(entrypointSource, /^#!\/bin\/sh\nset -eu\n/u, "the public operator entrypoint must avoid Bash startup hooks");
assert.match(entrypointSource, /exec \/usr\/bin\/env -i/u, "the entrypoint must start the body without caller startup state");
assert.match(entrypointSource, /\/usr\/bin\/bash --noprofile --norc/u, "the entrypoint must use its absolute reviewed non-startup Bash interpreter");
assert.match(entrypointSource, /git_as_deploy\(\)/u, "the public wrapper must isolate repository Git operations from root");
assert.match(entrypointSource, /readonly DEPLOY_APP_ROOT="\/opt\/lana-chatbot"/u, "the public wrapper must anchor release identity to the fixed application root");
assert.match(entrypointSource, /\/usr\/sbin\/runuser -u "\$DEPLOY_GIT_USER" -- \/usr\/bin\/env -i/u, "the public wrapper must invoke repository Git through the fixed deploy owner");
assert.match(entrypointSource, /GIT_CONFIG_KEY_0=core\.sshCommand/u, "the public wrapper must override a repository-local root SSH command with the fixed deploy identity");
assert.match(entrypointSource, /\/home\/lana-deploy\/\.ssh\/lana_chatbot_github_ed25519/u, "the public wrapper must use only the fixed deploy-owned read-only identity");
assert.match(entrypointSource, /-o GlobalKnownHostsFile=\/dev\/null/u, "the public wrapper must not inherit global SSH host trust");
assert.match(entrypointSource, /for deploy_directory in "\$DEPLOY_GIT_HOME" "\$DEPLOY_GIT_SSH_DIRECTORY"/u, "the public wrapper must enumerate the fixed credential parents");
assert.match(entrypointSource, /\$\((?:\/usr\/bin\/)?readlink -f -- "\$deploy_directory"\)" = "\$deploy_directory"/u, "the public wrapper must reject a symlinked credential parent");
assert.match(entrypointSource, /\$\((?:\/usr\/bin\/)?readlink -f -- "\$deploy_file"\)" = "\$deploy_file"/u, "the public wrapper must reject a credential whose parent resolves elsewhere");
assert.doesNotMatch(entrypointSource, /safe\.directory/u, "the public wrapper must not disable Git ownership protection");
assert.match(source, /^#!\/usr\/bin\/bash\nset -euo pipefail\nset -E\n/u, "the operational entrypoint must use its absolute reviewed interpreter");
assert.doesNotMatch(source, /\beval\b/u, "reconciliation automation must not evaluate caller input");
assert.doesNotMatch(source, /DF13_RECONCILE_BOOTSTRAP/u, "the private body must not accept a caller-mintable bootstrap bypass");
assert.doesNotMatch(entrypointSource, /DF13_RECONCILE_BOOTSTRAP/u, "the public wrapper must not mint a bypass token for its private body");
assert.match(entrypointSource, /RECONCILIATION_BODY_HASH_MISMATCH/u, "the clean public wrapper must attest the private body before it starts Bash");
assert.match(entrypointSource, /actual_body_blob="\$\(hash_release_file "\$body_path"\)"/u, "the clean public wrapper must re-hash its root-readable release body without granting root repository trust");
assertReviewedReleaseFileMode({
  repositoryRoot: resolve(deployDir, ".."),
  relativePath: "deploy/df13-first-preprod-release-reconcile.body.sh",
  expectedMode: 0o644,
  label: "reconciliation body",
});
assert.match(source, /trap - DEBUG RETURN ERR EXIT/u, "startup hooks inherited from a caller must be cleared before any release operation");
assert.match(source, /readonly TRUSTED_PATH="\/usr\/local\/sbin:\/usr\/local\/bin:\/usr\/sbin:\/usr\/bin:\/sbin:\/bin"/u, "release reconciliation must establish a fixed command search path");
assert.match(source, /unset BASH_ENV ENV CDPATH/u, "the reviewed body must clear noninteractive shell startup variables");
for (const required of ["DF13_RELEASE_COMMIT", "DF13_RELEASE_TREE", ".release-source.json", "RELEASE_SOURCE_COMMIT_MISMATCH", "current.next", "runtime-state/capture-current.sh", "runtime-state/verify-current.sh", "runtime-state/promote-current.sh"]) {
  assert.match(source, new RegExp(required.replaceAll(".", "\\."), "u"), `missing reconciliation binding: ${required}`);
}
assert.doesNotMatch(source, /DF13_(?:APP_ROOT|REPOSITORY_DIR|REALTIME_CONTAINER|RELEASE_DIR|PREVIOUS_RELEASE_DIR):=/u, "the caller must not select the reconciliation trust root, repository, container, or release directories");
assert.match(source, /release_dir="\$\(dirname "\$\(dirname "\$script_path"\)"\)"/u, "the target release must derive from the executing reviewed artifact");
assert.match(source, /repository_dir="\$app_root\/repository"/u, "the repository trust root must derive from the executing release path");
assert.match(source, /readonly DEPLOY_APP_ROOT="\/opt\/lana-chatbot"/u, "the private reconciliation body must anchor to the fixed application root before Git access");
assert.match(source, /\/usr\/sbin\/runuser -u "\$DEPLOY_GIT_USER" -- \/usr\/bin\/env -i/u, "the private reconciliation body must use the deploy owner for repository Git operations");
assert.match(source, /GIT_CONFIG_KEY_0=core\.sshCommand/u, "the private reconciliation body must override a repository-local root SSH command with the fixed deploy identity");
assert.match(source, /\/home\/lana-deploy\/\.ssh\/lana_chatbot_github_ed25519/u, "the private reconciliation body must use only the fixed deploy-owned read-only identity");
assert.match(source, /-o GlobalKnownHostsFile=\/dev\/null/u, "the private reconciliation body must not inherit global SSH host trust");
assert.match(source, /for deploy_directory in "\$DEPLOY_GIT_HOME" "\$DEPLOY_GIT_SSH_DIRECTORY"/u, "the reconciliation body must enumerate the fixed credential parents");
assert.match(source, /\$\((?:\/usr\/bin\/)?readlink -f -- "\$deploy_directory"\)" = "\$deploy_directory"/u, "the reconciliation body must reject a symlinked credential parent");
assert.match(source, /\$\((?:\/usr\/bin\/)?readlink -f -- "\$deploy_file"\)" = "\$deploy_file"/u, "the reconciliation body must reject a credential whose parent resolves elsewhere");
assert.doesNotMatch(source, /safe\.directory/u, "the private reconciliation body must not disable Git ownership protection");
assert.match(source, /readonly realtime_container="lana-chatbot-realtime-worker"/u, "the reconciled service identity must be fixed by the reviewed contract");
assert.match(source, /cat-file.*\$\{release_tag\}/u, "annotated tag validation is required");
assert.match(source, /\^\{tree\}/u, "exact release tree validation is required");
assert.match(source, /hash-object/u, "every executed release artifact must be re-hashed against the immutable commit");
assert.match(source, /RELEASE_FILE_HASH_MISMATCH/u, "a modified release-local artifact must fail closed");
assert.match(source, /com\.docker\.compose\.project\.config_files/u, "running worker must be bound to the immutable release compose file");
assert.match(source, /org\.opencontainers\.image\.revision/u, "running worker revision must be checked");
assert.match(source, /\.State\.Running/u, "the reconciled realtime worker must be running");
assert.match(source, /local launch_signal_exit_code=0\n  trap 'launch_signal_exit_code=130' INT\n  trap 'launch_signal_exit_code=143' TERM\n  trap 'launch_signal_exit_code=129' HUP\n  local step_pid=""\n  journal_write HELPER_PREPARED "\$step_name" "" ""\n  setsid env -u BASH_ENV -u ENV --default-signal=INT,TERM,HUP "DF13_RECONCILE_HELPER_TOKEN=\$operation_token" \/usr\/bin\/bash --noprofile --norc -c/u, "runtime-state helpers must durably record launch intent, defer signals until their process group is recorded, and explicitly reset child signal dispositions");
assert.match(source, /trap 'abort_reconciliation 130' INT\n  trap 'abort_reconciliation 143' TERM\n  trap 'abort_reconciliation 129' HUP/u, "the parent signal handlers must be restored only after the child process group is recorded");
assert.match(source, /ln -s /u, "current promotion must create a temporary symlink");
assert.match(source, /mv -Tf /u, "current promotion must be atomic");
assert.match(source, /readonly DEPLOYMENT_LOCK_FILE=/u, "the global deployment lock must be canonical");
assert.match(source, /\/proc\/\$\$\/fd\/9/u, "an inherited global deployment lock must be verified, not replaced");
assert.match(source, /flock -n 9/u, "concurrent release reconciliation must fail closed");
assert.match(source, /' bash "\$journal_file" "\$step_name" "\$operation_token" "\$@" 9>&- &/u, "a runtime-state helper must close the parent deployment-lock descriptor before it can outlive a crashed reconciler");
assert.doesNotMatch(source, /df13-release-reconcile\.lock/u, "a separate reconciliation lock would not serialize deployment automation");
assert.match(source, /trap 'abort_reconciliation 130' INT/u, "an interrupt must restore the prior current pointer and terminate");
assert.match(source, /trap 'abort_reconciliation 143' TERM/u, "a termination signal must restore the prior current pointer and terminate");
assert.match(source, /trap 'abort_reconciliation 129' HUP/u, "a hangup must restore the prior current pointer and terminate");
assert.match(source, /restore_runtime_state_from_journal/u, "failed, interrupted, or restarted reconciliation must restore the exact prior runtime-state pointer from its durable journal");
assert.match(source, /host_boot_id=/u, "the recovery journal must bind helpers to the host boot identity");
assert.match(source, /helper_start_ticks=/u, "the recovery journal must bind helpers to an exact process start time");
assert.match(source, /DF13_RECONCILE_HELPER_TOKEN/u, "the recovery journal must bind helpers to a token retained across exec");
assert.match(source, /service_evidence_snapshot=/u, "the recovery journal must bind an immutable service-evidence snapshot");
assert.match(source, /test -e "\$journal_file" \|\| test -L "\$journal_file"/u, "a dangling journal symlink must fail closed rather than look absent");
assert.match(source, /assert_private_regular_file/u, "journal and recovery snapshots must be private regular files");
assert.match(source, /assert_path_in_parent/u, "journal recovery paths must be canonicalized under their expected parent");
assert.match(source, /RUNTIME_STATE_PROMOTION_READBACK_MISMATCH/u, "promotion must be reconciled from a durable readback instead of its exit status alone");
const artifactVerification = source.indexOf("for release_artifact in");
const recoveryInvocation = source.indexOf("\nrecover_incomplete_reconciliation\n");
assert.ok(artifactVerification >= 0 && artifactVerification < recoveryInvocation, "body release artifacts must be verified before any incomplete-journal recovery can mutate pointers");
const priorPointerCapture = source.indexOf('previous_release_dir="$(safe_release_dir "$(readlink -f "$app_root/current")")"');
assert.ok(priorPointerCapture > recoveryInvocation, "the prior pointer must be captured only after the durable lock and incomplete-journal recovery complete");
assert.match(source, /test ! -L "\$DEPLOYMENT_LOCK_FILE" \|\| die "DEPLOYMENT_LOCK_SYMLINK"/u, "the durable deployment lock must reject symlinks before opening a descriptor");
assert.match(source, /exec 9>> "\$DEPLOYMENT_LOCK_FILE"/u, "the durable deployment lock must never truncate its target when it opens a descriptor");
assert.match(source, /DEPLOYMENT_LOCK_DESCRIPTOR_MISMATCH/u, "the durable deployment lock must verify its opened descriptor remains canonical");
assert.doesNotMatch(source, /docker compose|psql|sales_authority_mode|COMMERCE/u, "reconciliation must not deploy, alter authority, or expose a direct database operator");
assert.match(readFileSync(captureCurrent, "utf8"), /runtime-state\.mjs" capture/u, "runtime-state must be captured through the reviewed helper");
const runtimeStateSource = readFileSync(runtimeStateProgram, "utf8");
assert.match(runtimeStateSource, /resolveTrustedDeployRepository/u, "runtime-state capture must derive a fixed repository identity before Git access");
assert.match(runtimeStateSource, /\/usr\/sbin\/runuser/u, "runtime-state capture must query repository Git as the deploy owner");
assert.doesNotMatch(runtimeStateSource, /safe\.directory/u, "runtime-state capture must not trust an operator-provided Git path");
const trustedRepository = "/opt/lana-chatbot/repository";
const regularRepositoryFs = { lstatSync: () => ({ isDirectory: () => true, isSymbolicLink: () => false }), realpathSync: () => trustedRepository };
assert.equal(resolveTrustedDeployRepository(trustedRepository, regularRepositoryFs), trustedRepository, "the fixed deploy repository must resolve exactly");
for (const untrustedRepository of ["*", "relative/repository", "/srv/other/repository"]) {
  assert.throws(() => resolveTrustedDeployRepository(untrustedRepository, regularRepositoryFs), /RUNTIME_STATE_REPOSITORY_PATH_MISMATCH/u, "untrusted repository references must fail closed");
}
assert.throws(() => resolveTrustedDeployRepository(trustedRepository, { lstatSync: () => ({ isDirectory: () => true, isSymbolicLink: () => true }), realpathSync: () => trustedRepository }), /RUNTIME_STATE_REPOSITORY_SYMLINK/u, "a symlinked repository path must fail closed");
assert.throws(() => resolveTrustedDeployRepository(trustedRepository, { lstatSync: () => ({ isDirectory: () => true, isSymbolicLink: () => false }), realpathSync: () => "/tmp/repository" }), /RUNTIME_STATE_REPOSITORY_REALPATH_MISMATCH/u, "a resolved repository outside the fixed identity must fail closed");
const databaseCaptureStart = runtimeStateSource.indexOf("function captureLiveDatabase");
const databaseCaptureEnd = runtimeStateSource.indexOf("export function postgresQueryInvocation", databaseCaptureStart);
assert.notEqual(databaseCaptureStart, -1, "runtime-state database capture is missing");
const databaseCapture = runtimeStateSource.slice(databaseCaptureStart, databaseCaptureEnd);
assert.match(databaseCapture, /SELECT migration_name/u, "reconciliation must capture the reviewed migration ledger read-only");
assert.match(databaseCapture, /SELECT page_id/u, "reconciliation must capture the reviewed routing read-only");
assert.doesNotMatch(databaseCapture, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/u, "reconciliation must not delegate database mutation");
const readonlyQuery = "SELECT migration_name, checksum_sha256 FROM schema_migrations ORDER BY migration_name";
const readonlyInvocation = postgresQueryInvocation({ container: "postgres", user: "reader", database: "lana", password: "secret", sql: readonlyQuery });
assert.ok(readonlyInvocation.args.includes("PGOPTIONS=-c default_transaction_read_only=on"), "runtime-state database capture must set the session read-only at the server boundary");
assert.match(readonlyInvocation.args.at(-1), /^BEGIN TRANSACTION READ ONLY; SELECT migration_name, checksum_sha256 FROM schema_migrations ORDER BY migration_name; COMMIT;$/u, "runtime-state database capture must execute its fixed query inside a read-only transaction");
assert.throws(() => postgresQueryInvocation({ container: "postgres", user: "reader", database: "lana", password: "secret", sql: "UPDATE pages SET status = 'ACTIVE'" }), /POSTGRES_QUERY_NOT_ALLOWLISTED/u, "runtime-state database capture must reject a query outside its fixed read-only allowlist");
assert.match(readFileSync(releaseIntegrityGuard, "utf8"), /df13-first-preprod-release-reconcile\.test\.mjs/u, "the canonical release-integrity gate must execute this reconciliation contract");

const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const entrySyntax = spawnSync(bash, ["-n", entrypoint], { encoding: "utf8" });
assert.equal(entrySyntax.status, 0, entrySyntax.stderr);
const syntax = spawnSync(bash, ["-n", script], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr);

if (process.platform === "linux") {
  const identityScratch = mkdtempSync(join(deployDir, ".df13-deploy-git-identity-"));
  try {
    const deployHome = join(identityScratch, "home");
    const deploySsh = join(deployHome, ".ssh");
    const deployKey = join(deploySsh, "lana_chatbot_github_ed25519");
    const knownHosts = join(deploySsh, "known_hosts");
    mkdirSync(deploySsh, { recursive: true });
    writeFileSync(deployKey, "test-only-key\n");
    writeFileSync(knownHosts, "github.com test-host-key\n");
    chmodSync(deployKey, 0o600);
    chmodSync(knownHosts, 0o600);
    const runIdentityCheck = (sourceText, label) => {
      const start = sourceText.indexOf('readonly DEPLOY_GIT_USER="lana-deploy"');
      const end = sourceText.indexOf('git_as_deploy()');
      assert.ok(start >= 0 && end > start, `${label} must retain a standalone deploy-Git identity boundary`);
      const harness = `set -eu\ndie() { exit 91; }\n${sourceText.slice(start, end)
        .replace('readonly DEPLOY_GIT_USER="lana-deploy"', 'readonly DEPLOY_GIT_USER="$(/usr/bin/id -un)"')
        .replace('readonly DEPLOY_GIT_HOME="/home/lana-deploy"', 'readonly DEPLOY_GIT_HOME="$DF13_TEST_DEPLOY_HOME"')
        .replace('readonly DEPLOY_GIT_SSH_DIRECTORY="/home/lana-deploy/.ssh"', 'readonly DEPLOY_GIT_SSH_DIRECTORY="$DF13_TEST_DEPLOY_HOME/.ssh"')
        .replace('readonly DEPLOY_GIT_PRIVATE_KEY="/home/lana-deploy/.ssh/lana_chatbot_github_ed25519"', 'readonly DEPLOY_GIT_PRIVATE_KEY="$DF13_TEST_DEPLOY_HOME/.ssh/lana_chatbot_github_ed25519"')
        .replace('readonly DEPLOY_GIT_KNOWN_HOSTS="/home/lana-deploy/.ssh/known_hosts"', 'readonly DEPLOY_GIT_KNOWN_HOSTS="$DF13_TEST_DEPLOY_HOME/.ssh/known_hosts"')}assert_deploy_git_identity\n`;
      return spawnSync(bash, ["-c", harness], { encoding: "utf8", env: { ...process.env, DF13_TEST_DEPLOY_HOME: deployHome } });
    };
    for (const [label, sourceText] of [["reconcile-wrapper", entrypointSource], ["reconcile-body", source]]) {
      const accepted = runIdentityCheck(sourceText, label);
      assert.equal(accepted.status, 0, `${label} must accept the exact owner-owned 0600 credential pair: ${accepted.stderr}`);
    }
    chmodSync(deployKey, 0o640);
    for (const [label, sourceText] of [["reconcile-wrapper", entrypointSource], ["reconcile-body", source]]) assert.notEqual(runIdentityCheck(sourceText, label).status, 0, `${label} must reject a non-0600 private key`);
    chmodSync(deployKey, 0o600);
    renameSync(deployKey, `${deployKey}.real`);
    symlinkSync(`${deployKey}.real`, deployKey);
    for (const [label, sourceText] of [["reconcile-wrapper", entrypointSource], ["reconcile-body", source]]) assert.notEqual(runIdentityCheck(sourceText, label).status, 0, `${label} must reject a symlinked private-key leaf`);
    renameSync(deploySsh, `${deploySsh}.real`);
    symlinkSync(`${deploySsh}.real`, deploySsh);
    for (const [label, sourceText] of [["reconcile-wrapper", entrypointSource], ["reconcile-body", source]]) assert.notEqual(runIdentityCheck(sourceText, label).status, 0, `${label} must reject a symlinked SSH parent`);
  } finally {
    rmSync(identityScratch, { recursive: true, force: true });
  }
}

const commit = "a".repeat(40);
const tree = "b".repeat(40);
const imageId = `sha256:${"c".repeat(64)}`;
const immutableBlob = "d".repeat(40);
const tamperedBlob = "e".repeat(40);
const tag = "20260826-df13-reconcile-test";
const image = "lana-chatbot-app:20260826-df13-reconcile-test";
const runsLinuxHarness = process.platform === "linux";
const scratch = runsLinuxHarness ? mkdtempSync(join(deployDir, ".df13-release-reconcile-")) : null;
let harnessId = 0;
const toBashPath = (value) => value.replaceAll("\\", "/").replace(/^([A-Za-z]):/u, (_, drive) => `/${drive.toLowerCase()}`);
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function canonicalBashPath(value) {
  const result = spawnSync(bash, ["-c", `readlink -f ${quote(toBashPath(value))}`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function writeHarness({ captureFails = false, captureWaits = false, mutateEvidenceAfterSnapshot = false, promoteFailsAfterCurrentReplace = false, promoteWaitsAfterCurrentReplace = false, promoteWaitsForLaunchRace = false, signalDuringCommit = false, signalDuringLaunch = false, vulnerableLaunchHandshake = false, moveCurrentBeforeLock = false, running = true, sourceCommit = commit, tamperedReleaseArtifact = false } = {}) {
  const id = `scenario-${harnessId++}`;
  const appRoot = join(scratch, `${id}-root`);
  const release = join(appRoot, "releases", tag);
  const previous = join(appRoot, "releases", "known-good-legacy");
  const concurrent = join(appRoot, "releases", "completed-concurrent-operation");
  const repo = join(appRoot, "repository");
  const bin = join(scratch, `${id}-bin`);
  const evidence = join(scratch, `${id}-evidence.json`);
  const log = join(scratch, `${id}.log`);
  const captureStarted = join(scratch, `${id}.capture-started`);
  const promoteStarted = join(scratch, `${id}.promote-started`);
  const releaseLaunchRace = join(scratch, `${id}.release-launch-race`);
  const signalMarker = join(scratch, `${id}.signal-marker`);
  const evidenceObserved = join(scratch, `${id}.evidence-observed`);
  const tamperedBodyMarker = join(scratch, `${id}.tampered-body-ran`);
  mkdirSync(join(release, "deploy", "runtime-state"), { recursive: true });
  mkdirSync(join(appRoot, "runtime-state", "candidates"), { recursive: true });
  mkdirSync(join(appRoot, "shared"), { recursive: true });
  mkdirSync(previous, { recursive: true });
  mkdirSync(concurrent, { recursive: true });
  mkdirSync(repo, { recursive: true });
  mkdirSync(bin, { recursive: true });
  symlinkSync(previous, join(appRoot, "current"));
  const releaseEntrypoint = join(release, "deploy", "df13-first-preprod-release-reconcile.sh");
  const releaseScript = join(release, "deploy", "df13-first-preprod-release-reconcile.body.sh");
  copyFileSync(entrypoint, releaseEntrypoint);
  copyFileSync(script, releaseScript);
  let releaseEntrypointSource = readFileSync(releaseEntrypoint, "utf8");
  const sourceRoot = canonicalBashPath(appRoot);
  releaseEntrypointSource = releaseEntrypointSource.replaceAll("/opt/lana-chatbot", sourceRoot);
  const productionWrapperTrustedPath = 'TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"';
  assert.ok(releaseEntrypointSource.includes(productionWrapperTrustedPath), "the fixture must begin from the reviewed wrapper command path");
  releaseEntrypointSource = releaseEntrypointSource.replace(productionWrapperTrustedPath, 'TRUSTED_PATH="${DF13_TEST_TRUSTED_PATH:?}"');
  const deployHelper = /readonly DEPLOY_GIT_USER="lana-deploy"\n[\s\S]*?hash_release_file\(\) \{\n[\s\S]*?\n\}\n/u;
  assert.match(releaseEntrypointSource, deployHelper, "the fixture must begin from the reviewed wrapper deploy-owner boundary");
  releaseEntrypointSource = releaseEntrypointSource.replace(deployHelper, 'git_as_deploy() {\n  env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 git "$@"\n}\nhash_release_file() {\n  env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 git hash-object --no-filters -- "$1"\n}\n');
  const productionEntrypointPath = '  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \\' + String.fromCharCode(10);
  assert.ok(releaseEntrypointSource.includes(productionEntrypointPath), "the fixture must begin from the reviewed clean wrapper path");
  releaseEntrypointSource = releaseEntrypointSource.replace(productionEntrypointPath, `  PATH="\${DF13_TEST_TRUSTED_PATH:?}" \\
  DF13_TEST_TRUSTED_PATH="\${DF13_TEST_TRUSTED_PATH:?}" \\
  DF13_TEST_LOG="\${DF13_TEST_LOG:?}" \\
  DF13_TEST_CAPTURE_STARTED="\${DF13_TEST_CAPTURE_STARTED:?}" \\
  DF13_TEST_PROMOTE_STARTED="\${DF13_TEST_PROMOTE_STARTED:?}" \\
  DF13_TEST_RELEASE_LAUNCH_RACE="\${DF13_TEST_RELEASE_LAUNCH_RACE:?}" \\
  DF13_TEST_SIGNAL_MARKER="\${DF13_TEST_SIGNAL_MARKER:?}" \\
  DF13_TEST_EVIDENCE_OBSERVED="\${DF13_TEST_EVIDENCE_OBSERVED:?}" \\
  DF13_TEST_TAMPERED_BODY_MARKER="\${DF13_TEST_TAMPERED_BODY_MARKER:?}" \\
`);
  writeFileSync(releaseEntrypoint, releaseEntrypointSource);
  let releaseScriptSource = readFileSync(releaseScript, "utf8").replaceAll("/opt/lana-chatbot", sourceRoot);
  const productionTrustedPath = 'readonly TRUSTED_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"';
  assert.ok(releaseScriptSource.includes(productionTrustedPath), "the fixture must begin from the reviewed fixed command path");
  releaseScriptSource = releaseScriptSource.replace(productionTrustedPath, 'readonly TRUSTED_PATH="${DF13_TEST_TRUSTED_PATH:?}"');
  assert.match(releaseScriptSource, deployHelper, "the fixture must begin from the reviewed body deploy-owner boundary");
  releaseScriptSource = releaseScriptSource.replace(deployHelper, 'git_as_deploy() {\n  env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 git "$@"\n}\nhash_release_file() {\n  env -i PATH="$TRUSTED_PATH" HOME=/nonexistent GIT_CONFIG_NOSYSTEM=1 git hash-object --no-filters -- "$1"\n}\n');
  if (signalDuringCommit) {
    const commitBoundary = '  rm -f -- "$journal_file" "$runtime_state_snapshot" "$service_evidence_snapshot"\n';
    assert.ok(releaseScriptSource.includes(commitBoundary), "the fixture must locate the reviewed masked commit boundary");
    releaseScriptSource = releaseScriptSource.replace(commitBoundary, `  printf '%s\\n' "$$" > "$DF13_TEST_SIGNAL_MARKER"\n  kill -STOP "$$"\n${commitBoundary}`);
  }
  if (signalDuringLaunch) {
    const protectedLaunchBoundary = '  step_pid="$!"\n  active_step_pid="$step_pid"\n';
    const instrumentedLaunchBoundary = `  step_pid="$!"\n  if [ "\${DF13_TEST_LAUNCH_COUNT:-0}" = "2" ]; then\n    printf '%s\\n' "$$" > "$DF13_TEST_SIGNAL_MARKER"\n    kill -STOP "$$"\n  fi\n  export DF13_TEST_LAUNCH_COUNT=$(( \${DF13_TEST_LAUNCH_COUNT:-0} + 1 ))\n  active_step_pid="$step_pid"\n`;
    assert.ok(releaseScriptSource.includes(protectedLaunchBoundary), "the fixture must locate the reviewed launch-recording boundary");
    releaseScriptSource = releaseScriptSource.replace(protectedLaunchBoundary, instrumentedLaunchBoundary);
  }
  if (mutateEvidenceAfterSnapshot) {
    const evidenceSnapshotBoundary = 'sync -f "$service_evidence_snapshot" || die "RUNTIME_STATE_EVIDENCE_SNAPSHOT_SYNC_FAILED"\n';
    assert.ok(releaseScriptSource.includes(evidenceSnapshotBoundary), "the fixture must locate the immutable evidence-snapshot boundary");
    releaseScriptSource = releaseScriptSource.replace(evidenceSnapshotBoundary, `${evidenceSnapshotBoundary}printf '{"replacement":true}\\n' > "$DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE"\n`);
  }
  if (vulnerableLaunchHandshake) {
    const protectedHandshakeStart = releaseScriptSource.indexOf("run_runtime_state_step() {\n");
    const protectedHandshakeEnd = releaseScriptSource.indexOf("  local step_status=0\n", protectedHandshakeStart);
    assert.ok(protectedHandshakeStart >= 0 && protectedHandshakeEnd > protectedHandshakeStart, "test fixture must locate the reviewed signal-masked launch handshake");
    const protectedHandshake = releaseScriptSource.slice(protectedHandshakeStart, protectedHandshakeEnd);
    assert.match(protectedHandshake, /journal_write HELPER_RUNNING/u, "the vulnerable fixture must start from the durable helper journal protocol");
    const vulnerableHandshake = `run_runtime_state_step() {\n  local step_name="$1"\n  shift\n  setsid env -u BASH_ENV -u ENV --default-signal=INT,TERM,HUP /usr/bin/bash --noprofile --norc -c 'exec "$@"' bash "$@" &\n  if [ "\${DF13_TEST_LAUNCH_COUNT:-0}" = "2" ]; then\n    printf '%s\\n' "$$" > "$DF13_TEST_SIGNAL_MARKER"\n    kill -STOP "$$"\n  fi\n  export DF13_TEST_LAUNCH_COUNT=$(( \${DF13_TEST_LAUNCH_COUNT:-0} + 1 ))\n  active_step_pid="$!"\n`;
    releaseScriptSource = releaseScriptSource.replace(protectedHandshake, vulnerableHandshake);
  }
  if (moveCurrentBeforeLock) {
    const lockBoundary = 'mkdir -p "$(dirname "$DEPLOYMENT_LOCK_FILE")"\nacquire_deployment_lock\n';
    assert.ok(releaseScriptSource.includes(lockBoundary), "the concurrent-pointer fixture must locate the reviewed lock boundary");
    const replacement = `mkdir -p "$(dirname "$DEPLOYMENT_LOCK_FILE")"\nln -s ${quote(canonicalBashPath(concurrent))} "$app_root/current.concurrent.$$.df13-reconcile"\nmv -Tf "$app_root/current.concurrent.$$.df13-reconcile" "$app_root/current"\nacquire_deployment_lock\n`;
    releaseScriptSource = releaseScriptSource.replace(lockBoundary, replacement);
  }
  writeFileSync(releaseScript, releaseScriptSource);
  chmodSync(releaseEntrypoint, 0o700);
  chmodSync(releaseScript, 0o600);
  writeFileSync(join(release, ".release-source.json"), JSON.stringify({ schemaVersion: 1, release: tag, repository: "https://github.com/nguyentuanson27-netizen/lanchatbot", tag, commit: sourceCommit, createdAt: "2026-08-26T00:00:00Z" }));
  writeFileSync(join(release, "deploy", "docker-compose.vps.yml"), "services: {}\n");
  for (const name of ["release-source.mjs", "runtime-state.mjs", "service-inventory.json", "config-allowlists.json"]) writeFileSync(join(release, "deploy", "runtime-state", name), "{}\n");
  writeFileSync(join(appRoot, "runtime-state", "current.json"), '{"release":"known-good-legacy"}\n');
  for (const name of ["capture-current.sh", "verify-current.sh", "promote-current.sh"]) {
    const capture = name === "capture-current.sh";
    const promote = name === "promote-current.sh";
    const captureEvidence = capture && mutateEvidenceAfterSnapshot ? "cat \"$RUNTIME_STATE_SERVICE_EVIDENCE_FILE\" > \"$DF13_TEST_EVIDENCE_OBSERVED\"; " : "";
    const action = capture && captureFails ? "exit 1" : capture ? `${captureEvidence}mkdir -p \"$RUNTIME_STATE_ROOT/candidates\"; printf '{\"release\":\"release\"}\\n' > \"$RUNTIME_STATE_ROOT/candidates/$RUNTIME_STATE_CANDIDATE_ID.json\"` : promote ? "cp \"$RUNTIME_STATE_CANDIDATE\" \"$RUNTIME_STATE_ROOT/current.json\"" : "";
    const wait = capture && captureWaits ? "printf '%s\\n' \"$$\" > \"$DF13_TEST_CAPTURE_STARTED\"; while :; do sleep 1; done" : "";
    const promoteWait = promote && promoteWaitsAfterCurrentReplace ? "touch \"$DF13_TEST_PROMOTE_STARTED\"; while :; do sleep 1; done" : "";
    const launchRaceWait = promote && promoteWaitsForLaunchRace ? "printf '%s\\n' \"$$\" > \"$DF13_TEST_PROMOTE_STARTED\"; while test ! -e \"$DF13_TEST_RELEASE_LAUNCH_RACE\"; do sleep 0.01; done" : "";
    const failAfterPromotion = promote && promoteFailsAfterCurrentReplace ? "exit 1" : "";
    const path = join(release, "deploy", "runtime-state", name);
    writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' '${name}' >> "$DF13_TEST_LOG"\n${wait}\n${launchRaceWait}\n${action}\n${promoteWait}\n${failAfterPromotion}\n`);
    chmodSync(path, 0o700);
  }
  if (tamperedReleaseArtifact) writeFileSync(join(release, "deploy", "runtime-state", "capture-current.sh"), "#!/usr/bin/env bash\n# TAMPERED\nexit 0\n");
  writeFileSync(evidence, "{}\n");
  const evidenceSha256 = createHash("sha256").update(readFileSync(evidence)).digest("hex");
  writeFileSync(join(bin, "git"), `#!/usr/bin/env bash\nif [ "\${GIT_DIR:-}" = "malicious-object-store" ]; then\n  case "$*" in\n    *"cat-file -t"*) printf '%s\\n' tag ;;\n    *"^{commit}"*) printf '%s\\n' '${commit}' ;;\n    *"hash-object"*) printf '%s\\n' '${immutableBlob}' ;;\n    *"rev-parse"*":deploy/"*) printf '%s\\n' '${immutableBlob}' ;;\n    *"rev-parse"*) printf '%s\\n' '${tree}' ;;\n    *) exit 2 ;;\n  esac\n  exit 0\nfi\ncase "$*" in\n  *"cat-file -t"*) printf '%s\\n' tag ;;\n  *"^{commit}"*) printf '%s\\n' '${commit}' ;;\n  *"hash-object"*) if grep -F '# TAMPERED' "\${!#}" >/dev/null; then printf '%s\\n' '${tamperedBlob}'; else printf '%s\\n' '${immutableBlob}'; fi ;;\n  *"rev-parse"*":deploy/"*) printf '%s\\n' '${immutableBlob}' ;;\n  *"rev-parse"*) printf '%s\\n' '${tree}' ;;\n  *) exit 2 ;;\nesac\n`);
  writeFileSync(join(bin, "node"), "#!/usr/bin/env bash\nprintf '%s\\n' node >> \"$DF13_TEST_LOG\"\nif [ \"$1\" = \"--input-type=module\" ]; then grep -F \"\\\"commit\\\":\\\"$DF13_RELEASE_EXPECTED_COMMIT\\\"\" \"$DF13_RELEASE_SOURCE_FILE\" >/dev/null; fi\n");
  writeFileSync(join(bin, "docker"), `#!/usr/bin/env bash\nif [ "$1" = inspect ]; then\n  case "$3" in\n    *config_files*) printf '%s\\n' '${canonicalBashPath(join(release, "deploy", "docker-compose.vps.yml"))}' ;;\n    *Config.Image*) printf '%s\\n' '${image}' ;;\n    *State.Running*) printf '%s\\n' '${running ? "true" : "false"}' ;;\n    *Image*) printf '%s\\n' '${imageId}' ;;\n    *) exit 2 ;;\n  esac\nelif [ "$1" = image ]; then\n  printf '%s\\n' '${commit}'\nelse\n  exit 2\nfi\n`);
  for (const executable of ["git", "node", "docker"]) chmodSync(join(bin, executable), 0o700);
  return { appRoot, release, previous, concurrent, repo, bin, evidence, evidenceSha256, log, captureStarted, promoteStarted, releaseLaunchRace, signalMarker, evidenceObserved, tamperedBodyMarker };
}

function harnessEnvironment(harness) {
  return {
    PATH: `${canonicalBashPath(harness.bin)}:${process.env.PATH ?? ""}`,
    DF13_TEST_TRUSTED_PATH: `${canonicalBashPath(harness.bin)}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
    DF13_TEST_LOG: canonicalBashPath(harness.log),
    DF13_TEST_CAPTURE_STARTED: canonicalBashPath(harness.captureStarted),
    DF13_TEST_PROMOTE_STARTED: canonicalBashPath(harness.promoteStarted),
    DF13_TEST_RELEASE_LAUNCH_RACE: canonicalBashPath(harness.releaseLaunchRace),
    DF13_TEST_SIGNAL_MARKER: canonicalBashPath(harness.signalMarker),
    DF13_TEST_EVIDENCE_OBSERVED: canonicalBashPath(harness.evidenceObserved),
    DF13_TEST_TAMPERED_BODY_MARKER: canonicalBashPath(harness.tamperedBodyMarker),
    DF13_RELEASE_COMMIT: commit,
    DF13_RELEASE_TREE: tree,
    DF13_RELEASE_REALTIME_IMAGE: image,
    DF13_RELEASE_REALTIME_IMAGE_ID: imageId,
    DF13_RUNTIME_STATE_SERVICE_EVIDENCE_FILE: canonicalBashPath(harness.evidence),
    DF13_RUNTIME_STATE_SERVICE_EVIDENCE_SHA256: harness.evidenceSha256,
  };
}

function harnessCommand(harness, environment = {}) {
  const env = Object.entries({ ...harnessEnvironment(harness), ...environment }).map(([name, value]) => `${name}=${quote(value)}`).join(" ");
  return `${env} ${quote(canonicalBashPath(join(harness.release, "deploy", "df13-first-preprod-release-reconcile.sh")))}`;
}

function runHarness(harness, environment = {}) {
  return spawnSync(bash, ["-c", harnessCommand(harness, environment)], { encoding: "utf8" });
}

function runPublicEntrypoint(harness, environment = {}) {
  return spawnSync(join(harness.release, "deploy", "df13-first-preprod-release-reconcile.sh"), [], {
    encoding: "utf8",
    env: { ...process.env, ...harnessEnvironment(harness), ...environment },
  });
}

function readProcessStatus(pid) {
  try {
    return readFileSync(`/proc/${pid}/status`, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function waitForStoppedProcess(pid, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = readProcessStatus(pid);
    if (status && /^State:\s+[Tt]/mu.test(status)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  throw new Error(`timed out waiting for process ${pid} to stop`);
}

async function waitForTerminatedOrReapedProcess(pid, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = readProcessStatus(pid);
    if (status === null || /^State:\s+Z/mu.test(status)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  throw new Error(`timed out waiting for helper process ${pid} to terminate`);
}

function signalIsPending(status, signalNumber) {
  const signalMask = 1n << BigInt(signalNumber - 1);
  return ["SigPnd", "ShdPnd"].some((field) => {
    const match = status.match(new RegExp(`^${field}:\\s+([0-9A-Fa-f]+)$`, "mu"));
    return match !== null && (BigInt(`0x${match[1]}`) & signalMask) !== 0n;
  });
}

async function waitForPendingSignal(pid, signalNumber, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = readProcessStatus(pid);
    if (status && signalIsPending(status, signalNumber)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  throw new Error(`timed out waiting for signal ${signalNumber} to become pending for process ${pid}`);
}

async function waitForChildClose(child, timeoutMs = 2_000) {
  return await new Promise((resolveResult, rejectResult) => {
    const timeout = setTimeout(() => rejectResult(new Error(`timed out waiting for reconciliation process ${child.pid} to exit`)), timeoutMs);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolveResult({ code, signal });
    });
  });
}

function recordedHelperPid(harness) {
  const started = [harness.promoteStarted, harness.captureStarted].find((path) => existsSync(path));
  if (!started) return 0;
  const pid = Number(readFileSync(started, "utf8").trim());
  return Number.isSafeInteger(pid) && pid > 1 ? pid : 0;
}

function stopHarnessProcess(harness, child, signalTarget) {
  const helperPid = recordedHelperPid(harness);
  if (helperPid > 1) {
    try {
      process.kill(-helperPid, "SIGCONT");
      process.kill(-helperPid, "SIGKILL");
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ESRCH") throw error;
    }
  }
  for (const pid of [signalTarget, child.pid]) {
    if (!Number.isSafeInteger(pid) || pid <= 1) continue;
    try {
      process.kill(pid, "SIGCONT");
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ESRCH") throw error;
    }
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ESRCH") throw error;
    }
  }
}

async function runHarnessWithPendingSignal(harness, { requirePendingTerm = false, releaseLaunchRace = "none" } = {}) {
  const running = spawn(bash, ["-c", harnessCommand(harness)], { stdio: "ignore" });
  let signalTarget = 0;
  try {
    await waitForFile(harness.signalMarker);
    signalTarget = Number(readFileSync(harness.signalMarker, "utf8").trim());
    assert.ok(Number.isSafeInteger(signalTarget) && signalTarget > 1, "the signal-window injector must identify a live Bash process");
    await waitForStoppedProcess(signalTarget);
    process.kill(signalTarget, "SIGTERM");
    if (requirePendingTerm) await waitForPendingSignal(signalTarget, 15);
    process.kill(signalTarget, "SIGCONT");
    if (releaseLaunchRace === "before-exit") {
      await waitForFile(harness.promoteStarted);
      writeFileSync(harness.releaseLaunchRace, "release\n");
      return await waitForChildClose(running);
    }
    const result = await waitForChildClose(running);
    if (releaseLaunchRace === "after-exit") {
      await waitForFile(harness.promoteStarted);
      writeFileSync(harness.releaseLaunchRace, "release\n");
    }
    return result;
  } catch (error) {
    stopHarnessProcess(harness, running, signalTarget);
    throw error;
  }
}

async function waitForFile(path, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
}

async function waitForFileContents(path, expected, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(path) && readFileSync(path, "utf8") === expected) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  throw new Error(`timed out waiting for ${path} to equal the expected durable state`);
}

function journalPath(harness) {
  return join(harness.appRoot, "runtime-state", "df13-first-preprod-release-reconcile.journal");
}

function tamperReconciliationBody(harness) {
  const bodyPath = join(harness.release, "deploy", "df13-first-preprod-release-reconcile.body.sh");
  const bodySource = readFileSync(bodyPath, "utf8");
  const insertion = "set -E\n";
  assert.ok(bodySource.includes(insertion), "the tamper regression must locate the body startup boundary");
  writeFileSync(bodyPath, bodySource.replace(insertion, `${insertion}# TAMPERED\nprintf '%s\\n' tampered > "$DF13_TEST_TAMPERED_BODY_MARKER"\n`));
}

try {
  if (runsLinuxHarness) {
    const successful = writeHarness();
    const result = runHarness(successful);
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.equal(realpathSync(join(successful.appRoot, "current")), realpathSync(successful.release));
    assert.deepEqual(readFileSync(successful.log, "utf8").trim().split("\n"), ["node", "node", "capture-current.sh", "verify-current.sh", "promote-current.sh"]);

    const hostileStartup = writeHarness();
    const startupHook = join(scratch, "hostile-bash-env.sh");
    const startupMarker = join(scratch, "hostile-bash-env-ran");
    writeFileSync(startupHook, `printf '%s\\n' hostile > ${quote(canonicalBashPath(startupMarker))}\n`);
    const hostileStartupResult = runPublicEntrypoint(hostileStartup, { BASH_ENV: canonicalBashPath(startupHook) });
    assert.equal(hostileStartupResult.status, 0, `${hostileStartupResult.stderr}\n${hostileStartupResult.stdout}`);
    assert.ok(!existsSync(startupMarker), "the public wrapper must discard caller BASH_ENV before it starts the private Bash body");

    const immutableEvidence = writeHarness({ mutateEvidenceAfterSnapshot: true });
    const immutableEvidenceResult = runHarness(immutableEvidence);
    assert.equal(immutableEvidenceResult.status, 0, `${immutableEvidenceResult.stderr}\n${immutableEvidenceResult.stdout}`);
    assert.equal(readFileSync(immutableEvidence.evidenceObserved, "utf8"), "{}\n", "all runtime-state helpers must receive the checked immutable evidence snapshot, not the caller path after it changes");
    assert.equal(readFileSync(immutableEvidence.evidence, "utf8"), '{"replacement":true}\n', "the regression fixture must prove the caller evidence path changed after snapshotting");

    const danglingJournal = writeHarness();
    symlinkSync(join(scratch, "missing-reconciliation-journal"), journalPath(danglingJournal));
    const danglingJournalResult = runHarness(danglingJournal);
    assert.notEqual(danglingJournalResult.status, 0, "a dangling reconciliation journal must fail closed");
    assert.equal(realpathSync(join(danglingJournal.appRoot, "current")), realpathSync(danglingJournal.previous), "a dangling reconciliation journal must not begin a new pointer transition");

    const mismatchedSource = writeHarness({ sourceCommit: "d".repeat(40) });
    assert.notEqual(runHarness(mismatchedSource).status, 0, "a mismatched release-source commit must fail closed");
    assert.equal(realpathSync(join(mismatchedSource.appRoot, "current")), realpathSync(mismatchedSource.previous), "source-pointer mismatch must not switch current");

    const tamperedArtifact = writeHarness({ tamperedReleaseArtifact: true });
    assert.notEqual(runHarness(tamperedArtifact).status, 0, "a modified release-local helper must fail closed");
    assert.equal(realpathSync(join(tamperedArtifact.appRoot, "current")), realpathSync(tamperedArtifact.previous), "a modified release-local helper must not switch current");

    const failing = writeHarness({ captureFails: true });
    assert.notEqual(runHarness(failing).status, 0, "a runtime-state capture failure must fail closed");
    assert.equal(realpathSync(join(failing.appRoot, "current")), realpathSync(failing.previous), "capture failure must restore the previous current pointer");

    const lostAcknowledgement = writeHarness({ promoteFailsAfterCurrentReplace: true });
    assert.notEqual(runHarness(lostAcknowledgement).status, 0, "a lost promotion acknowledgement must fail closed");
    assert.equal(realpathSync(join(lostAcknowledgement.appRoot, "current")), realpathSync(lostAcknowledgement.previous), "a lost promotion acknowledgement must restore the prior current pointer");
    assert.equal(readFileSync(join(lostAcknowledgement.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "a lost promotion acknowledgement must restore the exact prior runtime-state pointer");

    const stopped = writeHarness({ running: false });
    assert.notEqual(runHarness(stopped).status, 0, "a stopped realtime worker must fail closed");
    assert.equal(realpathSync(join(stopped.appRoot, "current")), realpathSync(stopped.previous), "a stopped realtime worker must not switch current");

    const concurrentPointer = writeHarness({ captureFails: true, moveCurrentBeforeLock: true });
    const concurrentPointerResult = runHarness(concurrentPointer);
    assert.notEqual(concurrentPointerResult.status, 0, "a post-lock capture failure must fail closed after a concurrent pointer move");
    assert.equal(realpathSync(join(concurrentPointer.appRoot, "current")), realpathSync(concurrentPointer.concurrent), "failure recovery must preserve the pointer that was current when this run acquired the durable lock");

    const symlinkedLock = writeHarness();
    const lockTarget = join(scratch, "symlinked-lock-target");
    const symlinkedLockPath = join(symlinkedLock.appRoot, "shared", "lana-chatbot-deployment.lock");
    writeFileSync(lockTarget, "preserve this unrelated file\n");
    symlinkSync(lockTarget, symlinkedLockPath);
    const symlinkedLockResult = runHarness(symlinkedLock);
    assert.notEqual(symlinkedLockResult.status, 0, "a symlinked deployment lock must fail closed");
    assert.equal(readFileSync(lockTarget, "utf8"), "preserve this unrelated file\n", "a rejected lock symlink must not truncate or modify its target");
    assert.equal(realpathSync(join(symlinkedLock.appRoot, "current")), realpathSync(symlinkedLock.previous), "a rejected lock symlink must not switch current");

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

    const interruptedPromotion = writeHarness({ promoteWaitsAfterCurrentReplace: true });
    const promoting = spawn(bash, ["-c", harnessCommand(interruptedPromotion)], { stdio: "ignore" });
    await waitForFile(interruptedPromotion.promoteStarted);
    promoting.kill("SIGTERM");
    const promotionInterruptResult = await new Promise((resolveResult) => promoting.once("close", (code, signal) => resolveResult({ code, signal })));
    assert.notEqual(promotionInterruptResult.code, 0, "an interrupt after runtime-state replacement must terminate reconciliation nonzero");
    assert.equal(realpathSync(join(interruptedPromotion.appRoot, "current")), realpathSync(interruptedPromotion.previous), "an interrupt after runtime-state replacement must restore the previous current pointer");
    assert.equal(readFileSync(join(interruptedPromotion.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "an interrupt after runtime-state replacement must restore the exact prior runtime-state pointer");

    const signalDuringCommit = writeHarness({ signalDuringCommit: true });
    const commitSignalResult = await runHarnessWithPendingSignal(signalDuringCommit);
    assert.equal(commitSignalResult.code, 0, "a SIGTERM made pending while commit handling is masked must be discarded");
    assert.ok(existsSync(signalDuringCommit.signalMarker), "the commit-disarm injector must prove it stopped before the vulnerable command boundary");
    assert.equal(realpathSync(join(signalDuringCommit.appRoot, "current")), realpathSync(signalDuringCommit.release), "a signal during commit disarm must not restore only the release pointer");
    assert.equal(readFileSync(join(signalDuringCommit.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"release"}\n', "a signal during commit disarm must retain the matching promoted runtime-state pointer");

    const signalDuringLaunch = writeHarness({ promoteWaitsForLaunchRace: true, signalDuringLaunch: true });
    const launchSignalResult = await runHarnessWithPendingSignal(signalDuringLaunch, { requirePendingTerm: true });
    assert.notEqual(launchSignalResult.code, 0, "a signal during the launch handshake must fail closed after the helper process group is recorded");
    assert.ok(existsSync(signalDuringLaunch.signalMarker), "the launch-handshake injector must stop after the helper starts and before its process group is recorded");
    assert.equal(realpathSync(join(signalDuringLaunch.appRoot, "current")), realpathSync(signalDuringLaunch.previous), "the launch handshake must restore the exact prior release pointer");
    assert.equal(readFileSync(join(signalDuringLaunch.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "the launch handshake must terminate the recorded helper before it can split runtime state");

    const vulnerableSignalDuringLaunch = writeHarness({ promoteWaitsForLaunchRace: true, signalDuringLaunch: true, vulnerableLaunchHandshake: true });
    const vulnerableLaunchResult = await runHarnessWithPendingSignal(vulnerableSignalDuringLaunch, { requirePendingTerm: true, releaseLaunchRace: "after-exit" });
    assert.notEqual(vulnerableLaunchResult.code, 0, "the regression harness must reject an unmasked child-launch ordering");
    await waitForFileContents(join(vulnerableSignalDuringLaunch.appRoot, "runtime-state", "current.json"), '{"release":"release"}\n');
    assert.equal(realpathSync(join(vulnerableSignalDuringLaunch.appRoot, "current")), realpathSync(vulnerableSignalDuringLaunch.previous), "the vulnerable launch ordering restores the release pointer before its orphaned helper writes runtime state");
    assert.equal(readFileSync(join(vulnerableSignalDuringLaunch.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"release"}\n', "the vulnerable launch ordering demonstrates the orphaned helper split that the handshake prevents");

    const hardCrashDuringCapture = writeHarness({ captureWaits: true });
    const crashingCapture = spawn(bash, ["-c", harnessCommand(hardCrashDuringCapture)], { stdio: "ignore" });
    let unrelatedProcess = null;
    try {
      await waitForFile(hardCrashDuringCapture.captureStarted);
      crashingCapture.kill("SIGKILL");
      await waitForChildClose(crashingCapture);
      assert.equal(realpathSync(join(hardCrashDuringCapture.appRoot, "current")), realpathSync(hardCrashDuringCapture.release), "the test must prove a hard crash can interrupt after current moves but before runtime-state capture");
      const originalHelperPid = recordedHelperPid(hardCrashDuringCapture);
      assert.ok(originalHelperPid > 1, "the crash fixture must identify the recorded helper process");
      process.kill(-originalHelperPid, "SIGKILL");
      unrelatedProcess = spawn("setsid", ["sleep", "30"], { stdio: "ignore" });
      const staleJournal = readFileSync(journalPath(hardCrashDuringCapture), "utf8")
        .replace(/^helper_pid=.*$/mu, `helper_pid=${unrelatedProcess.pid}`);
      writeFileSync(journalPath(hardCrashDuringCapture), staleJournal);
      const recovered = runHarness(hardCrashDuringCapture);
      assert.notEqual(recovered.status, 0, "an interrupted reconciliation must recover its exact prior state then block rather than begin a new operation");
      assert.equal(realpathSync(join(hardCrashDuringCapture.appRoot, "current")), realpathSync(hardCrashDuringCapture.previous), "hard-crash recovery must restore the exact prior current pointer");
      assert.equal(readFileSync(join(hardCrashDuringCapture.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "hard-crash recovery must retain the exact prior runtime-state pointer");
      assert.doesNotThrow(() => process.kill(unrelatedProcess.pid, 0), "recovery must not signal an unrelated session leader whose reused PID lacks the recorded token");
    } finally {
      stopHarnessProcess(hardCrashDuringCapture, crashingCapture, 0);
      if (unrelatedProcess?.pid) {
        try { process.kill(-unrelatedProcess.pid, "SIGKILL"); } catch (error) { if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ESRCH") throw error; }
      }
    }

    const orphanedLockRecovery = writeHarness({ captureWaits: true });
    const orphanedLockParent = spawn(bash, ["-c", harnessCommand(orphanedLockRecovery)], { stdio: "ignore" });
    try {
      await waitForFile(orphanedLockRecovery.captureStarted);
      orphanedLockParent.kill("SIGKILL");
      await waitForChildClose(orphanedLockParent);
      const orphanedHelperPid = recordedHelperPid(orphanedLockRecovery);
      assert.ok(orphanedHelperPid > 1, "the orphaned-lock fixture must identify the running journal-bound helper");
      const helperStatusBeforeRecovery = readProcessStatus(orphanedHelperPid);
      assert.ok(helperStatusBeforeRecovery !== null && !/^State:\s+Z/mu.test(helperStatusBeforeRecovery), "the recovery regression must begin with a live orphaned helper");
      const recovered = runHarness(orphanedLockRecovery);
      assert.notEqual(recovered.status, 0, "a fresh reconciler must acquire the released deployment lock, recover, then block rather than begin a new operation");
      assert.equal(realpathSync(join(orphanedLockRecovery.appRoot, "current")), realpathSync(orphanedLockRecovery.previous), "orphaned-lock recovery must restore the exact prior current pointer");
      assert.equal(readFileSync(join(orphanedLockRecovery.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "orphaned-lock recovery must restore the exact prior runtime-state pointer");
      await waitForTerminatedOrReapedProcess(orphanedHelperPid);
    } finally {
      stopHarnessProcess(orphanedLockRecovery, orphanedLockParent, 0);
    }

    const tamperedBodyRecovery = writeHarness({ captureWaits: true });
    const tamperedRecoveryParent = spawn(bash, ["-c", harnessCommand(tamperedBodyRecovery)], { stdio: "ignore" });
    try {
      await waitForFile(tamperedBodyRecovery.captureStarted);
      tamperedRecoveryParent.kill("SIGKILL");
      await waitForChildClose(tamperedRecoveryParent);
      assert.equal(realpathSync(join(tamperedBodyRecovery.appRoot, "current")), realpathSync(tamperedBodyRecovery.release), "the tamper recovery fixture must leave the release pointer pending in its durable journal");
      assert.equal(readFileSync(join(tamperedBodyRecovery.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "the tamper recovery fixture must retain the prior runtime-state pointer before recovery");
      tamperReconciliationBody(tamperedBodyRecovery);
      const tamperedRecoveryResult = runHarness(tamperedBodyRecovery, {
        GIT_DIR: "malicious-object-store",
        GIT_OBJECT_DIRECTORY: "/malicious/objects",
        GIT_ALTERNATE_OBJECT_DIRECTORIES: "/malicious/alternates",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "alias.hash-object=!false",
        GIT_CONFIG_VALUE_0: "ignored",
      });
      assert.notEqual(tamperedRecoveryResult.status, 0, "a tampered body with a pending journal must fail before recovery");
      assert.ok(!existsSync(tamperedBodyRecovery.tamperedBodyMarker), "a tampered body must never start before the public wrapper verifies its immutable blob");
      assert.equal(realpathSync(join(tamperedBodyRecovery.appRoot, "current")), realpathSync(tamperedBodyRecovery.release), "a rejected tampered body must not restore or otherwise mutate the pending current pointer");
      assert.equal(readFileSync(join(tamperedBodyRecovery.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "a rejected tampered body must not mutate the pending runtime-state pointer");
    } finally {
      stopHarnessProcess(tamperedBodyRecovery, tamperedRecoveryParent, 0);
    }

    const traversalJournal = writeHarness({ captureWaits: true });
    const traversalParent = spawn(bash, ["-c", harnessCommand(traversalJournal)], { stdio: "ignore" });
    try {
      await waitForFile(traversalJournal.captureStarted);
      traversalParent.kill("SIGKILL");
      await waitForChildClose(traversalParent);
      const outsidePath = `${join(traversalJournal.appRoot, "runtime-state")}/.df13-reconcile-prior.fake/../../outside.json`;
      const tamperedJournal = readFileSync(journalPath(traversalJournal), "utf8").replace(/^runtime_state_snapshot=.*$/mu, `runtime_state_snapshot=${outsidePath}`);
      writeFileSync(journalPath(traversalJournal), tamperedJournal);
      const rejected = runHarness(traversalJournal);
      assert.notEqual(rejected.status, 0, "a traversal journal path must fail closed");
      assert.equal(realpathSync(join(traversalJournal.appRoot, "current")), realpathSync(traversalJournal.release), "a traversal journal must not restore from an external path");
    } finally {
      stopHarnessProcess(traversalJournal, traversalParent, 0);
    }

    const hardCrashDuringPromotion = writeHarness({ promoteWaitsAfterCurrentReplace: true });
    const crashingPromotion = spawn(bash, ["-c", harnessCommand(hardCrashDuringPromotion)], { stdio: "ignore" });
    try {
      await waitForFile(hardCrashDuringPromotion.promoteStarted);
      crashingPromotion.kill("SIGKILL");
      await waitForChildClose(crashingPromotion);
      assert.equal(realpathSync(join(hardCrashDuringPromotion.appRoot, "current")), realpathSync(hardCrashDuringPromotion.release), "the test must prove a hard crash can interrupt after the release pointer moves");
      assert.equal(readFileSync(join(hardCrashDuringPromotion.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"release"}\n', "the test must prove a hard crash can interrupt after runtime-state promotion");
      const recovered = runHarness(hardCrashDuringPromotion);
      assert.notEqual(recovered.status, 0, "a post-promotion hard crash must recover then block rather than silently accept split evidence");
      assert.equal(realpathSync(join(hardCrashDuringPromotion.appRoot, "current")), realpathSync(hardCrashDuringPromotion.previous), "post-promotion hard-crash recovery must restore the exact prior current pointer");
      assert.equal(readFileSync(join(hardCrashDuringPromotion.appRoot, "runtime-state", "current.json"), "utf8"), '{"release":"known-good-legacy"}\n', "post-promotion hard-crash recovery must restore the exact prior runtime-state pointer");
    } finally {
      stopHarnessProcess(hardCrashDuringPromotion, crashingPromotion, 0);
    }
  }
} finally {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
}

console.log("DF13 first-preprod release reconciliation contract: PASS");
