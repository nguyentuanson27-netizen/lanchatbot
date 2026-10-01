import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { makeFixture, seal } from './fixture-harness.mjs';
const source=resolve(process.env.VALIDATOR_SOURCE ?? fileURLToPath(new URL('./validate.mjs', import.meta.url)));
function run(mutate, expected) {
  const f=makeFixture(source);
  try {
    mutate?.(f);
    seal(f.root,f.data); // Mutation is resealed: a payload hash mismatch must not hide the contract defect.
    const r=spawnSync(process.execPath,[join(f.root,'validate.mjs')],{encoding:'utf8'});
    if(expected){assert.notEqual(r.status,0,'Invalid fixture was accepted');assert.match(r.stderr,expected);}
    else{assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).caseCount,70);}
  } finally {rmSync(f.root,{recursive:true,force:true});}
}
test('valid synthetic corpus keeps intentional Q024/Q043 gaps and both stale controls',()=>run());
test('unknown binding status is rejected after payload hashes are updated',()=>run(f=>{f.byId('V5V4Q001').context.product_binding.status='BROKEN';},/BINDING_STATUS/));
test('empty stale binding is rejected',()=>run(f=>{f.byId('V5V4Q007').context.product_binding={status:'STALE',product_ids:[]};},/BINDING_CARDINALITY/));
test('one-product ambiguous binding is rejected',()=>run(f=>{f.byId('V5V4Q007').context.product_binding.status='AMBIGUOUS';},/BINDING_CARDINALITY/));
test('not-required binding cannot contain a product',()=>run(f=>{f.byId('V5V4Q007').context.product_binding.status='NOT_REQUIRED';},/BINDING_CARDINALITY/));
test('product identifiers must be strings',()=>run(f=>{f.byId('V5V4Q007').context.product_binding.product_ids=[3];},/PRODUCT_ID/));
test('source stage outside the supported vocabulary is rejected',()=>run(f=>{f.byId('V5V4Q025').context.source_stage='BROKEN';},/SOURCE_STAGE/));
test('abstract phase must agree with explicit source stage',()=>run(f=>{f.byId('V5V4Q025').context.phase='BROWSING';},/PHASE_STAGE/));
test('negative shipping fee is rejected after payload hashes are updated',()=>run(f=>{f.byId('V5V4Q025').context.cart_snapshot.shipping_fee_vnd=-1;},/CART_SNAPSHOT_FEE/));
test('fractional shipping fee is rejected',()=>run(f=>{f.byId('V5V4Q025').context.cart_snapshot.shipping_fee_vnd=2.5;},/CART_SNAPSHOT_FEE/));
test('string shipping fee is rejected',()=>run(f=>{f.byId('V5V4Q025').context.cart_snapshot.shipping_fee_vnd='30000';},/CART_SNAPSHOT_FEE/));
test('unknown cart snapshot key is rejected',()=>run(f=>{f.byId('V5V4Q025').context.cart_snapshot.extra=true;},/CART_SNAPSHOT_SHAPE/));
test('missing cart snapshot fee is rejected',()=>run(f=>{f.byId('V5V4Q025').context.cart_snapshot={};},/CART_SNAPSHOT_SHAPE/));
test('shipping fee readback must match its claim',()=>run(f=>{f.byId('V5V4Q025').context.cart_snapshot.shipping_fee_vnd=20000;},/CART_SNAPSHOT_SHIPPING/));
test('freeship readback must match eligibility',()=>run(f=>{f.byId('V5V4Q023').context.cart_snapshot.shipping_fee_vnd=30000;},/CART_SNAPSHOT_FREESHIP/));
test('mixed cart versions are rejected',()=>run(f=>{const ctx=f.byId('V5V4Q025').context;ctx.runtime_claim_refs.push('RC_PROMO_50');f.data.facts.runtime_claim_catalog.RC_PROMO_50.scope.cartVersion=2;},/MIXED_CART_VERSIONS/));
test('snapshot with expired readback is rejected',()=>run(f=>{f.byId('V5V4Q022').context.runtime_claim_refs=['RC_PROMO_EXPIRED'];},/CART_SNAPSHOT_CLAIM/));
test('valid but unapproved context drift is rejected by anchored review baseline',()=>run(f=>{f.byId('V5V4Q031').context.buying_intent.decision='NEGATED';},/BASELINE_CONTEXT/));
test('changed evaluator text is rejected by review baseline',()=>run(f=>{f.data.judging.cases[0].expected.required_behaviors=['Different criterion'];},/BASELINE_EXPECTATIONS/));
test('changed facts are rejected even when local entry hashes are updated',()=>run(f=>{f.data.facts.runtime_claim_catalog.RC_PRICE_A.value.amountVnd=850000;},/BASELINE_FACTS/));
test('ordinary dialogue rewrite does not change the protected baseline invariants',()=>run(f=>{f.byId('V5V4Q041').latest_customer_message='Another natural question';}));
