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
const adminReleaseTag = '20260810-admin-policy-review-r6.8';
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
if (adminManifest.releaseTag !== adminReleaseTag || adminManifest.source?.implementationCommit !== '694fa313107c1a6ae83a97b4333cc288ed3c2133') {
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
if (adminManifest.supersedesRelease !== '20260809-admin-policy-review-r6.7' ||
    adminManifest.deploymentAutomation?.automaticRollbackOnSoakFailure !== true ||
    adminManifest.deploymentAutomation?.globalDeploymentLockRequired !== true ||
    adminManifest.rollback?.runtimeDefinitionAuthority !== 'previous release Compose plus reviewed image-only override') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_DEPLOYMENT_SAFETY');
}
const adminReleaseSelfTest = spawnSync(process.execPath, [join(adminReleaseDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (adminReleaseSelfTest.status !== 0) {
  throw new Error(`ADMIN_POLICY_RELEASE_SELF_TEST_FAILED:${adminReleaseSelfTest.stderr.trim()}`);
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
