import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateReleaseSource } from './release-source.mjs';
import { validateServiceEvidence } from './runtime-state.mjs';
import { assertDf13FirstPreprodComposeContract } from '../df13-first-preprod-compose-contract.mjs';
// deploy/ is outside the recursive workspace test runner. Import this
// self-executing regression suite so `pnpm check:release-integrity` (and CI)
// proves decoy comments or another service cannot weaken the default-off guard.
import '../df13-first-preprod-compose-contract.test.mjs';
import '../df13-first-preprod-release-reconcile.test.mjs';
import '../df13-first-preprod-release-materialize.test.mjs';
import '../release-artifact-mode.test.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const runtimeDir = join(root, 'deploy', 'runtime-state');
const schema = JSON.parse(readFileSync(join(runtimeDir, 'runtime-state.schema.json'), 'utf8'));
const example = JSON.parse(readFileSync(join(runtimeDir, 'example.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { 'date-time': true } });
const validate = ajv.compile(schema);
if (!validate(example)) throw new Error(`RUNTIME_STATE_JSON_SCHEMA:${ajv.errorsText(validate.errors)}`);
validateReleaseSource(JSON.parse(readFileSync(join(runtimeDir, '.release-source.example.json'), 'utf8')), 'example-release');

const inventory = JSON.parse(readFileSync(join(runtimeDir, 'service-inventory.json'), 'utf8'));
validateServiceEvidence(JSON.parse(readFileSync(join(runtimeDir, 'service-evidence.example.json'), 'utf8')), inventory);
const composeText = readFileSync(join(root, 'deploy', 'docker-compose.vps.yml'), 'utf8');
assertDf13FirstPreprodComposeContract(composeText);
if (!composeText.includes('export REALTIME_BEHAVIOR_MODE_DATABASE_URL="$$(cat')) {
  throw new Error('REALTIME_BEHAVIOR_SECRET_ROOT_BOOTSTRAP_MISSING');
}
if (!composeText.includes('exec su-exec node node apps/worker/dist/realtime-server.js')) throw new Error('REALTIME_BEHAVIOR_NODE_PRIVILEGE_DROP_MISSING');
const compose = composeText.split(/\r?\n/);
function composeServiceBlock(serviceName) {
  const start = compose.findIndex((line) => line === `  ${serviceName}:`);
  if (start < 0) throw new Error(`COMPOSE_SERVICE_BLOCK_MISSING:${serviceName}`);
  const next = compose.findIndex((line, index) => index > start && /^  [A-Za-z0-9_-]+:\s*$/.test(line));
  return compose.slice(start, next < 0 ? compose.length : next).join('\n');
}

const adminImageSelectors = {
  'admin-api': 'ADMIN_API_IMAGE',
  'admin-simulation-worker': 'ADMIN_SIMULATION_IMAGE',
  'admin-web': 'ADMIN_WEB_IMAGE'
};
for (const [serviceName, selector] of Object.entries(adminImageSelectors)) {
  const block = composeServiceBlock(serviceName);
  const requiredSelector = `image: \${${selector}:?${selector} must be pinned}`;
  if (!block.includes(requiredSelector)) throw new Error(`COMPOSE_ADMIN_IMAGE_SELECTOR_NOT_REQUIRED:${serviceName}:${selector}`);
  if (block.includes('ADMIN_IMAGE')) throw new Error(`COMPOSE_SHARED_ADMIN_IMAGE_SELECTOR_FORBIDDEN:${serviceName}`);
  for (const otherSelector of Object.values(adminImageSelectors)) {
    if (otherSelector !== selector && block.includes(otherSelector)) {
      throw new Error(`COMPOSE_ADMIN_IMAGE_SELECTOR_CROSSED:${serviceName}:${otherSelector}`);
    }
  }
}
const infrastructureEnvExample = readFileSync(join(root, 'deploy', '.env.infrastructure.example'), 'utf8');
for (const selector of Object.values(adminImageSelectors)) {
  if (!new RegExp(`^${selector}=\\S+$`, 'm').test(infrastructureEnvExample)) {
    throw new Error(`INFRASTRUCTURE_ENV_ADMIN_IMAGE_SELECTOR_MISSING:${selector}`);
  }
}
if (/^ADMIN_IMAGE=/m.test(infrastructureEnvExample)) throw new Error('INFRASTRUCTURE_ENV_SHARED_ADMIN_IMAGE_SELECTOR_FORBIDDEN');
const composeServices = []; let inServices = false;
for (const line of compose) {
  if (line === 'services:') { inServices = true; continue; }
  if (inServices && /^[A-Za-z]/.test(line)) break;
  const match = inServices ? line.match(/^  ([A-Za-z0-9_-]+):\s*$/) : null; if (match) composeServices.push(match[1]);
}
for (const name of composeServices) if (!inventory.services[name]?.required) throw new Error(`INVENTORY_COMPOSE_SERVICE_MISSING:${name}`);
if (!inventory.services['lana-mcp']?.required) throw new Error('INVENTORY_LANA_MCP_MISSING');
const requiredBySchema = schema.properties.services.required;
const requiredByInventory = Object.entries(inventory.services).filter(([, value]) => value.required).map(([name]) => name);
if (inventory.schemaVersion !== 1 || JSON.stringify(requiredBySchema) !== JSON.stringify(requiredByInventory)) throw new Error('SCHEMA_INVENTORY_REQUIRED_SERVICE_DRIFT');
const missingService = structuredClone(example); delete missingService.services.api; if (validate(missingService)) throw new Error('JSON_SCHEMA_ACCEPTED_MISSING_REQUIRED_SERVICE');
const unknownField = structuredClone(example); unknownField.unapproved = true; if (validate(unknownField)) throw new Error('JSON_SCHEMA_ACCEPTED_UNKNOWN_FIELD');

const manifestDir = join(root, 'deploy', 'manifests');
for (const file of readdirSync(manifestDir).filter((name) => name.endsWith('.json'))) JSON.parse(readFileSync(join(manifestDir, file), 'utf8'));
const adminReleaseTag = '20260811-admin-policy-review-r6.11';
const adminReleaseDir = join(root, 'deploy', 'releases', adminReleaseTag);
const adminReleaseScripts = [
  'common.sh',
  'preflight.sh',
  'run-build.sh',
  'artifact-smoke.sh',
  'backup-restore-test.sh',
  'verify-production-schema.sh',
  'cutover.sh',
  'promote-runtime-state.sh',
  'postcheck.sh',
  'soak.sh',
  'rollback.sh'
];
for (const scriptName of adminReleaseScripts) {
  const scriptPath = join(adminReleaseDir, scriptName);
  if (!existsSync(scriptPath)) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_MISSING:${scriptName}`);
  if (existsSync(join(root, '.git'))) {
    const relativeScriptPath = `deploy/releases/${adminReleaseTag}/${scriptName}`;
    const indexedMode = spawnSync('git', ['-C', root, 'ls-files', '--stage', '--', relativeScriptPath], { encoding: 'utf8' })
      .stdout.trim().split(/\s+/, 1)[0];
    if (indexedMode !== '100755') throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_NOT_EXECUTABLE:${scriptName}:${indexedMode || 'UNTRACKED'}`);
  } else if ((statSync(scriptPath).mode & 0o111) === 0) {
    throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_NOT_EXECUTABLE_IN_ARCHIVE:${scriptName}`);
  }
  const script = readFileSync(scriptPath, 'utf8');
  if (!script.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n')) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_NOT_FAIL_CLOSED:${scriptName}`);
  if (/\beval\b/.test(script)) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_EVAL_FORBIDDEN:${scriptName}`);
  const syntax = spawnSync('bash', ['-n', scriptPath], { encoding: 'utf8' });
  if (!syntax.error && syntax.status !== 0) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_SYNTAX:${scriptName}:${syntax.stderr.trim()}`);
  if (syntax.error && syntax.error.code !== 'ENOENT') throw syntax.error;
}
for (const requiredFile of [
  'admin-rollback-image-override.yml',
  'capture-deployment-boundary.mjs',
  'validate-deployment-boundary.mjs',
  'validate-runtime-invariants.mjs'
]) {
  if (!existsSync(join(adminReleaseDir, requiredFile))) throw new Error(`ADMIN_POLICY_RELEASE_FILE_MISSING:${requiredFile}`);
}
const adminCutover = readFileSync(join(adminReleaseDir, 'cutover.sh'), 'utf8');
for (const required of ['--no-deps', 'admin-web', 'PRESERVED_ADMIN_API_IMAGE', 'PRESERVED_ADMIN_SIMULATION_IMAGE', 'backup-restore-test.sh', 'verify-production-schema.sh', 'arm_automatic_rollback', 'disarm_automatic_rollback', 'acquire_deployment_lock', 'soak.sh', 'capture-deployment-boundary.mjs']) {
  if (!adminCutover.includes(required)) throw new Error(`ADMIN_POLICY_CUTOVER_GUARD_MISSING:${required}`);
}
if (/compose up -d --no-deps admin-api/.test(adminCutover)) throw new Error('ADMIN_POLICY_CUTOVER_ADMIN_API_RECREATE_FORBIDDEN');
const adminRollback = readFileSync(join(adminReleaseDir, 'rollback.sh'), 'utf8');
for (const required of ['--no-deps', 'admin-web', 'require_rollback_inputs', 'rollback_compose', 'PRESERVED_ADMIN_API_IMAGE_ID', 'ROLLBACK_ADMIN_WEB_IMAGE_ID']) {
  if (!adminRollback.includes(required)) throw new Error(`ADMIN_POLICY_ROLLBACK_GUARD_MISSING:${required}`);
}
if (/rollback_compose up -d --no-deps admin-api/.test(adminRollback)) throw new Error('ADMIN_POLICY_ROLLBACK_ADMIN_API_RECREATE_FORBIDDEN');
const adminCommon = readFileSync(join(adminReleaseDir, 'common.sh'), 'utf8');
for (const required of ['RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE', 'require_rollback_inputs', 'readonly DEPLOYMENT_LOCK_FILE=', '/proc/$$/fd/9', 'trap automatic_rollback_on_exit EXIT']) {
  if (!adminCommon.includes(required)) throw new Error(`ADMIN_POLICY_ROLLBACK_INPUT_GUARD_MISSING:${required}`);
}
if (adminRollback.includes('require_cutover_inputs')) throw new Error('ADMIN_POLICY_ROLLBACK_DEPENDS_ON_CUTOVER_GATE');
const adminArtifactSmoke = readFileSync(join(adminReleaseDir, 'artifact-smoke.sh'), 'utf8');
if (!adminArtifactSmoke.includes('apps/admin-web/dist/index.html') || /apps\/admin-api|sharp/.test(adminArtifactSmoke)) {
  throw new Error('ADMIN_POLICY_ADMIN_WEB_ARTIFACT_SMOKE_SCOPE');
}
const adminManifest = JSON.parse(readFileSync(join(manifestDir, `${adminReleaseTag}.json`), 'utf8'));
if (adminManifest.releaseTag !== adminReleaseTag || adminManifest.source?.implementationCommit !== '116d46104113fc73a71108241414104b47e70e01') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_PROVENANCE');
}
const adminSecurityPrerequisite = adminManifest.source?.pullRequests?.find(({ number }) => number === 162);
if (adminSecurityPrerequisite?.mergeCommit !== '43a42392cf975891ddb284083efe153581388d55' ||
    adminSecurityPrerequisite?.scope !== 'RUNTIME_AND_BUILD_DEPENDENCY_SECURITY_PATCHES') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_SECURITY_PREREQUISITE');
}
const adminSafeControls = adminManifest.source?.pullRequests?.find(({ number }) => number === 171);
if (adminSafeControls?.mergeCommit !== '694fa313107c1a6ae83a97b4333cc288ed3c2133' ||
    adminSafeControls?.scope !== 'ADMIN_POLICY_SAFE_CONTROLS_AND_SIZE_REVIEW_UI') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_SAFE_CONTROLS_PR');
}
const adminDockerBuildFix = adminManifest.source?.pullRequests?.find(({ number }) => number === 174);
if (adminDockerBuildFix?.mergeCommit !== '8eabe32c44529721e79b56b3ec5d0ea1ed333780' ||
    adminDockerBuildFix?.scope !== 'DOCKER_BUILD_BENCHMARK_FIXTURES') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_DOCKER_BUILD_FIX_PR');
}
const adminSelectionRefreshFix = adminManifest.source?.pullRequests?.find(({ number }) => number === 182);
if (adminSelectionRefreshFix?.mergeCommit !== '116d46104113fc73a71108241414104b47e70e01' ||
    adminSelectionRefreshFix?.scope !== 'ADMIN_POLICY_SELECTION_REFRESH_AND_BATCH_RECOVERY') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_SELECTION_REFRESH_PR');
}
if (adminManifest.database?.migrationRequired !== false ||
    JSON.stringify(adminManifest.database?.migrationsToApply) !== JSON.stringify([]) ||
    adminManifest.database?.backfillRequired !== false ||
    adminManifest.database?.dataRewriteRequired !== false ||
    adminManifest.database?.schemaRollbackRequired !== false ||
    adminManifest.database?.previousLatestMigration !== '0031_admin_policy_safe_deletion' ||
    adminManifest.database?.latestMigrationMustRemain !== '0031_admin_policy_safe_deletion') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_DATABASE_SCOPE');
}
if (JSON.stringify(adminManifest.scope?.targetServices) !== JSON.stringify(['admin-web'])) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_SERVICE_SCOPE');
}
if (adminManifest.scope?.adminApiMustRemainUnchanged !== true ||
    adminManifest.scope?.adminSimulationWorkerMustRemainUnchanged !== true ||
    adminManifest.scope?.messengerProductionTestAllowed !== false) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_NON_TARGET_SCOPE');
}
if (adminManifest.supersedesRelease !== '20260810-admin-policy-review-r6.10' ||
    adminManifest.deploymentAutomation?.productionMigrationAuthority !== 'NO_DDL_SCHEMA_0031_READ_ONLY_VERIFICATION' ||
    adminManifest.deploymentAutomation?.targetedComposeInvocation !== 'docker compose up -d --no-deps admin-web' ||
    adminManifest.deploymentAutomation?.automaticRollbackOnSoakFailure !== true ||
    adminManifest.deploymentAutomation?.globalDeploymentLockRequired !== true ||
    adminManifest.rollback?.runtimeDefinitionAuthority !== 'previous release Compose plus reviewed Admin Web image-only override' ||
    adminManifest.authorizationBoundary?.migrationAuthorized !== false) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_DEPLOYMENT_SAFETY');
}
const adminReleaseSelfTest = spawnSync(process.execPath, [join(adminReleaseDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (adminReleaseSelfTest.status !== 0) {
  throw new Error(`ADMIN_POLICY_RELEASE_SELF_TEST_FAILED:${adminReleaseSelfTest.stderr.trim()}`);
}

const waveCReleaseTag = '20260810-bf03-wave-c-r5.5';
const waveCReleaseDir = join(root, 'deploy', 'releases', waveCReleaseTag);
const waveCReleaseScripts = [
  'common.sh',
  'preflight.sh',
  'run-build.sh',
  'artifact-smoke.sh',
  'capture-operational-state.sh',
  'cutover.sh',
  'promote-runtime-state.sh',
  'postcheck.sh',
  'soak.sh',
  'rollback.sh'
];
for (const scriptName of waveCReleaseScripts) {
  const scriptPath = join(waveCReleaseDir, scriptName);
  if (!existsSync(scriptPath)) throw new Error(`WAVE_C_RELEASE_SCRIPT_MISSING:${scriptName}`);
  if (existsSync(join(root, '.git'))) {
    const relativeScriptPath = `deploy/releases/${waveCReleaseTag}/${scriptName}`;
    const indexedMode = spawnSync('git', ['-C', root, 'ls-files', '--stage', '--', relativeScriptPath], { encoding: 'utf8' })
      .stdout.trim().split(/\s+/, 1)[0];
    if (indexedMode !== '100755') throw new Error(`WAVE_C_RELEASE_SCRIPT_NOT_EXECUTABLE:${scriptName}:${indexedMode || 'UNTRACKED'}`);
  } else if ((statSync(scriptPath).mode & 0o111) === 0) {
    throw new Error(`WAVE_C_RELEASE_SCRIPT_NOT_EXECUTABLE_IN_ARCHIVE:${scriptName}`);
  }
  const script = readFileSync(scriptPath, 'utf8');
  if (!script.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n')) throw new Error(`WAVE_C_RELEASE_SCRIPT_NOT_FAIL_CLOSED:${scriptName}`);
  if (/\beval\b/u.test(script)) throw new Error(`WAVE_C_RELEASE_SCRIPT_EVAL_FORBIDDEN:${scriptName}`);
  const syntax = spawnSync('bash', ['-n', scriptPath], { encoding: 'utf8' });
  if (!syntax.error && syntax.status !== 0) throw new Error(`WAVE_C_RELEASE_SCRIPT_SYNTAX:${scriptName}:${syntax.stderr.trim()}`);
  if (syntax.error && syntax.error.code !== 'ENOENT') throw syntax.error;
}
for (const requiredFile of [
  'README.md',
  'realtime-rollback-image-override.yml',
  'capture-deployment-boundary.mjs',
  'validate-deployment-boundary.mjs',
  'validate-operational-state.mjs',
  'validate-prospective-realtime-env.mjs',
  'validate-realtime-log.mjs',
  'validate-runtime-invariants.mjs',
  'validate-target-evidence.mjs',
  'validate-release-pointer.mjs',
  'validate-service-evidence.mjs',
  'list-inventory-services.mjs',
  'test-release-automation.mjs'
]) {
  if (!existsSync(join(waveCReleaseDir, requiredFile))) throw new Error(`WAVE_C_RELEASE_FILE_MISSING:${requiredFile}`);
}
const waveCCutover = readFileSync(join(waveCReleaseDir, 'cutover.sh'), 'utf8');
for (const required of ['compose up -d --no-deps realtime-worker', 'arm_automatic_rollback', 'disarm_automatic_rollback', 'acquire_deployment_lock', 'postcheck.sh', 'soak.sh', 'promote-runtime-state.sh', 'capture-deployment-boundary.mjs']) {
  if (!waveCCutover.includes(required)) throw new Error(`WAVE_C_CUTOVER_GUARD_MISSING:${required}`);
}
if (/admin-api|admin-web|admin-simulation-worker/u.test(waveCCutover)) throw new Error('WAVE_C_CUTOVER_ADMIN_TARGET_FORBIDDEN');
if (!/upsert_env_pin REALTIME_IMAGE[\s\S]*upsert_env_pin REALTIME_RELEASE_ID/u.test(waveCCutover)) throw new Error('WAVE_C_CUTOVER_EXACT_ENV_PINS_MISSING');
const waveCRollback = readFileSync(join(waveCReleaseDir, 'rollback.sh'), 'utf8');
for (const required of ['rollback_compose up -d --no-deps realtime-worker', 'require_rollback_inputs', 'ROLLBACK_REALTIME_IMAGE_ID', 'promote-runtime-state.sh']) {
  if (!waveCRollback.includes(required)) throw new Error(`WAVE_C_ROLLBACK_GUARD_MISSING:${required}`);
}
if (waveCRollback.includes('require_cutover_inputs')) throw new Error('WAVE_C_ROLLBACK_DEPENDS_ON_CUTOVER_GATE');
const waveCCommon = readFileSync(join(waveCReleaseDir, 'common.sh'), 'utf8');
for (const required of [
  'EXPECTED_ROLLBACK_REALTIME_IMAGE_ID="sha256:2c34155c8ddf51014801e2dd0424e4ca14e0bb6a5d0c055cd657a126c1db0b6e"',
  'EXPECTED_ROLLBACK_REALTIME_REVISION="a63a3ccbd7dc2b3061cf96d56c3fa3e19c26851d"',
  'final release merge parents mismatch',
  'candidate tag/commit mismatch',
  'readonly DEPLOYMENT_LOCK_FILE=',
  'trap automatic_rollback_on_exit EXIT'
]) {
  if (!waveCCommon.includes(required)) throw new Error(`WAVE_C_COMMON_GUARD_MISSING:${required}`);
}
const waveCManifest = JSON.parse(readFileSync(join(manifestDir, `${waveCReleaseTag}.json`), 'utf8'));
if (waveCManifest.releaseTag !== waveCReleaseTag ||
    waveCManifest.releasePreparation?.ciCheckoutFullHistoryRequiredForExactProvenance !== true ||
    waveCManifest.releasePreparation?.ciCheckoutExactHeadRequired !== true ||
    waveCManifest.source?.implementationBoundaryCommit !== '6c8de97c29e30ac428f742fd92a951c72caee9f7' ||
    waveCManifest.source?.implementationBoundaryTree !== 'b9843a150d1b681638dd625d471e4595bd1a2580' ||
    JSON.stringify(waveCManifest.scope?.targetServices) !== JSON.stringify(['realtime-worker']) ||
    waveCManifest.scope?.migrationRequired !== false ||
    waveCManifest.scope?.backfillRequired !== false ||
    waveCManifest.scope?.routingChanged !== false ||
    waveCManifest.scope?.pageAllowlistChanged !== false ||
    waveCManifest.scope?.messengerProductionTestAllowed !== false ||
    waveCManifest.scope?.n8nActionAllowed !== false) {
  throw new Error('WAVE_C_RELEASE_MANIFEST_SCOPE_OR_PROVENANCE');
}
const ciWorkflowPath = join(root, '.github', 'workflows', 'ci.yml');
if (existsSync(ciWorkflowPath)) {
  const ciWorkflow = readFileSync(ciWorkflowPath, 'utf8');
  if (!/uses: actions\/checkout@[a-f0-9]+[^\n]*\n\s+with:\n\s+ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}\n\s+fetch-depth: 0/u.test(ciWorkflow)) {
    throw new Error('WAVE_C_CI_FULL_HISTORY_PROVENANCE_MISSING');
  }
}
const expectedWaveCPullRequests = [
  { number: 158, issue: 'BF-03', baseCommit: '2b1d0f2f0bfe7577588a0865a466b8bd42d7415a', reviewedHead: '5555cc086cc38cc19f064e9164dd254f37a3905c', mergeCommit: 'cf7f2aae7fbc3ca12612f78acee927cd9262afce', mergeTree: '12bb8049d4d84d66c3a68dc6b4f737173272a8e7', scope: 'FOUNDATION_ONLY_INACTIVE_CORRECTION_CONTAINMENT' },
  { number: 169, issue: 'BF-06', baseCommit: 'cf7f2aae7fbc3ca12612f78acee927cd9262afce', reviewedHead: '496babde5f2cedb8559dd60f5e45bbec580772a6', mergeCommit: '58507aedaf938c80fbd39c2c0180281af8d99dfd', mergeTree: '5e30073cd93b82c929bba07d4596ab03d05e7e12', scope: 'PER_ASSET_MEDIA_RESOLUTION' },
  { number: 170, issue: 'BF-07', baseCommit: '58507aedaf938c80fbd39c2c0180281af8d99dfd', reviewedHead: 'e11278a10920a78a48959a34fd6b1c567b5faa6b', mergeCommit: '67201e8f96b060e670d9ce7960ec3b3b5f6add49', mergeTree: 'a90fe7abcf91a83ed512f99cb1ddb585a5f82880', scope: 'DISTINCT_PRODUCT_CLARIFICATION_AND_BF02_REPLAY_COMPATIBILITY' },
  { number: 172, issue: 'BF-08', baseCommit: 'dc4b2b2751c8da2877d58b981e7aa30c885a62b9', reviewedHead: '0e081cc8d29176fabdd8e7fa4267b06a04b58670', mergeCommit: 'dfff2f41e0320e2514ccffe1bc621a88805675cb', mergeTree: '8712481f22e49420b5eac2479820a4a14d2b05dd', scope: 'CLASSIFIED_CUSTOMER_URL_POLICY' },
  { number: 178, issue: 'BF-09', baseCommit: 'dfff2f41e0320e2514ccffe1bc621a88805675cb', reviewedHead: '805a41ccc47577064b31193c7f9a6408fbedfd5e', mergeCommit: '5431073ae80cd40fb9156ea18f681e7fc9d56aca', mergeTree: 'abc4f24a834f14d8402908dfb2394494348c8a21', scope: 'FULL_LOOK_MEDIA_MAPPING' },
  { number: 179, issue: 'WAVE_C_COMBINED_EVIDENCE', baseCommit: '5431073ae80cd40fb9156ea18f681e7fc9d56aca', reviewedHead: 'cec160d4e1d8a0296600b022155ef8b3fd44d9c1', mergeCommit: '6c8de97c29e30ac428f742fd92a951c72caee9f7', mergeTree: 'b9843a150d1b681638dd625d471e4595bd1a2580', scope: 'REQUIRED_MULTI_IMAGE_CLARIFICATION_SD398_REPLAY' },
];
if (JSON.stringify(waveCManifest.source?.pullRequests) !== JSON.stringify(expectedWaveCPullRequests)) {
  throw new Error('WAVE_C_RELEASE_MANIFEST_EXACT_PR_PROVENANCE');
}
if (existsSync(join(root, '.git'))) {
  const gitOutput = (args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`WAVE_C_GIT_PROVENANCE_COMMAND_FAILED:${args.join(':')}`);
    return result.stdout.trim();
  };
  for (const record of expectedWaveCPullRequests) {
    if (gitOutput(['show', '-s', '--format=%T', record.mergeCommit]) !== record.mergeTree) {
      throw new Error(`WAVE_C_MERGE_TREE_DRIFT:${record.number}`);
    }
    if (gitOutput(['show', '-s', '--format=%P', record.mergeCommit]) !== `${record.baseCommit} ${record.reviewedHead}`) {
      throw new Error(`WAVE_C_MERGE_PARENTS_DRIFT:${record.number}`);
    }
    if (gitOutput(['merge-base', record.baseCommit, record.reviewedHead]) !== record.baseCommit) {
      throw new Error(`WAVE_C_MERGE_BASE_DRIFT:${record.number}`);
    }
    const ancestry = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', record.mergeCommit, waveCManifest.source.implementationBoundaryCommit]);
    if (ancestry.status !== 0) throw new Error(`WAVE_C_MERGE_ANCESTRY_DRIFT:${record.number}`);
  }
}
if (waveCManifest.bf03InactiveInvariant?.runtimeAdapterPresent !== false ||
    waveCManifest.bf03InactiveInvariant?.publishableCorrectionPolicyPresent !== false ||
    waveCManifest.bf03InactiveInvariant?.activationPathPresent !== false ||
    waveCManifest.policy?.activationDuringThisDeployment !== false ||
    waveCManifest.policy?.effectiveWaveCDefaults?.mediaPartialResolutionPolicy !== 'LEGACY' ||
    waveCManifest.policy?.effectiveWaveCDefaults?.multiProductResolutionPolicy !== 'LEGACY' ||
    waveCManifest.policy?.effectiveWaveCDefaults?.customerUrlPolicy !== 'STRICT_BLOCK_ALL') {
  throw new Error('WAVE_C_RELEASE_MANIFEST_POLICY_BOUNDARY');
}
if (waveCManifest.authorizationBoundary?.existingConfigEnvSecretBaselinePreservationAuthorized !== true ||
    waveCManifest.authorizationBoundary?.configEnvSecretAdditionOrChangeAuthorized !== false ||
    JSON.stringify(waveCManifest.scope?.allowedInfrastructureEnvChanges) !== JSON.stringify(['REALTIME_IMAGE', 'REALTIME_RELEASE_ID'])) {
  throw new Error('WAVE_C_RELEASE_MANIFEST_SECRET_BOUNDARY');
}
const realtimeServer = readFileSync(join(root, 'apps', 'worker', 'src', 'realtime-server.ts'), 'utf8');
const policySchema = readFileSync(join(root, 'packages', 'contracts', 'src', 'v4', 'admin-policy-control.ts'), 'utf8');
if (!realtimeServer.includes('from "./bf02-realtime-runner.js"') || /bf03/iu.test(realtimeServer) ||
    existsSync(join(root, 'apps', 'worker', 'src', 'bf03-realtime-runner.ts')) || /correctionDialoguePolicy/u.test(policySchema)) {
  throw new Error('WAVE_C_BF03_INACTIVE_BOUNDARY_DRIFT');
}
const waveCReleaseSelfTest = spawnSync(process.execPath, [join(waveCReleaseDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (waveCReleaseSelfTest.status !== 0) {
  throw new Error(`WAVE_C_RELEASE_SELF_TEST_FAILED:${waveCReleaseSelfTest.stderr.trim()}`);
}
const bf10DeliveryTag = '20260812-bf10-delivery-r5.6';
const bf10DeliveryDir = join(root, 'deploy', 'releases', bf10DeliveryTag);
const bf10DeliveryManifest = JSON.parse(readFileSync(join(root, 'deploy', 'manifests', `${bf10DeliveryTag}.json`), 'utf8'));
for (const requiredFile of [
  'README.md', 'common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh',
  'capture-deployment-boundary.mjs', 'capture-operational-state.sh', 'cutover.sh',
  'postcheck.sh', 'soak.sh', 'rollback.sh', 'promote-runtime-state.sh',
  'delivery-rollback-image-override.yml', 'validate-target-evidence.mjs',
  'validate-service-evidence.mjs', 'validate-runtime-invariants.mjs',
  'validate-operational-state.mjs', 'validate-prospective-delivery-env.mjs',
  'validate-delivery-log.mjs', 'validate-deployment-boundary.mjs',
  'validate-release-pointer.mjs', 'list-inventory-services.mjs', 'test-release-automation.mjs'
]) {
  if (!existsSync(join(bf10DeliveryDir, requiredFile))) throw new Error(`BF10_DELIVERY_RELEASE_FILE_MISSING:${requiredFile}`);
}
for (const shellName of ['common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh', 'capture-operational-state.sh', 'cutover.sh', 'postcheck.sh', 'soak.sh', 'rollback.sh', 'promote-runtime-state.sh']) {
  const shellPath = join(bf10DeliveryDir, shellName);
  const source = readFileSync(shellPath, 'utf8');
  if (!/^#!\/usr\/bin\/env bash\r?\nset -euo pipefail\r?\n/u.test(source) || /\beval\b/u.test(source)) {
    throw new Error(`BF10_DELIVERY_SHELL_FAIL_CLOSED_INVALID:${shellName}`);
  }
  if (process.platform !== 'win32' && existsSync(join(root, '.git')) && (statSync(shellPath).mode & 0o111) === 0) {
    throw new Error(`BF10_DELIVERY_SHELL_NOT_EXECUTABLE:${shellName}`);
  }
  if (process.platform !== 'win32' && spawnSync('bash', ['-n', shellPath]).status !== 0) throw new Error(`BF10_DELIVERY_SHELL_SYNTAX_INVALID:${shellName}`);
}
if (JSON.stringify(bf10DeliveryManifest.scope?.targetServices) !== JSON.stringify(['delivery-worker']) ||
    JSON.stringify(bf10DeliveryManifest.scope?.servicesRecreated) !== JSON.stringify(['delivery-worker']) ||
    JSON.stringify(bf10DeliveryManifest.scope?.allowedInfrastructureEnvChanges) !== JSON.stringify(['DELIVERY_IMAGE']) ||
    bf10DeliveryManifest.scope?.dockerConfigEnvAdditionsOrChangesAllowed !== false ||
    bf10DeliveryManifest.scope?.migrationRequired !== false || bf10DeliveryManifest.scope?.backfillAllowed !== false ||
    bf10DeliveryManifest.scope?.routingMutationAllowed !== false || bf10DeliveryManifest.scope?.policyMutationAllowed !== false ||
    bf10DeliveryManifest.scope?.messengerProductionSendOrTestAllowed !== false || bf10DeliveryManifest.scope?.n8nActionAllowed !== false) {
  throw new Error('BF10_DELIVERY_MANIFEST_SCOPE_INVALID');
}
if (bf10DeliveryManifest.reviewCandidateTag !== `${bf10DeliveryTag}-review-candidate.3` ||
    bf10DeliveryManifest.implementationBoundaryCommit !== 'a7669d058d59a9331f0dadc2c04fe91a7888c51b' ||
    bf10DeliveryManifest.provenance?.bf10ImplementationCommit !== 'e8bb7a8fa7a067655b0435713d6dd7abf70e63d7' ||
    bf10DeliveryManifest.provenance?.bf10MergeCommit !== '3bc3e0a440ce64b5017f84d400a7e9a4085c435c' ||
    bf10DeliveryManifest.rollback?.deliveryImage !== 'lana-chatbot-app:realtime-compatibility-first-r32.2' ||
    bf10DeliveryManifest.rollback?.deliveryImageId !== 'sha256:44ecb2fd9f7d6a5aa769938f738a3c6ba42b470db5a9bce3d30fdc364de2a0b7' ||
    bf10DeliveryManifest.rollback?.deliveryRevision !== '1c004eacca7cce309a0a05643d1aa751b897d41c') {
  throw new Error('BF10_DELIVERY_MANIFEST_IDENTITY_INVALID');
}
if (bf10DeliveryManifest.preservedRuntimePolicy?.replyReconciliationPolicy !== 'CLARIFY_RECONCILED_V1' ||
    bf10DeliveryManifest.preservedRuntimePolicy?.mediaPartialResolutionPolicy !== 'PER_ASSET_V1' ||
    bf10DeliveryManifest.preservedRuntimePolicy?.multiProductResolutionPolicy !== 'CLARIFY_V1' ||
    bf10DeliveryManifest.preservedRuntimePolicy?.customerUrlPolicy !== 'CLASSIFIED_ALLOWLIST_V1' ||
    bf10DeliveryManifest.preservedRuntimePolicy?.correctionDialoguePolicyPresent !== false) {
  throw new Error('BF10_DELIVERY_ACTIVE_POLICY_CONTRACT_INVALID');
}
const bf10Cutover = readFileSync(join(bf10DeliveryDir, 'cutover.sh'), 'utf8');
if (!bf10Cutover.includes('compose up -d --no-deps delivery-worker') ||
    /compose up[^\n]*(realtime-worker|admin-api|admin-web|admin-simulation-worker)/u.test(bf10Cutover) ||
    !bf10Cutover.includes('upsert_env_pin DELIVERY_IMAGE') || bf10Cutover.includes('DELIVERY_RELEASE_ID') ||
    !bf10Cutover.includes('arm_automatic_rollback') || !bf10Cutover.includes('acquire_deployment_lock')) {
  throw new Error('BF10_DELIVERY_CUTOVER_SCOPE_INVALID');
}
const bf10Rollback = readFileSync(join(bf10DeliveryDir, 'rollback.sh'), 'utf8');
if (!bf10Rollback.includes('rollback_compose up -d --no-deps delivery-worker') ||
    /rollback_compose up[^\n]*(realtime-worker|admin-api|admin-web|admin-simulation-worker)/u.test(bf10Rollback)) {
  throw new Error('BF10_DELIVERY_ROLLBACK_SCOPE_INVALID');
}
const bf10Boundary = readFileSync(join(bf10DeliveryDir, 'capture-deployment-boundary.mjs'), 'utf8');
if (!bf10Boundary.includes("new Set(['DELIVERY_IMAGE'])") || bf10Boundary.includes('DELIVERY_RELEASE_ID') ||
    !bf10Boundary.includes('lana-chatbot-delivery-worker')) throw new Error('BF10_DELIVERY_CONFIG_BOUNDARY_INVALID');
const bf10Build = readFileSync(join(bf10DeliveryDir, 'run-build.sh'), 'utf8');
if (!bf10Build.includes('verify_prospective_delivery_env_parity "$COMPOSE_FILE" "$TARGET_DELIVERY_IMAGE"')) {
  throw new Error('BF10_DELIVERY_TARGET_IMAGE_ENV_PREFLIGHT_MISSING');
}
const bf10OperationalCapture = readFileSync(join(bf10DeliveryDir, 'capture-operational-state.sh'), 'utf8');
const bf10OperationalValidator = readFileSync(join(bf10DeliveryDir, 'validate-operational-state.mjs'), 'utf8');
for (const required of ['postCutover', 'activeError', 'retryScheduled', 'attemptHistory', 'acceptedAfterRetryAudit', 'PENDING_NATURAL_TRANSITION_EVIDENCE']) {
  if (!bf10OperationalCapture.includes(required) && !bf10OperationalValidator.includes(required)) {
    throw new Error(`BF10_DELIVERY_AGGREGATE_EVIDENCE_MISSING:${required}`);
  }
}
const bf10Source = readFileSync(join(root, 'packages', 'database', 'src', 'realtime-runtime.ts'), 'utf8');
for (const required of ["status = 'SENT_ACCEPTED'", 'last_error_code = NULL', 'next_attempt_at = NULL', 'META_OUTBOX_ACCEPTED_AFTER_RETRY']) {
  if (!bf10Source.includes(required)) throw new Error(`BF10_DELIVERY_SOURCE_CONTRACT_MISSING:${required}`);
}
if (existsSync(join(root, '.git'))) {
  const ancestry = (commit) => spawnSync('git', ['merge-base', '--is-ancestor', commit, bf10DeliveryManifest.implementationBoundaryCommit], { cwd: root });
  for (const commit of [bf10DeliveryManifest.provenance?.bf10ImplementationCommit, bf10DeliveryManifest.provenance?.bf10MergeCommit]) {
    if (!/^[a-f0-9]{40}$/u.test(commit ?? '') || ancestry(commit).status !== 0) throw new Error(`BF10_DELIVERY_PROVENANCE_INVALID:${commit}`);
  }
}
const bf10SelfTest = spawnSync(process.execPath, [join(bf10DeliveryDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (bf10SelfTest.status !== 0) throw new Error(`BF10_DELIVERY_RELEASE_SELF_TEST_FAILED:${bf10SelfTest.stderr.trim()}`);
const textMediaReleaseTag = '20260812-unbounded-text-media-guard-r5.7';
const textMediaReleaseDir = join(root, 'deploy', 'releases', textMediaReleaseTag);
const textMediaManifest = JSON.parse(readFileSync(join(root, 'deploy', 'manifests', `${textMediaReleaseTag}.json`), 'utf8'));
for (const requiredFile of [
  'README.md', 'common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh',
  'capture-deployment-boundary.mjs', 'capture-operational-state.sh', 'cutover.sh',
  'postcheck.sh', 'soak.sh', 'rollback.sh', 'promote-runtime-state.sh',
  'realtime-rollback-image-override.yml', 'validate-target-evidence.mjs',
  'validate-service-evidence.mjs', 'validate-runtime-invariants.mjs',
  'validate-operational-state.mjs', 'validate-prospective-realtime-env.mjs',
  'validate-realtime-log.mjs', 'validate-deployment-boundary.mjs',
  'validate-release-pointer.mjs', 'list-inventory-services.mjs', 'test-release-automation.mjs',
  'validate-reviewed-live-baseline.mjs'
]) {
  if (!existsSync(join(textMediaReleaseDir, requiredFile))) throw new Error(`TEXT_MEDIA_RELEASE_FILE_MISSING:${requiredFile}`);
}
for (const shellName of ['common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh', 'capture-operational-state.sh', 'cutover.sh', 'postcheck.sh', 'soak.sh', 'rollback.sh', 'promote-runtime-state.sh']) {
  const shellPath = join(textMediaReleaseDir, shellName);
  const source = readFileSync(shellPath, 'utf8');
  if (!/^#!\/usr\/bin\/env bash\r?\nset -euo pipefail\r?\n/u.test(source) || /\beval\b/u.test(source)) {
    throw new Error(`TEXT_MEDIA_SHELL_FAIL_CLOSED_INVALID:${shellName}`);
  }
  if (process.platform !== 'win32' && existsSync(join(root, '.git')) && (statSync(shellPath).mode & 0o111) === 0) {
    throw new Error(`TEXT_MEDIA_SHELL_NOT_EXECUTABLE:${shellName}`);
  }
  if (process.platform !== 'win32' && spawnSync('bash', ['-n', shellPath]).status !== 0) throw new Error(`TEXT_MEDIA_SHELL_SYNTAX_INVALID:${shellName}`);
}
if (textMediaManifest.source?.implementationBoundaryCommit !== 'ab0638e30d360c190f04f11faa59dc7a7348391c' ||
    textMediaManifest.source?.originMainAtFreshBoundaryVerification !== '66763a058937a84f018bd10a391d3d5e70ce1e4d' ||
    textMediaManifest.source?.governanceIntegration?.operatingMode !== 'ENGINEERING_PREPROD' ||
    textMediaManifest.environment !== 'engineering-preprod-single-approved-test-page' ||
    textMediaManifest.source?.behaviorPullRequest?.reviewedHead !== 'eaca8fe3c91719b435cc6b1abef47c0eede885bd' ||
    textMediaManifest.source?.behaviorPullRequest?.mergeCommit !== 'ab0638e30d360c190f04f11faa59dc7a7348391c' ||
    JSON.stringify(textMediaManifest.scope?.targetServices) !== JSON.stringify(['realtime-worker']) ||
    JSON.stringify(textMediaManifest.scope?.allowedInfrastructureEnvChanges) !== JSON.stringify(['REALTIME_IMAGE']) ||
    textMediaManifest.scope?.migrationRequired !== false || textMediaManifest.scope?.policyMutationRequired !== false ||
    textMediaManifest.scope?.messengerSyntheticActionAllowed !== false || textMediaManifest.scope?.directVpsSourceEditAllowed !== false ||
    textMediaManifest.behaviorContract?.textProducts?.hardCountCap !== false ||
    textMediaManifest.behaviorContract?.textProducts?.factConcurrency !== 3 ||
    textMediaManifest.behaviorContract?.media?.moreThanTen !== 'SILENT_HANDOFF_WHOLE_TURN' ||
    textMediaManifest.behaviorContract?.media?.downstreamCallsAllowed !== false ||
    textMediaManifest.behaviorContract?.media?.replyOrOutboxAllowed !== false) {
  throw new Error('TEXT_MEDIA_RELEASE_MANIFEST_CONTRACT_INVALID');
}
if (textMediaManifest.policyPreservation?.replyReconciliationPolicy !== 'CLARIFY_RECONCILED_V1' ||
    textMediaManifest.policyPreservation?.mediaPartialResolutionPolicy !== 'PER_ASSET_V1' ||
    textMediaManifest.policyPreservation?.multiProductResolutionPolicy !== 'CLARIFY_V1' ||
    textMediaManifest.policyPreservation?.customerUrlPolicy !== 'CLASSIFIED_ALLOWLIST_V1' ||
    textMediaManifest.policyPreservation?.correctionDialoguePolicy !== 'ABSENT_AND_NON_ACTIVATABLE') {
  throw new Error('TEXT_MEDIA_RELEASE_POLICY_PRESERVATION_INVALID');
}
const textMediaCutover = readFileSync(join(textMediaReleaseDir, 'cutover.sh'), 'utf8');
const textMediaRollback = readFileSync(join(textMediaReleaseDir, 'rollback.sh'), 'utf8');
if (!textMediaCutover.includes('compose up -d --no-deps realtime-worker') ||
    /compose up[^\n]*(delivery-worker|admin-api|admin-web|admin-simulation-worker)/u.test(textMediaCutover) ||
    !textMediaCutover.includes('upsert_env_pin REALTIME_IMAGE') || textMediaCutover.includes('upsert_env_pin REALTIME_RELEASE_ID') ||
    !textMediaRollback.includes('rollback_compose up -d --no-deps realtime-worker')) {
  throw new Error('TEXT_MEDIA_RELEASE_TARGET_SCOPE_INVALID');
}
for (const forbidden of [/\bmigrate\b/u, /\bbackfill\b/u, /admin\/v1\/policy/u, /graph\.facebook/u, /\bn8n\b/u]) {
  if (forbidden.test(textMediaCutover) || forbidden.test(textMediaRollback)) throw new Error('TEXT_MEDIA_RELEASE_FORBIDDEN_MUTATION');
}
const textMediaOperational = readFileSync(join(textMediaReleaseDir, 'validate-operational-state.mjs'), 'utf8');
for (const required of ['CLARIFY_RECONCILED_V1', 'PER_ASSET_V1', 'CLARIFY_V1', 'CLASSIFIED_ALLOWLIST_V1', 'OPERATIONAL_STATE_BF03_FIELD_PRESENT']) {
  if (!textMediaOperational.includes(required)) throw new Error(`TEXT_MEDIA_RELEASE_POLICY_GATE_MISSING:${required}`);
}
const textMediaBaseline = readFileSync(join(textMediaReleaseDir, 'validate-reviewed-live-baseline.mjs'), 'utf8');
for (const required of [textMediaManifest.freshHostBaseline.currentRuntimeStateSha256, textMediaManifest.freshHostBaseline.currentReleaseSourceSha256, textMediaManifest.freshHostBaseline.realtimeRollback.containerId, textMediaManifest.freshHostBaseline.deliveryContainerId, textMediaManifest.policyPreservation.closingContentHash, textMediaManifest.policyPreservation.fullPublishedBundleCanonicalJsonNoLfSha256]) {
  if (!textMediaBaseline.includes(required)) throw new Error(`TEXT_MEDIA_REVIEWED_BASELINE_GATE_MISSING:${required}`);
}
const textMediaSmoke = readFileSync(join(textMediaReleaseDir, 'artifact-smoke.sh'), 'utf8');
for (const required of ['bounded-concurrency.js', 'realtime-runner.js', 'business-fact-queries.js', '--network none']) {
  if (!textMediaSmoke.includes(required)) throw new Error(`TEXT_MEDIA_RELEASE_SMOKE_GATE_MISSING:${required}`);
}
const textMediaRunner = readFileSync(join(root, 'apps', 'worker', 'src', 'realtime-runner.ts'), 'utf8');
const boundedConcurrency = readFileSync(join(root, 'apps', 'worker', 'src', 'bounded-concurrency.ts'), 'utf8');
const businessFactSchema = readFileSync(join(root, 'packages', 'contracts', 'src', 'v3', 'business-fact-queries.ts'), 'utf8');
if (!textMediaRunner.includes('BUSINESS_FACT_QUERY_CONCURRENCY = 3') ||
    !textMediaRunner.includes('MAX_INBOUND_IMAGE_ATTACHMENTS = 10') ||
    !textMediaRunner.includes('MEDIA_INPUT_LIMIT_EXCEEDED') ||
    !textMediaRunner.includes('mapWithBoundedConcurrency') ||
    !boundedConcurrency.includes('await Promise.all(workers)') || !boundedConcurrency.includes('throw error') ||
    !businessFactSchema.includes('queries: z.array(BusinessFactQueryV2Schema).min(1),')) {
  throw new Error('TEXT_MEDIA_IMPLEMENTATION_BOUNDARY_INVALID');
}
if (existsSync(join(root, '.git'))) {
  const merge = textMediaManifest.source.behaviorPullRequest.mergeCommit;
  if (spawnSync('git', ['merge-base', '--is-ancestor', merge, textMediaManifest.source.implementationBoundaryCommit], { cwd: root }).status !== 0) {
    throw new Error('TEXT_MEDIA_RELEASE_PROVENANCE_INVALID');
  }
}
const textMediaSelfTest = spawnSync(process.execPath, [join(textMediaReleaseDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (textMediaSelfTest.status !== 0) throw new Error(`TEXT_MEDIA_RELEASE_SELF_TEST_FAILED:${textMediaSelfTest.stderr.trim()}`);
const textMediaHotfixReleaseTag = '20260812-unbounded-text-media-guard-r5.7.1';
const textMediaHotfixReleaseDir = join(root, 'deploy', 'releases', textMediaHotfixReleaseTag);
const textMediaHotfixManifest = JSON.parse(readFileSync(join(root, 'deploy', 'manifests', `${textMediaHotfixReleaseTag}.json`), 'utf8'));
for (const requiredFile of [
  'README.md', 'common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh',
  'capture-deployment-boundary.mjs', 'capture-operational-state.sh', 'cutover.sh',
  'postcheck.sh', 'soak.sh', 'rollback.sh', 'promote-runtime-state.sh',
  'realtime-rollback-image-override.yml', 'validate-target-evidence.mjs',
  'validate-service-evidence.mjs', 'validate-runtime-invariants.mjs',
  'validate-operational-state.mjs', 'validate-prospective-realtime-env.mjs',
  'validate-realtime-log.mjs', 'validate-deployment-boundary.mjs',
  'validate-release-pointer.mjs', 'list-inventory-services.mjs', 'test-release-automation.mjs',
  'validate-reviewed-live-baseline.mjs'
]) {
  if (!existsSync(join(textMediaHotfixReleaseDir, requiredFile))) throw new Error(`TEXT_MEDIA_HOTFIX_RELEASE_FILE_MISSING:${requiredFile}`);
}
for (const shellName of ['common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh', 'capture-operational-state.sh', 'cutover.sh', 'postcheck.sh', 'soak.sh', 'rollback.sh', 'promote-runtime-state.sh']) {
  const shellPath = join(textMediaHotfixReleaseDir, shellName);
  const source = readFileSync(shellPath, 'utf8');
  if (!/^#!\/usr\/bin\/env bash\r?\nset -euo pipefail\r?\n/u.test(source) || /\beval\b/u.test(source)) {
    throw new Error(`TEXT_MEDIA_HOTFIX_SHELL_FAIL_CLOSED_INVALID:${shellName}`);
  }
  if (process.platform !== 'win32' && existsSync(join(root, '.git')) && (statSync(shellPath).mode & 0o111) === 0) {
    throw new Error(`TEXT_MEDIA_HOTFIX_SHELL_NOT_EXECUTABLE:${shellName}`);
  }
  if (process.platform !== 'win32' && spawnSync('bash', ['-n', shellPath]).status !== 0) throw new Error(`TEXT_MEDIA_HOTFIX_SHELL_SYNTAX_INVALID:${shellName}`);
}
if (textMediaHotfixManifest.releaseTag !== textMediaHotfixReleaseTag ||
    textMediaHotfixManifest.source?.originMainAtFreshBoundaryVerification !== '25ce732904009be2b9ea67e1016f0f81bd94b18b' ||
    textMediaHotfixManifest.supersededUndeployedRelease?.tag !== textMediaReleaseTag ||
    textMediaHotfixManifest.supersededUndeployedRelease?.tagObject !== 'd55a74e5f95f6fd650aecb900d9836abea5b79ce' ||
    textMediaHotfixManifest.supersededUndeployedRelease?.commit !== '25ce732904009be2b9ea67e1016f0f81bd94b18b' ||
    textMediaHotfixManifest.supersededUndeployedRelease?.preflightResult !== 'FAILED_CLOSED_BEFORE_BUILD' ||
    textMediaHotfixManifest.supersededUndeployedRelease?.artifactBuilt !== false ||
    textMediaHotfixManifest.supersededUndeployedRelease?.serviceMutationPerformed !== false ||
    textMediaHotfixManifest.supersededUndeployedRelease?.runtimeStateMutationPerformed !== false ||
    JSON.stringify(textMediaHotfixManifest.scope?.targetServices) !== JSON.stringify(['realtime-worker']) ||
    JSON.stringify(textMediaHotfixManifest.scope?.allowedInfrastructureEnvChanges) !== JSON.stringify(['REALTIME_IMAGE'])) {
  throw new Error('TEXT_MEDIA_HOTFIX_MANIFEST_CONTRACT_INVALID');
}
const textMediaHotfixBaseline = readFileSync(join(textMediaHotfixReleaseDir, 'validate-reviewed-live-baseline.mjs'), 'utf8');
if (!/const closing = parseClosingRow\(query\([\s\S]*?\)\);/u.test(textMediaHotfixBaseline) ||
    !textMediaHotfixBaseline.includes('parseDelimitedRows(raw, closingFields)') ||
    !textMediaHotfixBaseline.includes('TAB_CLOSING_ROW') || !textMediaHotfixBaseline.includes('PIPE_CLOSING_ROW') ||
    textMediaHotfixBaseline.includes(".split('|')")) {
  throw new Error('TEXT_MEDIA_HOTFIX_CLOSING_DELIMITER_INVALID');
}
const textMediaHotfixCommon = readFileSync(join(textMediaHotfixReleaseDir, 'common.sh'), 'utf8');
if (!textMediaHotfixCommon.includes(`EXPECTED_RELEASE_TAG="${textMediaHotfixReleaseTag}"`) ||
    !textMediaHotfixCommon.includes('EXPECTED_MAIN_BASE="25ce732904009be2b9ea67e1016f0f81bd94b18b"') ||
    !textMediaHotfixCommon.includes(`EXPECTED_CANDIDATE_TAG="${textMediaHotfixReleaseTag}-review-candidate.2"`)) {
  throw new Error('TEXT_MEDIA_HOTFIX_PROVENANCE_CONSTANTS_INVALID');
}
const textMediaHotfixSelfTest = spawnSync(process.execPath, [join(textMediaHotfixReleaseDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (textMediaHotfixSelfTest.status !== 0) throw new Error(`TEXT_MEDIA_HOTFIX_RELEASE_SELF_TEST_FAILED:${textMediaHotfixSelfTest.stderr.trim()}`);
const dockerfile = readFileSync(join(root, 'deploy', 'Dockerfile'), 'utf8');
if (!dockerfile.includes('COPY benchmarks ./benchmarks')) {
  throw new Error('DOCKER_BUILD_BENCHMARK_FIXTURES_MISSING');
}
for (const requiredEvidenceArtifact of ['COPY docs ./docs', 'COPY evaluation ./evaluation']) {
  if (!dockerfile.includes(requiredEvidenceArtifact)) {
    throw new Error(`DOCKER_BUILD_DF13_EVIDENCE_ARTIFACT_MISSING:${requiredEvidenceArtifact}`);
  }
}
if (!dockerfile.includes('RUN apk add --no-cache bash ffmpeg git')) {
  throw new Error('ADMIN_POLICY_RELEASE_BUILD_BASH_MISSING');
}
if ((dockerfile.split('FROM node:22-alpine AS runtime')[1] ?? '').match(/apk add[^\n]*\bbash\b/)) {
  throw new Error('ADMIN_POLICY_RELEASE_RUNTIME_BASH_FORBIDDEN');
}
const a0Name = '20260802-r32.2.2-runtime-reconciliation.json'; const a0Bytes = readFileSync(join(manifestDir, a0Name)); const a0 = JSON.parse(a0Bytes);
if (a0.schemaVersion !== 1 || typeof a0.capturedAt !== 'string' || typeof a0.documentType !== 'string' || !/^[a-f0-9]{40}$/.test(a0.sourceCommit ?? '') || a0.attestationLevel !== 'PARTIAL') throw new Error('A0_RECONCILIATION_REQUIRED_FIELDS');
const recordedA0Digest = readFileSync(join(manifestDir, `${a0Name}.sha256`), 'utf8').trim().split(/\s+/)[0];
if (createHash('sha256').update(a0Bytes).digest('hex') !== recordedA0Digest) throw new Error('A0_HISTORICAL_MANIFEST_IMMUTABILITY');

const readme = readFileSync(join(root, 'README.md'), 'utf8');
if (/\/opt\/lana-chatbot\/releases\/(?!<)[^`\s]+/.test(readme)) throw new Error('README_CONCRETE_CURRENT_RELEASE_PATH');
for (const phrase of ['Runtime symlink hiện hành:', 'Current test-page canary runtime:', 'Production đang trỏ tới release', 'realtime production hiện dùng binary']) if (readme.includes(phrase)) throw new Error(`README_CURRENT_RELEASE_ASSERTION:${phrase}`);
if (!readme.includes('/opt/lana-chatbot/runtime-state/current.json') || !readme.includes('.release-source.json') || !readme.includes(a0Name)) throw new Error('README_GENERATED_TRUTH_DIRECTIONS_MISSING');
console.log('repository release-integrity guard: PASS (JSON Schema/repository artifacts only; live host parity is not claimed)');
