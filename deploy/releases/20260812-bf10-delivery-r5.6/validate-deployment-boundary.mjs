import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const [, , beforePath, afterPath] = process.argv;
if (!beforePath || !afterPath) throw new Error('USAGE: validate-deployment-boundary.mjs <before> <after>');
const before = JSON.parse(readFileSync(resolve(beforePath), 'utf8'));
const after = JSON.parse(readFileSync(resolve(afterPath), 'utf8'));
if (before.schemaVersion !== 1 || after.schemaVersion !== 1 || !isDeepStrictEqual(before, after)) {
  throw new Error('DEPLOYMENT_BOUNDARY_DRIFT');
}
console.log('deployment boundary comparison: PASS');
