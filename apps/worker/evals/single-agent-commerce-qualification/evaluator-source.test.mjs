import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProduct} from '../../dist/single-agent-commerce.test-support.js';
import {digest} from './qualification.mjs';
import {judgeSourceInventory,assertJudgeSourceInventory} from './evaluator-source.mjs';
const world=()=>{const f=fixtureProduct();return {products:[f.product],snapshots:{SM613:f.snapshot},policyRecords:[],capturedAt:f.product.observedAt};};
test('judge inventory retains source price and media even when no verifier/tool ran',()=>{
 const w=world(),v=judgeSourceInventory(w,['SM613']);
 assert.equal(v.worldHash,digest(w));assert(v.products[0].pos.snapshot.offers.DIRECT.sale_price>0);
 assert.equal(v.products[0].media.scope,'INSPECTED_PRODUCT_INDEX_ONLY');
 assert.equal(v.products[0].media.assets.length,0);
 assert.doesNotThrow(()=>assertJudgeSourceInventory(v,digest(w)));
 assert.throws(()=>assertJudgeSourceInventory({...v,worldHash:'wrong'},digest(w)),/SOURCE/);
 const changed=structuredClone(v);changed.products[0].pos.snapshot.offers.DIRECT.sale_price=1;
 const {contentHash,...body}=changed;changed.contentHash=digest(body);
 assert.throws(()=>assertJudgeSourceInventory(changed,digest(w),w),/NOT_DERIVED/);
});
test('unfrozen/missing sources cannot be silently converted to authoritative absence',()=>{
 const w=world();assert.throws(()=>judgeSourceInventory(w,['OTHER']),/NOT_FROZEN/);
 delete w.snapshots.SM613;assert.throws(()=>judgeSourceInventory(w,['SM613']),/NOT_FROZEN/);
 const missing=world();missing.snapshots.SM613=null;
 assert.equal(judgeSourceInventory(missing,['SM613']).products[0].pos.status,'NOT_FOUND');
});
