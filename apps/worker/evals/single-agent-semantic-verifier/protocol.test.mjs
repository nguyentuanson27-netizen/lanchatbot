import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDraft, validateProtocol, projectRuntime, preflight, hash, buildRequest } from './protocol.mjs';

const load = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const manifest = load('manifest.json');
const a2 = load('corpus-a2.json');
const a3 = load('corpus-a3.json');

test('draft corpora contain exact seeds, required A2 families and whole-reply A3 coverage', () => {
  assert.doesNotThrow(() => validateDraft(manifest, a2, a3));
  const broken = structuredClone(a2);
  broken.cases = broken.cases.filter(c => c.evaluator.family !== 'wrong-subject');
  assert.throws(() => validateDraft(manifest, broken, a3));
});

test('each exact PR387 segment/literal input remains pinned independently of new cases', () => {
  const broken = structuredClone(a2);
  broken.cases[1].runtime.finalDraft += ' Changed';
  assert.throws(() => validateDraft(manifest, broken, a3), /SEED/);
});

test('captured conversation and verifier request bodies exclude evaluator-only data', () => {
  const fixture = structuredClone(a2.cases[1]);
  fixture.evaluator = { caseId: 'EVAL_SENTINEL', split: 'EVAL_SENTINEL',
    family: 'EVAL_SENTINEL', qualityTags: ['EVAL_SENTINEL'], expected: 'EVAL_SENTINEL',
    requiredBehaviors: ['EVAL_SENTINEL'], forbiddenBehaviors: ['EVAL_SENTINEL'], rubric: 'EVAL_SENTINEL' };
  fixture.runtime.trusted.state.privateCheckout = 'PRIVATE_SENTINEL';
  fixture.runtime.trusted.state.caseId = 'EVAL_SENTINEL';
  fixture.runtime.caseId = 'EVAL_SENTINEL';
  const captured = [];
  const provider = body => { captured.push(JSON.stringify(body)); };
  for (const role of ['verifier', 'conversation']) provider(buildRequest(manifest, role,
    projectRuntime(manifest, fixture, role, 'opaque-request-uuid')));
  assert.equal(captured.length, 2);
  for (const body of captured) {
    assert.ok(!body.includes('EVAL_SENTINEL'));
    assert.ok(!body.includes('PRIVATE_SENTINEL'));
    for (const label of ['caseId', 'split', 'qualityTags', 'requiredBehaviors', 'forbiddenBehaviors', 'rubric'])
      assert.ok(!body.includes('"' + label + '"'));
  }
});

test('projection binds exact draft and allowlisted trusted snapshot, excludes draft from conversation input', () => {
  const v = projectRuntime(manifest, a2.cases[1], 'verifier', 'opaque-request-uuid');
  assert.equal(v.requestIdentity.finalDraftHash, hash(a2.cases[1].runtime.finalDraft));
  assert.equal(v.requestIdentity.trustedSnapshotId, hash(JSON.stringify(v.trusted)));
  const c = projectRuntime(manifest, a2.cases[1], 'conversation', 'opaque-request-uuid');
  assert.ok(!Object.hasOwn(c.untrusted, 'finalDraft'));
});

test('frozen bounds reject oversized input instead of silently truncating authoritative truth', () => {
  const fixture = structuredClone(a2.cases[1]);
  fixture.runtime.history = Array.from({ length: manifest.bounds.historyCount + 1 }, () => ({ role: 'customer', text: 'x' }));
  assert.throws(() => projectRuntime(manifest, fixture, 'verifier', 'opaque-request-uuid'), /BOUND/);
  fixture.runtime.history = [];
  fixture.runtime.finalDraft = 'x'.repeat(manifest.bounds.draftBytes + 1);
  assert.throws(() => projectRuntime(manifest, fixture, 'verifier', 'opaque-request-uuid'), /BOUND/);
  const projection=projectRuntime(manifest,a2.cases[1],'verifier','opaque');
  projection.untrusted.retrievedText=['x'.repeat(manifest.bounds.totalBytes-Buffer.byteLength(JSON.stringify(projection))-10)];
  assert.throws(()=>buildRequest(manifest,'verifier',projection),/TOTAL_BOUND/);
});

test('owner decisions and bounded Codex inference configuration are frozen', () => {
  assert.equal(manifest.usability.ownerConfirmed, true);
  assert.equal(manifest.usability.maximumTerminalFailureRate, 0.1);
  for (const model of Object.values(manifest.models)) {
    assert.equal(model.credentialRoute, 'CODEX_CHATGPT_LOGIN');
    assert.equal(model.generationConfig.tools.length, 0);
    assert.equal(model.generationConfig.tool_choice, 'none');
    assert.equal(model.generationConfig.relayUpstreamRequestsPerAttempt, 1);
  }
  assert.doesNotThrow(() => validateProtocol(manifest, a2, a3));
  const broken = structuredClone(manifest);
  broken.models.verifier.generationConfig = null;
  assert.throws(() => validateProtocol(broken, a2, a3), /NOT_FROZEN/);
  const retrying = structuredClone(manifest);
  retrying.models.verifier.generationConfig.relayUpstreamRequestsPerAttempt = 2;
  assert.throws(() => validateProtocol(retrying, a2, a3), /GENERATION_CONFIG/);
});

test('A2 and A3 preflight reject missing or mismatched runtime source SHA', () => {
  const head = 'a'.repeat(40);
  for (const phase of ['a2', 'a3']) {
    assert.throws(() => preflight(manifest, phase, {}, head, []), /SOURCE/);
    assert.throws(() => preflight(manifest, phase, { [phase + 'RunSourceSha']: 'b'.repeat(40) }, head, []), /SOURCE/);
    assert.throws(() => preflight(manifest, phase, { [phase + 'RunSourceSha']: head }, head, [' M apps/worker/src/vertex.ts']), /DIRTY/);
  }
});

test('fallback text/hash, terminal map and corpus tampering invalidate protocol inputs', () => {
  const m = structuredClone(manifest);
  m.fallbacks[0].text = 'Em đã chốt đơn cho chị.';
  assert.throws(() => validateDraft(m, a2, a3), /HASH/);
  const n = structuredClone(manifest);
  n.terminal.FAIL = 'PASS';
  assert.throws(() => validateDraft(n, a2, a3), /TERMINAL/);
});
