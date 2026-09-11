import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const readText = (relativePath) => readFileSync(join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const gitBlobSha1 = (relativePath) => {
  const bytes = Buffer.from(readText(relativePath), 'utf8');
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`, 'utf8')
    .update(bytes)
    .digest('hex');
};
const ok = (value, message) => { if (!value) throw new Error(message); };

const manifest = readJson('manifest.json');
const scoringPath = '../../../src/track-c-c3-v5-benchmark-scoring.ts';
const evaluatorPath = '../../../src/track-c-c3-v5-benchmark-evaluator.ts';
const gatePath = '../../../src/track-c-c3-v5-benchmark-gate.ts';
const scoringGitSha1 = gitBlobSha1(scoringPath);
const evaluatorGitSha1 = gitBlobSha1(evaluatorPath);
const gateGitSha1 = gitBlobSha1(gatePath);
const coreBundleFingerprint = manifest.content_hashes.bundle_fingerprint_sha256;
const qualityHarnessFingerprint = sha256(stable({
  coreBundleFingerprint,
  scoringGitSha1,
  evaluatorGitSha1,
  gateGitSha1,
}));

ok(manifest.adapter_sources.scoring === 'apps/worker/src/track-c-c3-v5-benchmark-scoring.ts', 'quality harness scoring source registration');
ok(manifest.adapter_sources.evaluation === 'apps/worker/src/track-c-c3-v5-benchmark-evaluator.ts', 'quality harness evaluator source registration');
ok(manifest.adapter_sources.gate === 'apps/worker/src/track-c-c3-v5-benchmark-gate.ts', 'quality harness gate source registration');
ok(manifest.quality_harness_components_git_sha1[scoringPath] === scoringGitSha1, 'quality harness scoring Git SHA mismatch');
ok(manifest.quality_harness_components_git_sha1[evaluatorPath] === evaluatorGitSha1, 'quality harness evaluator Git SHA mismatch');
ok(manifest.quality_harness_components_git_sha1[gatePath] === gateGitSha1, 'quality harness gate Git SHA mismatch');
ok(manifest.content_hashes.quality_harness_fingerprint_sha256 === qualityHarnessFingerprint, `quality harness fingerprint mismatch: actual=${qualityHarnessFingerprint}`);

console.log(JSON.stringify({
  ok: true,
  coreBundleFingerprint,
  qualityHarnessFingerprint,
  components: { scoringGitSha1, evaluatorGitSha1, gateGitSha1 },
}, null, 2));
