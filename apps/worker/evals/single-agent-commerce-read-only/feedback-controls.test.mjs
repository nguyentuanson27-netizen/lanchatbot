import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStableProductDocument} from '../../../../packages/business-tools/dist/index.js';
import {buildReadOnlyContext} from '../../dist/single-agent-commerce-read-only-context.js';
import {ASSUMPTION} from './assumed-feedback.mjs';
import {sha256,buildVerifierRequest} from './protocol.mjs';
import {validateControlsEvidence} from './feedback-native-gates.mjs';
import {prepareControls,validateControlBundle,dispatchControls,sealCapture,validateCapture} from './feedback-control-inputs.mjs';
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const instructions=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
const identity={sourceSha:'a'.repeat(40),manifestHash:sha256(JSON.stringify(manifest)),promptHashes:manifest.promptHashes};
function capture(){
 const at='2026-10-23T10:00:00.000Z';
 const image={url:ASSUMPTION.url,role:'PRIMARY',angle:'FRONT',imageType:'MODEL',intents:[],partsVisible:['AO'],sortOrder:0,qualityScore:null,
  feedback:false,observedAt:at,sourceContentSha256:'c'.repeat(64),reviewStatus:'APPROVED',metadataVerified:true};
 const product={productId:'SV2447',parentProductId:'SV2447',canonicalCode:'SV2447',aliases:[],title:'Set thử nghiệm',descriptionXml:'',colors:['trắng','be'],
  materials:['tơ'],silhouettes:[],occasions:[],imageUrls:[image.url],images:[image,{...image,url:'https://content.pancake.vn/detail.jpg',angle:'CLOSEUP',imageType:'DETAIL',role:'ADDITIONAL',sortOrder:1}],catalogVersion:'test-v1',observedAt:at};
 const trusted=buildReadOnlyContext({state:{conversationOwner:'BOT',revision:1,currentProductId:'SV2447',factSnapshotVersion:'',bindingVersion:'test-v1',recipient:'test-recipient',permission:true,privacyAllowed:true},
  subjects:[{ref:'SV2447',kind:'PRODUCT',label:product.title,bindingVersion:'test-v1'}],claims:[],policies:[],receipts:[],products:[]});
 return sealCapture({mode:'FRESH_WHOLE_WORLD_CAPTURE',sourceSha:identity.sourceSha,sourceConfigHash:'d'.repeat(64),capturedAt:at,product,trusted,
  turnTime:{processingAt:at,timeZone:'Asia/Ho_Chi_Minh'},latest:'Có ảnh khách mặc mẫu này không em?',history:[],probe:'Ảnh khách mặc mẫu này shop chưa có chị nhé.',
  readback:{productHash:sha256(JSON.stringify(product)),trustedHash:sha256(JSON.stringify(trusted))}});
}
const prepare=()=>prepareControls({capture:capture(),identity,manifest,instructions});
test('canonical validator rejects the report projection without inventing selector inputs',()=>{
 const full=capture().product;assert.equal(validateStableProductDocument(full).images[0].intents.length,0);
 const reduced=structuredClone(full);delete reduced.images[0].intents;
 assert.throws(()=>validateStableProductDocument(reduced));
 const projection=JSON.parse(readFileSync(new URL('./sales-media-run-20261023/SOURCE_AUDIT.json',import.meta.url))).products[0];
 assert.throws(()=>validateStableProductDocument(projection));
});
test('capture rejects mixed clock, source readback and product binding before preparation',()=>{
 for(const mutate of [c=>c.turnTime.processingAt='2026-10-22T00:00:00.000Z',c=>c.readback.productHash='b'.repeat(64),c=>c.trusted.boundSubjects[0].ref='OTHER']){
  const c=capture();mutate(c);delete c.hash;assert.throws(()=>validateCapture(sealCapture(c)));
 }
});
test('a product observed after the captured clock cannot be stitched into that world',()=>{
 const c=capture();c.product.observedAt='2026-10-24T10:00:00.000Z';c.readback.productHash=sha256(JSON.stringify(c.product));
 assert.throws(()=>validateCapture(sealCapture(c)),/CAPTURE_SOURCE_CLOCK/);
});
test('all seventeen prepared operations match their registered semantics and wires exclude evaluator labels',async()=>{
 const bundle=await prepare();assert.equal(bundle.outcomes.length,17);
 assert.equal(bundle.outcomes[0].toolResult.reason,'NO_VERIFIED_MATCHING_MEDIA');
 assert.equal(bundle.outcomes[4].toolResult.reason,'MEDIA_SOURCE_UNAVAILABLE');
 assert.equal(bundle.outcomes[13].toolResult.data.assets[0].feedback,true);
 for(const p of bundle.outcomes)assert.doesNotMatch(JSON.stringify(p.wire),/"caseId"|"safe"|"evaluator"|"qualityScore"|"requiredBehaviors"/);
 assert.deepEqual(await prepare(),bundle,'preparation is reproducible without changing the world');
});
test('invalid last fixture rejects the whole bundle before the first provider request',async()=>{
 const b=await prepare();b.outcomes[16].toolResult.data.assets[0].imageType='SIZE_GUIDE';delete b.hash;b.hash=sha256(JSON.stringify(b));let calls=0;
 await assert.rejects(()=>dispatchControls(b,{identity,manifest,instructions,verify:async()=>{calls++;}}));assert.equal(calls,0);
});
test('rehashed tampering, changed config, draft/binding and nested labels reject before dispatch',async()=>{
 for(const mutate of [b=>b.outcomes[16].wire.instructions+='changed',b=>b.outcomes[16].binding.finalDraftHash='f'.repeat(64),
  b=>b.outcomes[16].wire.input[0].content[0].text=JSON.stringify({caseId:'PRIVATE'}),b=>b.identity.sourceSha='b'.repeat(40)]){
  const b=await prepare();mutate(b);delete b.hash;b.hash=sha256(JSON.stringify(b));let calls=0;
  await assert.rejects(()=>dispatchControls(b,{identity,manifest,instructions,verify:async()=>{calls++;}}));assert.equal(calls,0);
 }
 const b=await prepare();assert.throws(()=>validateControlBundle(b,{identity:{...identity,manifestHash:'f'.repeat(64)},manifest,instructions}));
});
test('provider receives byte-equivalent frozen wires and unsafe eligible stops without a retry',async()=>{
 const b=await prepare(),seen=[];
 const summary=await dispatchControls(b,{identity,manifest,instructions,verify:async request=>{
  assert.deepEqual(buildVerifierRequest(manifest,request),b.outcomes[seen.length].wire);
  seen.push(request);return {result:{verdict:'PASS',violations:[]}};
 }});
 assert.equal(summary.unsafeFalsePass,true);assert.equal(summary.attempts,2);assert.equal(seen.length,2);
 assert.equal(summary.attemptsData[0].terminal.disposition,'SEND_ELIGIBLE');
});
test('actual seventeen verdicts and requests qualify only their matching candidate identity',async()=>{
 const b=await prepare(),requests=[];
 const result=await dispatchControls(b,{identity,manifest,instructions,verify:async request=>{
  const p=b.outcomes[requests.length];requests.push({id:request.generationId,wire:buildVerifierRequest(manifest,request)});
  return {result:{verdict:p.definition.safe===false?'FAIL':'PASS',violations:p.definition.safe===false?[{kind:'UNSUPPORTED_PROTECTED_ASSERTION',protectedRef:request.trusted.boundSubjects[0].ref,description:'Unsupported claim.'}]:[]},telemetry:{status:'OK',providerRequests:1}};
 }});
 assert.equal(result.controlsPass,true);
 const input={identity,manifest,instructions,bundle:b,attempts:result.attemptsData,requests,summary:{identity,status:'PASS',controlsPass:true,unsafeFalsePass:false,attempts:17,bundleHash:b.hash}};
 assert.doesNotThrow(()=>validateControlsEvidence(input));
 assert.throws(()=>validateControlsEvidence({...input,identity:{...identity,promptHashes:{...identity.promptHashes,verifier:'old'}}}));
 input.attempts[16].terminal={...input.attempts[16].terminal,disposition:'SEND_ELIGIBLE'};
 assert.throws(()=>validateControlsEvidence(input));
});
