import { createHash } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = 'https://github.com/nguyentuanson27-netizen/lanchatbot';
const A0_MANIFEST = 'deploy/manifests/20260802-r32.2.2-runtime-reconciliation.json';
const SHA256 = /^[a-f0-9]{64}$/;
const IMAGE_ID = /^sha256:[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const UTC = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
function isUtcTimestamp(value) { return typeof value === 'string' && UTC.test(value) && Number.isFinite(Date.parse(value)); }
const SAFE_KEY = /^[A-Za-z0-9_]+$/;
const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|PRIVATE[_-]?KEY|CREDENTIAL)/i;

function fail(code) { throw new Error(code); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function nonEmpty(value, code) { if (typeof value !== 'string' || !value) fail(code); }
function onlyKeys(object, allowed, label) {
  if (!isObject(object)) fail(`${label}_NOT_OBJECT`);
  for (const key of Object.keys(object)) if (!allowed.includes(key)) fail(`${label}_UNKNOWN_FIELD:${key}`);
}
function safeScalar(value, code) {
  if (!['string', 'boolean', 'number'].includes(typeof value) || (typeof value === 'string' && /[\r\n]/.test(value))) fail(code);
  return value;
}
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function run(command, args) { return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

export function canonicalProjection(values, allowlistedKeys) {
  if (!isObject(values)) fail('PROJECTION_NOT_OBJECT');
  if (!Array.isArray(allowlistedKeys) || new Set(allowlistedKeys).size !== allowlistedKeys.length) fail('PROJECTION_ALLOWLIST_INVALID');
  for (const key of allowlistedKeys) if (!SAFE_KEY.test(key) || SECRET_NAME.test(key)) fail(`PROJECTION_SECRET_OR_INVALID_KEY:${key}`);
  const keys = [...allowlistedKeys].filter((key) => Object.hasOwn(values, key)).sort();
  return `${keys.map((key) => `${key}=${String(safeScalar(values[key], `PROJECTION_UNSTABLE_VALUE:${key}`))}`).join('\n')}\n`;
}

export function canonicalRows(rows, allowlistedFields) {
  if (!Array.isArray(rows)) fail('ROWS_NOT_ARRAY');
  for (const field of allowlistedFields) if (!SAFE_KEY.test(field) || SECRET_NAME.test(field)) fail(`ROWS_SECRET_OR_INVALID_FIELD:${field}`);
  const projected = rows.map((row, rowIndex) => {
    if (!isObject(row)) fail(`ROW_NOT_OBJECT:${rowIndex}`);
    return allowlistedFields.map((field) => safeScalar(row[field], `ROW_FIELD_INVALID:${rowIndex}:${field}`));
  });
  projected.sort((left, right) => Buffer.from(JSON.stringify(left)).compare(Buffer.from(JSON.stringify(right))));
  return `${projected.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

export function digestProjection(values, allowlistedKeys) {
  return {
    sha256: sha256(Buffer.from(canonicalProjection(values, allowlistedKeys), 'utf8')),
    canonicalization: 'UTF-8 KEY=VALUE; explicit non-secret allowlist; unknown keys excluded; bytewise key sort; LF terminal newline',
    allowlistedKeys: [...allowlistedKeys].sort(),
  };
}

export function digestRows(rows, allowlistedFields) {
  return {
    sha256: sha256(Buffer.from(canonicalRows(rows, allowlistedFields), 'utf8')),
    canonicalization: 'UTF-8 JSON arrays containing allowlisted fields; bytewise row sort; LF terminal newline',
    allowlistedKeys: [...allowlistedFields],
  };
}

function validateDigest(value, code) {
  onlyKeys(value, ['sha256', 'canonicalization', 'allowlistedKeys'], code);
  if (!SHA256.test(value.sha256)) fail(`${code}_SHA256`);
  nonEmpty(value.canonicalization, `${code}_CANONICALIZATION`);
  if (!Array.isArray(value.allowlistedKeys) || value.allowlistedKeys.some((key) => !SAFE_KEY.test(key) || SECRET_NAME.test(key))) fail(`${code}_ALLOWLIST`);
}

export function validateRuntimeState(state, inventory) {
  onlyKeys(state, ['schemaVersion', 'capturedAt', 'environment', 'inventoryId', 'candidateId', 'history', 'current', 'services', 'database', 'digests', 'routing', 'evidence'], 'STATE');
  if (state.schemaVersion !== 1 || state.environment !== 'production' || state.inventoryId !== inventory.inventoryId) fail('STATE_VERSION_OR_INVENTORY');
  if (!isUtcTimestamp(state.capturedAt) || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/.test(state.candidateId)) fail('STATE_CAPTURE_METADATA');
  onlyKeys(state.history, ['path'], 'HISTORY');
  const expectedHistory = `/opt/lana-chatbot/runtime-state/history/${state.capturedAt.replace(/[:.]/g, '-')}-${state.current?.release}.json`;
  if (state.history.path !== expectedHistory) fail('HISTORY_PATH');
  onlyKeys(state.current, ['release', 'symlinkTarget', 'sourcePointer'], 'CURRENT');
  nonEmpty(state.current.release, 'CURRENT_RELEASE');
  if (state.current.symlinkTarget !== `/opt/lana-chatbot/releases/${state.current.release}`) fail('CURRENT_SYMLINK');
  const pointer = state.current.sourcePointer;
  onlyKeys(pointer, ['path', 'release', 'repository', 'tag', 'commit', 'createdAt', 'attestation', 'reason'], 'SOURCE_POINTER');
  if (pointer.path !== `${state.current.symlinkTarget}/.release-source.json` || pointer.release !== state.current.release || pointer.repository !== REPOSITORY || pointer.tag !== state.current.release || !COMMIT.test(pointer.commit) || !isUtcTimestamp(pointer.createdAt) || !['OBSERVED', 'UNVERIFIED', 'MISMATCH'].includes(pointer.attestation)) fail('SOURCE_POINTER_INVALID');
  if (pointer.attestation !== 'OBSERVED' && !pointer.reason) fail('SOURCE_POINTER_REASON_REQUIRED');
  if (!isObject(state.services)) fail('SERVICES_NOT_OBJECT');
  for (const [name, definition] of Object.entries(inventory.services)) {
    const service = state.services[name];
    if (!service && definition.required) fail(`SERVICE_MISSING:${name}`);
    if (!service) continue;
    onlyKeys(service, ['state', 'container', 'image', 'imageId', 'registryDigest', 'ociLabels', 'attestation', 'reason', 'rollback'], `SERVICE:${name}`);
    if (!['DEPLOYED', 'NOT_DEPLOYED'].includes(service.state) || service.container !== definition.container || !IMAGE_ID.test(service.imageId) || (service.registryDigest !== null && !/^.+@sha256:[a-f0-9]{64}$/.test(service.registryDigest)) || !isObject(service.ociLabels) || !['OBSERVED', 'UNVERIFIED', 'MISMATCH'].includes(service.attestation)) fail(`SERVICE_INVALID:${name}`);
    if (definition.required && service.state !== 'DEPLOYED') fail(`SERVICE_REQUIRED_NOT_DEPLOYED:${name}`);
    if (service.state === 'NOT_DEPLOYED' && service.attestation !== 'UNVERIFIED') fail(`OPTIONAL_NOT_DEPLOYED_ONLY:${name}`);
    if (service.attestation !== 'OBSERVED' && !service.reason) fail(`SERVICE_REASON_REQUIRED:${name}`);
    onlyKeys(service.rollback, ['release', 'image', 'imageId'], `ROLLBACK:${name}`);
    nonEmpty(service.rollback.release, `ROLLBACK_RELEASE:${name}`);
    nonEmpty(service.rollback.image, `ROLLBACK_IMAGE:${name}`);
    if (!IMAGE_ID.test(service.rollback.imageId)) fail(`ROLLBACK_INVALID:${name}`);
  }
  for (const name of Object.keys(state.services)) if (!Object.hasOwn(inventory.services, name)) fail(`SERVICE_UNKNOWN:${name}`);
  onlyKeys(state.database, ['latestMigration', 'migrationLedgerDigest'], 'DATABASE');
  nonEmpty(state.database.latestMigration, 'MIGRATION_LATEST'); validateDigest(state.database.migrationLedgerDigest, 'MIGRATION_DIGEST');
  if (!isObject(state.digests) || Object.keys(state.digests).length === 0) fail('DIGESTS_NOT_OBJECT');
  for (const [name, value] of Object.entries(state.digests)) validateDigest(value, `DIGEST:${name}`);
  onlyKeys(state.routing, ['canaryPageIds', 'pageAllowlistDigest'], 'ROUTING');
  if (!Array.isArray(state.routing.canaryPageIds) || new Set(state.routing.canaryPageIds).size !== state.routing.canaryPageIds.length || state.routing.canaryPageIds.some((id) => !/^\d+$/.test(id))) fail('ROUTING_PAGES');
  validateDigest(state.routing.pageAllowlistDigest, 'ROUTING_DIGEST');
  onlyKeys(state.evidence, ['reconciliationManifest'], 'EVIDENCE');
  if (state.evidence.reconciliationManifest !== A0_MANIFEST) fail('EVIDENCE_A0_REQUIRED');
  return true;
}

export function assertGateR(state, inventory) {
  validateRuntimeState(state, inventory);
  if (state.current.sourcePointer.attestation !== 'OBSERVED') fail('GATE_R_SOURCE_NOT_OBSERVED');
  for (const [name, definition] of Object.entries(inventory.services)) {
    if (definition.required && state.services[name].attestation !== 'OBSERVED') fail(`GATE_R_SERVICE_NOT_OBSERVED:${name}`);
  }
  return true;
}

function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
export function verifyParity(candidate, observed, inventory) {
  assertGateR(candidate, inventory); assertGateR(observed, inventory);
  if (candidate.current.release !== observed.current.release || candidate.current.symlinkTarget !== observed.current.symlinkTarget || !sameJson(candidate.current.sourcePointer, observed.current.sourcePointer)) fail('PARITY_CURRENT_MISMATCH');
  for (const name of Object.keys(inventory.services)) {
    const expected = candidate.services[name]; const actual = observed.services[name];
    if (!sameJson(expected, actual)) fail(`PARITY_SERVICE_MISMATCH:${name}`);
  }
  if (!sameJson(candidate.database, observed.database)) fail('PARITY_DATABASE_MISMATCH');
  if (!sameJson(candidate.digests, observed.digests)) fail('PARITY_CONFIG_DIGEST_MISMATCH');
  if (!sameJson(candidate.routing, observed.routing)) fail('PARITY_ROUTING_MISMATCH');
  return true;
}

export function attestSourcePointer(pointerFile, path, fetchedCommit) {
  onlyKeys(pointerFile, ['schemaVersion', 'release', 'repository', 'tag', 'commit', 'createdAt'], 'RELEASE_SOURCE_FILE');
  if (pointerFile.schemaVersion !== 1 || pointerFile.repository !== REPOSITORY || pointerFile.release !== pointerFile.tag || !COMMIT.test(pointerFile.commit) || !isUtcTimestamp(pointerFile.createdAt)) fail('RELEASE_SOURCE_FILE_INVALID');
  return {
    path, release: pointerFile.release, repository: pointerFile.repository, tag: pointerFile.tag, commit: pointerFile.commit, createdAt: pointerFile.createdAt,
    attestation: fetchedCommit === pointerFile.commit ? 'OBSERVED' : 'MISMATCH', ...(fetchedCommit === pointerFile.commit ? {} : { reason: 'FETCHED_GIT_TAG_OR_COMMIT_MISMATCH' }),
  };
}
export function validateServiceEvidence(evidence, inventory) {
  onlyKeys(evidence, ['schemaVersion', 'inventoryId', 'services'], 'SERVICE_EVIDENCE');
  if (evidence.schemaVersion !== 1 || evidence.inventoryId !== inventory.inventoryId || !isObject(evidence.services)) fail('SERVICE_EVIDENCE_VERSION_OR_INVENTORY');
  for (const [name, definition] of Object.entries(inventory.services)) {
    const record = evidence.services[name];
    if (!record && definition.required) fail(`SERVICE_EVIDENCE_MISSING:${name}`);
    if (!record) continue;
    onlyKeys(record, ['expectedImageId', 'expectedRevision', 'revisionRequired', 'rollback'], `SERVICE_EVIDENCE:${name}`);
    if (!IMAGE_ID.test(record.expectedImageId) || typeof record.revisionRequired !== 'boolean' || (record.expectedRevision !== undefined && !COMMIT.test(record.expectedRevision))) fail(`SERVICE_EVIDENCE_INVALID:${name}`);
    if (record.revisionRequired && !COMMIT.test(record.expectedRevision ?? '')) fail(`SERVICE_EVIDENCE_REVISION_REQUIRED:${name}`);
    onlyKeys(record.rollback, ['release', 'image', 'imageId'], `SERVICE_EVIDENCE_ROLLBACK:${name}`);
    nonEmpty(record.rollback.release, `SERVICE_EVIDENCE_ROLLBACK_RELEASE:${name}`); nonEmpty(record.rollback.image, `SERVICE_EVIDENCE_ROLLBACK_IMAGE:${name}`);
    if (!IMAGE_ID.test(record.rollback.imageId)) fail(`SERVICE_EVIDENCE_ROLLBACK_INVALID:${name}`);
  }
  for (const name of Object.keys(evidence.services)) if (!Object.hasOwn(inventory.services, name)) fail(`SERVICE_EVIDENCE_UNKNOWN_SERVICE:${name}`);
  return true;
}
export function attestServiceEvidence({ actualImageId, actualRevision, evidence, expectedRevisionFetched = true }) {
  if (!IMAGE_ID.test(evidence.expectedImageId) || actualImageId !== evidence.expectedImageId) return { attestation: 'MISMATCH', reason: 'EXPECTED_IMAGE_ID_MISMATCH' };
  if (evidence.revisionRequired) {
    if (!COMMIT.test(evidence.expectedRevision ?? '')) return { attestation: 'UNVERIFIED', reason: 'EXPECTED_FULL_REVISION_MISSING' };
    if (actualRevision !== evidence.expectedRevision) return { attestation: 'MISMATCH', reason: 'OCI_REVISION_MISMATCH_OR_NOT_FULL_COMMIT' };
    if (!expectedRevisionFetched) return { attestation: 'UNVERIFIED', reason: 'EXPECTED_REVISION_NOT_FETCHED' };
  } else if (actualRevision && evidence.expectedRevision && actualRevision !== evidence.expectedRevision) return { attestation: 'MISMATCH', reason: 'OCI_REVISION_CONFLICTS_WITH_EXPECTED' };
  return { attestation: 'OBSERVED' };
}

function observedService(name, definition, evidence, gitDir) {
  const container = readJsonFromCommand('docker', ['inspect', definition.container]);
  if (container.length !== 1) fail(`CONTAINER_NOT_UNIQUE:${name}`);
  const containerRecord = container[0];
  const image = readJsonFromCommand('docker', ['image', 'inspect', containerRecord.Image]);
  if (image.length !== 1 || image[0].Id !== containerRecord.Image) fail(`IMAGE_INSPECTION_MISMATCH:${name}`);
  const imageRecord = image[0]; const labels = imageRecord.Config?.Labels ?? containerRecord.Config?.Labels ?? {};
  const actualRevision = labels['org.opencontainers.image.revision'] ?? null;
  let expectedRevisionFetched = true;
  if (evidence.revisionRequired && COMMIT.test(evidence.expectedRevision ?? '')) {
    try { run('git', ['-C', gitDir, 'cat-file', '-e', `${evidence.expectedRevision}^{commit}`]); } catch { expectedRevisionFetched = false; }
  }
  const result = attestServiceEvidence({ actualImageId: containerRecord.Image, actualRevision, evidence, expectedRevisionFetched });
  const registryDigest = [...(imageRecord.RepoDigests ?? [])].sort()[0] ?? null;
  return {
    state: 'DEPLOYED', container: definition.container, image: containerRecord.Config.Image, imageId: containerRecord.Image, registryDigest,
    ociLabels: Object.fromEntries(Object.entries(labels).filter(([key]) => key.startsWith('org.opencontainers.image.')).sort(([left], [right]) => left.localeCompare(right))),
    ...result, rollback: evidence.rollback,
  };
}

function readJsonFromCommand(command, args) { return JSON.parse(run(command, args)); }
function envMap(entries = []) {
  return Object.fromEntries(entries.map((entry) => { const index = entry.indexOf('='); if (index < 1) fail('ENV_ENTRY_INVALID'); return [entry.slice(0, index), entry.slice(index + 1)]; }));
}

export function parseDelimitedRows(output, fields) {
  if (typeof output !== 'string' || !output.trim()) fail('LIVE_DATABASE_QUERY_EMPTY');
  return output.trim().split(/\r?\n/).map((line, index) => {
    const values = line.split('\t'); if (values.length !== fields.length) fail(`LIVE_DATABASE_ROW_SHAPE:${index}`);
    return Object.fromEntries(fields.map((field, fieldIndex) => [field, values[fieldIndex]]));
  });
}

function captureLiveDatabase(inventory) {
  const postgresContainer = inventory.services.postgres.container;
  const postgres = readJsonFromCommand('docker', ['inspect', postgresContainer]); if (postgres.length !== 1) fail('POSTGRES_CONTAINER_NOT_UNIQUE');
  const postgresEnv = envMap(postgres[0].Config.Env); const user = postgresEnv.POSTGRES_USER; const database = postgresEnv.POSTGRES_DB; const password = postgresEnv.POSTGRES_PASSWORD;
  nonEmpty(user, 'POSTGRES_USER_MISSING'); nonEmpty(database, 'POSTGRES_DB_MISSING'); nonEmpty(password, 'POSTGRES_PASSWORD_MISSING');
  const query = (sql) => {
    const invocation = postgresQueryInvocation({ container: postgresContainer, user, database, password, sql }, process.env);
    return execFileSync('docker', invocation.args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: invocation.env }).trim();
  };
  const migrationRows = parseDelimitedRows(query('SELECT migration_name, checksum_sha256 FROM schema_migrations ORDER BY migration_name'), ['migration', 'checksumSha256']);
  for (const row of migrationRows) if (!row.migration || !SHA256.test(row.checksumSha256)) fail('LIVE_MIGRATION_ROW_INVALID');
  const routingRaw = parseDelimitedRows(query('SELECT page_id, status, routing_owner, app_send_enabled, kill_switch FROM pages ORDER BY page_id'), ['page_id', 'status', 'routing_owner', 'app_send_enabled', 'kill_switch']);
  const routingRows = routingRaw.map((row) => ({ ...row, app_send_enabled: row.app_send_enabled === 't' ? true : row.app_send_enabled === 'f' ? false : fail('LIVE_ROUTING_BOOLEAN'), kill_switch: row.kill_switch === 't' ? true : row.kill_switch === 'f' ? false : fail('LIVE_ROUTING_BOOLEAN') }));
  return { migration: { latestMigration: migrationRows.at(-1).migration, rows: migrationRows }, routing: { canaryPageIds: routingRows.filter((row) => row.status === 'ACTIVE' && row.routing_owner === 'APP').map((row) => row.page_id), rows: routingRows } };
}

export function postgresQueryInvocation({ container, user, database, password, sql }, baseEnvironment = {}) {
  nonEmpty(container, 'POSTGRES_CONTAINER_MISSING'); nonEmpty(user, 'POSTGRES_USER_MISSING'); nonEmpty(database, 'POSTGRES_DB_MISSING'); nonEmpty(password, 'POSTGRES_PASSWORD_MISSING'); nonEmpty(sql, 'POSTGRES_QUERY_MISSING');
  return {
    args: ['exec', '--env', 'PGPASSWORD', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', database, '-At', '-F', '\t', '-c', sql],
    env: { ...baseEnvironment, PGPASSWORD: password },
  };
}

export function buildRuntimeState({ candidateId, capturedAt, target, pointer, services, migration, routing, realtimeEnv, deliveryEnv, inventory, allowlists }) {
  const release = basename(target);
  const state = {
    schemaVersion: 1, capturedAt, environment: 'production', inventoryId: inventory.inventoryId, candidateId,
    history: { path: `/opt/lana-chatbot/runtime-state/history/${capturedAt.replace(/[:.]/g, '-')}-${release}.json` },
    current: { release, symlinkTarget: target, sourcePointer: pointer }, services,
    database: { latestMigration: migration.latestMigration, migrationLedgerDigest: digestRows(migration.rows, ['migration', 'checksumSha256']) },
    digests: { realtimeNonSecretConfig: digestProjection(realtimeEnv, allowlists.realtime), deliveryNonSecretConfig: digestProjection(deliveryEnv, allowlists.delivery) },
    routing: { canaryPageIds: [...routing.canaryPageIds].sort(), pageAllowlistDigest: digestRows(routing.rows, allowlists.routing) },
    evidence: { reconciliationManifest: A0_MANIFEST },
  };
  validateRuntimeState(state, inventory); return state;
}

export function captureState({ runtimeRoot, serviceEvidenceFile, candidateId, gitDir, inventory, allowlists, capturedAt = new Date().toISOString() }) {
  const target = run('readlink', ['-f', `${runtimeRoot}/current`]);
  if (target !== `/opt/lana-chatbot/releases/${basename(target)}`) fail('CURRENT_TARGET_OUTSIDE_RELEASES');
  const pointerPath = `${target}/.release-source.json`; if (!existsSync(pointerPath)) fail('SOURCE_POINTER_MISSING');
  const pointerFile = readJson(pointerPath); let fetchedCommit = null;
  try { fetchedCommit = run('git', ['-C', gitDir, 'rev-parse', `${pointerFile.tag}^{}`]); } catch {}
  const pointer = attestSourcePointer(pointerFile, pointerPath, fetchedCommit);
  const evidence = readJson(serviceEvidenceFile); validateServiceEvidence(evidence, inventory);
  const services = {};
  for (const [name, definition] of Object.entries(inventory.services)) {
    if (!definition.required && !evidence.services[name]) continue;
    if (!evidence.services[name]) fail(`SERVICE_EVIDENCE_MISSING:${name}`);
    services[name] = observedService(name, definition, evidence.services[name], gitDir);
  }
  const realtime = readJsonFromCommand('docker', ['inspect', inventory.services['realtime-worker'].container])[0];
  const delivery = readJsonFromCommand('docker', ['inspect', inventory.services['delivery-worker'].container])[0];
  const liveDatabase = captureLiveDatabase(inventory);
  return buildRuntimeState({ candidateId, capturedAt, target, pointer, services, migration: liveDatabase.migration, routing: liveDatabase.routing, realtimeEnv: envMap(realtime.Config.Env), deliveryEnv: envMap(delivery.Config.Env), inventory, allowlists });
}

export function promoteVerifiedCandidate({ candidateFile, observedFile, runtimeRoot, inventory }) {
  const candidate = readJson(candidateFile); const observed = readJson(observedFile); verifyParity(candidate, observed, inventory);
  const bytes = readFileSync(candidateFile); const candidateDigest = sha256(bytes);
  const expectedRoot = resolve(runtimeRoot); const historyFile = resolve(expectedRoot, 'history', basename(candidate.history.path));
  mkdirSync(dirname(historyFile), { recursive: true }); mkdirSync(expectedRoot, { recursive: true });
  const historyFd = openSync(historyFile, 'wx'); try { writeFileSync(historyFd, bytes); fsyncSync(historyFd); } finally { closeSync(historyFd); }
  const currentFile = resolve(expectedRoot, 'current.json'); const nextFile = `${currentFile}.${process.pid}.next`; const priorFile = `${currentFile}.${process.pid}.prior`;
  let hadPrior = false;
  try {
    if (existsSync(currentFile)) { copyFileSync(currentFile, priorFile); hadPrior = true; }
    const nextFd = openSync(nextFile, 'wx'); try { writeFileSync(nextFd, bytes); fsyncSync(nextFd); } finally { closeSync(nextFd); }
    renameSync(nextFile, currentFile);
    const readback = readFileSync(currentFile); if (sha256(readback) !== candidateDigest || !readFileSync(historyFile).equals(readback)) fail('PROMOTION_READBACK_DIGEST_OR_HISTORY');
    verifyParity(JSON.parse(readback), observed, inventory);
  } catch (error) {
    if (hadPrior) renameSync(priorFile, currentFile); else rmSync(currentFile, { force: true });
    rmSync(nextFile, { force: true }); throw error;
  }
  rmSync(priorFile, { force: true });
  return { historyFile, currentFile, sha256: candidateDigest };
}

export function recordIncident({ incidentDir, candidateFile, reason, now = new Date().toISOString() }) {
  mkdirSync(incidentDir, { recursive: true }); const candidate = basename(candidateFile);
  const path = resolve(incidentDir, `${now.replace(/[:.]/g, '-')}-${candidate}`);
  const body = `${JSON.stringify({ schemaVersion: 1, type: 'RUNTIME_STATE_PARITY_MISMATCH', candidate, recordedAt: now, reason })}\n`;
  writeFileSync(path, body, { flag: 'wx' }); return path;
}

function arg(name) { const index = process.argv.indexOf(name); if (index === -1 || !process.argv[index + 1]) fail(`ARG_REQUIRED:${name}`); return process.argv[index + 1]; }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = process.argv[2]; const inventory = readJson(resolve(ROOT, 'service-inventory.json')); const allowlists = readJson(resolve(ROOT, 'config-allowlists.json'));
  if (action === 'validate') { validateRuntimeState(readJson(arg('--state')), inventory); console.log('repository runtime-state contract validation: PASS (not host parity)'); }
  else if (action === 'capture') {
    const state = captureState({ runtimeRoot: arg('--runtime-root'), serviceEvidenceFile: arg('--service-evidence-file'), candidateId: arg('--candidate-id'), gitDir: arg('--git-dir'), inventory, allowlists });
    const output = arg('--output'); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
  } else if (action === 'verify') { verifyParity(readJson(arg('--candidate')), readJson(arg('--observed')), inventory); console.log('fresh host parity validation: PASS'); }
  else if (action === 'promote') console.log(JSON.stringify(promoteVerifiedCandidate({ candidateFile: arg('--candidate'), observedFile: arg('--observed'), runtimeRoot: arg('--runtime-root'), inventory })));
  else if (action === 'incident') console.log(recordIncident({ incidentDir: arg('--incident-dir'), candidateFile: arg('--candidate'), reason: arg('--reason') }));
  else fail('USAGE: validate|capture|verify|promote|incident');
}
