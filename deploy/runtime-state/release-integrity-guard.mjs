import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateReleaseSource } from './release-source.mjs';
import { validateServiceEvidence } from './runtime-state.mjs';

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
const adminReleaseTag = '20260810-admin-policy-review-r6.10';
const adminReleaseDir = join(root, 'deploy', 'releases', adminReleaseTag);
const adminReleaseScripts = [
  'common.sh',
  'preflight.sh',
  'run-build.sh',
  'artifact-smoke.sh',
  'backup-restore-test.sh',
  'migrate-production.sh',
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
for (const required of ['--no-deps', 'admin-api', 'admin-web', 'ADMIN_SIMULATION_IMAGE', 'backup-restore-test.sh', 'migrate-production.sh', 'arm_automatic_rollback', 'disarm_automatic_rollback', 'acquire_deployment_lock', 'soak.sh', 'capture-deployment-boundary.mjs']) {
  if (!adminCutover.includes(required)) throw new Error(`ADMIN_POLICY_CUTOVER_GUARD_MISSING:${required}`);
}
const adminRollback = readFileSync(join(adminReleaseDir, 'rollback.sh'), 'utf8');
for (const required of ['--no-deps', 'admin-api', 'admin-web', 'require_rollback_inputs', 'rollback_compose', 'ROLLBACK_ADMIN_API_IMAGE_ID', 'ROLLBACK_ADMIN_WEB_IMAGE_ID']) {
  if (!adminRollback.includes(required)) throw new Error(`ADMIN_POLICY_ROLLBACK_GUARD_MISSING:${required}`);
}
const adminCommon = readFileSync(join(adminReleaseDir, 'common.sh'), 'utf8');
for (const required of ['RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE', 'require_rollback_inputs', 'readonly DEPLOYMENT_LOCK_FILE=', '/proc/$$/fd/9', 'trap automatic_rollback_on_exit EXIT']) {
  if (!adminCommon.includes(required)) throw new Error(`ADMIN_POLICY_ROLLBACK_INPUT_GUARD_MISSING:${required}`);
}
if (adminRollback.includes('require_cutover_inputs')) throw new Error('ADMIN_POLICY_ROLLBACK_DEPENDS_ON_CUTOVER_GATE');
const adminArtifactSmoke = readFileSync(join(adminReleaseDir, 'artifact-smoke.sh'), 'utf8');
if (!/cd apps\/admin-api\s+node -e "import\(\\"sharp\\"\)/.test(adminArtifactSmoke)) {
  throw new Error('ADMIN_POLICY_SHARP_SMOKE_WORKSPACE_ANCHOR_MISSING');
}
const adminManifest = JSON.parse(readFileSync(join(manifestDir, `${adminReleaseTag}.json`), 'utf8'));
if (adminManifest.releaseTag !== adminReleaseTag || adminManifest.source?.implementationCommit !== '8eabe32c44529721e79b56b3ec5d0ea1ed333780') {
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
if (adminManifest.database?.migrationRequired !== true ||
    JSON.stringify(adminManifest.database?.migrationsToApply) !== JSON.stringify(['0031_admin_policy_safe_deletion']) ||
    adminManifest.database?.backfillRequired !== false ||
    adminManifest.database?.dataRewriteRequired !== false ||
    adminManifest.database?.schemaRollbackRequired !== false) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_DATABASE_SCOPE');
}
if (JSON.stringify(adminManifest.scope?.targetServices) !== JSON.stringify(['admin-api', 'admin-web'])) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_SERVICE_SCOPE');
}
if (adminManifest.scope?.adminSimulationWorkerMustRemainUnchanged !== true || adminManifest.scope?.messengerProductionTestAllowed !== false) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_NON_TARGET_SCOPE');
}
if (adminManifest.supersedesFailedRelease !== '20260810-admin-policy-review-r6.9' ||
    adminManifest.failedReleaseOutcome !== 'PRE_CUTOVER_DDL_PERMISSION_FAILURE_AUTOMATIC_ROLLBACK_PASS' ||
    adminManifest.deploymentAutomation?.productionMigrationAuthority !== 'EXACT_TARGET_IMAGE_SQL_APPLIED_BY_DATABASE_OWNER_WITH_ATOMIC_LEDGER' ||
    adminManifest.deploymentAutomation?.automaticRollbackOnSoakFailure !== true ||
    adminManifest.deploymentAutomation?.globalDeploymentLockRequired !== true ||
    adminManifest.rollback?.runtimeDefinitionAuthority !== 'previous release Compose plus reviewed image-only override') {
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
const dockerfile = readFileSync(join(root, 'deploy', 'Dockerfile'), 'utf8');
if (!dockerfile.includes('COPY benchmarks ./benchmarks')) {
  throw new Error('DOCKER_BUILD_BENCHMARK_FIXTURES_MISSING');
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
