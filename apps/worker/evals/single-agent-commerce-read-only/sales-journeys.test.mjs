// Offline candidate-data checks only. No run registration, source reads or provider invocation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runtimeCase, readRegisteredCases, buildVerifierRequest} from './protocol.mjs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';

const path = new URL('./sales-journeys.candidate.json', import.meta.url);
const corpus = JSON.parse(readFileSync(path, 'utf8'));
const turns = corpus.journeys.flatMap(j => j.turns);
const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const routes = new Set(['PUBLIC_MODEL', 'PRIVATE_CODE', 'MEDIA_PRIVACY_FIRST', 'PRIVATE_OR_HUMAN_CODE', 'HUMAN_CONTROL']);

test('candidate journeys keep real customer inputs separate from setup, scoring and dependent-turn instructions', () => {
  assert.equal(corpus.status, 'CANDIDATE_NOT_REGISTERED');
  assert.equal(corpus.sendEnabled, false);
  assert.equal(corpus.repetitions, 1);
  assert.equal(corpus.generationRetry, 0);
  assert.equal(corpus.historyMode, 'ACTUAL_ACCEPTED_OUTPUTS_AND_CANONICAL_STATE');
  assert.equal(new Set(corpus.journeys.map(j => j.caseId)).size, corpus.journeys.length);
  assert.deepEqual(corpus.journeys.map(j => j.purposeId), Array.from({length: 12}, (_, i) => `J${String(i + 1).padStart(2, '0')}`));
  for (const j of corpus.journeys) {
    assert(j.evaluator.prerequisites.length && j.evaluator.setup && j.evaluator.success && j.evaluator.safety);
    assert.equal(new Set(j.turns.map(t => t.turnId)).size, j.turns.length);
    for (const t of j.turns) {
      assert(routes.has(t.evaluator.route));
      assert(t.evaluator.expected);
      assert.deepEqual(Object.keys(t.runtime), t.runtime.privateFixture ? ['privateFixture'] : ['messages']);
      if (t.runtime.privateFixture) {
        assert.equal(t.evaluator.route, 'PRIVATE_CODE');
        assert.match(t.runtime.privateFixture, /^RECIPIENT_[A-Z_]+$/);
        continue;
      }
      assert(t.runtime.messages.length > 0);
      assert(Buffer.byteLength(t.runtime.messages.map(m => m.text ?? '').join('\n')) <= 2048);
      for (const m of t.runtime.messages) {
        assert(Object.keys(m).every(k => ['text', 'attachments', 'adsContext'].includes(k)));
        assert(m.text === null || (typeof m.text === 'string' && m.text.trim()));
        assert(m.text || m.attachments.length);
        for (const a of m.attachments) {
          assert.deepEqual(Object.keys(a), ['fixtureRef']);
          assert(typeof a.fixtureRef === 'string' && !a.fixtureRef.includes('://'));
        }
      }
    }
  }
});

test('the existing fixed B1 reader cannot silently run an unregistered journey corpus or drop its attachments', () => {
  assert.throws(() => readRegisteredCases(path), /EXACT_TWENTY_FOUR_CASES_REQUIRED/);
  for (const t of turns) assert.throws(() => runtimeCase(t), /RUNTIME_FIELDS/);
  const baseline = readRegisteredCases(new URL('./cases.b1.json', import.meta.url));
  assert.equal(baseline.samples.length, 24);
  assert.equal(JSON.parse(readFileSync(new URL('./stateful-cases.json', import.meta.url), 'utf8')).length, 8);
});

test('plain public journey text fits existing wire builders without forwarding evaluation labels', () => {
  let checked = 0;
  for (const j of corpus.journeys) for (const t of j.turns) {
    if (t.evaluator.route !== 'PUBLIC_MODEL' || t.runtime.messages.some(m => m.attachments.length || m.adsContext)) continue;
    const r = runtimeCase({
      caseId: 'JOURNEY_CASE_CANARY', purposeId: 'JOURNEY_PURPOSE_CANARY',
      evaluator: {expected: 'JOURNEY_RUBRIC_CANARY'},
      runtime: {latest: t.runtime.messages.map(m => m.text ?? '').join('\n'), history: [], initialProductCodes: []},
    });
    const request = {
      generationId: 'turn:owner:1', instructions: 'Tư vấn theo nguồn.',
      contents: [{role: 'user', parts: [{text: r.latest}]}],
      context: {boundSubjects: [], protectedClaims: [], runtimeProducts: [], policyLiterals: [], effectReceipts: [], state: {revision: 1, currentProductId: null}},
      toolsAllowed: false, availableTools: [], toolBudget: {roundsRemaining: 0, callsRemaining: 0},
      caseId: 'JOURNEY_CASE_CANARY', purposeId: 'JOURNEY_PURPOSE_CANARY',
      evaluator: {expected: 'JOURNEY_RUBRIC_CANARY'},
    };
    const ownerWire = buildGeminiCommerceRequest(request);
    const verifierWire = buildVerifierRequest(manifest, {
      ...request, latest: r.latest, history: r.history, trusted: request.context,
      binding: {requestId: 'turn'}, finalDraft: 'Dạ chị.',
    });
    for (const wire of [ownerWire, verifierWire]) {
      assert.doesNotMatch(JSON.stringify(wire), /JOURNEY_CASE_CANARY|JOURNEY_PURPOSE_CANARY|JOURNEY_RUBRIC_CANARY|"(?:evaluator|purposeId|caseId|advanceWhen|expected)"/);
      assert(JSON.stringify(wire).includes(r.latest));
    }
    checked++;
  }
  assert(checked > 0);
});

test('candidate private values remain fixture references and the receipt batch preserves the earlier image message', () => {
  const checkout = corpus.journeys.find(j => j.purposeId === 'J09');
  assert(checkout.turns.filter(t => t.runtime.privateFixture).every(t => t.evaluator.advanceWhen));
  const receipt = corpus.journeys.find(j => j.purposeId === 'J10').turns.find(t => t.turnId === 'receipt-batch');
  assert.equal(receipt.runtime.messages.length, 2);
  assert.equal(receipt.runtime.messages[0].attachments[0].fixtureRef, 'synthetic-bank-receipt');
  assert.equal(receipt.runtime.messages[1].attachments.length, 0);
  assert.equal(receipt.evaluator.route, 'PRIVATE_OR_HUMAN_CODE');
  // This checks candidate data, not the future staff linkage or privacy adapter.
});
