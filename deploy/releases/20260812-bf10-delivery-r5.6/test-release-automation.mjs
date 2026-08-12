import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = (name) => readFileSync(join(root, name), 'utf8');
const requireText = (source, token, code) => {
  if (!source.includes(token)) throw new Error(code);
};
const forbid = (source, pattern, code) => {
  if (pattern.test(source)) throw new Error(code);
};

const common = read('common.sh');
const preflight = read('preflight.sh');
const cutover = read('cutover.sh');
const rollback = read('rollback.sh');
const postcheck = read('postcheck.sh');
const boundary = read('capture-deployment-boundary.mjs');
const prospective = read('validate-prospective-delivery-env.mjs');
const target = read('validate-target-evidence.mjs');
const smoke = read('artifact-smoke.sh');

requireText(common, 'EXPECTED_ROLLBACK_DELIVERY_IMAGE="lana-chatbot-app:realtime-compatibility-first-r32.2"', 'ROLLBACK_REF_NOT_PINNED');
requireText(common, 'EXPECTED_ROLLBACK_DELIVERY_IMAGE_ID="sha256:44ecb2fd9f7d6a5aa769938f738a3c6ba42b470db5a9bce3d30fdc364de2a0b7"', 'ROLLBACK_ID_NOT_PINNED');
requireText(common, 'EXPECTED_ROLLBACK_DELIVERY_REVISION="1c004eacca7cce309a0a05643d1aa751b897d41c"', 'ROLLBACK_REVISION_NOT_PINNED');
requireText(common, 'require_no_inherited_compose_overrides', 'INHERITED_ENV_GUARD_MISSING');
requireText(common, 'verify_prospective_delivery_env_parity', 'PROSPECTIVE_ENV_GUARD_MISSING');
requireText(cutover, 'acquire_deployment_lock', 'GLOBAL_LOCK_MISSING');
requireText(cutover, 'arm_automatic_rollback', 'AUTOMATIC_ROLLBACK_MISSING');
requireText(cutover, 'upsert_env_pin DELIVERY_IMAGE "$TARGET_DELIVERY_IMAGE"', 'DELIVERY_IMAGE_PIN_MISSING');
requireText(cutover, 'compose up -d --no-deps delivery-worker', 'DELIVERY_ONLY_CUTOVER_MISSING');
requireText(rollback, 'rollback_compose up -d --no-deps delivery-worker', 'DELIVERY_ONLY_ROLLBACK_MISSING');
forbid(`${common}\n${preflight}\n${cutover}\n${rollback}\n${postcheck}`, /DELIVERY_RELEASE_ID/u, 'INVENTED_DELIVERY_RELEASE_ID');
forbid(cutover, /compose up[^\n]*(realtime-worker|admin-api|admin-web|admin-simulation-worker)/u, 'NON_TARGET_CUTOVER');
forbid(rollback, /rollback_compose up[^\n]*(realtime-worker|admin-api|admin-web|admin-simulation-worker)/u, 'NON_TARGET_ROLLBACK');
requireText(boundary, "new Set(['DELIVERY_IMAGE'])", 'ONLY_DELIVERY_SELECTOR_MUST_BE_MUTABLE');
requireText(boundary, 'normalizedContainerEntries', 'FULL_CONFIG_ENV_DIGEST_MISSING');
requireText(boundary, 'lana-chatbot-delivery-worker', 'DELIVERY_BOUNDARY_TARGET_MISSING');
requireText(prospective, "compose.services?.['delivery-worker']?.environment", 'PROSPECTIVE_DELIVERY_TARGET_MISSING');
requireText(target, "deployment.services['delivery-worker']", 'DELIVERY_SERVICE_EVIDENCE_MISSING');
requireText(smoke, 'apps/worker/dist/delivery-server.js', 'DELIVERY_ARTIFACT_SMOKE_MISSING');
requireText(smoke, 'packages/database/dist/realtime-runtime.js', 'BF10_DATABASE_ARTIFACT_SMOKE_MISSING');
const temp = mkdtempSync(join(tmpdir(), 'bf10-delivery-release-test-'));
try {
  const composePath = join(temp, 'compose.json');
  const livePath = join(temp, 'live.json');
  const imagePath = join(temp, 'image.json');
  writeFileSync(composePath, JSON.stringify({ services: { 'delivery-worker': { environment: { DATABASE_URL: 'baseline-secret' } } } }));
  writeFileSync(livePath, JSON.stringify([{ Config: { Env: ['PATH=/usr/local/bin', 'DATABASE_URL=baseline-secret'] } }]));
  writeFileSync(imagePath, JSON.stringify([{ Config: { Env: ['PATH=/usr/local/bin'] } }]));
  const validator = join(root, 'validate-prospective-delivery-env.mjs');
  const clean = spawnSync(process.execPath, [validator, composePath, livePath, imagePath], { encoding: 'utf8' });
  if (clean.status !== 0) throw new Error('PROSPECTIVE_ENV_CLEAN_FIXTURE_REJECTED');
  writeFileSync(imagePath, JSON.stringify([{ Config: { Env: ['PATH=/different-target-default'] } }]));
  const drift = spawnSync(process.execPath, [validator, composePath, livePath, imagePath], { encoding: 'utf8' });
  if (drift.status === 0 || !drift.stderr.includes('PROSPECTIVE_DELIVERY_ENV_DRIFT:PATH') || drift.stderr.includes('baseline-secret')) {
    throw new Error('PROSPECTIVE_TARGET_IMAGE_DRIFT_NOT_REJECTED_SAFELY');
  }
  writeFileSync(livePath, JSON.stringify([{ Config: { Env: ['PATH=/usr/local/bin', 'PATH=/duplicate', 'DATABASE_URL=baseline-secret'] } }]));
  writeFileSync(imagePath, JSON.stringify([{ Config: { Env: ['PATH=/usr/local/bin'] } }]));
  const duplicate = spawnSync(process.execPath, [validator, composePath, livePath, imagePath], { encoding: 'utf8' });
  if (duplicate.status === 0 || !duplicate.stderr.includes('PROSPECTIVE_DELIVERY_ENV_DUPLICATE_OR_KEY_INVALID')) {
    throw new Error('PROSPECTIVE_ENV_DUPLICATE_NOT_REJECTED');
  }

  const hashA = `sha256:${'a'.repeat(64)}`;
  const hashB = `sha256:${'b'.repeat(64)}`;
  const hashC = `sha256:${'c'.repeat(64)}`;
  const operationalBaseline = {
    schemaVersion: 1,
    queues: {
      inbox: { active: 0, failedPermanent: 1, duplicates: 0 },
      metaOutbox: { active: 0, failedPermanent: 4, duplicates: 0 },
      pancakeOutbox: { active: 0, failedPermanent: 0, duplicates: 0 },
    },
    policy: {
      channel: 'PUBLISHED', enabled: 'true', publishedEnabled: 'true', closingContentHash: hashA,
      publishedBundle: [
        { artifactKey: 'lana.closing-strategy', artifactKind: 'CLOSING_STRATEGY', pointerId: '11111111-1111-4111-8111-111111111111', pointerRevision: 4, versionId: '22222222-2222-4222-8222-222222222222', versionArtifactKey: 'lana.closing-strategy', versionArtifactKind: 'CLOSING_STRATEGY', versionNumber: 3, versionRevision: 4, contentHash: hashA, lifecycle: 'PUBLISHED' },
        { artifactKey: 'lana.offer-policy', artifactKind: 'OFFER_POLICY', pointerId: '33333333-3333-4333-8333-333333333333', pointerRevision: 2, versionId: '44444444-4444-4444-8444-444444444444', versionArtifactKey: 'lana.offer-policy', versionArtifactKind: 'OFFER_POLICY', versionNumber: 1, versionRevision: 3, contentHash: hashB, lifecycle: 'PUBLISHED' },
        { artifactKey: 'lana.shop-policy', artifactKind: 'SHOP_POLICY', pointerId: '55555555-5555-4555-8555-555555555555', pointerRevision: 3, versionId: '66666666-6666-4666-8666-666666666666', versionArtifactKey: 'lana.shop-policy', versionArtifactKind: 'SHOP_POLICY', versionNumber: 1, versionRevision: 2, contentHash: hashC, lifecycle: 'PUBLISHED' },
      ],
      closingPointerId: '11111111-1111-4111-8111-111111111111', closingPointerRevision: 4,
      closingVersionId: '22222222-2222-4222-8222-222222222222', closingVersionNumber: 3, closingVersionRevision: 4,
      replyReconciliationPolicy: 'CLARIFY_RECONCILED_V1', correctionDialogueFieldAbsent: true,
      effective: { mediaPartialResolutionPolicy: 'PER_ASSET_V1', multiProductResolutionPolicy: 'CLARIFY_V1', customerUrlPolicy: 'CLASSIFIED_ALLOWLIST_V1' },
    },
    behaviorMode: { enabled: 'true', startupConfirmationMode: 'V2_ACTIVE', contentHash: hashB, confirmationMode: 'V2_ACTIVE', salesAuthorityMode: 'LEGACY', stateReadMode: 'LEGACY', pointerRevision: 3 },
    runtime: { mode: 'LIVE', appSendEnabled: 'true', chatbotSendEnabled: 'true', hourlyGenerationLimit: 500, dailyGenerationLimit: 2000 },
    realtimeWorker: { workerId: 'realtime-worker-1', status: 'IDLE', mode: 'LIVE', sendEnabled: true, lastSeenEpochMs: 1_700_000_000_000, capturedAtEpochMs: 1_700_000_001_000, lastErrorCodeAbsent: true },
    bf10: {
      cutoverAt: '1970-01-01T00:00:00Z',
      historical: { accepted: 247, activeError: 13, retryScheduled: 233, attemptHistory: 247 },
      postCutover: { accepted: 247, activeError: 13, retryScheduled: 233, attemptHistory: 247, acceptedAfterRetryAudit: 0 },
      classification: 'BASELINE_ONLY',
    },
  };
  const baselinePath = join(temp, 'operational-baseline.json');
  const operationalPath = join(temp, 'operational-current.json');
  const operationalValidator = join(root, 'validate-operational-state.mjs');
  writeFileSync(baselinePath, JSON.stringify(operationalBaseline));

  const rollbackState = structuredClone(operationalBaseline);
  rollbackState.realtimeWorker.lastSeenEpochMs += 1_000;
  rollbackState.realtimeWorker.capturedAtEpochMs += 1_000;
  writeFileSync(operationalPath, JSON.stringify(rollbackState));
  const rollbackValidation = spawnSync(process.execPath, [operationalValidator, operationalPath, baselinePath, 'rollback'], { encoding: 'utf8' });
  if (rollbackValidation.status !== 0) throw new Error('ROLLBACK_SENTINEL_OPERATIONAL_STATE_REJECTED');
  const strictSentinel = spawnSync(process.execPath, [operationalValidator, operationalPath, baselinePath, 'strict'], { encoding: 'utf8' });
  if (strictSentinel.status === 0 || !strictSentinel.stderr.includes('OPERATIONAL_STATE_BF10_CUTOVER_WINDOW_MISSING')) {
    throw new Error('STRICT_SENTINEL_OPERATIONAL_STATE_ACCEPTED');
  }

  const deployedState = structuredClone(rollbackState);
  deployedState.bf10.cutoverAt = '2026-08-12T04:30:00Z';
  deployedState.bf10.classification = 'NATURAL_TRANSITION_WINDOW_OBSERVED';
  deployedState.bf10.postCutover = { accepted: 1, activeError: 0, retryScheduled: 0, attemptHistory: 0, acceptedAfterRetryAudit: 0 };
  deployedState.bf10.historical.accepted += 1;
  writeFileSync(operationalPath, JSON.stringify(deployedState));
  const lostAttempt = spawnSync(process.execPath, [operationalValidator, operationalPath, baselinePath, 'strict'], { encoding: 'utf8' });
  if (lostAttempt.status === 0 || !lostAttempt.stderr.includes('OPERATIONAL_STATE_BF10_ATTEMPT_HISTORY_NOT_PRESERVED')) {
    throw new Error('BF10_MISSING_ATTEMPT_HISTORY_ACCEPTED');
  }
  deployedState.bf10.postCutover.attemptHistory = 1;
  deployedState.bf10.historical.attemptHistory += 1;
  writeFileSync(operationalPath, JSON.stringify(deployedState));
  const preservedAttempt = spawnSync(process.execPath, [operationalValidator, operationalPath, baselinePath, 'strict'], { encoding: 'utf8' });
  if (preservedAttempt.status !== 0) throw new Error('BF10_PRESERVED_ATTEMPT_HISTORY_REJECTED');
  deployedState.bf10.historical.activeError -= 1;
  writeFileSync(operationalPath, JSON.stringify(deployedState));
  const historicalCleanup = spawnSync(process.execPath, [operationalValidator, operationalPath, baselinePath, 'strict'], { encoding: 'utf8' });
  if (historicalCleanup.status === 0 || !historicalCleanup.stderr.includes('OPERATIONAL_STATE_BF10_HISTORICAL_DIRTY_ROWS_CHANGED')) {
    throw new Error('BF10_HISTORICAL_DIRTY_ROW_CHANGE_ACCEPTED');
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
for (const source of [common, preflight, cutover, rollback, postcheck]) {
  forbid(source, /\beval\b/u, 'EVAL_FORBIDDEN');
  forbid(source, /docker compose down|docker compose restart|docker system prune|rm -rf/u, 'DESTRUCTIVE_COMMAND_FORBIDDEN');
}
console.log('BF10 delivery release automation self-test: PASS');
