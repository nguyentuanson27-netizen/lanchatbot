import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const REPOSITORY = 'https://github.com/nguyentuanson27-netizen/lanchatbot';
const COMMIT = /^[a-f0-9]{40}$/;
const UTC = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
function fail(code) { throw new Error(code); }
function run(command, args) { return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }

export function validateReleaseSource(pointer, release) {
  const keys = ['schemaVersion', 'release', 'repository', 'tag', 'commit', 'createdAt'];
  if (!pointer || typeof pointer !== 'object' || Array.isArray(pointer) || Object.keys(pointer).some((key) => !keys.includes(key))) fail('RELEASE_SOURCE_UNKNOWN_FIELD');
  if (pointer.schemaVersion !== 1 || pointer.release !== release || pointer.repository !== REPOSITORY || pointer.tag !== release || !COMMIT.test(pointer.commit) || !(UTC.test(pointer.createdAt) && Number.isFinite(Date.parse(pointer.createdAt)))) fail('RELEASE_SOURCE_INVALID');
  return true;
}

export function createReleaseSource({ releaseDir, repository, tag, commit, gitDir, createdAt = new Date().toISOString() }) {
  const release = basename(resolve(releaseDir)); const path = resolve(releaseDir, '.release-source.json');
  if (!existsSync(releaseDir)) fail('RELEASE_DIRECTORY_MISSING');
  if (repository !== REPOSITORY || tag !== release || !COMMIT.test(commit)) fail('RELEASE_SOURCE_ARGUMENT_INVALID');
  const fetched = run('git', ['-C', gitDir, 'rev-parse', `${tag}^{}`]); if (fetched !== commit) fail('RELEASE_SOURCE_FETCHED_GIT_MISMATCH');
  const pointer = { schemaVersion: 1, release, repository, tag, commit, createdAt }; validateReleaseSource(pointer, release);
  writeFileSync(path, `${JSON.stringify(pointer, null, 2)}\n`, { flag: 'wx' });
  const readback = JSON.parse(readFileSync(path, 'utf8')); validateReleaseSource(readback, release);
  if (JSON.stringify(readback) !== JSON.stringify(pointer)) fail('RELEASE_SOURCE_READBACK_MISMATCH');
  return { path, pointer };
}

function arg(name) { const index = process.argv.indexOf(name); if (index === -1 || !process.argv[index + 1]) fail(`ARG_REQUIRED:${name}`); return process.argv[index + 1]; }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'validate') { const path = arg('--file'); validateReleaseSource(JSON.parse(readFileSync(path, 'utf8')), arg('--release')); console.log('release-source validation: PASS'); }
  else if (process.argv[2] === 'create') console.log(JSON.stringify(createReleaseSource({ releaseDir: arg('--release-dir'), repository: arg('--repository'), tag: arg('--tag'), commit: arg('--commit'), gitDir: arg('--git-dir') })));
  else fail('USAGE: validate|create');
}
