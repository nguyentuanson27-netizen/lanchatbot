import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertGateR,
  attestSourcePointer,
  attestServiceEvidence,
  buildDeployRepositoryGitInvocation,
  buildRuntimeState,
  canonicalProjection,
  canonicalRows,
  digestProjection,
  digestRows,
  parseDelimitedRows,
  postgresQueryInvocation,
  promoteVerifiedCandidate,
  resolveTrustedDeployGitIdentity,
  validateRuntimeState,
  validateServiceEvidence,
  verifyParity,
} from './runtime-state.mjs';
import { createReleaseSource } from './release-source.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(readFileSync(join(here, 'service-inventory.json'), 'utf8'));
const allowlists = JSON.parse(readFileSync(join(here, 'config-allowlists.json'), 'utf8'));
const serviceEvidenceExample = JSON.parse(readFileSync(join(here, 'service-evidence.example.json'), 'utf8'));
const example = JSON.parse(readFileSync(join(here, 'example.json'), 'utf8'));
const clone = (value = example) => structuredClone(value);
const throws = (fn, message) => assert.throws(fn, new RegExp(message));

const deployGitUid = '997';
const deployGitIdentityPaths = {
  home: '/home/lana-deploy',
  ssh: '/home/lana-deploy/.ssh',
  key: '/home/lana-deploy/.ssh/lana_chatbot_github_ed25519',
  knownHosts: '/home/lana-deploy/.ssh/known_hosts',
};
function deployGitIdentityFs({ invalidPath, resolvedPath, credentialUid = Number(deployGitUid) } = {}) {
  return {
    lstatSync(path) {
      if (path === invalidPath) {
        return {
          isDirectory: () => path === deployGitIdentityPaths.home || path === deployGitIdentityPaths.ssh,
          isFile: () => path === deployGitIdentityPaths.key || path === deployGitIdentityPaths.knownHosts,
          isSymbolicLink: () => !resolvedPath,
          uid: credentialUid,
          mode: 0o100600,
        };
      }
      if (path === deployGitIdentityPaths.home || path === deployGitIdentityPaths.ssh) {
        return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false, uid: Number(deployGitUid), mode: 0o40700 };
      }
      if (path === deployGitIdentityPaths.key || path === deployGitIdentityPaths.knownHosts) {
        return { isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false, uid: credentialUid, mode: 0o100600 };
      }
      throw new Error(`unexpected path ${path}`);
    },
    realpathSync(path) { return path === invalidPath && resolvedPath ? resolvedPath : path; },
  };
}
const deployGitUserId = () => deployGitUid;
assert.deepEqual(resolveTrustedDeployGitIdentity(deployGitIdentityFs(), deployGitUserId), deployGitIdentityPaths);
for (const [path, code] of [
  [deployGitIdentityPaths.home, 'RUNTIME_STATE_DEPLOY_GIT_HOME_INVALID'],
  [deployGitIdentityPaths.ssh, 'RUNTIME_STATE_DEPLOY_GIT_SSH_DIRECTORY_INVALID'],
  [deployGitIdentityPaths.key, 'RUNTIME_STATE_DEPLOY_GIT_IDENTITY_INVALID'],
  [deployGitIdentityPaths.knownHosts, 'RUNTIME_STATE_DEPLOY_GIT_IDENTITY_INVALID'],
]) {
  throws(() => resolveTrustedDeployGitIdentity(deployGitIdentityFs({ invalidPath: path }), deployGitUserId), code);
  throws(() => resolveTrustedDeployGitIdentity(deployGitIdentityFs({ invalidPath: path, resolvedPath: '/tmp/redirected-credential' }), deployGitUserId), code);
}
throws(() => resolveTrustedDeployGitIdentity(deployGitIdentityFs({ credentialUid: 998 }), deployGitUserId), 'RUNTIME_STATE_DEPLOY_GIT_IDENTITY_INVALID');
const deployGitInvocation = buildDeployRepositoryGitInvocation('/opt/lana-chatbot/repository', ['cat-file', '-e', `${'a'.repeat(40)}^{commit}`], {
  fileSystem: {
    lstatSync(path) {
      if (path === '/opt/lana-chatbot/repository') return { isDirectory: () => true, isSymbolicLink: () => false };
      return deployGitIdentityFs().lstatSync(path);
    },
    realpathSync(path) { return path; },
  },
  resolveUserId: deployGitUserId,
});
assert.equal(deployGitInvocation.command, '/usr/sbin/runuser');
assert.deepEqual(deployGitInvocation.args.slice(0, 11), [
  '-u', 'lana-deploy', '--', '/usr/bin/env', '-i',
  'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  'HOME=/home/lana-deploy', 'GIT_CONFIG_NOSYSTEM=1', 'GIT_CONFIG_GLOBAL=/dev/null',
  'GIT_CONFIG_COUNT=1', 'GIT_CONFIG_KEY_0=core.sshCommand',
]);
assert.match(deployGitInvocation.args[11], /^GIT_CONFIG_VALUE_0=\/usr\/bin\/ssh -F \/dev\/null -i \/home\/lana-deploy\/\.ssh\/lana_chatbot_github_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=\/home\/lana-deploy\/\.ssh\/known_hosts$/u);

