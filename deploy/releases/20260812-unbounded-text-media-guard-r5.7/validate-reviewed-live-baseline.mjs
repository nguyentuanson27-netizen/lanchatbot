import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { digestRows, parseDelimitedRows, postgresQueryInvocation } from '../../runtime-state/runtime-state.mjs';

const appRoot = process.env.APP_ROOT ?? '/opt/lana-chatbot';
const expected = {
  currentRelease: '20260812-bf10-delivery-r5.6',
  runtimeStateSha256: 'bdcb97fcc4878cf4b753fa3b027d5a6cd41b2b98f7ae9f570ee05fa080578245',
  historyPath: '/opt/lana-chatbot/runtime-state/history/2026-08-12T06-57-05-686Z-20260812-bf10-delivery-r5.6.json',
  sourceSha256: 'e819f81dbe053ff11dea6dd02a82f0477dde411dd9d1d9af1ce7515669c6e4bd',
  realtimeContainerId: 'facda92073374bd385e8e47f8c49288ece146ef98bcbf054fa3f37c182d96794',
  deliveryContainerId: 'b47558b172477d3d1b536aa35d19b4c8478254d565decdcbc906d4c65894aeaf',
  migrationDigest: 'c2f764b824f9cdf9d865ff8b5fb853771f17405f889dbbd2bf4c66c44a8a4180',
  routingDigest: '746b8b4ba5e44d1bc5104f49715d66f0f1b6cdf24121c3cf0d76686a6fd6c9b5',
  publishedBundleCanonicalJsonNoLfSha256: '1bfb247d8da44d7b219ea6e0d8733bfad2a446e3df08cb060ae5a296120376f0',
  closing: ['cefcecd6-2619-4ba9-bd54-ac43b25f5abd', '4', '805931e1-0363-4cb2-a66d-de9058982af5', '3', '4', 'sha256:e151e450efe47cfe9a48b7a55ea714ff2e1413399090fbd45d928816ecd067df', 'CLARIFY_RECONCILED_V1', 'PER_ASSET_V1', 'CLARIFY_V1', 'CLASSIFIED_ALLOWLIST_V1', '0'],
};
function validateReviewedFacts(facts) {
  if (facts.currentRelease !== expected.currentRelease || facts.runtimeStateSha256 !== expected.runtimeStateSha256 ||
      facts.historyPath !== expected.historyPath || facts.historySha256 !== expected.runtimeStateSha256 ||
      facts.currentHistoryByteIdentical !== true || facts.sourceSha256 !== expected.sourceSha256) throw new Error('REVIEWED_BASELINE_RUNTIME_IDENTITY_DRIFT');
  if (facts.realtimeContainerId !== expected.realtimeContainerId || facts.deliveryContainerId !== expected.deliveryContainerId) throw new Error('REVIEWED_BASELINE_TARGET_OR_DELIVERY_CONTAINER_DRIFT');
  if (facts.migrationDigest !== expected.migrationDigest) throw new Error('REVIEWED_BASELINE_MIGRATION_DRIFT');
  if (facts.routingDigest !== expected.routingDigest) throw new Error('REVIEWED_BASELINE_ROUTING_DRIFT');
  if (!isDeepStrictEqual(facts.closing, expected.closing)) throw new Error('REVIEWED_BASELINE_CLOSING_POLICY_DRIFT');
  if (facts.publishedBundleCanonicalJsonNoLfSha256 !== expected.publishedBundleCanonicalJsonNoLfSha256) throw new Error('REVIEWED_BASELINE_PUBLISHED_BUNDLE_DRIFT');
}
if (process.argv[2] === '--self-test') {
  const valid = { ...expected, historySha256: expected.runtimeStateSha256, currentHistoryByteIdentical: true, closing: [...expected.closing] };
  validateReviewedFacts(valid);
  for (const key of ['runtimeStateSha256', 'sourceSha256', 'realtimeContainerId', 'deliveryContainerId', 'migrationDigest', 'routingDigest']) {
    const drift = structuredClone(valid); drift[key] = `drift-${key}`;
    try { validateReviewedFacts(drift); throw new Error(`BASELINE_SELF_TEST_ACCEPTED:${key}`); } catch (error) { if (String(error).includes('BASELINE_SELF_TEST_ACCEPTED')) throw error; }
  }
  const policyDrift = structuredClone(valid); policyDrift.closing[5] = `sha256:${'0'.repeat(64)}`;
  try { validateReviewedFacts(policyDrift); throw new Error('BASELINE_SELF_TEST_ACCEPTED:policy'); } catch (error) { if (String(error).includes('BASELINE_SELF_TEST_ACCEPTED')) throw error; }
  const bundleDrift = structuredClone(valid); bundleDrift.publishedBundleCanonicalJsonNoLfSha256 = '0'.repeat(64);
  try { validateReviewedFacts(bundleDrift); throw new Error('BASELINE_SELF_TEST_ACCEPTED:bundle'); } catch (error) { if (String(error).includes('BASELINE_SELF_TEST_ACCEPTED')) throw error; }
  console.log('reviewed live baseline validator self-test: PASS'); process.exit(0);
}
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const currentPath = `${appRoot}/runtime-state/current.json`;
const current = JSON.parse(readFileSync(currentPath, 'utf8'));
const inspect = (name) => JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }))[0];
const realtime = inspect('lana-chatbot-realtime-worker');
const delivery = inspect('lana-chatbot-delivery-worker');
const postgres = inspect('lana-chatbot-postgres');
const env = Object.fromEntries((postgres?.Config?.Env ?? []).map((entry) => {
  const split = entry.indexOf('='); return [entry.slice(0, split), entry.slice(split + 1)];
}));
const query = (sql) => {
  const invocation = postgresQueryInvocation({ container: 'lana-chatbot-postgres', user: env.POSTGRES_USER, database: env.POSTGRES_DB, password: env.POSTGRES_PASSWORD, sql }, process.env);
  return execFileSync('docker', invocation.args, { encoding: 'utf8', env: invocation.env }).trim();
};
const migrations = parseDelimitedRows(query('SELECT migration_name, checksum_sha256 FROM schema_migrations ORDER BY migration_name'), ['migration', 'checksumSha256']);
const migrationDigest = digestRows(migrations, ['migration', 'checksumSha256']).sha256;
const routing = parseDelimitedRows(query('SELECT page_id, status, routing_owner, app_send_enabled, kill_switch FROM pages ORDER BY page_id'), ['page_id', 'status', 'routing_owner', 'app_send_enabled', 'kill_switch'])
  .map((row) => ({ ...row, app_send_enabled: row.app_send_enabled === 't', kill_switch: row.kill_switch === 't' }));
