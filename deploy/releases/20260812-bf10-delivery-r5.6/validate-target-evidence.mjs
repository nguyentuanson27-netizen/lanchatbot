import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { validateServiceEvidence } from '../../runtime-state/runtime-state.mjs';

const [, , deploymentPath, rollbackPath, inventoryPath, targetImageId, rollbackImage, rollbackImageId, rollbackRelease, rollbackRevision] = process.argv;
if ([deploymentPath, rollbackPath, inventoryPath, targetImageId, rollbackImage, rollbackImageId, rollbackRelease, rollbackRevision].some((value) => !value)) {
  throw new Error('USAGE: validate-target-evidence.mjs <deployment> <rollback> <inventory> <target-id> <rollback-ref> <rollback-id> <rollback-release> <rollback-revision>');
}
const inventory = JSON.parse(readFileSync(resolve(inventoryPath), 'utf8'));
const deployment = JSON.parse(readFileSync(resolve(deploymentPath), 'utf8'));
const rollback = JSON.parse(readFileSync(resolve(rollbackPath), 'utf8'));
validateServiceEvidence(deployment, inventory);
validateServiceEvidence(rollback, inventory);

if (deployment.services['delivery-worker'].expectedImageId !== targetImageId) {
  throw new Error('DEPLOYMENT_TARGET_IMAGE_ID_MISMATCH:delivery-worker');
}
const exactRollback = { release: rollbackRelease, image: rollbackImage, imageId: rollbackImageId };
if (!isDeepStrictEqual(deployment.services['delivery-worker'].rollback, exactRollback)) {
  throw new Error('DELIVERY_ROLLBACK_IDENTITY_MISMATCH');
}
if (rollback.services['delivery-worker'].expectedImageId !== rollbackImageId ||
    rollback.services['delivery-worker'].expectedRevision !== rollbackRevision) {
  throw new Error('ROLLBACK_TARGET_IMAGE_ID_MISMATCH:delivery-worker');
}
if (!isDeepStrictEqual(rollback.services['delivery-worker'].rollback, exactRollback)) {
  throw new Error('ROLLBACK_RECOVERY_IDENTITY_MISMATCH:delivery-worker');
}
for (const service of Object.keys(inventory.services)) {
  if (service === 'delivery-worker' || !deployment.services[service]) continue;
  if (!isDeepStrictEqual(deployment.services[service], rollback.services[service])) {
    throw new Error(`NON_TARGET_EVIDENCE_MISMATCH:${service}`);
  }
}
console.log('delivery target deployment and rollback evidence validation: PASS');
