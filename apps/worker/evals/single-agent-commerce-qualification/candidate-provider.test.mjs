// Local stubbed HTTP only; these responses are never campaign/model evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,basename} from 'node:path';
import {fixtureProduct} from '../../dist/single-agent-commerce.test-support.js';
import {makeBinding} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {buildQuoteRequest} from '../single-agent-commerce-read-only/quote-presentation-diagnostic.mjs';
import {createCandidateProvider,assertSealedInputs} from './candidate-provider.mjs';
import {digest,qualificationIdentity,registerSlots} from './qualification.mjs';
import {config,corpus} from './fixtures.test-support.mjs';
import {NATIVE_CODECS} from './native-wire.mjs';
function setup(t,dependencies={}){
 const out=mkdtempSync(resolve(tmpdir(),'c3-c-provider-unit-'));
 t.after(()=>{assert.equal(dirname(out),resolve(tmpdir()));assert(basename(out).startsWith('c3-c-provider-unit-'));rmSync(out,{recursive:true,force:true});});
 const m=JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/manifest.json',import.meta.url))),p=fixtureProduct('SV2447',new Date()),
  world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',config:{scope:{shopAlias:'LANA'},vertex:{projectId:'unit-project'}},products:[p.product],snapshots:{SV2447:p.snapshot},policyRecords:[]};
 world.sourceEvidenceHashes=[digest(world.products),digest(world.snapshots),digest(world.policyRecords)];
 const runtimeInput={latest:'Mẫu SV2447 này giá bao nhiêu em?',history:[],initialProductCodes:['SV2447']};
 const preflight={m,world,registration:{maximumGenerationRequests:8},sealed:{slots:[{slotId:'unit-slot',caseId:'unit-case',arm:'CANDIDATE',mode:'SINGLE'},
  {slotId:'unit-next-slot',caseId:'unit-next-case',arm:'CANDIDATE',mode:'SINGLE'}],corpus:{scenarios:[{id:'unit-case',turns:[runtimeInput]},
   {id:'unit-next-case',turns:[runtimeInput]}]}}};
 const provider=createCandidateProvider({preflight,out,dependencies:{unitFixture:true,getToken:async()=>'unit-token-not-real',...dependencies}});
 provider.setSlot({slotId:'unit-slot',turnIndex:0,runtimeInput});
 const row=JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))).records[0];
 const request=buildQuoteRequest(row,'A','unit-request',provider.ownerPrompt);request.contents=[{role:'user',parts:[{text:runtimeInput.latest}]}];
 return {provider,request,m,runtimeInput,out};
}
const response=()=>new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',usageMetadata:{promptTokenCount:7,candidatesTokenCount:3},
 candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Áo 499k chị nhé.'}]}}]}));
