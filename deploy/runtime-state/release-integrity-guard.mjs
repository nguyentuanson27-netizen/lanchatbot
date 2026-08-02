import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const readme = readFileSync(join(root, 'README.md'), 'utf8');
if (/current[^\n]{0,100}\/opt\/lana-chatbot\/releases\/[^<\s`]+/i.test(readme) || /production[^\n]{0,100}release\s+`?20\d{6}[^`\s]*/i.test(readme)) throw new Error('README_CURRENT_RELEASE_HARDCODED');
const manifests = readdirSync(join(root, 'deploy', 'manifests')).filter((name) => name.endsWith('.json'));
const a0 = '20260802-r32.2.2-runtime-reconciliation.json';
if (!manifests.includes(a0)) throw new Error('A0_RECONCILIATION_MANIFEST_MISSING');
const manifest = JSON.parse(readFileSync(join(root, 'deploy', 'manifests', a0), 'utf8'));
if (manifest.schemaVersion !== 1 || typeof manifest.capturedAt !== 'string' || typeof manifest.documentType !== 'string' || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit ?? '')) throw new Error(`MANIFEST_REQUIRED_FIELDS:${a0}`);
console.log('repository release-integrity guard: PASS (does not verify host parity)');
