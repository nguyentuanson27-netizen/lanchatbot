import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));
const INVENTORY = JSON.parse(readFileSync(resolve(ROOT, 'service-inventory.json'), 'utf8'));
const ALLOWLISTS = JSON.parse(readFileSync(resolve(ROOT, 'config-allowlists.json'), 'utf8'));
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|PRIVATE[_-]?KEY|CREDENTIAL)/i;

export function canonicalProjection(values, allowlistedKeys) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('PROJECTION_NOT_OBJECT');
  const allow = new Set(allowlistedKeys);
  for (const key of Object.keys(values)) {
    if (!allow.has(key)) throw new Error(`PROJECTION_UNKNOWN_KEY:${key}`);
    if (SECRET_NAME.test(key)) throw new Error(`PROJECTION_SECRET_KEY:${key}`);
    if (typeof values[key] !== 'string' && typeof values[key] !== 'boolean' && typeof values[key] !== 'number') throw new Error(`PROJECTION_UNSTABLE_VALUE:${key}`);
  }
  const lines = [...allow].filter((key) => Object.hasOwn(values, key)).sort().map((key) => `${key}=${String(values[key])}`);
  return `${lines.join('\n')}\n`;
}

export function digestProjection(values, allowlistedKeys) {
  const canonical = canonicalProjection(values, allowlistedKeys);
  return { sha256: createHash('sha256').update(canonical, 'utf8').digest('hex'), canonicalization: 'UTF-8 KEY=VALUE, explicit non-secret allowlist, bytewise key sort, LF terminal newline', allowlistedKeys: [...allowlistedKeys].sort() };
}

