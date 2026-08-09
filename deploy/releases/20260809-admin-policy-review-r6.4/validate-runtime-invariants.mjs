import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const [, , beforePath, afterPath, latestMigration] = process.argv;
if (!beforePath || !afterPath || !latestMigration) {
  throw new Error('USAGE: validate-runtime-invariants.mjs <before> <after> <latest-migration>');
}

const before = JSON.parse(readFileSync(resolve(beforePath), 'utf8'));
const after = JSON.parse(readFileSync(resolve(afterPath), 'utf8'));
const equal = (name, left, right) => {
  if (!isDeepStrictEqual(left, right)) throw new Error(`RUNTIME_INVARIANT_DRIFT:${name}`);
};

if (before.database?.latestMigration !== latestMigration || after.database?.latestMigration !== latestMigration) {
  throw new Error('RUNTIME_INVARIANT_DRIFT:latestMigration');
}
equal('database', before.database, after.database);
equal('routing', before.routing, after.routing);
equal('nonSecretConfigDigests', before.digests, after.digests);

const targetServices = new Set(['admin-api', 'admin-web']);
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
