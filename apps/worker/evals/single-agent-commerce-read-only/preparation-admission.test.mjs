import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {admitPreparedCommerceContext} from './preparation-admission.mjs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {buildVerifierRequest} from './protocol.mjs';
import {withNativePresentation} from './native-presentation.mjs';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {makeBinding} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))),owner=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifier=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
const setup=()=>{const f=fixtureProduct();return createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,prepareCurrentOffers:true,candidateEvidence:true,initialProducts:[f.product],
 catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});};
const request=context=>({generationId:'opaque',instructions:owner,context,contents:[{role:'user',parts:[{text:'Áo này giá bao nhiêu em?'}]}],toolsAllowed:true,
 toolBudget:{roundsRemaining:2,callsRemaining:5},availableTools:['read_product','read_policy'],signal:new AbortController().signal});
test('admits current summary against actual native owner and reserved verifier wire with no provider',async()=>{
 const tools=setup();let calls=0;
 assert.equal(await tools.prepare(context=>{calls++;return admitPreparedCommerceContext(manifest,verifier,request(context));}),1);
 assert.equal(calls,1);assert(tools.snapshot().protectedClaims.some(c=>c.type==='PRICE'));
 await assert.doesNotReject(()=>tools.readback());
});
test('oversized actual native serialization rejects optional data without dropping catalog or making generation',async()=>{
 const tools=setup();await tools.prepare(context=>admitPreparedCommerceContext(manifest,verifier,{...request(context),instructions:'x'.repeat(65536)}));
 assert.deepEqual(tools.snapshot().protectedClaims,[]);assert(tools.snapshot().runtimeProducts[0].content);
});
test('exact selected tuple proof reaches both owner and verifier native requests',async()=>{
 const tools=setup();const result=await tools.invoke({name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT',size:'M'}});
 assert.equal(result.status,'OK');const context=tools.snapshot(),e=context.runtimeProducts[0].selectionEvidence[0];
 const ownerBody=buildGeminiCommerceRequest(withNativePresentation(request(context),'VI_DATA_BLOCKS_COMPACT_V2'));
 const finalDraft='Chị xem lựa chọn này nhé.',verifierBody=buildVerifierRequest(manifest,{instructions:verifier,finalDraft,trusted:context,
  latest:'Áo này giá bao nhiêu em?',history:[],binding:makeBinding('opaque',finalDraft,context)});
 assert(JSON.stringify(ownerBody).includes(e.contentHash));assert(JSON.stringify(verifierBody).includes(e.contentHash));
 assert(Buffer.byteLength(JSON.stringify(ownerBody))<=65536);assert(Buffer.byteLength(JSON.stringify(verifierBody))<=65536);
});
