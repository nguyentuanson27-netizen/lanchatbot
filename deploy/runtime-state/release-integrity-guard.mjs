import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
const adminReleaseTag = '20260809-admin-policy-review-r6.1';
const adminReleaseDir = join(root, 'deploy', 'releases', adminReleaseTag);
const adminReleaseScripts = [
  'common.sh',
  'preflight.sh',
  'run-build.sh',
  'cutover.sh',
  'promote-runtime-state.sh',
  'postcheck.sh',
  'soak.sh',
  'rollback.sh'
];
for (const scriptName of adminReleaseScripts) {
  const scriptPath = join(adminReleaseDir, scriptName);
  if (!existsSync(scriptPath)) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_MISSING:${scriptName}`);
  const script = readFileSync(scriptPath, 'utf8');
  if (!script.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n')) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_NOT_FAIL_CLOSED:${scriptName}`);
  if (/\beval\b/.test(script)) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_EVAL_FORBIDDEN:${scriptName}`);
  const syntax = spawnSync('bash', ['-n', scriptPath], { encoding: 'utf8' });
  if (!syntax.error && syntax.status !== 0) throw new Error(`ADMIN_POLICY_RELEASE_SCRIPT_SYNTAX:${scriptName}:${syntax.stderr.trim()}`);
  if (syntax.error && syntax.error.code !== 'ENOENT') throw syntax.error;
}
const adminCutover = readFileSync(join(adminReleaseDir, 'cutover.sh'), 'utf8');
for (const required of ['--no-deps', 'admin-api', 'admin-web', 'ADMIN_SIMULATION_IMAGE', 'rollback.sh']) {
  if (!adminCutover.includes(required)) throw new Error(`ADMIN_POLICY_CUTOVER_GUARD_MISSING:${required}`);
}
const adminRollback = readFileSync(join(adminReleaseDir, 'rollback.sh'), 'utf8');
for (const required of ['--no-deps', 'admin-api', 'admin-web', 'RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE']) {
  if (!adminRollback.includes(required)) throw new Error(`ADMIN_POLICY_ROLLBACK_GUARD_MISSING:${required}`);
}
const adminManifest = JSON.parse(readFileSync(join(manifestDir, `${adminReleaseTag}.json`), 'utf8'));
if (adminManifest.releaseTag !== adminReleaseTag || adminManifest.source?.implementationCommit !== 'aaa1a28200c98fa7be79ec1c4c66f5f10a95272a') {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_PROVENANCE');
}
if (adminManifest.database?.migrationRequired !== false || adminManifest.database?.backfillRequired !== false) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_DATABASE_SCOPE');
}
if (JSON.stringify(adminManifest.scope?.targetServices) !== JSON.stringify(['admin-api', 'admin-web'])) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_SERVICE_SCOPE');
}
if (adminManifest.scope?.adminSimulationWorkerMustRemainUnchanged !== true || adminManifest.scope?.messengerProductionTestAllowed !== false) {
  throw new Error('ADMIN_POLICY_RELEASE_MANIFEST_NON_TARGET_SCOPE');
}
const adminReleaseSelfTest = spawnSync(process.execPath, [join(adminReleaseDir, 'test-release-automation.mjs')], { encoding: 'utf8' });
if (adminReleaseSelfTest.status !== 0) {
  throw new Error(`ADMIN_POLICY_RELEASE_SELF_TEST_FAILED:${adminReleaseSelfTest.stderr.trim()}`);
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
