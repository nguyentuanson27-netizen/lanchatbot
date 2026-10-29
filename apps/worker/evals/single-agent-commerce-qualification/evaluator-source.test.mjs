import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProduct} from '../../dist/single-agent-commerce.test-support.js';
import {digest} from './qualification.mjs';
import {judgeSourceInventory,assertJudgeSourceInventory} from './evaluator-source.mjs';
import {eligibleCommerceMedia} from '../../dist/single-agent-commerce-media-eligibility.js';
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
test('coverage binds all initial subjects and separately declares discovery/order-only sources',()=>{
 const w=world(),f=fixtureProduct('OTHER');w.products.push(f.product);w.snapshots.OTHER=f.snapshot;
 const scenario=(initial,kind,productCodes)=>({turns:[{initialProductCodes:initial}],judgeContext:{sourceRequirements:{kind,productCodes}}});
 const required=scenario(['SM613'],'INITIAL_PRODUCTS',['SM613']);
 assert.throws(()=>assertJudgeSourceInventory(judgeSourceInventory(w,['OTHER']),digest(w),w,required),/SUBJECT_COVERAGE/);
 const pair=scenario(['SM613','OTHER'],'INITIAL_PRODUCTS',['SM613','OTHER']);
 assert.throws(()=>assertJudgeSourceInventory(judgeSourceInventory(w,['SM613']),digest(w),w,pair),/SUBJECT_COVERAGE/);
 const noProduct=judgeSourceInventory(w,[],{noProductLookupRequired:true});
 assert.throws(()=>assertJudgeSourceInventory(noProduct,digest(w),w,required),/SUBJECT_COVERAGE/);
 assert.doesNotThrow(()=>assertJudgeSourceInventory(judgeSourceInventory(w,['OTHER']),digest(w),w,scenario([],'DISCOVERY_POOL',['OTHER'])));
 assert.doesNotThrow(()=>assertJudgeSourceInventory(noProduct,digest(w),w,scenario([],'ORDER_ONLY',[])));
 assert.throws(()=>assertJudgeSourceInventory(judgeSourceInventory(w,['OTHER']),digest(w),w,scenario([],'ORDER_ONLY',[])),/SUBJECT_COVERAGE/);
});
test('media ground truth preserves VALID INVALID ABSENT bindings and actual hash mismatch semantics',()=>{
 for(const binding of [{status:'VALID',color:'be',sha256:'a'.repeat(64)},{status:'INVALID'},
  {status:'ABSENT'},{status:'VALID',color:'be',sha256:'b'.repeat(64)}]){
  const w=world(),p=w.products[0];p.colors=['be','navy'];
  p.images=[{url:'https://content.pancake.vn/unit.jpg',role:'PRIMARY',angle:'FRONT',imageType:'PRODUCT_ONLY',intents:[],sortOrder:0,
   feedback:false,reviewStatus:'APPROVED',metadataVerified:true,observedAt:p.observedAt,sourceContentSha256:'a'.repeat(64),colorBinding:binding}];
  const projected=judgeSourceInventory(w,['SM613']).products[0].media.assets[0];assert.deepEqual(projected.colorBinding,binding);
  const query={subjectRef:'SM613',intent:'GENERIC',color:'be'},at=Date.parse(p.observedAt);
  if(binding.status==='VALID'&&binding.sha256==='a'.repeat(64))assert(eligibleCommerceMedia(p,query,at,['content.pancake.vn']).images.length>0);
  else assert.throws(()=>eligibleCommerceMedia(p,query,at,['content.pancake.vn']),/MEDIA_COLOR_BINDING_UNVERIFIED/);
 }
});