const routingDigest = digestRows(routing, ['page_id', 'status', 'routing_owner', 'app_send_enabled', 'kill_switch']).sha256;
const closing = query("SELECT p.pointer_id, p.revision, v.version_id, v.version_number, v.revision, v.content_hash, COALESCE(v.content->>'replyReconciliationPolicy','OMITTED'), COALESCE(v.content->>'mediaPartialResolutionPolicy','OMITTED'), COALESCE(v.content->>'multiProductResolutionPolicy','OMITTED'), COALESCE(v.content->>'customerUrlPolicy','OMITTED'), (v.content ? 'correctionDialoguePolicy')::int FROM admin_active_pointers p JOIN admin_artifact_versions v ON v.version_id=p.version_id WHERE p.active AND p.page_id='1198992073286645' AND p.channel='PUBLISHED' AND p.artifact_kind='CLOSING_STRATEGY'").split('|');
const publishedBundle = JSON.parse(query("SELECT COALESCE(jsonb_agg(jsonb_build_object('artifactKey', p.artifact_key, 'artifactKind', p.artifact_kind, 'pointerId', p.pointer_id, 'pointerRevision', p.revision, 'versionId', v.version_id, 'versionArtifactKey', v.artifact_key, 'versionArtifactKind', v.artifact_kind, 'versionNumber', v.version_number, 'versionRevision', v.revision, 'contentHash', v.content_hash, 'lifecycle', v.lifecycle) ORDER BY p.artifact_kind, p.artifact_key, p.pointer_id), '[]'::jsonb)::text FROM admin_active_pointers p JOIN admin_artifact_versions v ON v.version_id=p.version_id WHERE p.active AND p.page_id='1198992073286645' AND p.channel='PUBLISHED'"));
const publishedBundleCanonicalJsonNoLfSha256 = createHash('sha256').update(JSON.stringify(publishedBundle), 'utf8').digest('hex');
validateReviewedFacts({
  currentRelease: realpathSync(`${appRoot}/current`).split('/').at(-1), runtimeStateSha256: sha256(currentPath),
  historyPath: current.history?.path, historySha256: sha256(expected.historyPath),
  currentHistoryByteIdentical: readFileSync(currentPath).equals(readFileSync(expected.historyPath)),
  sourceSha256: sha256(`${appRoot}/releases/${expected.currentRelease}/.release-source.json`),
  realtimeContainerId: realtime?.Id, deliveryContainerId: delivery?.Id,
  migrationDigest, routingDigest, closing, publishedBundleCanonicalJsonNoLfSha256,
});
console.log('reviewed live baseline validation: PASS');
