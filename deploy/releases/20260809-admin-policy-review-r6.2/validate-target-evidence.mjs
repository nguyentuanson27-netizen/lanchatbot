import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateServiceEvidence } from '../../runtime-state/runtime-state.mjs';

const [
  , , deploymentPath, rollbackPath, inventoryPath, targetImageId,
  rollbackApiImage, rollbackApiImageId, rollbackWebImage, rollbackWebImageId,
  simulationImage, simulationImageId
] = process.argv;
if ([deploymentPath, rollbackPath, inventoryPath, targetImageId, rollbackApiImage, rollbackApiImageId,
  rollbackWebImage, rollbackWebImageId, simulationImage, simulationImageId].some((value) => !value)) {
  throw new Error('USAGE: validate-target-evidence.mjs <deployment> <rollback> <inventory> <target-id> <api-ref> <api-id> <web-ref> <web-id> <simulation-ref> <simulation-id>');
}

const inventory = JSON.parse(readFileSync(resolve(inventoryPath), 'utf8'));
const deployment = JSON.parse(readFileSync(resolve(deploymentPath), 'utf8'));
const rollback = JSON.parse(readFileSync(resolve(rollbackPath), 'utf8'));
validateServiceEvidence(deployment, inventory);
validateServiceEvidence(rollback, inventory);

for (const service of ['admin-api', 'admin-web']) {
  if (deployment.services[service].expectedImageId !== targetImageId) {
    throw new Error(`DEPLOYMENT_TARGET_IMAGE_ID_MISMATCH:${service}`);
  }
}
if (deployment.services['admin-api'].rollback.image !== rollbackApiImage ||
    deployment.services['admin-api'].rollback.imageId !== rollbackApiImageId) {
  throw new Error('ADMIN_API_ROLLBACK_IDENTITY_MISMATCH');
}
if (deployment.services['admin-web'].rollback.image !== rollbackWebImage ||
    deployment.services['admin-web'].rollback.imageId !== rollbackWebImageId) {
  throw new Error('ADMIN_WEB_ROLLBACK_IDENTITY_MISMATCH');
}
if (deployment.services['admin-simulation-worker'].expectedImageId !== simulationImageId ||
    rollback.services['admin-simulation-worker'].expectedImageId !== simulationImageId) {
  throw new Error('ADMIN_SIMULATION_PRESERVATION_ID_MISMATCH');
}
if (rollback.services['admin-api'].expectedImageId !== rollbackApiImageId ||
    rollback.services['admin-web'].expectedImageId !== rollbackWebImageId) {
  throw new Error('ROLLBACK_TARGET_IMAGE_ID_MISMATCH');
}
if (deployment.services['admin-simulation-worker'].rollback.image !== simulationImage ||
    deployment.services['admin-simulation-worker'].rollback.imageId !== simulationImageId) {
  throw new Error('ADMIN_SIMULATION_ROLLBACK_IDENTITY_MISMATCH');
}
console.log('target deployment and rollback evidence validation: PASS');
