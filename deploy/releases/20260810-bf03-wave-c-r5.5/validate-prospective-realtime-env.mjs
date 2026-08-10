import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const [, , firstArgument, secondArgument, thirdArgument, fourthArgument] = process.argv;
if (!firstArgument) {
  throw new Error('USAGE: validate-prospective-realtime-env.mjs <compose-json> <live-inspect-json> <image-inspect-json> [allowed-csv]');
}
let compose;
let live;
let image;
let allowedCsv;
if (firstArgument === '--live-container') {
  const container = secondArgument;
  if (!container) throw new Error('LIVE_CONTAINER_REQUIRED');
  allowedCsv = thirdArgument ?? 'REALTIME_RELEASE_ID';
  compose = JSON.parse(readFileSync(0, 'utf8'));
  [live] = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  if (!live?.Image) throw new Error('LIVE_CONTAINER_IMAGE_ID_MISSING');
  [image] = JSON.parse(execFileSync('docker', ['image', 'inspect', live.Image], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
} else {
  if (!secondArgument || !thirdArgument) {
    throw new Error('USAGE: validate-prospective-realtime-env.mjs <compose-json> <live-inspect-json> <image-inspect-json> [allowed-csv]');
  }
  allowedCsv = fourthArgument ?? 'REALTIME_RELEASE_ID';
  compose = JSON.parse(readFileSync(resolve(firstArgument), 'utf8'));
  [live] = JSON.parse(readFileSync(resolve(secondArgument), 'utf8'));
  [image] = JSON.parse(readFileSync(resolve(thirdArgument), 'utf8'));
}
const prospectiveObject = compose.services?.['realtime-worker']?.environment;
if (!prospectiveObject || typeof prospectiveObject !== 'object' || Array.isArray(prospectiveObject) || !live || !image) {
  throw new Error('PROSPECTIVE_REALTIME_ENV_INPUT_INVALID');
}
const allowed = new Set(allowedCsv.split(',').filter(Boolean));
const envMap = (entries, label) => {
  if (!Array.isArray(entries)) throw new Error(`PROSPECTIVE_REALTIME_ENV_ARRAY_INVALID:${label}`);
  const result = new Map();
  for (const entry of entries) {
    if (typeof entry !== 'string' || !entry.includes('=')) throw new Error(`PROSPECTIVE_REALTIME_ENV_ENTRY_INVALID:${label}`);
    const separator = entry.indexOf('=');
    const key = entry.slice(0, separator);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || result.has(key)) {
      throw new Error(`PROSPECTIVE_REALTIME_ENV_DUPLICATE_OR_KEY_INVALID:${label}:${key || 'EMPTY'}`);
    }
    result.set(key, entry.slice(separator + 1));
  }
  return result;
};
const prospective = new Map(Object.entries(prospectiveObject).map(([key, value]) => [key, value === null ? '' : String(value)]));
const liveEnv = envMap(live.Config?.Env, 'live');
const imageDefaults = envMap(image.Config?.Env ?? [], 'image');
for (const [key, value] of prospective) {
  if (allowed.has(key)) continue;
  if (!liveEnv.has(key) || liveEnv.get(key) !== value) throw new Error(`PROSPECTIVE_REALTIME_ENV_DRIFT:${key}`);
}
for (const [key, value] of liveEnv) {
  if (allowed.has(key) || prospective.has(key)) continue;
  if (imageDefaults.get(key) === value) continue;
  throw new Error(`PROSPECTIVE_REALTIME_ENV_LIVE_EXTRA:${key}`);
}
console.log('prospective realtime environment parity: PASS');
