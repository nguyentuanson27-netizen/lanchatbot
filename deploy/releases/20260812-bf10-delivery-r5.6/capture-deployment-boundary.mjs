import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , envPath, outputPath] = process.argv;
if (!envPath || !outputPath) throw new Error('USAGE: capture-deployment-boundary.mjs <env-file> <output>');
const digest = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const mutableKeys = new Set(['DELIVERY_IMAGE']);

function normalizedInfrastructureEntries(entries) {
  return entries
    .filter((line) => {
      const key = line.split('=', 1)[0]?.trim();
      return key && !mutableKeys.has(key);
    })
    .sort()
    .join('\n');
}

function normalizedContainerEntries(entries) {
  return [...entries].sort().join('\n');
}

const infrastructure = readFileSync(resolve(envPath), 'utf8')
  .split(/\r?\n/u)
  .filter((line) => line.trim() && !line.trimStart().startsWith('#'));
const [container] = JSON.parse(execFileSync('docker', ['inspect', 'lana-chatbot-delivery-worker'], { encoding: 'utf8' }));
if (!container) throw new Error('BOUNDARY_CONTAINER_MISSING:delivery-worker');

const projection = {
  command: container.Config?.Cmd ?? null,
  entrypoint: container.Config?.Entrypoint ?? null,
  environmentSha256: digest(normalizedContainerEntries(container.Config?.Env ?? [])),
  mounts: [...(container.Mounts ?? [])]
    .map(({ Type, Source, Destination, RW, Propagation }) => ({ Type, Source, Destination, RW, Propagation }))
    .sort((left, right) => left.Destination.localeCompare(right.Destination)),
  networks: Object.keys(container.NetworkSettings?.Networks ?? {}).sort(),
  readOnlyRootFilesystem: container.HostConfig?.ReadonlyRootfs ?? false,
  securityOptions: [...(container.HostConfig?.SecurityOpt ?? [])].sort(),
  user: container.Config?.User ?? '',
};

const output = {
  schemaVersion: 1,
  infrastructureExceptDeliveryPinsSha256: digest(normalizedInfrastructureEntries(infrastructure)),
  deliveryRuntimeBoundarySha256: digest(JSON.stringify(projection)),
  secretBaselinePolicy: 'PRESERVE_EXISTING_CONFIG_ENV_NO_ADD_OR_CHANGE',
};
writeFileSync(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
console.log('delivery deployment boundary capture: PASS');