assert.equal(canonicalProjection({ B: '2', A: '1', UNKNOWN: 'excluded', META_TOKEN: 'excluded' }, ['A', 'B']), 'A=1\nB=2\n');
assert.equal(digestProjection({ A: '1', B: '2' }, ['B', 'A']).sha256, digestProjection({ B: '2', A: '1', EXTRA: 'ignored' }, ['A', 'B']).sha256);
throws(() => canonicalProjection({ META_TOKEN: 'x' }, ['META_TOKEN']), 'PROJECTION_SECRET_OR_INVALID_KEY');
const sourcePointerFile = JSON.parse(readFileSync(join(here, '.release-source.example.json'), 'utf8'));
assert.equal(attestSourcePointer(sourcePointerFile, '/opt/lana-chatbot/releases/example-release/.release-source.json', sourcePointerFile.commit).attestation, 'OBSERVED');
assert.equal(attestSourcePointer(sourcePointerFile, '/opt/lana-chatbot/releases/example-release/.release-source.json', 'd'.repeat(40)).attestation, 'MISMATCH');
const serviceEvidence = { expectedImageId: 'sha256:' + 'a'.repeat(64), expectedRevision: 'c'.repeat(40), revisionRequired: true };
assert.deepEqual(attestServiceEvidence({ actualImageId: serviceEvidence.expectedImageId, actualRevision: serviceEvidence.expectedRevision, evidence: serviceEvidence }), { attestation: 'OBSERVED' });
assert.deepEqual(attestServiceEvidence({ actualImageId: serviceEvidence.expectedImageId, actualRevision: 'cccccccc', evidence: serviceEvidence }), { attestation: 'MISMATCH', reason: 'OCI_REVISION_MISMATCH_OR_NOT_FULL_COMMIT' });
assert.deepEqual(attestServiceEvidence({ actualImageId: 'sha256:' + 'b'.repeat(64), actualRevision: serviceEvidence.expectedRevision, evidence: serviceEvidence }), { attestation: 'MISMATCH', reason: 'EXPECTED_IMAGE_ID_MISMATCH' });
assert.equal(canonicalRows([{ b: 2, a: 1, ignored: 'x' }, { b: 1, a: 2 }], ['a', 'b']), '[1,2]\n[2,1]\n');
assert.deepEqual(parseDelimitedRows('a\tb\nc\td', ['left', 'right']), [{ left: 'a', right: 'b' }, { left: 'c', right: 'd' }]);
throws(() => parseDelimitedRows('a|b', ['left', 'right']), 'LIVE_DATABASE_ROW_SHAPE');
const databasePassword = 'host-only-password-sentinel';
const databaseQuery = 'SELECT migration_name, checksum_sha256 FROM schema_migrations ORDER BY migration_name';
const databaseInvocation = postgresQueryInvocation({ container: 'postgres', user: 'lana_app', database: 'lana_chatbot', password: databasePassword, sql: databaseQuery }, { SAFE_PARENT_ENV: 'preserved' });
assert.deepEqual(databaseInvocation.args, ['exec', '--env', 'PGPASSWORD', '--env', 'PGOPTIONS=-c default_transaction_read_only=on', 'postgres', 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'lana_app', '-d', 'lana_chatbot', '-At', '-F', '\t', '-c', `BEGIN TRANSACTION READ ONLY; ${databaseQuery}; COMMIT;`]);
assert.equal(databaseInvocation.args.includes(databasePassword), false);
assert.deepEqual(databaseInvocation.env, { SAFE_PARENT_ENV: 'preserved', PGPASSWORD: databasePassword });
throws(() => postgresQueryInvocation({ container: 'postgres', user: 'lana_app', database: 'lana_chatbot', password: '', sql: databaseQuery }), 'POSTGRES_PASSWORD_MISSING');
throws(() => postgresQueryInvocation({ container: 'postgres', user: 'lana_app', database: 'lana_chatbot', password: databasePassword, sql: 'UPDATE pages SET status = \'ACTIVE\'' }), 'POSTGRES_QUERY_NOT_ALLOWLISTED');
for (const release of ['20260812-unbounded-text-media-guard-r5.7', '20260812-unbounded-text-media-guard-r5.7.1']) {
  const reviewedBaselineSource = readFileSync(join(here, '..', 'releases', release, 'validate-reviewed-live-baseline.mjs'), 'utf8');
  const reviewedBaselineQueries = [...reviewedBaselineSource.matchAll(/"(SELECT [^"]+)"/gu)].map((match) => match[1]).filter((sql) => sql.includes("CLOSING_STRATEGY") || sql.includes("jsonb_agg"));
  assert.equal(reviewedBaselineQueries.length, 2, `the existing ${release} reviewed-baseline queries must remain explicit`);
  for (const sql of reviewedBaselineQueries) {
    const invocation = postgresQueryInvocation({ container: 'postgres', user: 'lana_app', database: 'lana_chatbot', password: databasePassword, sql });
    assert.match(invocation.args.at(-1), /^BEGIN TRANSACTION READ ONLY; SELECT /u, 'existing reviewed-baseline queries must retain the database read-only transaction boundary');
  }
}
assert.equal(digestRows([{ migration: 'b', checksumSha256: '2' }, { migration: 'a', checksumSha256: '1' }], ['migration', 'checksumSha256']).sha256, digestRows([{ migration: 'a', checksumSha256: '1' }, { migration: 'b', checksumSha256: '2' }], ['migration', 'checksumSha256']).sha256);

