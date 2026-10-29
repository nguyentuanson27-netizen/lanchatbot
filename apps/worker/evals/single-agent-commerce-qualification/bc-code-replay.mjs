// Run once per source build, using the same frozen inputs. All ports are local read-only data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {read,write,validateInput,digest,byteHash,B_SHA,C_SHA} from './bc-control.mjs';
const [inputFile,arm,out]=process.argv.slice(2);assert(['B','C'].includes(arm)&&out,'CONTROL_REPLAY_ARGS');
const input=read(inputFile);validateInput(input);const root=arm==='B'?input.bRoot:input.cRoot;
const expected=arm==='B'?B_SHA:C_SHA;
if(arm==='B')assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),expected);
else execFileSync('git',['diff','--exit-code',C_SHA,'--','apps/worker/src','packages'],{cwd:root,stdio:'pipe'});
const load=path=>import(pathToFileURL(resolve(root,path)).href);
const [{hardPrecheck},{createReadOnlyTools},{createCommerceTools},{eligibleCommerceMedia},{RuntimePolicyResolver},business,{commerceSizeSource},{fixtureProfile}]=await Promise.all([
 load('apps/worker/dist/single-agent-semantic-verifier-boundary.js'),load('apps/worker/dist/single-agent-commerce-read-only-tools.js'),load('apps/worker/dist/single-agent-commerce.js'),
 load('apps/worker/dist/single-agent-commerce-media-eligibility.js'),load('packages/chat-runtime/dist/index.js'),load('packages/business-tools/dist/index.js'),
 load('apps/worker/dist/single-agent-commerce-product-groups.js'),load('apps/worker/dist/single-agent-commerce.test-support.js')]);
const world=read(input.cWorld);assert.equal(byteHash(readFileSync(input.cWorld)),input.cWorldHash,'CONTROL_WORLD_CHANGED');const now=new Date(world.capturedAt);
const policy=()=>new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(world.policyRecords)},{enabled:true,publishedEnabled:world.config.channel==='PUBLISHED'}).resolve({pageId:world.config.scope.pageId,channel:world.config.channel,now});
const scope={...world.config.scope,requestId:'bc-control',sourceMessageId:'bc-control',sourceObservedAt:now.toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
const product=id=>structuredClone(world.products.find(p=>p.productId===id));
const readInput=ids=>({scope,clock:()=>now,policy,initialProducts:ids.map(product),maxFactAgeSeconds:world.config.maxFactAgeSeconds,productGroups:world.config.productGroups,
 catalog:{readProduct:async id=>({product:product(id),snapshot:structuredClone(world.snapshots[id])}),searchText:async()=>{throw Error('CONTROL_UNREGISTERED_SEARCH');}}});
const historical=input.cases.map(c=>{
 const observations=[];const walk=v=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(k==='observedAt'&&Number.isFinite(Date.parse(x)))observations.push(Date.parse(x));else walk(x);}};walk(c.historicalTrusted);
 // The wire records turn start, not the final gate's wall clock. A size result may be observed later.
 const earliestAt=new Date(Math.max(Date.parse(c.historicalTime),...observations)+1),reasons=[],startReasons=[];
 return {caseId:c.caseId,at:c.historicalTime,inputHash:digest({trusted:c.historicalTrusted,draft:c.historicalDraft,time:c.historicalTime}),
  atTurnStart:hardPrecheck(structuredClone(c.historicalTrusted),c.historicalDraft,new Date(c.historicalTime),r=>startReasons.push(...r)),startReasons,
  earliestNonFutureEvidenceAt:earliestAt.toISOString(),clockProvenance:'DERIVED_LOWER_BOUND_NOT_CAPTURED_FINAL_GATE_TIME',
  hardPrecheck:hardPrecheck(structuredClone(c.historicalTrusted),c.historicalDraft,earliestAt,r=>reasons.push(...r)),reasons};
});
const queries=[{subjectRef:'SV2447'},{subjectRef:'SV2447',offerType:'AO'},{subjectRef:'SV2447',offerType:'SET_VAY'},{subjectRef:'SV1561'},{subjectRef:'SV1561',offerType:'SET_VAY'}];
const readProbes=[];
for(const args of queries){const tools=await createCommerceTools({read:readInput([args.subjectRef])});const result=await tools.invoke({name:'read_product',args});
 let readback;try{await tools.readback();readback='OK';}catch(error){readback=error.message;}
 readProbes.push({query:args,sourceInputHash:digest({product:product(args.subjectRef),snapshot:world.snapshots[args.subjectRef],at:now.toISOString()}),status:result.status,reason:result.reason??null,
  responseBytes:Buffer.byteLength(JSON.stringify(result)),runtimeProductBytes:Buffer.byteLength(JSON.stringify(tools.snapshot().runtimeProducts??[])),readback,
  facts:tools.snapshot().protectedClaims.map(c=>({type:c.type,scope:c.scope,value:c.value})),response:result});}
