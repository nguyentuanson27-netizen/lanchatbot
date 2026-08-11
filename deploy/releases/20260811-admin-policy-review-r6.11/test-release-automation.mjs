import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const releaseDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const runtimeDir = resolve(releaseDir, '..', '..', 'runtime-state');
const inventoryPath = join(runtimeDir, 'service-inventory.json');
const example = JSON.parse(readFileSync(join(runtimeDir, 'service-evidence.example.json'), 'utf8'));
const scratch = mkdtempSync(join(tmpdir(), 'lana-admin-web-release-test-'));
const targetId = `sha256:${'a'.repeat(64)}`;
const preservedApiId = `sha256:${'b'.repeat(64)}`;
const rollbackWebId = `sha256:${'d'.repeat(64)}`;

function releaseScript(name) {
  return readFileSync(join(releaseDir, name), 'utf8');
}

function requireText(name, pattern, failure) {
  if (!pattern.test(releaseScript(name))) throw new Error(failure);
}

function rejectText(name, pattern, failure) {
  if (pattern.test(releaseScript(name))) throw new Error(failure);
}

function run(script, args) {
  return spawnSync(process.execPath, [join(releaseDir, script), ...args], { encoding: 'utf8' });
}

try {
  const deployment = structuredClone(example);
  const rollback = structuredClone(example);
  deployment.services['admin-api'].expectedImageId = preservedApiId;
  deployment.services['admin-api'].rollback = {
    release: 'previous-release', image: 'example:api', imageId: preservedApiId,
  };
  deployment.services['admin-web'].expectedImageId = targetId;
  deployment.services['admin-web'].rollback = {
    release: 'previous-release', image: 'example:web', imageId: rollbackWebId,
  };
  rollback.services['admin-api'].expectedImageId = preservedApiId;
  rollback.services['admin-web'].expectedImageId = rollbackWebId;
  deployment.services['admin-simulation-worker'].rollback = {
    release: 'previous-release', image: 'example:simulation', imageId: targetId,
  };
  const deploymentPath = join(scratch, 'deployment.json');
  const rollbackPath = join(scratch, 'rollback.json');
  writeFileSync(deploymentPath, JSON.stringify(deployment));
  writeFileSync(rollbackPath, JSON.stringify(rollback));

  const positive = run('validate-target-evidence.mjs', [
    deploymentPath, rollbackPath, inventoryPath, targetId,
    'example:api', preservedApiId, 'example:web', rollbackWebId,
    'example:simulation', targetId,
  ]);
  if (positive.status !== 0) throw new Error(`positive target evidence rejected: ${positive.stderr}`);

  deployment.services['admin-api'].expectedImageId = targetId;
  writeFileSync(deploymentPath, JSON.stringify(deployment));
  const apiDrift = run('validate-target-evidence.mjs', [
    deploymentPath, rollbackPath, inventoryPath, targetId,
    'example:api', preservedApiId, 'example:web', rollbackWebId,
    'example:simulation', targetId,
  ]);
  if (apiDrift.status === 0 || !apiDrift.stderr.includes('ADMIN_API_PRESERVATION_ID_MISMATCH')) {
    throw new Error('Admin API preservation mismatch did not fail closed');
  }

  const runtimeBeforePath = join(scratch, 'runtime-before.json');
  const runtimeAfterPath = join(scratch, 'runtime-after.json');
  const runtimeBefore = {
    database: { latestMigration: '0031_admin_policy_safe_deletion', migrationLedgerDigest: targetId },
    routing: { canaryPageIds: ['1198992073286645'], pageAllowlistDigest: targetId },
    digests: { realtimeNonSecretConfig: targetId, deliveryNonSecretConfig: targetId },
    services: {
      'admin-api': { imageId: preservedApiId },
      'admin-web': { imageId: rollbackWebId },
      postgres: { imageId: targetId },
    },
  };
  const runtimeAfter = structuredClone(runtimeBefore);
  runtimeAfter.services['admin-web'].imageId = targetId;
  writeFileSync(runtimeBeforePath, JSON.stringify(runtimeBefore));
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  const runtimeArgs = [
    runtimeBeforePath, runtimeAfterPath,
    '0031_admin_policy_safe_deletion', '0031_admin_policy_safe_deletion', 'deployment',
  ];
  if (run('validate-runtime-invariants.mjs', runtimeArgs).status !== 0) {
    throw new Error('valid Admin Web-only runtime transition rejected');
  }
  runtimeAfter.services['admin-api'].imageId = targetId;
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  const nonTargetDrift = run('validate-runtime-invariants.mjs', runtimeArgs);
  if (nonTargetDrift.status === 0 || !nonTargetDrift.stderr.includes('RUNTIME_INVARIANT_DRIFT:service:admin-api')) {
    throw new Error('Admin API drift did not fail closed');
  }

  const release = '20260811-admin-policy-review-r6.11';
  const commit = 'f'.repeat(40);
  const pointerPath = join(scratch, 'release-source.json');
  writeFileSync(pointerPath, JSON.stringify({
    schemaVersion: 1,
    release,
    repository: 'https://github.com/nguyentuanson27-netizen/lanchatbot',
    tag: release,
    commit,
    createdAt: '2026-08-11T00:00:00Z',
  }));
  if (run('validate-release-pointer.mjs', [pointerPath, release, commit]).status !== 0) {
    throw new Error('valid release pointer rejected');
  }

  requireText('common.sh', /EXPECTED_RELEASE_TAG="20260811-admin-policy-review-r6\.11"/, 'r6.11 identity is not pinned');
  requireText('common.sh', /EXPECTED_PREVIOUS_MIGRATION="0031_admin_policy_safe_deletion"/, 'database baseline is not pinned');
  requireText('common.sh', /EXPECTED_LATEST_MIGRATION="0031_admin_policy_safe_deletion"/, 'database target is not pinned');
  requireText('common.sh', /PRESERVED_ADMIN_API_IMAGE/, 'Admin API preservation identity is missing');
  requireText('common.sh', /ROLLBACK_ADMIN_WEB_IMAGE/, 'Admin Web rollback identity is missing');
  requireText('common.sh', /acquire_deployment_lock/, 'global deployment lock is missing');
  requireText('preflight.sh', /pnpm[^\n]*audit/, 'native dependency audit gate is missing');
  requireText('run-build.sh', /artifact-smoke\.sh/, 'built artifact smoke gate is missing');
  requireText('backup-restore-test.sh', /pg_dump/, 'pre-cutover database backup is missing');
  requireText('backup-restore-test.sh', /pg_restore --exit-on-error/, 'database restore test is missing');
  rejectText('backup-restore-test.sh', /migration_(?:up|down)/, 'code-only release must not replay migration 0031');
  requireText('verify-production-schema.sh', /database_migration_checksum/, 'production schema checksum gate is missing');
  rejectText('verify-production-schema.sh', /INSERT INTO schema_migrations|migration_in_image/, 'code-only release must not execute DDL');
  requireText('artifact-smoke.sh', /apps\/admin-web\/dist\/index\.html/, 'Admin Web artifact smoke is missing');
  rejectText('artifact-smoke.sh', /apps\/admin-api|sharp/, 'Admin API artifact is outside this release');
  requireText('cutover.sh', /compose up -d --no-deps admin-web/, 'cutover is not scoped to Admin Web');
  rejectText('cutover.sh', /compose up -d --no-deps admin-api/, 'cutover must not recreate Admin API');
  requireText('rollback.sh', /rollback_compose up -d --no-deps admin-web/, 'rollback is not scoped to Admin Web');
  rejectText('rollback.sh', /rollback_compose up -d --no-deps admin-api/, 'rollback must not recreate Admin API');
  requireText('promote-runtime-state.sh', /validate-runtime-invariants\.mjs/, 'runtime invariant comparison is missing');
  requireText('cutover.sh', /"\$script_dir\/soak\.sh"/, 'soak is outside automatic rollback');
  const cutover = releaseScript('cutover.sh');
  const backupIndex = cutover.indexOf('backup-restore-test.sh');
  const armIndex = cutover.indexOf('arm_automatic_rollback');
  const schemaIndex = cutover.indexOf('verify-production-schema.sh');
  const recreateIndex = cutover.indexOf('compose up -d --no-deps admin-web');
  if (!(backupIndex >= 0 && backupIndex < armIndex && armIndex < schemaIndex && schemaIndex < recreateIndex)) {
    throw new Error('backup/schema verification/cutover ordering is unsafe');
  }
  requireText('soak.sh', /readonly iterations=3/, 'soak is not fixed at three samples');
  if (!existsSync(join(releaseDir, 'admin-rollback-image-override.yml'))) {
    throw new Error('Admin Web rollback override is missing');
  }
  console.log('admin policy r6.11 web-only release automation self-test: PASS');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
