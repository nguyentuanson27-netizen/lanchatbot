import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {expandSelectionOptions} from '../../dist/single-agent-commerce-selection-evidence.js';
import {resultBudgetView} from '../../dist/single-agent-commerce-read-only.js';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {buildVerifierRequest} from './protocol.mjs';
import {withNativePresentation} from './native-presentation.mjs';
import {makeBinding,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))),owner=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifier=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
test('all three offers keep every exact tuple in both native wires and fit unchanged product/result/wire bounds',async()=>{
 const f=fixtureProduct(),template=f.snapshot.offers.DIRECT,row=template.rows[0];
 f.snapshot.offers=Object.fromEntries(['AO','CV','SET'].map(offer=>[offer,{...structuredClone(template),rows:['be','navy','white','black','red','blue','green','brown'].map(color=>({...structuredClone(row),offer_type:offer,color,parent_variation_id:`SM613-${offer}-${color}`}))}]));
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const call={name:'read_product',args:{subjectRef:f.product.productId,offerTypes:['AO','CV','SET']}},result=await tools.invoke(call),context=tools.snapshot();assert.equal(result.status,'OK');
 const product=context.runtimeProducts[0];assert(Buffer.byteLength(JSON.stringify(product))<=8192);assert(Buffer.byteLength(JSON.stringify(resultBudgetView([call],[result],context)))<=8192);
 const request={generationId:'opaque',instructions:owner,context,contents:[{role:'user',parts:[{functionResponse:{name:call.name,response:result}}]}],toolsAllowed:true,toolBudget:{roundsRemaining:2,callsRemaining:5},availableTools:['read_product','read_policy'],signal:new AbortController().signal};
 const body=buildGeminiCommerceRequest(withNativePresentation(request,'VI_DATA_BLOCKS_COMPACT_V2'));
 const draft='Chị xem các lựa chọn nhé.',binding=makeBinding('opaque',draft,context),verifierBody=buildVerifierRequest(manifest,{instructions:verifier,finalDraft:draft,trusted:context,latest:'Các món này giá bao nhiêu em?',history:[],binding});
 for(const e of product.selectionEvidence){assert.equal(e.kind,'CANDIDATE_SELECTION_V2');assert.equal(e.options.length,8);assert(Buffer.byteLength(JSON.stringify(e))<=4096);
  assert(JSON.stringify(body).includes(e.contentHash));assert(JSON.stringify(verifierBody).includes(e.contentHash));
 }
 const projected=body.contents.at(-1).parts[0].functionResponse.response.data;assert(!Object.hasOwn(projected,'selectionEvidence'));assert(!Object.hasOwn(projected,'selectionOptions'));
 assert.deepEqual(result.data.selectionOptions,expandSelectionOptions(product.selectionEvidence[0]));
 assert(Buffer.byteLength(JSON.stringify(body))<=65536);assert(Buffer.byteLength(JSON.stringify(verifierBody))<=65536);
 // A local deterministic PASS object is only a gate negative control, never provider evidence.
 f.snapshot.offers.AO.rows[0].stock_quantity=0;await assert.rejects(()=>tools.readback());
 const expired=finalGate({expected:binding,response:{kind:'VERDICT',binding,result:{verdict:'PASS',violations:[]}},current:context,finalDraft:draft,now:new Date(commerceNow.getTime()+1200001)});
 assert.notEqual(expired.disposition,'SEND_ELIGIBLE');
});
