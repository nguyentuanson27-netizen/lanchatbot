import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const releaseDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const runtimeDir = resolve(releaseDir, '..', '..', 'runtime-state');
const inventoryPath = join(runtimeDir, 'service-inventory.json');
const example = JSON.parse(readFileSync(join(runtimeDir, 'service-evidence.example.json'), 'utf8'));
const scratch = mkdtempSync(join(tmpdir(), 'lana-wave-c-release-test-'));
const aaaa = `sha256:${'a'.repeat(64)}`;
const bbbb = `sha256:${'b'.repeat(64)}`;
const cccc = `sha256:${'c'.repeat(64)}`;

function source(name) { return readFileSync(join(releaseDir, name), 'utf8'); }
function requireText(name, pattern, failure) {
  if (!pattern.test(source(name))) throw new Error(failure);
}
function run(script, args) {
  return spawnSync(process.execPath, [join(releaseDir, script), ...args], { encoding: 'utf8' });
}
function runBash(script) {
  const executable = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
  return spawnSync(executable, ['-c', script], { encoding: 'utf8' });
}

try {
  const scripts = [
    'common.sh', 'preflight.sh', 'run-build.sh', 'artifact-smoke.sh',
    'capture-operational-state.sh', 'cutover.sh', 'postcheck.sh', 'soak.sh',
    'rollback.sh', 'promote-runtime-state.sh',
  ];
  for (const name of scripts) {
    const body = source(name);
    if (!body.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n')) throw new Error(`script is not fail closed: ${name}`);
    if (/\beval\b/u.test(body)) throw new Error(`eval is forbidden: ${name}`);
    const syntax = runBash(`bash -n '${join(releaseDir, name).replaceAll('\\', '/')}'`);
    if (syntax.status !== 0) throw new Error(`bash syntax failed: ${name}: ${syntax.stderr}`);
  }

  const deployment = structuredClone(example);
  const rollback = structuredClone(example);
  deployment.services['realtime-worker'].expectedImageId = aaaa;
  deployment.services['realtime-worker'].rollback = { release: 'old', image: 'old:realtime', imageId: bbbb };
  rollback.services['realtime-worker'].expectedImageId = bbbb;
  rollback.services['realtime-worker'].expectedRevision = 'a'.repeat(40);
  rollback.services['realtime-worker'].rollback = { release: 'old', image: 'old:realtime', imageId: bbbb };
  const deploymentPath = join(scratch, 'deployment.json');
  const rollbackPath = join(scratch, 'rollback.json');
  writeFileSync(deploymentPath, JSON.stringify(deployment));
  writeFileSync(rollbackPath, JSON.stringify(rollback));
  const targetEvidenceArgs = [deploymentPath, rollbackPath, inventoryPath, aaaa, 'old:realtime', bbbb, 'old', 'a'.repeat(40)];
  let result = run('validate-target-evidence.mjs', targetEvidenceArgs);
  if (result.status !== 0) throw new Error(`valid target evidence rejected: ${result.stderr}`);
  rollback.services.api.rollback.imageId = cccc;
  writeFileSync(rollbackPath, JSON.stringify(rollback));
  result = run('validate-target-evidence.mjs', targetEvidenceArgs);
  if (result.status === 0 || !result.stderr.includes('NON_TARGET_EVIDENCE_MISMATCH:api')) {
    throw new Error('non-target evidence drift did not fail closed');
  }
  rollback.services.api.rollback.imageId = deployment.services.api.rollback.imageId;
  rollback.services['realtime-worker'].rollback.imageId = cccc;
  writeFileSync(rollbackPath, JSON.stringify(rollback));
  result = run('validate-target-evidence.mjs', targetEvidenceArgs);
  if (result.status === 0 || !result.stderr.includes('ROLLBACK_RECOVERY_IDENTITY_MISMATCH:realtime-worker')) {
    throw new Error('wrong future realtime rollback identity did not fail closed');
  }

  const runtimeBefore = {
    database: { latestMigration: '0031_admin_policy_safe_deletion', migrationLedgerDigest: aaaa },
    routing: { canaryPageIds: ['1198992073286645'], pageAllowlistDigest: aaaa },
    digests: { realtimeNonSecretConfig: aaaa, deliveryNonSecretConfig: aaaa },
    services: {
      'realtime-worker': { imageId: bbbb },
      postgres: { imageId: aaaa, rollback: { release: 'old', image: 'postgres:17', imageId: aaaa } },
    },
  };
  const runtimeAfter = structuredClone(runtimeBefore);
  runtimeAfter.digests.realtimeNonSecretConfig = bbbb;
  runtimeAfter.services['realtime-worker'].imageId = aaaa;
  const runtimeBeforePath = join(scratch, 'runtime-before.json');
  const runtimeAfterPath = join(scratch, 'runtime-after.json');
  writeFileSync(runtimeBeforePath, JSON.stringify(runtimeBefore));
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  const runtimeArgs = [runtimeBeforePath, runtimeAfterPath, '0031_admin_policy_safe_deletion', 'deployment'];
  if (run('validate-runtime-invariants.mjs', runtimeArgs).status !== 0) throw new Error('valid realtime-only transition rejected');
  runtimeAfter.digests.deliveryNonSecretConfig = bbbb;
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  result = run('validate-runtime-invariants.mjs', runtimeArgs);
  if (result.status === 0 || !result.stderr.includes('configDigest:deliveryNonSecretConfig')) {
    throw new Error('delivery config drift did not fail closed');
  }
  runtimeAfter.digests.deliveryNonSecretConfig = aaaa;
  runtimeAfter.routing.canaryPageIds = ['unexpected'];
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  if (run('validate-runtime-invariants.mjs', runtimeArgs).status === 0) throw new Error('routing drift did not fail closed');
  const rollbackState = structuredClone(runtimeBefore);
  writeFileSync(runtimeAfterPath, JSON.stringify(rollbackState));
  if (run('validate-runtime-invariants.mjs', [runtimeBeforePath, runtimeAfterPath, '0031_admin_policy_safe_deletion', 'rollback']).status !== 0) {
    throw new Error('exact rollback runtime state rejected');
  }

  const operational = {
    schemaVersion: 1,
    queues: {
      inbox: { active: 0, failedPermanent: 1, duplicates: 0 },
      metaOutbox: { active: 0, failedPermanent: 4, duplicates: 0 },
      pancakeOutbox: { active: 0, failedPermanent: 0, duplicates: 0 },
    },
    policy: {
      channel: 'PUBLISHED', enabled: 'true', publishedEnabled: 'true', closingContentHash: aaaa,
      publishedBundle: [
        {
          artifactKey: 'lana.closing-strategy', artifactKind: 'CLOSING_STRATEGY',
          pointerId: '11111111-1111-4111-8111-111111111111', pointerRevision: 1,
          versionId: '22222222-2222-4222-8222-222222222222', versionArtifactKey: 'lana.closing-strategy',
          versionArtifactKind: 'CLOSING_STRATEGY', versionNumber: 1, versionRevision: 4,
          contentHash: aaaa, lifecycle: 'PUBLISHED',
        },
        {
          artifactKey: 'lana.offer-policy', artifactKind: 'OFFER_POLICY',
          pointerId: '33333333-3333-4333-8333-333333333333', pointerRevision: 2,
          versionId: '44444444-4444-4444-8444-444444444444', versionArtifactKey: 'lana.offer-policy',
          versionArtifactKind: 'OFFER_POLICY', versionNumber: 1, versionRevision: 3,
          contentHash: bbbb, lifecycle: 'PUBLISHED',
        },
        {
          artifactKey: 'lana.shop-policy', artifactKind: 'SHOP_POLICY',
          pointerId: '55555555-5555-4555-8555-555555555555', pointerRevision: 3,
          versionId: '66666666-6666-4666-8666-666666666666', versionArtifactKey: 'lana.shop-policy',
          versionArtifactKind: 'SHOP_POLICY', versionNumber: 1, versionRevision: 2,
          contentHash: cccc, lifecycle: 'PUBLISHED',
        },
      ],
      closingPointerId: '11111111-1111-4111-8111-111111111111', closingPointerRevision: 1,
      closingVersionId: '22222222-2222-4222-8222-222222222222', closingVersionNumber: 1, closingVersionRevision: 4,
      replyReconciliationPolicy: 'OMITTED', waveCFieldsAbsent: true, correctionDialogueFieldAbsent: true,
      effectiveDefaults: { mediaPartialResolutionPolicy: 'LEGACY', multiProductResolutionPolicy: 'LEGACY', customerUrlPolicy: 'STRICT_BLOCK_ALL' },
    },
    behaviorMode: {
      enabled: 'true', startupConfirmationMode: 'LEGACY', contentHash: bbbb,
      confirmationMode: 'V2_ACTIVE', salesAuthorityMode: 'LEGACY', stateReadMode: 'LEGACY', pointerRevision: 3,
    },
    runtime: { mode: 'LIVE', appSendEnabled: 'true', chatbotSendEnabled: 'true', hourlyGenerationLimit: 500, dailyGenerationLimit: 2000 },
    realtimeWorker: {
      workerId: 'realtime-worker-1', status: 'IDLE', mode: 'LIVE', sendEnabled: true,
      lastSeenEpochMs: 1_700_000_000_000, capturedAtEpochMs: 1_700_000_001_000, lastErrorCodeAbsent: true,
    },
  };
  const operationalPath = join(scratch, 'operational.json');
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath]).status !== 0) throw new Error('valid operational state rejected');
  operational.policy.publishedBundle[1].versionArtifactKind = 'SHOP_POLICY';
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath]).status === 0) {
    throw new Error('pointer/version artifact kind mismatch accepted');
  }
  operational.policy.publishedBundle[1].versionArtifactKind = 'OFFER_POLICY';
  operational.policy.publishedBundle[2].versionId = operational.policy.publishedBundle[1].versionId;
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath]).status === 0) {
    throw new Error('duplicate published policy version identity accepted');
  }
  operational.policy.publishedBundle[2].versionId = '66666666-6666-4666-8666-666666666666';
  const duplicateSizeChartScope = {
    artifactKey: 'lana.size-chart.alpha', artifactKind: 'SIZE_CHART',
    pointerId: '77777777-7777-4777-8777-777777777777', pointerRevision: 1,
    versionId: '88888888-8888-4888-8888-888888888888', versionArtifactKey: 'lana.size-chart.alpha',
    versionArtifactKind: 'SIZE_CHART', versionNumber: 1, versionRevision: 1,
    contentHash: aaaa, lifecycle: 'PUBLISHED',
  };
  operational.policy.publishedBundle.splice(3, 0, duplicateSizeChartScope, {
    ...duplicateSizeChartScope,
    pointerId: '99999999-9999-4999-8999-999999999999',
    versionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath]).status === 0) {
    throw new Error('duplicate logical published policy scope accepted');
  }
  operational.policy.publishedBundle.splice(3, 2);
  operational.policy.waveCFieldsAbsent = false;
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath]).status === 0) throw new Error('active Wave-C policy accepted');
  operational.policy.waveCFieldsAbsent = true;
  const operationalBaselinePath = join(scratch, 'operational-baseline.json');
  const operationalBaseline = structuredClone(operational);
  writeFileSync(operationalBaselinePath, JSON.stringify(operationalBaseline));
  operational.policy.publishedBundle[1].pointerRevision += 1;
  operational.realtimeWorker.lastSeenEpochMs += 1_000;
  operational.realtimeWorker.capturedAtEpochMs += 1_000;
  writeFileSync(operationalPath, JSON.stringify(operational));
  result = run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'strict']);
  if (result.status === 0 || !result.stderr.includes('OPERATIONAL_STATE_DRIFT:policy')) {
    throw new Error('non-closing published policy pointer drift did not fail closed');
  }
  operational.policy.publishedBundle[1].pointerRevision -= 1;
  operational.realtimeWorker.lastSeenEpochMs += 1_000;
  operational.realtimeWorker.capturedAtEpochMs += 1_000;
  operational.queues.inbox.active = 1;
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'rollback']).status !== 0) {
    throw new Error('rollback validator rejected natural active queue with advancing heartbeat');
  }
  if (run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'strict']).status === 0) {
    throw new Error('strict validator accepted active queue');
  }
  operational.queues.inbox.active = 0;
  operational.queues.inbox.duplicates = 1;
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'rollback']).status !== 0) {
    throw new Error('rollback validator rejected a recorded duplicate stop condition');
  }
  if (run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'strict']).status === 0) {
    throw new Error('strict validator accepted duplicate queue evidence');
  }
  operational.queues.inbox.duplicates = 0;
  operational.realtimeWorker.lastSeenEpochMs = operationalBaseline.realtimeWorker.lastSeenEpochMs;
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'strict']).status === 0) {
    throw new Error('non-advancing realtime heartbeat accepted');
  }
  operational.realtimeWorker.lastSeenEpochMs += 1_000;
  operational.realtimeWorker.capturedAtEpochMs += 70_000;
  writeFileSync(operationalPath, JSON.stringify(operational));
  if (run('validate-operational-state.mjs', [operationalPath, operationalBaselinePath, 'strict']).status === 0) {
    throw new Error('stale realtime heartbeat accepted');
  }
  const soakSample1 = structuredClone(operationalBaseline);
  soakSample1.realtimeWorker.lastSeenEpochMs += 1_000;
  soakSample1.realtimeWorker.capturedAtEpochMs += 1_000;
  const soakSample2 = structuredClone(soakSample1);
  soakSample2.realtimeWorker.capturedAtEpochMs += 20_000;
  const soakSample1Path = join(scratch, 'operational-soak-1.json');
  const soakSample2Path = join(scratch, 'operational-soak-2.json');
  writeFileSync(soakSample1Path, JSON.stringify(soakSample1));
  writeFileSync(soakSample2Path, JSON.stringify(soakSample2));
  if (run('validate-operational-state.mjs', [soakSample2Path, soakSample1Path, 'strict']).status === 0) {
    throw new Error('consecutive soak sample accepted a repeated heartbeat');
  }

  const boundary = {
    schemaVersion: 1,
    infrastructureExceptRealtimePinsSha256: aaaa,
    realtimeRuntimeBoundarySha256: bbbb,
    secretBaselinePolicy: 'PRESERVE_EXISTING_CONFIG_ENV_NO_ADD_OR_CHANGE',
  };
  const boundaryBeforePath = join(scratch, 'boundary-before.json');
  const boundaryAfterPath = join(scratch, 'boundary-after.json');
  writeFileSync(boundaryBeforePath, JSON.stringify(boundary));
  writeFileSync(boundaryAfterPath, JSON.stringify(boundary));
  if (run('validate-deployment-boundary.mjs', [boundaryBeforePath, boundaryAfterPath]).status !== 0) throw new Error('matching secret-safe boundary rejected');
  boundary.realtimeRuntimeBoundarySha256 = cccc;
  writeFileSync(boundaryAfterPath, JSON.stringify(boundary));
  if (run('validate-deployment-boundary.mjs', [boundaryBeforePath, boundaryAfterPath]).status === 0) throw new Error('Config.Env boundary drift accepted');

  const prospectivePath = join(scratch, 'prospective-compose.json');
  const liveInspectPath = join(scratch, 'live-inspect.json');
  const imageInspectPath = join(scratch, 'image-inspect.json');
  const prospective = { services: { 'realtime-worker': { environment: {
    PATH: '/usr/local/bin', DATABASE_URL: 'baseline-secret', REALTIME_RELEASE_ID: 'next-release',
  } } } };
  const liveInspect = [{ Config: { Env: ['PATH=/usr/local/bin', 'DATABASE_URL=baseline-secret', 'REALTIME_RELEASE_ID=old-release'] } }];
  const imageInspect = [{ Config: { Env: ['PATH=/usr/local/bin'] } }];
  writeFileSync(prospectivePath, JSON.stringify(prospective));
  writeFileSync(liveInspectPath, JSON.stringify(liveInspect));
  writeFileSync(imageInspectPath, JSON.stringify(imageInspect));
  if (run('validate-prospective-realtime-env.mjs', [prospectivePath, liveInspectPath, imageInspectPath]).status !== 0) {
    throw new Error('valid prospective realtime environment parity rejected');
  }
  prospective.services['realtime-worker'].environment.DATABASE_URL = 'drifted-secret';
  writeFileSync(prospectivePath, JSON.stringify(prospective));
  result = run('validate-prospective-realtime-env.mjs', [prospectivePath, liveInspectPath, imageInspectPath]);
  if (result.status === 0 || !result.stderr.includes('PROSPECTIVE_REALTIME_ENV_DRIFT:DATABASE_URL') ||
      result.stderr.includes('baseline-secret') || result.stderr.includes('drifted-secret')) {
    throw new Error('prospective secret drift did not fail closed without disclosure');
  }

  const safeLogPath = join(scratch, 'realtime-safe.log');
  const errorLogPath = join(scratch, 'realtime-error.log');
  writeFileSync(safeLogPath, '{"level":"info","code":"LOOP_HEARTBEAT_OK"}\n');
  writeFileSync(errorLogPath, '{"level":"error","code":"REALTIME_LOOP_HEARTBEAT_FAILED"}\n');
  if (run('validate-realtime-log.mjs', [safeLogPath]).status !== 0) throw new Error('safe structured realtime log rejected');
  result = run('validate-realtime-log.mjs', [errorLogPath]);
  if (result.status === 0 || !result.stderr.includes('REALTIME_LOG_STRUCTURED_ERROR_LEVEL_DETECTED')) {
    throw new Error('structured realtime level:error log accepted');
  }

  const release = '20260810-bf03-wave-c-r5.5';
  const commit = 'f'.repeat(40);
  const pointerPath = join(scratch, 'release-source.json');
  writeFileSync(pointerPath, JSON.stringify({
    schemaVersion: 1, release, repository: 'https://github.com/nguyentuanson27-netizen/lanchatbot',
    tag: release, commit, createdAt: '2026-08-10T00:00:00Z',
  }));
  if (run('validate-release-pointer.mjs', [pointerPath, release, commit]).status !== 0) throw new Error('valid release pointer rejected');
  if (run('validate-release-pointer.mjs', [pointerPath, release, 'e'.repeat(40)]).status === 0) throw new Error('release pointer mismatch accepted');

  const rollbackHarness = join(scratch, 'rollback-harness.sh');
  const rollbackMarker = join(scratch, 'rollback-called');
  writeFileSync(rollbackHarness, `#!/usr/bin/env bash\nprintf '%s\\n' "\${AUTO_ROLLBACK:-0}" >> "${rollbackMarker.replaceAll('\\', '/')}"\n`);
  const automaticRollback = runBash(`
    set -euo pipefail
    source '${join(releaseDir, 'common.sh').replaceAll('\\', '/')}'
    RELEASE_SCRIPT_DIR='${scratch.replaceAll('\\', '/')}'
    cp '${rollbackHarness.replaceAll('\\', '/')}' "$RELEASE_SCRIPT_DIR/rollback.sh"
    chmod +x "$RELEASE_SCRIPT_DIR/rollback.sh"
    arm_automatic_rollback
    die 'forced post-mutation failure'
  `);
  if (automaticRollback.status === 0 || !existsSync(rollbackMarker) || readFileSync(rollbackMarker, 'utf8') !== '1\n') {
    throw new Error(`automatic rollback trap did not run exactly once: status=${automaticRollback.status} stdout=${automaticRollback.stdout} stderr=${automaticRollback.stderr}`);
  }

  requireText('common.sh', /EXPECTED_RELEASE_TAG="20260810-bf03-wave-c-r5\.5"/u, 'release identity not pinned');
  requireText('common.sh', /EXPECTED_CANDIDATE_TAG="20260810-bf03-wave-c-r5\.5-review-candidate\.6"/u, 'reviewed candidate ordinal not pinned');
  requireText('common.sh', /EXPECTED_ROLLBACK_REALTIME_IMAGE_ID="sha256:2c34155c8ddf51014801e2dd0424e4ca14e0bb6a5d0c055cd657a126c1db0b6e"/u, 'rollback image ID not pinned');
  requireText('common.sh', /EXPECTED_ROLLBACK_REALTIME_REVISION="a63a3ccbd7dc2b3061cf96d56c3fa3e19c26851d"/u, 'rollback revision not pinned');
  requireText('common.sh', /final release merge parents mismatch/u, 'exact final merge-parent gate missing');
  requireText('common.sh', /candidate tag\/commit mismatch/u, 'candidate tag provenance gate missing');
  requireText('common.sh', /trap automatic_rollback_on_exit EXIT/u, 'automatic rollback EXIT trap missing');
  requireText('preflight.sh', /pnpm[^\n]*audit/u, 'dependency audit missing');
  if (/RELEASE_FETCH_SOURCE/u.test(source('preflight.sh'))) throw new Error('preflight accepts an unpinned fetch source');
  requireText('artifact-smoke.sh', /--network none/u, 'artifact smoke network isolation missing');
  requireText('run-build.sh', /image\.tar\.gz/u, 'immutable image archive missing');
  requireText('run-build.sh', /configDigest/u, 'image config digest metadata missing');
  if (/contentDigest: imageId/u.test(source('run-build.sh'))) throw new Error('image ID falsely labeled as content digest');
  if (/import\(.*realtime-server/u.test(source('artifact-smoke.sh'))) throw new Error('artifact smoke imports top-level realtime server');
  requireText('cutover.sh', /compose up -d --no-deps realtime-worker/u, 'target-only cutover missing');
  requireText('cutover.sh', /arm_automatic_rollback[\s\S]*upsert_env_pin REALTIME_IMAGE/u, 'rollback is not armed before first mutation');
  requireText('cutover.sh', /require_no_inherited_compose_overrides[\s\S]*arm_automatic_rollback/u, 'Compose override gate does not run before cutover mutation');
  requireText('cutover.sh', /verify_prospective_realtime_env_parity[\s\S]*arm_automatic_rollback/u, 'prospective environment parity does not run before cutover mutation');
  requireText('cutover.sh', /postcheck\.sh[\s\S]*soak\.sh[\s\S]*promote-runtime-state\.sh/u, 'verification/promotion order invalid');
  requireText('cutover.sh', /postcheck\.sh" "\$EVIDENCE_DIR\/operational-state\.before\.json" "\$initial_postcheck_operational"/u, 'initial append-only operational sample missing');
  requireText('rollback.sh', /rollback_compose up -d --no-deps realtime-worker/u, 'target-only rollback missing');
  requireText('rollback.sh', /require_no_inherited_compose_overrides[\s\S]*cp --preserve=mode "\$ENV_BACKUP"/u, 'Compose override gate does not run before rollback mutation');
  requireText('postcheck.sh', /capture-deployment-boundary\.mjs/u, 'soak-time secret boundary check missing');
  requireText('capture-operational-state.sh', /realtime_worker_status/u, 'realtime worker readiness readback missing');
  requireText('capture-operational-state.sh', /p\.pointer_id, p\.revision, v\.version_id/u, 'closing pointer identity readback missing');
  requireText('capture-operational-state.sh', /jsonb_agg[\s\S]*p\.channel='PUBLISHED'/u, 'complete published policy bundle readback missing');
  requireText('common.sh', /verify_delivery_health/u, 'delivery readiness helper missing');
  requireText('common.sh', /compose\(\) \{\s+require_no_inherited_compose_overrides/u, 'cutover Compose interpolation override gate missing');
  requireText('common.sh', /rollback_compose\(\) \{\s+require_no_inherited_compose_overrides/u, 'rollback Compose interpolation override gate missing');
  requireText('common.sh', /config --format json \|[\s\S]*--live-container lana-chatbot-realtime-worker/u, 'prospective environment parity is not memory-only');
  if (/lana-(compose-config|live-inspect|image-inspect)/u.test(source('common.sh'))) {
    throw new Error('prospective environment parity persists raw secret-bearing captures');
  }
  requireText('run-build.sh', /require_no_inherited_compose_overrides "" "\$COMPOSE_FILE"/u, 'build-time Compose interpolation override gate missing');
  requireText('preflight.sh', /verify_prospective_realtime_env_parity/u, 'preflight prospective environment parity missing');
  const composeEnvPath = join(scratch, 'compose.env');
  writeFileSync(composeEnvPath, 'POSTGRES_PASSWORD=baseline-secret\nRUNTIME_POLICY_CHANNEL=PUBLISHED\n');
  const composeInterpolationPath = join(scratch, 'compose.yml');
  writeFileSync(composeInterpolationPath, 'services:\n  realtime-worker:\n    image: ${REALTIME_IMAGE:-example:latest}\n    environment:\n      REALTIME_MEDIA_CUTOUT_MODE: ${REALTIME_MEDIA_CUTOUT_MODE:-LIVE}\n');
  const inheritedOverride = runBash(`
    set -euo pipefail
    INFRASTRUCTURE_ENV_FILE='${composeEnvPath.replaceAll('\\', '/')}'
    source '${join(releaseDir, 'common.sh').replaceAll('\\', '/')}'
    export POSTGRES_PASSWORD='must-not-leak'
    require_no_inherited_compose_overrides
  `);
  if (inheritedOverride.status === 0 || !inheritedOverride.stderr.includes('inherited Compose environment override forbidden: POSTGRES_PASSWORD') ||
      inheritedOverride.stderr.includes('must-not-leak')) {
    throw new Error('inherited secret Compose override did not fail closed without disclosure');
  }
  const absentReferencedOverride = runBash(`
    set -euo pipefail
    INFRASTRUCTURE_ENV_FILE='${composeEnvPath.replaceAll('\\', '/')}'
    source '${join(releaseDir, 'common.sh').replaceAll('\\', '/')}'
    export REALTIME_MEDIA_CUTOUT_MODE='OFF'
    require_no_inherited_compose_overrides '' '${composeInterpolationPath.replaceAll('\\', '/')}'
  `);
  if (absentReferencedOverride.status === 0 ||
      !absentReferencedOverride.stderr.includes('inherited Compose interpolation override forbidden: REALTIME_MEDIA_CUTOUT_MODE')) {
    throw new Error('inherited defaulted Compose interpolation override did not fail closed');
  }
  const cleanComposeEnvironment = runBash(`
    set -euo pipefail
    INFRASTRUCTURE_ENV_FILE='${composeEnvPath.replaceAll('\\', '/')}'
    source '${join(releaseDir, 'common.sh').replaceAll('\\', '/')}'
    require_no_inherited_compose_overrides '' '${composeInterpolationPath.replaceAll('\\', '/')}'
  `);
  if (cleanComposeEnvironment.status !== 0) throw new Error(`clean Compose environment rejected: ${cleanComposeEnvironment.stderr}`);
  const duplicateComposeEnvPath = join(scratch, 'compose-duplicate.env');
  writeFileSync(duplicateComposeEnvPath, 'RUNTIME_POLICY_CHANNEL=PUBLISHED\nRUNTIME_POLICY_CHANNEL=CANARY_LIVE\n');
  const duplicateComposeEnvironment = runBash(`
    set -euo pipefail
    INFRASTRUCTURE_ENV_FILE='${duplicateComposeEnvPath.replaceAll('\\', '/')}'
    source '${join(releaseDir, 'common.sh').replaceAll('\\', '/')}'
    require_no_inherited_compose_overrides
  `);
  if (duplicateComposeEnvironment.status === 0 ||
      !duplicateComposeEnvironment.stderr.includes('duplicate infrastructure environment key forbidden: RUNTIME_POLICY_CHANNEL')) {
    throw new Error('duplicate Compose environment keys did not fail closed');
  }
  requireText('soak.sh', /readonly iterations=3/u, 'soak is not fixed at three samples');
  requireText('soak.sh', /for iteration[\s\S]*sleep 20[\s\S]*postcheck\.sh" "\$previous" "\$output"/u, 'soak does not wait for a fresh production heartbeat before every sample');
  requireText('soak.sh', /postcheck\.sh" "\$previous" "\$output"[\s\S]*previous="\$output"/u, 'soak samples do not form a heartbeat evidence chain');
  for (const name of ['cutover.sh', 'rollback.sh']) {
    if (/\bdocker compose (down|restart)\b/u.test(source(name))) throw new Error(`broad compose mutation forbidden: ${name}`);
    if (/admin-api|admin-web|admin-simulation-worker/u.test(source(name))) throw new Error(`Admin target leaked into realtime release: ${name}`);
  }
  for (const name of scripts) {
    if (/migrate-production|pg_dump|pg_restore|Messenger|n8n/u.test(source(name))) throw new Error(`forbidden release action present: ${name}`);
  }
  console.log('BF-03 + Wave C realtime release automation self-test: PASS');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
