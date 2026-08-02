import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalProjection, digestProjection, validateRuntimeState, assertGateR, verifyParity, promoteVerifiedCandidate } from './runtime-state.mjs';

const example = JSON.parse(readFileSync(new URL('./example.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(example);
const live = (state) => ({ release: state.current.release, symlinkTarget: state.current.symlinkTarget, sourceCommit: state.current.sourcePointer.commit, latestMigration: state.database.latestMigration, services: Object.fromEntries(Object.entries(state.services).map(([name, service]) => [name, { imageId: service.imageId }])) });
const throws = (fn, message) => assert.throws(fn, new RegExp(message));

assert.equal(canonicalProjection({ B: '2', A: '1' }, ['A', 'B']), 'A=1\nB=2\n');
assert.equal(digestProjection({ A: '1', B: '2' }, ['B', 'A']).sha256, digestProjection({ B: '2', A: '1' }, ['A', 'B']).sha256);
throws(() => canonicalProjection({ A: '1', EXTRA: 'x' }, ['A']), 'PROJECTION_UNKNOWN_KEY');
throws(() => canonicalProjection({ META_TOKEN: 'x' }, ['META_TOKEN']), 'PROJECTION_SECRET_KEY');
validateRuntimeState(example); assertGateR(example); verifyParity(example, live(example));
const mixed = clone(); mixed.services.api.image = 'example:other'; validateRuntimeState(mixed);
const missing = clone(); delete missing.services.api; throws(() => validateRuntimeState(missing), 'SERVICE_MISSING:api');
const optional = clone(); optional.services['reporting-sidecar'] = { ...optional.services.api, state: 'NOT_DEPLOYED', container: 'lana-chatbot-reporting-sidecar', attestation: 'UNVERIFIED' }; validateRuntimeState(optional);
const badOptional = clone(); badOptional.services['reporting-sidecar'] = { ...badOptional.services.api, state: 'NOT_DEPLOYED', container: 'lana-chatbot-reporting-sidecar', attestation: 'OBSERVED' }; throws(() => validateRuntimeState(badOptional), 'OPTIONAL_NOT_DEPLOYED_ONLY');
const mismatch = clone(); mismatch.services['realtime-worker'].attestation = 'MISMATCH'; throws(() => assertGateR(mismatch), 'GATE_R_SERVICE_NOT_OBSERVED:realtime-worker');
const partial = clone(); partial.current.sourcePointer.attestation = 'UNVERIFIED'; throws(() => assertGateR(partial), 'GATE_R_SOURCE_NOT_OBSERVED');
const parityFailure = clone(); const differentLive = live(parityFailure); differentLive.services.api.imageId = 'sha256:' + 'f'.repeat(64); throws(() => verifyParity(parityFailure, differentLive), 'PARITY_IMAGE_MISMATCH:api');
const root = mkdtempSync(join(tmpdir(), 'runtime-state-')); const candidateFile = join(root, 'candidate.json'); const liveFile = join(root, 'live.json'); writeFileSync(candidateFile, JSON.stringify(example)); writeFileSync(liveFile, JSON.stringify(live(example)));
const result = promoteVerifiedCandidate({ candidateFile, liveFile, runtimeRoot: root }); assert.ok(existsSync(result.currentFile)); assert.deepEqual(JSON.parse(readFileSync(result.currentFile, 'utf8')), example); assert.ok(existsSync(result.historyFile));
const failed = clone(); failed.services.api.attestation = 'MISMATCH'; writeFileSync(candidateFile, JSON.stringify(failed)); throws(() => promoteVerifiedCandidate({ candidateFile, liveFile, runtimeRoot: root }), 'GATE_R_SERVICE_NOT_OBSERVED:api'); assert.deepEqual(JSON.parse(readFileSync(result.currentFile, 'utf8')), example);
console.log('runtime-state tests: PASS');
