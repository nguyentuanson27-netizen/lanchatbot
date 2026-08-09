import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function run(script, args) {
  return spawnSync(process.execPath, [join(releaseDir, script), ...args], { encoding: 'utf8' });
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

  const release = '20260809-admin-policy-review-r6.1';
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
  console.log('admin policy release automation self-test: PASS');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
