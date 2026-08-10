import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { validateServiceEvidence } from '../../runtime-state/runtime-state.mjs';

const [, , deploymentPath, rollbackPath, inventoryPath, targetImageId, rollbackImage, rollbackImageId] = process.argv;
if ([deploymentPath, rollbackPath, inventoryPath, targetImageId, rollbackImage, rollbackImageId].some((value) => !value)) {
  throw new Error('USAGE: validate-target-evidence.mjs <deployment> <rollback> <inventory> <target-id> <rollback-ref> <rollback-id>');
}
const inventory = JSON.parse(readFileSync(resolve(inventoryPath), 'utf8'));
const deployment = JSON.parse(readFileSync(resolve(deploymentPath), 'utf8'));
const rollback = JSON.parse(readFileSync(resolve(rollbackPath), 'utf8'));
validateServiceEvidence(deployment, inventory);
validateServiceEvidence(rollback, inventory);

if (deployment.services['realtime-worker'].expectedImageId !== targetImageId) {
  throw new Error('DEPLOYMENT_TARGET_IMAGE_ID_MISMATCH:realtime-worker');
}
if (deployment.services['realtime-worker'].rollback.image !== rollbackImage ||
    deployment.services['realtime-worker'].rollback.imageId !== rollbackImageId) {
  throw new Error('REALTIME_ROLLBACK_IDENTITY_MISMATCH');
}
if (rollback.services['realtime-worker'].expectedImageId !== rollbackImageId) {
  throw new Error('ROLLBACK_TARGET_IMAGE_ID_MISMATCH:realtime-worker');
}
for (const service of Object.keys(inventory.services)) {
  if (service === 'realtime-worker' || !deployment.services[service]) continue;
  if (!isDeepStrictEqual(deployment.services[service], rollback.services[service])) {
    throw new Error(`NON_TARGET_EVIDENCE_MISMATCH:${service}`);
  }
}
console.log('realtime target deployment and rollback evidence validation: PASS');
