import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const [, , beforePath, afterPath, expectedMigration, mode] = process.argv;
if (!beforePath || !afterPath || !expectedMigration || !['deployment', 'rollback'].includes(mode)) {
  throw new Error('USAGE: validate-runtime-invariants.mjs <before> <after> <expected-migration> <deployment|rollback>');
}
const before = JSON.parse(readFileSync(resolve(beforePath), 'utf8'));
const after = JSON.parse(readFileSync(resolve(afterPath), 'utf8'));
const equal = (name, left, right) => {
  if (!isDeepStrictEqual(left, right)) throw new Error(`RUNTIME_INVARIANT_DRIFT:${name}`);
};

if (before.database?.latestMigration !== expectedMigration || after.database?.latestMigration !== expectedMigration) {
  throw new Error('RUNTIME_INVARIANT_DRIFT:latestMigration');
}
equal('database', before.database, after.database);
equal('routing', before.routing, after.routing);
if (mode === 'rollback') {
  equal('nonSecretConfigDigests', before.digests, after.digests);
} else {
  for (const [name, value] of Object.entries(before.digests ?? {})) {
    if (name === 'deliveryNonSecretConfig') continue;
    equal(`configDigest:${name}`, value, after.digests?.[name]);
  }
  for (const name of Object.keys(after.digests ?? {})) {
    if (name !== 'deliveryNonSecretConfig' && !Object.hasOwn(before.digests ?? {}, name)) {
      throw new Error(`RUNTIME_INVARIANT_DRIFT:configDigestAdded:${name}`);
    }
  }
}

const target = 'delivery-worker';
for (const [service, record] of Object.entries(before.services ?? {})) {
  if (service === target) continue;
  const next = after.services?.[service];
  if (!next) throw new Error(`RUNTIME_INVARIANT_DRIFT:serviceMissing:${service}`);
  equal(`service:${service}`, record, next);
}
for (const service of Object.keys(after.services ?? {})) {
  if (service !== target && !Object.hasOwn(before.services ?? {}, service)) {
    throw new Error(`RUNTIME_INVARIANT_DRIFT:serviceAdded:${service}`);
  }
}
console.log('delivery runtime invariant comparison: PASS');
