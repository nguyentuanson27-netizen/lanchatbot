import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const [, , beforePath, afterPath, previousMigration, latestMigration, mode] = process.argv;
if (!beforePath || !afterPath || !previousMigration || !latestMigration || !mode) {
  throw new Error('USAGE: validate-runtime-invariants.mjs <before> <after> <previous-migration> <latest-migration> <deployment|rollback>');
}
if (!['deployment', 'rollback'].includes(mode)) throw new Error('RUNTIME_INVARIANT_MODE_INVALID');

const before = JSON.parse(readFileSync(resolve(beforePath), 'utf8'));
const after = JSON.parse(readFileSync(resolve(afterPath), 'utf8'));
const equal = (name, left, right) => {
  if (!isDeepStrictEqual(left, right)) throw new Error(`RUNTIME_INVARIANT_DRIFT:${name}`);
};

if (![previousMigration, latestMigration].includes(before.database?.latestMigration)) {
  throw new Error('RUNTIME_INVARIANT_DRIFT:latestMigration');
}
if (mode === 'deployment' && after.database?.latestMigration !== latestMigration) {
  throw new Error('RUNTIME_INVARIANT_DRIFT:latestMigration');
}
if (mode === 'rollback' && ![previousMigration, latestMigration].includes(after.database?.latestMigration)) {
  throw new Error('RUNTIME_INVARIANT_DRIFT:latestMigration');
}
if (before.database.latestMigration === after.database.latestMigration) {
  equal('database', before.database, after.database);
} else if (before.database.latestMigration !== previousMigration || after.database.latestMigration !== latestMigration) {
  throw new Error('RUNTIME_INVARIANT_DRIFT:databaseTransition');
}
equal('routing', before.routing, after.routing);
equal('nonSecretConfigDigests', before.digests, after.digests);

const targetServices = new Set(['admin-web']);
for (const [service, record] of Object.entries(before.services ?? {})) {
  if (targetServices.has(service)) continue;
  const next = after.services?.[service];
  if (!next) throw new Error(`RUNTIME_INVARIANT_DRIFT:serviceMissing:${service}`);
  equal(`service:${service}`, record, next);
}
for (const service of Object.keys(after.services ?? {})) {
  if (!targetServices.has(service) && !Object.hasOwn(before.services ?? {}, service)) {
    throw new Error(`RUNTIME_INVARIANT_DRIFT:serviceAdded:${service}`);
  }
}

console.log('runtime invariant comparison: PASS');
