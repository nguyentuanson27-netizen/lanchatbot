import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const [, , envPath, outputPath] = process.argv;
if (!envPath || !outputPath) throw new Error('USAGE: capture-deployment-boundary.mjs <env-file> <output>');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const imageKeys = new Set(['ADMIN_IMAGE', 'ADMIN_API_IMAGE', 'ADMIN_WEB_IMAGE', 'ADMIN_SIMULATION_IMAGE']);
const normalizedEnv = readFileSync(resolve(envPath), 'utf8')
  .split(/\r?\n/)
  .filter((line) => {
    const key = line.split('=', 1)[0]?.trim();
    return line.trim() && !line.trimStart().startsWith('#') && !imageKeys.has(key);
  })
  .sort()
  .join('\n');

function containerBoundary(container) {
  const [record] = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }));
  if (!record) throw new Error(`BOUNDARY_CONTAINER_MISSING:${container}`);
  const projection = {
    command: record.Config?.Cmd ?? null,
    entrypoint: record.Config?.Entrypoint ?? null,
    environment: [...(record.Config?.Env ?? [])].sort(),
    mounts: [...(record.Mounts ?? [])]
      .map(({ Type, Source, Destination, RW, Propagation }) => ({ Type, Source, Destination, RW, Propagation }))
      .sort((a, b) => a.Destination.localeCompare(b.Destination)),
    networks: Object.keys(record.NetworkSettings?.Networks ?? {}).sort(),
    readOnlyRootFilesystem: record.HostConfig?.ReadonlyRootfs ?? false,
    securityOptions: [...(record.HostConfig?.SecurityOpt ?? [])].sort(),
    user: record.Config?.User ?? '',
  };
  return `sha256:${digest(JSON.stringify(projection))}`;
}

const output = {
  schemaVersion: 1,
  infrastructureNonImageSha256: `sha256:${digest(normalizedEnv)}`,
  targets: {
    'admin-api': { runtimeConfigSha256: containerBoundary('lana-chatbot-admin-api') },
    'admin-web': { runtimeConfigSha256: containerBoundary('lana-chatbot-admin-web') },
  },
};
writeFileSync(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
console.log('deployment boundary capture: PASS');