test('dispatch preflight rejects changed registration corpus, slots, world, codec or review before clients are constructed',()=>{
 const c=config();c.nativeCodecs=NATIVE_CODECS;const pop=corpus(),world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD'};
 pop.review={status:'APPROVED',worldHash:digest(world),newProviderResultsObserved:0};
 const sealed={config:c,corpus:pop,corpusHash:digest(pop),identity:qualificationIdentity(c),worldHash:digest(world),
  slots:registerSlots(c,pop),sendEnabled:false,status:'SEALED_NOT_EXECUTED',registeredAt:'2026-10-28T00:00:00.000Z'};
 assertSealedInputs(sealed,world);
 for(const mutate of [s=>{s.corpus.scenarios[0].turns[0].latest='Another question';},s=>{s.slots.pop();},s=>{s.worldHash='f'.repeat(64);},
  s=>{s.sendEnabled=true;},s=>{s.corpus.review.status='PENDING';},s=>{s.config.nativeCodecs.OWNER='UNREGISTERED';}]){
  const bad=structuredClone(sealed);mutate(bad);assert.throws(()=>assertSealedInputs(bad,world));
 }
});
test('actual native client ledger captures one HTTP body, CompactV2 and exposed usage',async t=>{
 let posts=0;const f=setup(t,{fetchImpl:async()=>{posts++;return response();}});
 const value=await f.provider.owner(f.request);assert.equal(value.kind,'FINAL');assert.equal(posts,1);
 const g=f.provider.observed()[0];assert.equal(g.status,'OK');assert.equal(g.providerRequests,1);assert.equal(g.metrics.inputTokens,7);
 assert(g.requestBody.contents[0].parts[0].text.startsWith('Thời điểm'));assert.equal(g.requestHash,digest(g.requestBody));
 await assert.rejects(f.provider.owner(f.request),/DUPLICATE_GENERATION_ID/);assert.equal(posts,1);
});
test('401/429/5xx are single failed generations with no retry or next call in the same turn',async t=>{
 for(const status of [401,429,500]){
  let posts=0;const f=setup(t,{fetchImpl:async()=>{posts++;return new Response('unit-error',{status});}});
  await assert.rejects(f.provider.owner(f.request));assert.equal(posts,1);
  assert.equal(f.provider.observed()[0].providerRequests,1);assert.equal(f.provider.observed()[0].status,'PROVIDER_ERROR');
  await assert.rejects(f.provider.owner({...f.request,generationId:'unit-second'}),/ROLE_CAP_OR_PRIOR_FAILURE/);assert.equal(posts,1);
 }
});
test('auth failure and request-shape failure remain registered with zero upstream generations',async t=>{
 let posts=0;const f=setup(t,{getToken:async()=>{throw Error('UNIT_AUTH_FAILED');},fetchImpl:async()=>{posts++;return response();}});
 await assert.rejects(f.provider.owner(f.request));assert.equal(posts,0);
 const row=f.provider.observed()[0];assert.equal(row.failureLayer,'PRE_DISPATCH');assert.equal(row.providerRequests,0);
 const other=setup(t,{fetchImpl:async()=>{posts++;return response();}});
 await assert.rejects(other.provider.owner({...other.request,context:{}}));assert.equal(other.provider.observed().length,1);assert.equal(posts,0);
});
test('per-turn owner cap rejects a fourth call before HTTP and verifier usage uses Responses fields',async t=>{
 let posts=0;const f=setup(t,{fetchImpl:async()=>{posts++;return response();},verifier:async()=>({result:{verdict:'PASS',violations:[]},
  telemetry:{providerRequests:1,modelVersion:'gpt-6.1-sol',usage:{input_tokens:11,output_tokens:4}}})});
 for(let n=0;n<3;n++)await f.provider.owner({...f.request,generationId:'unit-owner-'+n});
 await assert.rejects(f.provider.owner({...f.request,generationId:'unit-owner-four'}),/ROLE_CAP_OR_PRIOR_FAILURE/);assert.equal(posts,3);
 const draft='Dạ chị.',binding=makeBinding('unit-verifier',draft,f.request.context);
 const request={generationId:'unit-verifier',instructions:f.provider.verifierPrompt,trusted:f.request.context,finalDraft:draft,
  latest:f.runtimeInput.latest,history:[],binding,signal:new AbortController().signal};
 await f.provider.verifier(request);assert.equal(f.provider.observed().at(-1).metrics.inputTokens,11);
 await assert.rejects(f.provider.verifier({...request,generationId:'unit-verifier-two'}),/ROLE_CAP_OR_PRIOR_FAILURE/);
});
test('slow aborted HTTP remains pending with counted dispatch and prevents switching slots',async t=>{
 let release,dispatched;const sent=new Promise(resolve=>{dispatched=resolve;});
 const f=setup(t,{fetchImpl:async()=>{dispatched();return new Promise(resolve=>{release=resolve;});}});
 const controller=new AbortController(),work=f.provider.owner({...f.request,signal:controller.signal});await sent;controller.abort();
 assert.equal(await f.provider.awaitSettled(5),false);const row=f.provider.observed()[0];assert.equal(row.status,'PENDING');assert.equal(row.providerRequests,1);
 assert.throws(()=>f.provider.setSlot({slotId:'unit-next-slot',turnIndex:0,runtimeInput:f.runtimeInput}),/PENDING_GENERATION/);
 release(response());await work;assert.equal(await f.provider.awaitSettled(),true);
 const lines=readFileSync(resolve(f.out,'NATIVE_REQUESTS.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert(lines.every(line=>line.slotId==='unit-slot'));assert.equal(f.provider.observed()[0].providerRequests,1);
});