validateServiceEvidence(serviceEvidenceExample, inventory);
const missingEvidence = structuredClone(serviceEvidenceExample); delete missingEvidence.services.api; throws(() => validateServiceEvidence(missingEvidence, inventory), 'SERVICE_EVIDENCE_MISSING:api');
validateRuntimeState(example, inventory); assertGateR(example, inventory); verifyParity(example, clone(), inventory);
const mixed = clone(); mixed.services.api.image = 'example:other-version'; validateRuntimeState(mixed, inventory);
const missing = clone(); delete missing.services.api; throws(() => validateRuntimeState(missing, inventory), 'SERVICE_MISSING:api');
const optional = clone(); optional.services['reporting-sidecar'] = { ...clone().services.api, state: 'NOT_DEPLOYED', container: 'lana-chatbot-reporting-sidecar', attestation: 'UNVERIFIED', reason: 'OPTIONAL_SERVICE_ABSENT' }; validateRuntimeState(optional, inventory);
const badOptional = clone(optional); badOptional.services['reporting-sidecar'].attestation = 'OBSERVED'; delete badOptional.services['reporting-sidecar'].reason; throws(() => validateRuntimeState(badOptional, inventory), 'OPTIONAL_NOT_DEPLOYED_ONLY');
const mismatch = clone(); mismatch.services['realtime-worker'].attestation = 'MISMATCH'; mismatch.services['realtime-worker'].reason = 'OCI_REVISION_MISMATCH_OR_NOT_FULL_COMMIT'; throws(() => assertGateR(mismatch, inventory), 'GATE_R_SERVICE_NOT_OBSERVED:realtime-worker');
const partial = clone(); partial.current.sourcePointer.attestation = 'UNVERIFIED'; partial.current.sourcePointer.reason = 'SOURCE_NOT_FETCHED'; throws(() => assertGateR(partial, inventory), 'GATE_R_SOURCE_NOT_OBSERVED');
const differentConfig = clone(); differentConfig.digests.realtimeNonSecretConfig.sha256 = '9'.repeat(64); throws(() => verifyParity(example, differentConfig, inventory), 'PARITY_CONFIG_DIGEST_MISMATCH');
const differentRouting = clone(); differentRouting.routing.canaryPageIds = ['2']; throws(() => verifyParity(example, differentRouting, inventory), 'PARITY_ROUTING_MISMATCH');