function fail(code) { throw new Error(code); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function onlyKeys(object, allowed, label) { if (!isObject(object)) fail(`${label}_NOT_OBJECT`); for (const key of Object.keys(object)) if (!allowed.includes(key)) fail(`${label}_UNKNOWN_FIELD:${key}`); }
function nonEmpty(value, code) { if (typeof value !== 'string' || !value) fail(code); }
function digest(value, code) { onlyKeys(value, ['sha256', 'canonicalization', 'allowlistedKeys'], code); if (!SHA256.test(value.sha256)) fail(`${code}_SHA256`); nonEmpty(value.canonicalization, `${code}_CANONICALIZATION`); if (!Array.isArray(value.allowlistedKeys) || value.allowlistedKeys.some((key) => typeof key !== 'string' || SECRET_NAME.test(key))) fail(`${code}_ALLOWLIST`); }

export function validateRuntimeState(state, inventory = INVENTORY) {
  onlyKeys(state, ['schemaVersion', 'capturedAt', 'environment', 'inventoryId', 'candidateId', 'current', 'services', 'database', 'digests', 'routing', 'evidence'], 'STATE');
  if (state.schemaVersion !== 1 || state.environment !== 'production' || state.inventoryId !== inventory.inventoryId) fail('STATE_VERSION_OR_INVENTORY');
  if (typeof state.capturedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(state.capturedAt)) fail('STATE_CAPTURED_AT');
  onlyKeys(state.current, ['release', 'symlinkTarget', 'sourcePointer'], 'CURRENT');
  nonEmpty(state.current.release, 'CURRENT_RELEASE');
  if (state.current.symlinkTarget !== `/opt/lana-chatbot/releases/${state.current.release}`) fail('CURRENT_SYMLINK');
  const pointer = state.current.sourcePointer;
  onlyKeys(pointer, ['path', 'repository', 'tag', 'commit', 'attestation', 'reason'], 'SOURCE_POINTER');
  if (pointer.path !== `${state.current.symlinkTarget}/.release-source.json` || pointer.repository !== 'https://github.com/nguyentuanson27-netizen/lanchatbot' || pointer.tag !== state.current.release || !COMMIT.test(pointer.commit) || !['OBSERVED', 'UNVERIFIED', 'MISMATCH'].includes(pointer.attestation)) fail('SOURCE_POINTER_INVALID');
  if (!isObject(state.services)) fail('SERVICES_NOT_OBJECT');
  for (const [name, def] of Object.entries(inventory.services)) {
    const service = state.services[name];
    if (!service && def.required) fail(`SERVICE_MISSING:${name}`);
    if (!service) continue;
    if (def.required && service.state === 'NOT_DEPLOYED') fail(`SERVICE_REQUIRED_NOT_DEPLOYED:${name}`);
    onlyKeys(service, ['state', 'container', 'image', 'imageId', 'registryDigest', 'ociLabels', 'attestation', 'reason', 'rollback'], `SERVICE:${name}`);
    if (!['DEPLOYED', 'NOT_DEPLOYED'].includes(service.state) || service.container !== def.container || !SHA256.test(String(service.imageId).replace('sha256:', '')) || (service.registryDigest !== null && !/^.+@sha256:[a-f0-9]{64}$/.test(service.registryDigest)) || !isObject(service.ociLabels) || !['OBSERVED', 'UNVERIFIED', 'MISMATCH'].includes(service.attestation)) fail(`SERVICE_INVALID:${name}`);
    onlyKeys(service.rollback, ['release', 'image', 'imageId'], `ROLLBACK:${name}`);
    nonEmpty(service.rollback.release, `ROLLBACK_RELEASE:${name}`); nonEmpty(service.rollback.image, `ROLLBACK_IMAGE:${name}`); if (!SHA256.test(String(service.rollback.imageId).replace('sha256:', ''))) fail(`ROLLBACK_INVALID:${name}`);
    if (service.state === 'NOT_DEPLOYED' && service.attestation !== 'UNVERIFIED') fail(`OPTIONAL_NOT_DEPLOYED_ONLY:${name}`);
  }
  for (const name of Object.keys(state.services)) if (!Object.hasOwn(inventory.services, name)) fail(`SERVICE_UNKNOWN:${name}`);
  onlyKeys(state.database, ['latestMigration', 'migrationLedgerDigest'], 'DATABASE'); nonEmpty(state.database.latestMigration, 'MIGRATION_LATEST'); digest(state.database.migrationLedgerDigest, 'MIGRATION_DIGEST');
  if (!isObject(state.digests)) fail('DIGESTS_NOT_OBJECT'); for (const [name, value] of Object.entries(state.digests)) digest(value, `DIGEST:${name}`);
  onlyKeys(state.routing, ['canaryPageIds', 'pageAllowlistDigest'], 'ROUTING'); if (!Array.isArray(state.routing.canaryPageIds) || state.routing.canaryPageIds.some((id) => !/^\d+$/.test(id))) fail('ROUTING_PAGES'); digest(state.routing.pageAllowlistDigest, 'ROUTING_DIGEST');
  onlyKeys(state.evidence, ['reconciliationManifest'], 'EVIDENCE'); if (state.evidence.reconciliationManifest !== 'deploy/manifests/20260802-r32.2.2-runtime-reconciliation.json') fail('EVIDENCE_A0_REQUIRED');
  return true;
}

export function assertGateR(state, inventory = INVENTORY) {
  validateRuntimeState(state, inventory);
  if (state.current.sourcePointer.attestation !== 'OBSERVED') fail('GATE_R_SOURCE_NOT_OBSERVED');
  for (const [name, def] of Object.entries(inventory.services)) if (def.required && state.services[name].attestation !== 'OBSERVED') fail(`GATE_R_SERVICE_NOT_OBSERVED:${name}`);
  return true;
}

export function verifyParity(candidate, live, inventory = INVENTORY) {
  validateRuntimeState(candidate, inventory);
  if (!live || candidate.current.release !== live.release || candidate.current.symlinkTarget !== live.symlinkTarget || candidate.current.sourcePointer.commit !== live.sourceCommit || candidate.database.latestMigration !== live.latestMigration) fail('PARITY_CURRENT_OR_DATABASE_MISMATCH');
  for (const [name, service] of Object.entries(candidate.services)) if (service.state === 'DEPLOYED' && service.imageId !== live.services?.[name]?.imageId) fail(`PARITY_IMAGE_MISMATCH:${name}`);
  return true;
}

export function promoteVerifiedCandidate({ candidateFile, liveFile, runtimeRoot }) {
  const candidate = JSON.parse(readFileSync(candidateFile, 'utf8')); const live = JSON.parse(readFileSync(liveFile, 'utf8'));
  assertGateR(candidate); verifyParity(candidate, live);
  const candidateBytes = readFileSync(candidateFile); const candidateDigest = createHash('sha256').update(candidateBytes).digest('hex');
  const historyDir = resolve(runtimeRoot, 'history'); const currentFile = resolve(runtimeRoot, 'current.json'); mkdirSync(historyDir, { recursive: true });
  const historyFile = resolve(historyDir, `${candidate.capturedAt.replace(/[:.]/g, '-')}-${candidate.current.release}.json`);
  const fd = openSync(historyFile, 'wx'); try { writeFileSync(fd, candidateBytes); } finally { closeSync(fd); }
  const tmp = `${currentFile}.${process.pid}.tmp`; copyFileSync(candidateFile, tmp); renameSync(tmp, currentFile);
  const readback = readFileSync(currentFile); if (createHash('sha256').update(readback).digest('hex') !== candidateDigest) fail('PROMOTION_READBACK_DIGEST');
  verifyParity(JSON.parse(readback), live); return { historyFile, currentFile, sha256: candidateDigest };
}

function run(command, args) { return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function dockerInspect(container) { return JSON.parse(run('docker', ['inspect', container]))[0]; }
function envMap(entries = []) { return Object.fromEntries(entries.map((entry) => { const index = entry.indexOf('='); return [entry.slice(0, index), entry.slice(index + 1)]; })); }
export function captureState({ runtimeRoot, migrationFile, routingFile, rollbackFile, candidateId, gitDir }) {
  const target = run('readlink', ['-f', `${runtimeRoot}/current`]); const release = basename(target); const pointerPath = `${target}/.release-source.json`;
  if (!existsSync(pointerPath)) fail('SOURCE_POINTER_MISSING'); const pointerFile = JSON.parse(readFileSync(pointerPath, 'utf8'));
  let fetchedCommit = null; try { fetchedCommit = run('git', ['-C', gitDir, 'rev-parse', `${pointerFile.tag}^{}`]); } catch {}
  const sourcePointer = { path: pointerPath, repository: pointerFile.repository, tag: pointerFile.tag, commit: pointerFile.commit, attestation: fetchedCommit === pointerFile.commit ? 'OBSERVED' : 'MISMATCH', ...(fetchedCommit === pointerFile.commit ? {} : { reason: 'FETCHED_GIT_TAG_OR_COMMIT_MISMATCH' }) };
  if (sourcePointer.repository !== 'https://github.com/nguyentuanson27-netizen/lanchatbot' || sourcePointer.tag !== release || !COMMIT.test(sourcePointer.commit)) fail('SOURCE_POINTER_INVALID');
  const rollback = JSON.parse(readFileSync(rollbackFile, 'utf8')); const services = {};
  for (const [name, def] of Object.entries(INVENTORY.services)) { const item = dockerInspect(def.container); const labels = item.Config?.Labels ?? {}; const revision = labels['org.opencontainers.image.revision']; const imageId = item.Image; const repoDigest = item.RepoDigests?.[0] ?? null; const attestation = revision === sourcePointer.commit ? 'OBSERVED' : revision ? 'MISMATCH' : 'UNVERIFIED'; if (!rollback[name]) fail(`ROLLBACK_MISSING:${name}`); services[name] = { state: 'DEPLOYED', container: def.container, image: item.Config.Image, imageId, registryDigest: repoDigest, ociLabels: Object.fromEntries(Object.entries(labels).filter(([key]) => key.startsWith('org.opencontainers.image.'))), attestation, ...(attestation === 'OBSERVED' ? {} : { reason: revision ? 'OCI_REVISION_MISMATCH_OR_NOT_FULL_COMMIT' : 'OCI_REVISION_LABEL_MISSING' }), rollback: rollback[name] }; }
  const migration = JSON.parse(readFileSync(migrationFile, 'utf8')); const routing = JSON.parse(readFileSync(routingFile, 'utf8'));
  const realtime = dockerInspect(INVENTORY.services['realtime-worker'].container); const delivery = dockerInspect(INVENTORY.services['delivery-worker'].container);
  const state = { schemaVersion: 1, capturedAt: new Date().toISOString(), environment: 'production', inventoryId: INVENTORY.inventoryId, candidateId, current: { release, symlinkTarget: target, sourcePointer }, services, database: { latestMigration: migration.latestMigration, migrationLedgerDigest: digestProjection(migration.rows, Object.keys(migration.rows)) }, digests: { realtimeNonSecretConfig: digestProjection(envMap(realtime.Config.Env), ALLOWLISTS.realtime), deliveryNonSecretConfig: digestProjection(envMap(delivery.Config.Env), ALLOWLISTS.delivery) }, routing: { canaryPageIds: routing.canaryPageIds, pageAllowlistDigest: digestProjection(routing.rows, ALLOWLISTS.routing) }, evidence: { reconciliationManifest: 'deploy/manifests/20260802-r32.2.2-runtime-reconciliation.json' } };
  validateRuntimeState(state); return state;
}

function arg(name) { const index = process.argv.indexOf(name); if (index === -1 || !process.argv[index + 1]) fail(`ARG_REQUIRED:${name}`); return process.argv[index + 1]; }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  if (action === 'validate') { validateRuntimeState(JSON.parse(readFileSync(arg('--state'), 'utf8'))); console.log('repository schema validation: PASS (not host parity)'); }
  else if (action === 'verify') { const candidate = JSON.parse(readFileSync(arg('--candidate'), 'utf8')); const live = JSON.parse(readFileSync(arg('--live'), 'utf8')); assertGateR(candidate); verifyParity(candidate, live); console.log('host parity validation: PASS'); }
  else if (action === 'promote') console.log(JSON.stringify(promoteVerifiedCandidate({ candidateFile: arg('--candidate'), liveFile: arg('--live'), runtimeRoot: arg('--runtime-root') })));
  else if (action === 'capture') { const state = captureState({ runtimeRoot: arg('--runtime-root'), migrationFile: arg('--migration-file'), routingFile: arg('--routing-file'), rollbackFile: arg('--rollback-file'), candidateId: arg('--candidate-id'), gitDir: arg('--git-dir') }); const output = arg('--output'); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' }); }
  else fail('USAGE: validate|verify|promote|capture');
}
