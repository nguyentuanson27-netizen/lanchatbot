import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inventoryPath = process.argv[2];
if (!inventoryPath) throw new Error('USAGE: list-inventory-services.mjs <inventory>');
const inventory = JSON.parse(readFileSync(resolve(inventoryPath), 'utf8'));
for (const [service, config] of Object.entries(inventory.services ?? {})) {
  if (!config.required) continue;
  if (!/^[A-Za-z0-9_-]+$/.test(service) || !/^[A-Za-z0-9_.-]+$/.test(config.container ?? '')) {
    throw new Error(`INVALID_INVENTORY_SERVICE:${service}`);
  }
  process.stdout.write(`${service}\t${config.container}\n`);
}
