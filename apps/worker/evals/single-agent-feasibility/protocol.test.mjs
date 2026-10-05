import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpusHash, validateProtocol } from './protocol.mjs';

const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url)));
test('frozen development corpus and intended matched protocol are valid', () => {
  assert.deepEqual(validateProtocol(manifest, corpus), { A: 3, B: 3, C: 4, D: 3, CONTROL: 2 });
});
for (const field of ['provider', 'model', 'version', 'effort', 'generation', 'historyPolicy', 'judge', 'substrate', 'pairedInputHash', 'evaluationAt']) {
  test(`rejects comparative configuration mismatch: ${field}`, () => {
    const changed = structuredClone(manifest);
    changed.candidate[field] = 'unmatched';
    assert.throws(() => validateProtocol(changed, corpus), /MISMATCH/);
  });
  test(`rejects missing comparative identity: ${field}`, () => {
    const changed = structuredClone(manifest);
    delete changed.candidate[field];
    assert.throws(() => validateProtocol(changed, corpus), /MISSING/);
  });
}
test('intended identity cannot be relabeled as provider-observed comparative evidence', () => {
  assert.throws(() => validateProtocol(manifest, corpus, { comparativeClaim: true }), /UNOBSERVED/);
});
test('rejects altered frozen input', () => {
  const changed = structuredClone(corpus);
  changed.cases[0].latestCustomerMessage = 'altered';
  assert.throws(() => validateProtocol(manifest, changed), /CORPUS_HASH/);
});
test('rejects incomplete scenario contracts even when resealed', () => {
  const changed = structuredClone(corpus);
  changed.cases[0].requiredOutcomes = [];
  const updated = structuredClone(manifest);
  updated.corpusHash = corpusHash(changed);
  updated.candidate.pairedInputHash = updated.baseline.pairedInputHash = updated.corpusHash;
  assert.throws(() => validateProtocol(updated, changed), /SCENARIO_CONTRACT/);
});
test('rejects missing base identity', () => {
  const changed = structuredClone(manifest);
  delete changed.implementationBaseSha;
  assert.throws(() => validateProtocol(changed, corpus), /BASE_SHA/);
});
