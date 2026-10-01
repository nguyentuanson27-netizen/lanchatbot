#!/usr/bin/env node
// Dataset checks only. No provider call, network request, or runtime mutation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const sha = (v) => createHash('sha256').update(v).digest('hex');
const stable = (v) => Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v !== null && typeof v === 'object'
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v);
const canonicalHash = (v) => sha(Buffer.from(stable(v), 'utf8'));
const fail = (ok, message) => { if (!ok) throw new Error(message); };
function json(name) {
  const bytes = readFileSync(join(root, name));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  fail(Buffer.from(text, 'utf8').equals(bytes), `${name}: UTF8_ROUND_TRIP`);
  return JSON.parse(text);
}
const manifest = json('manifest.json');
const input = json('dev70.cases.json');
const judging = json('dev70.expectations.json');
const facts = json('facts-used.json');
const changes = json('change-map.json');
const fields = new Set(['FULL_NAME', 'PHONE', 'ADDRESS', 'PAYMENT_METHOD']);
const actions = new Set(['NONE', 'ASK_COLOR', 'ASK_SIZE', 'ASK_PRODUCT', 'ASK_MEASUREMENTS',
  'ASK_CHECKOUT_DETAILS', 'ASK_LOCALITY', 'ASK_PRICE_BARRIER', 'ASK_COMPARISON_CRITERION']);
const keys = ['context', 'history', 'id', 'latest_customer_message', 'split'];
const expectedCaseKeys = ['category', 'domain', 'expected', 'expected_admission', 'id', 'title'];
const noOutputKeys = new Set(['reply', 'raw', 'calls', 'stderr', 'responderTask', 'conversationPlan',
  'validatedOutput', 'status', 'golden_answer', 'ideal_answer', 'model_output']);