const hosts=['content.pancake.vn','lanadesign.vn','fbcdn.net','fbsbx.com'],freshness=[];
for(const id of ['SV1561','V406','SV2447']){
 // Identical counterfactual clocks across both versions; never derive clocks from arm-specific behavior.
 const p=product(id),times=(p.images??[]).map(i=>Date.parse(i.observedAt??p.observedAt??'')).filter(Number.isFinite);
 assert(times.length,'CONTROL_MEDIA_OBSERVATION');const first=Math.min(...times),boundary=first+30*86400000;
 for(const at of [boundary-1,boundary+1,now.getTime()])for(const q of [{subjectRef:id,intent:'GENERIC'},{subjectRef:id,intent:'DETAIL'},{subjectRef:id,intent:'DETAIL',componentRole:'TOP'}]){
  try{const r=eligibleCommerceMedia(p,q,at,hosts);freshness.push({productId:id,productHash:digest(p),at:new Date(at).toISOString(),query:q,selected:r.images.length,alternatives:r.alternatives});}
  catch(error){freshness.push({productId:id,productHash:digest(p),at:new Date(at).toISOString(),query:q,error:error.message});}
 }
}
const contexts=[];
for(const ids of [['SV2447'],['SV2447','SQ2447']])for(const readPolicy of [false,true]){
 const tools=await createCommerceTools({read:readInput(ids)});await tools.prepare?.();if(readPolicy)await tools.invoke({name:'read_policy',args:{}});
 const snapshot=tools.snapshot();contexts.push({initialProductCodes:ids,readPolicy,worldHash:input.cWorldHash,snapshotHash:digest(snapshot),
  currentProductId:snapshot.state.currentProductId,subjectRefs:snapshot.boundSubjects.map(s=>s.ref),productRefs:(snapshot.runtimeProducts??[]).map(p=>p.subjectRef),
  policyRefs:snapshot.policyLiterals.map(p=>p.ref),claimTypes:snapshot.protectedClaims.map(p=>p.type),snapshot});
}
// Same source/chart/profile through each version's real size engine. No state write or fit authorization.
const sizeCase=input.cases.find(c=>c.caseId==='sales-size-advice:height-weight'),state=sizeCase.historicalTrusted.state;
const capturedProfile=read(sizeCase.rawArtifact).committedPublicState;
assert.deepEqual(capturedProfile.measurements.map(m=>({kind:m.kind,value:m.value})),state.customerMeasurements,'CONTROL_MEASUREMENT_SOURCE');
const profile={...fixtureProfile().profile,profileId:state.customerProfileId,revision:state.customerProfileRevision,measurements:capturedProfile.measurements,
 fitPreference:state.fitPreference,updatedAt:now.toISOString()};
const resolved=await policy();assert.equal(resolved.status,'RESOLVED');const sizeInput=commerceSizeSource(product('SV2447'),resolved,world.config.productGroups);
const size=business.recommendSize({...sizeInput,profile,generatedAt:now.toISOString()});
const policyTools=createReadOnlyTools(readInput(['SV2447']));const policyResult=await policyTools.invoke({name:'read_policy',args:{}});
const result={kind:'OFFLINE_CODE_COMPONENT_REPLAY_NOT_END_TO_END',arm,sourceSha:expected,inputHash:digest(input),worldHash:input.cWorldHash,providerRequests:0,effects:0,sendEnabled:false,
 historical,readProbes,freshness,contexts,size:{inputHash:digest({source:sizeInput,profile,generatedAt:now.toISOString()}),result:size},policyResult,
 limitations:['Scripted read-only ports and size evaluation, not real PostgreSQL/native ingress replay','Historical hard gate checks cannot measure model semantics or replace verifier','Freshness counterfactual applies only to media component, not current authorization','Search algorithm parity is not established']};
write(out,result);console.log(JSON.stringify({arm,historical:historical.map(r=>r.hardPrecheck),reads:readProbes.map(r=>({query:r.query,status:r.status,reason:r.reason})),size:size.recommendation.status,providerRequests:0}));
