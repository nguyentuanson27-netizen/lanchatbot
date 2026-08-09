import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateServiceEvidence } from '../../runtime-state/runtime-state.mjs';

const [, , evidencePath, inventoryPath] = process.argv;
if (!evidencePath || !inventoryPath) throw new Error('USAGE: validate-service-evidence.mjs <evidence> <inventory>');
const evidence = JSON.parse(readFileSync(resolve(evidencePath), 'utf8'));
const inventory = JSON.parse(readFileSync(resolve(inventoryPath), 'utf8'));
validateServiceEvidence(evidence, inventory);
console.log('service evidence validation: PASS');