function checkCases(cases = input.cases, expectations = judging.cases) {
  fail(cases.length === 70 && expectations.length === 70, 'CASE_COUNT');
  fail(new Set(cases.map((c) => c.id)).size === 70, 'DUPLICATE_ID');
  assert.deepEqual(cases.map((c) => c.id), manifest.expected_ids, 'POPULATION_CHANGED');
  assert.deepEqual(expectations.map((c) => c.id), manifest.expected_ids, 'JUDGE_MAPPING');
  fail(new Set(cases.map((c) => c.latest_customer_message)).size === 70, 'DUPLICATE_LATEST');
  let long = 0, first = 0, stale = 0;
  cases.forEach((c, index) => {
    const e = expectations[index];
    // Context contains binding.status, a valid input field; scan only outputs at the record root.
    for (const k of Object.keys(c)) fail(!noOutputKeys.has(k), `${c.id}:MODEL_OUTPUT_LEAK`);
    assert.deepEqual(Object.keys(c).sort(), keys, `${c.id}:INPUT_KEYS_OR_JUDGE_LEAK`);
    fail(c.split === 'DEV', `${c.id}:NON_DEV`);
    fail(Array.isArray(c.history) && c.history.length + 1 <= 32, `${c.id}:HISTORY_BOUND`);
    if (c.history.length > 15) long++;
    for (const [role, text] of [...c.history, ['customer', c.latest_customer_message]]) {
      fail(['customer', 'shop'].includes(role), `${c.id}:ROLE`);
      fail(typeof text === 'string' && text.trim() && text.length <= 2000, `${c.id}:TEXT`);
      fail(!text.includes('\uFFFD'), `${c.id}:REPLACEMENT_CHARACTER`);
      fail(!/[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/u.test(text), `${c.id}:EMAIL`);
      fail(!/\b0\d{9,10}\b/u.test(text), `${c.id}:RECIPIENT_PHONE`);
    }
    const ctx = c.context;
    const bound = ctx.product_binding;
    fail(Array.isArray(bound.product_ids), `${c.id}:BINDING`);
    fail(new Set(bound.product_ids).size === bound.product_ids.length, `${c.id}:DUPLICATE_PRODUCT`);
    if (bound.status === 'RESOLVED') fail(bound.product_ids.length > 0, `${c.id}:UNBOUND`);
    if (bound.status === 'UNRESOLVED') fail(bound.product_ids.length === 0, `${c.id}:RESOLVED_CONFLICT`);
    if (ctx.first_meaningful_inbound) {
      first++; fail(ctx.origin === 'ADVERTISEMENT' && c.history.length === 0, `${c.id}:FIRST_CONTACT`);
    }
    for (const [list, catalog] of [['runtime_claim_refs', 'runtime_claim_catalog'], ['simulation_fact_refs', 'simulation_fact_catalog']]) {
      fail(Array.isArray(ctx[list]) && new Set(ctx[list]).size === ctx[list].length, `${c.id}:REF_LIST`);
      for (const ref of ctx[list]) {
        const value = facts[catalog][ref]; fail(value !== undefined, `${c.id}:UNKNOWN_FACT:${ref}`);
        const productId = catalog === 'runtime_claim_catalog' ? value.scope?.productId : value.productId;
        if (productId) fail(bound.product_ids.includes(productId), `${c.id}:FACT_SUBJECT:${ref}`);
      }
    }
    const intent = ctx.buying_intent;
    fail(['NONE', 'CONSIDERING', 'COMMITTED', 'NEGATED'].includes(intent.decision), `${c.id}:INTENT`);
    if (intent.decision !== 'COMMITTED') {
      fail(intent.requested_action === 'NONE' && intent.quantity === null, `${c.id}:NONCOMMITTED_ACTION`);
    } else fail(intent.requested_action !== 'NONE' && intent.quantity > 0, `${c.id}:COMMITMENT_SHAPE`);
    if (intent.evidence !== null) fail([c.latest_customer_message, ...c.history.filter(([r]) => r === 'customer').map(([, t]) => t)]
      .some((t) => t.normalize('NFC').includes(intent.evidence.normalize('NFC'))), `${c.id}:INTENT_SOURCE`);
    const checkout = ctx.checkout_completeness;
    if (checkout) {
      fail(['CART_OPEN', 'ORDER_PREVIEW'].includes(ctx.source_stage), `${c.id}:CHECKOUT_STAGE`);
      fail(['REQUIRED', 'COMPLETE'].includes(checkout.state), `${c.id}:CHECKOUT_STATE`);
      fail(new Set(checkout.missing_fields).size === checkout.missing_fields.length &&
        checkout.missing_fields.every((f) => fields.has(f)), `${c.id}:CHECKOUT_FIELDS`);
      fail((checkout.state === 'REQUIRED') === (checkout.missing_fields.length > 0), `${c.id}:CHECKOUT_COMPLETENESS`);
    }
    if (ctx.source_stage === 'ORDER_PREVIEW') fail(bound.status === 'RESOLVED' &&
      !ctx.canonical_flags.includes('MEASUREMENTS_REQUIRED'), `${c.id}:IMPOSSIBLE_PREVIEW`);
    for (const k of Object.keys(e)) fail(expectedCaseKeys.includes(k) || k === 'expected_error', `${c.id}:JUDGE_KEYS`);
    const ex = e.expected, next = ex.next_step;
    fail(ex.required_behaviors.length > 0 && ex.forbidden_behaviors.length > 0, `${c.id}:EXPECTATIONS`);
    fail(['NONE', 'OPTIONAL', 'REQUIRED'].includes(next.requirement), `${c.id}:NEXT_REQUIREMENT`);
    fail(next.allowed_actions.length > 0 && next.allowed_actions.every((a) => actions.has(a)), `${c.id}:NEXT_ACTIONS`);
    if (next.requirement === 'NONE') assert.deepEqual(next.allowed_actions, ['NONE'], `${c.id}:NONE_CONFLICT`);
    if (next.requirement === 'REQUIRED') fail(!next.allowed_actions.includes('NONE'), `${c.id}:REQUIRED_CONFLICT`);
    if (next.requirement === 'REQUIRED' && next.allowed_actions.includes('ASK_MEASUREMENTS'))
      fail(ctx.canonical_flags.includes('MEASUREMENTS_REQUIRED'), `${c.id}:MISSING_MEASUREMENT_AUTHORITY`);
    if (next.requirement === 'REQUIRED' && next.allowed_actions.includes('ASK_CHECKOUT_DETAILS'))
      fail(checkout?.state === 'REQUIRED', `${c.id}:MISSING_CHECKOUT_AUTHORITY`);
    if (e.expected_admission === 'PRE_MODEL_REJECT') {
      stale++; fail(e.expected_error === 'TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE', `${c.id}:PREMODEL_ERROR`);
      fail(ctx.runtime_claim_refs.some((r) => facts.runtime_claim_catalog[r].freshness === 'EXPIRED'), `${c.id}:STALE_CONTROL`);
    } else fail(e.expected_admission === 'MODEL_ELIGIBLE', `${c.id}:ADMISSION`);
  });
  fail(first === 3 && long >= 4 && stale === 2, 'COVERAGE');
  return { caseCount: cases.length, longHistoryCases: long, firstContactCases: first, preModelControls: stale };
}
function checkFiles() {
  for (const [name, hash] of Object.entries(manifest.payload_sha256))
    fail(sha(readFileSync(join(root, name))) === hash, `PAYLOAD_CHANGED:${name}`);
  for (const catalog of ['runtime_claim_catalog', 'simulation_fact_catalog']) {
    for (const [ref, value] of Object.entries(facts[catalog]))
      fail(canonicalHash(value) === manifest.fact_entry_sha256[catalog][ref], `FACT_CHANGED:${ref}`);
  }
  fail(changes.changes.length === 70, 'CHANGE_MAP_COUNT');
  changes.changes.forEach((c, i) => {
    fail(c.id === input.cases[i].id && c.r1_dialogue_sha256 !== c.new_dialogue_sha256, 'UNCHANGED_DIALOGUE');
    fail(c.new_dialogue_sha256 === canonicalHash([input.cases[i].history, input.cases[i].latest_customer_message]), 'CHANGE_MAP_HASH');
    fail(typeof c.source_dialogue_sha256 === 'string' && c.source_dialogue_sha256.length === 64, `${c.id}:SOURCE_HASH`);
  });
}
function checkSource(repo) {
  const source = join(repo, 'apps/worker/evals/track-c-c2/v2');
  for (const [name, hash] of Object.entries(manifest.source_files_sha256))
    fail(sha(readFileSync(join(source, name))) === hash, `FROZEN_SOURCE_CHANGED:${name}`);
  const sourceManifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
  fail(sourceManifest.benchmark_revision === manifest.source_revision, 'SOURCE_REVISION_CHANGED');
  fail(sourceManifest.content_hashes?.dev_70_expanded_sha256 === manifest.source_dev_sha256, 'SOURCE_DEV_POPULATION_HASH_CHANGED');
  const catalog = JSON.parse(readFileSync(join(source, 'facts.json'), 'utf8'));
  for (const name of ['runtime_claim_catalog', 'simulation_fact_catalog']) {
    for (const [ref, value] of Object.entries(facts[name]))
      assert.deepEqual(value, catalog[name][ref], `SOURCE_FACT_CHANGED:${ref}`);
  }
  const old = Array.from({ length: 10 }, (_, i) => JSON.parse(readFileSync(join(source, `quality-${String(i+1).padStart(2, '0')}.json`), 'utf8')).cases)
    .flat().filter((c) => c.split === 'DEV');
  assert.deepEqual(old.map((c) => c.id), manifest.expected_ids, 'SOURCE_POPULATION');
  old.forEach((c, i) => {
    fail(JSON.stringify(c.history) !== JSON.stringify(input.cases[i].history) || c.history.length === 0, `${c.id}:OLD_HISTORY`);
    fail(c.latest_customer_message !== input.cases[i].latest_customer_message, `${c.id}:OLD_LATEST`);
    fail(canonicalHash([c.history, c.latest_customer_message]) === changes.changes[i].source_dialogue_sha256, `${c.id}:OLD_HASH`);
  });
  return { sourceRevision: sourceManifest.benchmark_revision, sourceFilesPinned: Object.keys(manifest.source_files_sha256).length, sourceFactsIdentical: true };
}
function selfTest() {
  const tests = [
    ['duplicate id', (c) => { c[1].id = c[0].id; }],
    ['unknown fact', (c) => { c[0].context.runtime_claim_refs.push('NOT_A_FACT'); }],
    ['wrong fact subject', (c) => { c[0].context.product_binding.product_ids = ['OTHER']; }],
    ['judge leak', (c) => { c[0].expected = { answer: 'leak' }; }],
    ['old generated output', (c) => { c[0].reply = 'leak'; }],
    ['wrong split', (c) => { c[0].split = 'HOLDOUT'; }],
    ['missing measurement authority', (c, e) => {
      const i = e.findIndex((x) => x.expected.next_step.requirement === 'REQUIRED' && x.expected.next_step.allowed_actions.includes('ASK_MEASUREMENTS'));
      c[i].context.canonical_flags = [];
    }],
    ['impossible checkout', (c) => {
      c.find((x) => x.context.checkout_completeness?.state === 'REQUIRED').context.checkout_completeness.missing_fields = [];
    }],
    ['corrupt unicode', (c) => { c[0].latest_customer_message += '\uFFFD'; }],
    ['too long history', (c) => { c[4].history = Array.from({ length: 32 }, () => ['customer', 'x']); }],
    ['conditional purchase upgraded', (c) => {
      c.find((x) => x.context.buying_intent.decision === 'CONSIDERING').context.buying_intent.requested_action = 'OPEN_CART';
    }],
  ];
  for (const [name, mutate] of tests) {
    const c = structuredClone(input.cases), e = structuredClone(judging.cases); mutate(c, e);
    assert.throws(() => checkCases(c, e), undefined, `NEGATIVE_CONTROL_NOT_REJECTED:${name}`);
  }
  assert.throws(() => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from([0xc3, 0x28])));
  return tests.length + 1;
}
try {
  checkFiles();
  const result = { kind: 'STATIC_DATA_VALIDATION_NOT_MODEL_EVAL', ...checkCases() };
  const args = process.argv.slice(2);
  fail(args.every((a, i) => a === '--self-test' || a === '--repo' || args[i-1] === '--repo'), 'UNKNOWN_ARGUMENT');
  if (args.includes('--repo')) {
    const value = args[args.indexOf('--repo') + 1]; fail(value && !value.startsWith('--'), 'MISSING_REPO_PATH');
    result.source = checkSource(resolve(value));
  }
  if (args.includes('--self-test')) result.negativeControlsPassed = selfTest();
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
