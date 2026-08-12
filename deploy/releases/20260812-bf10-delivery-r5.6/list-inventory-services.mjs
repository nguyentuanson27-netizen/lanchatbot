import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inventoryPath = process.argv[2];
if (!inventoryPath) throw new Error('USAGE: list-inventory-services.mjs <inventory>');
const inventory = JSON.parse(readFileSync(resolve(inventoryPath), 'utf8'));
for (const [service, config] of Object.entries(inventory.services ?? {})) {
  if (!/^[A-Za-z0-9_-]+$/.test(service) || !/^[A-Za-z0-9_.-]+$/.test(config.container ?? '')) {
    throw new Error(`INVALID_INVENTORY_SERVICE:${service}`);
  }
  if (typeof config.required !== 'boolean') throw new Error(`INVALID_INVENTORY_REQUIREMENT:${service}`);
  process.stdout.write(`${service}\t${config.container}\t${config.required ? 'required' : 'optional'}\n`);
}