const built = buildRuntimeState({
  candidateId: 'deterministic-candidate', capturedAt: example.capturedAt, target: example.current.symlinkTarget, pointer: example.current.sourcePointer, services: example.services,
  migration: { latestMigration: '0001_core', rows: [{ migration: '0001_core', checksumSha256: 'a'.repeat(64) }] },
  routing: { canaryPageIds: ['2', '1'], rows: [{ page_id: '2', status: 'ACTIVE', routing_owner: 'APP', app_send_enabled: true, kill_switch: false }, { page_id: '1', status: 'INACTIVE', routing_owner: 'APP', app_send_enabled: false, kill_switch: true }] },
  realtimeEnv: { APP_SEND_ENABLED: 'true', UNKNOWN: 'ignored' }, deliveryEnv: { APP_SEND_ENABLED: 'true', PASSWORD: 'ignored' }, inventory, allowlists,
});
validateRuntimeState(built, inventory); assert.deepEqual(built.routing.canaryPageIds, ['1', '2']);

const runtimeRoot = mkdtempSync(join(tmpdir(), 'runtime-state-')); const candidateFile = join(runtimeRoot, 'candidate.json'); const observedFile = join(runtimeRoot, 'observed.json');
writeFileSync(candidateFile, JSON.stringify(example)); writeFileSync(observedFile, JSON.stringify(example)); writeFileSync(join(runtimeRoot, 'current.json'), 'prior-known-good');
const result = promoteVerifiedCandidate({ candidateFile, observedFile, runtimeRoot, inventory }); assert.ok(existsSync(result.historyFile)); assert.deepEqual(JSON.parse(readFileSync(result.currentFile, 'utf8')), example);
const promotedBytes = readFileSync(result.currentFile); throws(() => promoteVerifiedCandidate({ candidateFile, observedFile, runtimeRoot, inventory }), 'EEXIST'); assert.ok(readFileSync(result.currentFile).equals(promotedBytes));
const failedCandidate = clone(); failedCandidate.services.api.attestation = 'MISMATCH'; failedCandidate.services.api.reason = 'EXPECTED_IMAGE_ID_MISMATCH'; writeFileSync(candidateFile, JSON.stringify(failedCandidate)); throws(() => promoteVerifiedCandidate({ candidateFile, observedFile, runtimeRoot, inventory }), 'GATE_R_SERVICE_NOT_OBSERVED:api'); assert.ok(readFileSync(result.currentFile).equals(promotedBytes));

const gitRoot = mkdtempSync(join(tmpdir(), 'release-source-git-')); execFileSync('git', ['init', '-q'], { cwd: gitRoot }); execFileSync('git', ['config', 'user.email', 'runtime-state@example.invalid'], { cwd: gitRoot }); execFileSync('git', ['config', 'user.name', 'Runtime State Test'], { cwd: gitRoot }); writeFileSync(join(gitRoot, 'fixture.txt'), 'fixture'); execFileSync('git', ['add', 'fixture.txt'], { cwd: gitRoot }); execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: gitRoot });
const release = 'test-release'; execFileSync('git', ['tag', '-a', release, '-m', release], { cwd: gitRoot }); const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: gitRoot, encoding: 'utf8' }).trim(); const releaseDir = join(gitRoot, release); mkdirSync(releaseDir);
const source = createReleaseSource({ releaseDir, repository: 'https://github.com/nguyentuanson27-netizen/lanchatbot', tag: release, commit, gitDir: gitRoot, createdAt: '2026-08-02T00:00:00Z' }); const sourceBytes = readFileSync(source.path);
throws(() => createReleaseSource({ releaseDir, repository: 'https://github.com/nguyentuanson27-netizen/lanchatbot', tag: release, commit, gitDir: gitRoot }), 'EEXIST'); assert.ok(readFileSync(source.path).equals(sourceBytes));
console.log('runtime-state contract, capture primitives, parity, immutability, and atomic promotion tests: PASS');
