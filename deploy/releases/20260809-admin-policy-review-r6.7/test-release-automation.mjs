import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const releaseDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const runtimeDir = resolve(releaseDir, '..', '..', 'runtime-state');
const inventoryPath = join(runtimeDir, 'service-inventory.json');
const example = JSON.parse(readFileSync(join(runtimeDir, 'service-evidence.example.json'), 'utf8'));
const scratch = mkdtempSync(join(tmpdir(), 'lana-admin-release-test-'));
const aaaa = `sha256:${'a'.repeat(64)}`;
const bbbb = `sha256:${'b'.repeat(64)}`;
const dddd = `sha256:${'d'.repeat(64)}`;

function releaseScript(name) {
  return readFileSync(join(releaseDir, name), 'utf8');
}

function requireText(name, pattern, failure) {
  if (!pattern.test(releaseScript(name))) throw new Error(failure);
}

function run(script, args) {
  return spawnSync(process.execPath, [join(releaseDir, script), ...args], { encoding: 'utf8' });
}

function runBash(script) {
  const executable = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
  return spawnSync(executable, ['-c', script], { encoding: 'utf8' });
}

try {
  const deployment = structuredClone(example);
  const rollback = structuredClone(example);
  rollback.services['admin-api'].expectedImageId = dddd;
  rollback.services['admin-web'].expectedImageId = dddd;
  deployment.services['admin-simulation-worker'].rollback = {
    release: 'previous-release',
    image: 'example:simulation',
    imageId: aaaa
  };
  const deploymentPath = join(scratch, 'deployment.json');
  const rollbackPath = join(scratch, 'rollback.json');
  writeFileSync(deploymentPath, JSON.stringify(deployment));
  writeFileSync(rollbackPath, JSON.stringify(rollback));

  const positive = run('validate-target-evidence.mjs', [
    deploymentPath, rollbackPath, inventoryPath, aaaa,
    'example:previous', dddd, 'example:previous', dddd, 'example:simulation', aaaa
  ]);
  if (positive.status !== 0) throw new Error(`positive target evidence rejected: ${positive.stderr}`);

  deployment.services['admin-api'].expectedImageId = bbbb;
  writeFileSync(deploymentPath, JSON.stringify(deployment));
  const negative = run('validate-target-evidence.mjs', [
    deploymentPath, rollbackPath, inventoryPath, aaaa,
    'example:previous', dddd, 'example:previous', dddd, 'example:simulation', aaaa
  ]);
  if (negative.status === 0 || !negative.stderr.includes('DEPLOYMENT_TARGET_IMAGE_ID_MISMATCH:admin-api')) {
    throw new Error('target evidence mismatch did not fail closed');
  }

  const release = '20260809-admin-policy-review-r6.7';
  const commit = 'f'.repeat(40);
  const pointerPath = join(scratch, 'release-source.json');
  writeFileSync(pointerPath, JSON.stringify({
    schemaVersion: 1,
    release,
    repository: 'https://github.com/nguyentuanson27-netizen/lanchatbot',
    tag: release,
    commit,
    createdAt: '2026-08-09T00:00:00Z'
  }));
  if (run('validate-release-pointer.mjs', [pointerPath, release, commit]).status !== 0) {
    throw new Error('valid release pointer rejected');
  }
  if (run('validate-release-pointer.mjs', [pointerPath, release, 'e'.repeat(40)]).status === 0) {
    throw new Error('release pointer commit mismatch accepted');
  }

  const walkthroughPath = join(scratch, 'walkthrough.json');
  const walkthrough = {
    schemaVersion: 1,
    releaseTag: release,
    releaseCommit: commit,
    checkedAt: '2026-08-09T00:00:00Z',
    environment: 'review preview',
    result: 'PASS',
    checks: {
      authBoundary: 'PASS',
      policyReviewTable: 'PASS',
      drawerLatestRequestWins: 'PASS',
      singleLifecycleAction: 'PASS',
      batchValidateApprove: 'PASS',
      ambiguousRecovery: 'PASS',
      keyboardNavigation: 'PASS'
    },
    piiIncluded: false,
    secretsIncluded: false
  };
  writeFileSync(walkthroughPath, JSON.stringify(walkthrough));
  if (run('validate-walkthrough-evidence.mjs', [walkthroughPath, release, commit]).status !== 0) {
    throw new Error('valid walkthrough evidence rejected');
  }
  walkthrough.checks.ambiguousRecovery = 'PENDING';
  writeFileSync(walkthroughPath, JSON.stringify(walkthrough));
  if (run('validate-walkthrough-evidence.mjs', [walkthroughPath, release, commit]).status === 0) {
    throw new Error('incomplete walkthrough evidence accepted');
  }

  const inventory = run('list-inventory-services.mjs', [inventoryPath]);
  if (inventory.status !== 0 || !inventory.stdout.includes('lana-mcp\tlana-chatbot-mcp')) {
    throw new Error('required external lana-mcp inventory boundary missing');
  }
  if (!inventory.stdout.includes('reporting-sidecar\tlana-chatbot-reporting-sidecar\toptional')) {
    throw new Error('optional running-service identity boundary is not enumerable');
  }

  const runtimeBeforePath = join(scratch, 'runtime-before.json');
  const runtimeAfterPath = join(scratch, 'runtime-after.json');
  const runtimeBefore = {
    database: { latestMigration: '0030_runtime_behavior_modes', migrationLedgerDigest: aaaa },
    routing: { canaryPageIds: ['1198992073286645'], pageAllowlistDigest: aaaa },
    digests: { realtimeNonSecretConfig: aaaa, deliveryNonSecretConfig: aaaa },
    services: {
      'admin-api': { imageId: dddd, rollback: { release: 'old', image: 'old:api', imageId: dddd } },
      'admin-web': { imageId: dddd, rollback: { release: 'old', image: 'old:web', imageId: dddd } },
      postgres: { imageId: aaaa, attestation: 'OBSERVED', rollback: { release: 'old', image: 'postgres:17', imageId: aaaa } },
    },
  };
  const runtimeAfter = structuredClone(runtimeBefore);
  runtimeAfter.services['admin-api'].imageId = bbbb;
  runtimeAfter.services['admin-web'].imageId = bbbb;
  writeFileSync(runtimeBeforePath, JSON.stringify(runtimeBefore));
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  if (run('validate-runtime-invariants.mjs', [runtimeBeforePath, runtimeAfterPath, '0030_runtime_behavior_modes']).status !== 0) {
    throw new Error('valid target-only runtime transition rejected');
  }
  runtimeAfter.routing.canaryPageIds = ['unexpected-page'];
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  const routingDrift = run('validate-runtime-invariants.mjs', [runtimeBeforePath, runtimeAfterPath, '0030_runtime_behavior_modes']);
  if (routingDrift.status === 0 || !routingDrift.stderr.includes('RUNTIME_INVARIANT_DRIFT:routing')) {
    throw new Error('routing drift did not fail closed');
  }
  runtimeAfter.routing = structuredClone(runtimeBefore.routing);
  runtimeAfter.services.postgres.rollback.imageId = bbbb;
  writeFileSync(runtimeAfterPath, JSON.stringify(runtimeAfter));
  const rollbackMetadataDrift = run('validate-runtime-invariants.mjs', [runtimeBeforePath, runtimeAfterPath, '0030_runtime_behavior_modes']);
  if (rollbackMetadataDrift.status === 0 || !rollbackMetadataDrift.stderr.includes('RUNTIME_INVARIANT_DRIFT:service:postgres')) {
    throw new Error('non-target rollback metadata drift did not fail closed');
  }

  const boundaryBeforePath = join(scratch, 'boundary-before.json');
  const boundaryAfterPath = join(scratch, 'boundary-after.json');
  const boundary = {
    schemaVersion: 1,
    infrastructureNonImageSha256: aaaa,
    targets: {
      'admin-api': { runtimeConfigSha256: aaaa },
      'admin-web': { runtimeConfigSha256: aaaa },
    },
  };
  writeFileSync(boundaryBeforePath, JSON.stringify(boundary));
  writeFileSync(boundaryAfterPath, JSON.stringify(boundary));
  if (run('validate-deployment-boundary.mjs', [boundaryBeforePath, boundaryAfterPath]).status !== 0) {
    throw new Error('matching deployment boundary rejected');
  }
  boundary.targets['admin-api'].runtimeConfigSha256 = bbbb;
  writeFileSync(boundaryAfterPath, JSON.stringify(boundary));
  if (run('validate-deployment-boundary.mjs', [boundaryBeforePath, boundaryAfterPath]).status === 0) {
    throw new Error('deployment boundary drift did not fail closed');
  }

  const rollbackHarness = join(scratch, 'rollback-harness');
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
    throw new Error(`die() did not execute automatic rollback exactly once: stdout=${automaticRollback.stdout} stderr=${automaticRollback.stderr}`);
  }

  const overrideResolution = runBash(`
    set -euo pipefail
    export APP_ROOT='${join(scratch, 'app').replaceAll('\\', '/')}'
    export REPOSITORY_DIR='${join(scratch, 'repository').replaceAll('\\', '/')}'
    source '${join(releaseDir, 'common.sh').replaceAll('\\', '/')}'
    repository_override="$REPOSITORY_DIR/deploy/releases/$EXPECTED_RELEASE_TAG/admin-rollback-image-override.yml"
    mkdir -p "$(dirname "$repository_override")"
    : > "$repository_override"
    test "$(rollback_override_source)" = "$repository_override"
    mkdir -p "$(dirname "$ROLLBACK_COMPOSE_OVERRIDE")"
    : > "$ROLLBACK_COMPOSE_OVERRIDE"
    test "$(rollback_override_source)" = "$ROLLBACK_COMPOSE_OVERRIDE"
  `);
  if (overrideResolution.status !== 0) {
    throw new Error(`rollback override did not resolve across materialization boundary: ${overrideResolution.stderr}`);
  }

  const moduleAnchorRoot = join(scratch, 'module-anchor');
  const adminApiRoot = join(moduleAnchorRoot, 'apps', 'admin-api');
  const sharpFixture = join(adminApiRoot, 'node_modules', 'sharp');
  mkdirSync(sharpFixture, { recursive: true });
  writeFileSync(join(sharpFixture, 'package.json'), JSON.stringify({ name: 'sharp', type: 'module', exports: './index.js' }));
  writeFileSync(join(sharpFixture, 'index.js'), 'export default function sharp() {}\n');
  const rootImport = spawnSync(process.execPath, ['-e', 'import("sharp")'], { cwd: moduleAnchorRoot, encoding: 'utf8' });
  const workspaceImport = spawnSync(process.execPath, ['-e', 'import("sharp")'], { cwd: adminApiRoot, encoding: 'utf8' });
  if (rootImport.status === 0 || workspaceImport.status !== 0) {
    throw new Error('workspace-scoped Sharp resolution regression fixture is invalid');
  }

  requireText('common.sh', /EXPECTED_RELEASE_TAG="20260809-admin-policy-review-r6\.7"/, 'r6.7 identity is not pinned');
  requireText('common.sh', /rollback_override_source/, 'rollback override materialization resolver missing');
  requireText('common.sh', /require_release_provenance/, 'release provenance gate missing');
  requireText('common.sh', /acquire_deployment_lock/, 'global deployment lock missing');
  requireText('common.sh', /readonly DEPLOYMENT_LOCK_FILE=/, 'deployment lock path is operator-overridable');
  requireText('common.sh', /\/proc\/\$\$\/fd\/9/, 'inherited deployment lock descriptor is not verified');
  requireText('common.sh', /trap automatic_rollback_on_exit EXIT/, 'automatic rollback is not guarded by EXIT');
  requireText('preflight.sh', /pnpm[^\n]*audit/, 'native dependency audit gate missing');
  requireText('run-build.sh', /artifact-smoke\.sh/, 'built Admin artifact smoke gate missing');
  requireText('artifact-smoke.sh', /cd apps\/admin-api\s+node -e "import\(\\"sharp\\"\)/, 'Sharp smoke is not anchored to the Admin API workspace');
  requireText('rollback.sh', /require_rollback_inputs/, 'rollback still depends on the full cutover gate');
  requireText('rollback.sh', /rollback_compose up -d --no-deps admin-api admin-web/, 'rollback does not use the previous runtime definition');
  requireText('rollback.sh', /ROLLBACK_ADMIN_API_IMAGE_ID/, 'rollback Admin API image ID is not enforced');
  requireText('rollback.sh', /ROLLBACK_ADMIN_WEB_IMAGE_ID/, 'rollback Admin Web image ID is not enforced');
  requireText('rollback.sh', /deployment-boundary\.rollback\.XXXXXX\.json/, 'rollback boundary capture is not retryable');
  requireText('promote-runtime-state.sh', /validate-runtime-invariants\.mjs/, 'pre/post runtime invariant comparison missing');
  requireText('cutover.sh', /"\$script_dir\/soak\.sh"/, 'soak is outside the automatic rollback boundary');
  requireText('soak.sh', /readonly iterations=3/, 'soak is not fixed at three samples');
  if (!existsSync(join(releaseDir, 'admin-rollback-image-override.yml'))) {
    throw new Error('previous-compose rollback image override missing');
  }
  console.log('admin policy release automation self-test: PASS');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
