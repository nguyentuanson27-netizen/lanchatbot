// Offline capacity check on the frozen J1 world and captured empty before-state.
// Captured clock is never a live/provider/send eligibility clock. No DB or HTTP.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {RuntimePolicyResolver,createSalesCycleRuntimeState} from '@lana/chat-runtime';
import {createConversationState} from '@lana/conversation-engine';
import {CustomerProfileV1Schema} from '@lana/contracts';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {commerceHash,commerceUuid} from '../../dist/single-agent-commerce-read-only-context.js';
import {EXPLICIT_QUOTE_TASK} from '../../dist/single-agent-commerce-quote.js';
import {frozenFacts} from './frozen-world.mjs';
import {byteHash,digest} from './bc-control.mjs';

export async function replayJ1Code({world,native,subjectRef,offerType}){
 const before=native.before.publicState,first=native.generations.find(g=>g.role==='OWNER');
 assert(before.owner==='BOT'&&before.stage==='DISCOVERY'&&before.salesRevision===0&&before.cart===null&&
  before.preview===null&&before.confirmation===null&&before.negotiation===null&&native.before.receipts.length===0,'J1_REPLAY_BEFORE_STATE');
 assert(first.runtimeInput.initialProductCodes.includes(subjectRef),'J1_REPLAY_SUBJECT');
 const at=new Date(first.startedAt);assert(Number.isFinite(at.getTime()),'J1_CAPTURED_CLOCK');
 const scope={...world.config.scope,requestId:'offline-j1',sourceMessageId:'offline-j1',sourceObservedAt:at.toISOString(),
  revision:before.revision,conversationOwner:'BOT',permission:true,privacyAllowed:true};
 const clock=()=>at,policy=()=>new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(world.policyRecords)},
  {enabled:true,publishedEnabled:world.config.channel==='PUBLISHED'}).resolve({pageId:scope.pageId,channel:world.config.channel,now:at});
 const facts=frozenFacts(world),products=first.runtimeInput.initialProductCodes.map(id=>{
  const p=world.products.find(p=>p.productId===id);assert(p,'J1_FROZEN_PRODUCT');return structuredClone(p);
 });
 let casCalls=0;
 const make=async()=>{
  const state=createSalesCycleRuntimeState(scope.conversationId,{pageId:scope.pageId,conversationId:scope.conversationId},at);
  const profile={profile:CustomerProfileV1Schema.parse({schemaVersion:1,profileId:commerceUuid(commerceHash(['offline-j1','profile'])),
   customerKey:{namespace:'meta',algorithm:'HMAC_SHA256',digest:scope.customerHash},...before.profile,sizeHistory:[],createdAt:at.toISOString(),updatedAt:at.toISOString()}),fieldEvidence:{}};
  assert(state.stage===before.stage&&state.revision===before.salesRevision,'J1_REPLAY_STATE_PARITY');
  return createCommerceTools({read:{scope,clock,policy,initialProducts:products,maxFactAgeSeconds:world.config.maxFactAgeSeconds,
   entry:{firstContact:false,fromAd:false},productGroups:world.config.productGroups,
   catalog:{readProduct:async id=>({product:structuredClone(world.products.find(p=>p.productId===id)),snapshot:structuredClone(world.snapshots[id])}),
    searchText:async()=>{throw Error('J1_UNREGISTERED_SEARCH');}}},quoteTask:EXPLICIT_QUOTE_TASK,
   state:{store:{read:async()=>structuredClone(profile),compareAndSwap:async()=>{casCalls++;throw Error('J1_OFFLINE_PROFILE_EFFECT_FORBIDDEN');}},
    sizeInput:async()=>{throw Error('J1_UNREGISTERED_SIZE');},quoteInput:async()=>{throw Error('J1_EMPTY_CART_QUOTE_MUST_NOT_RUN');}},
   handoff:{read:async()=>({...scope,fence:1,stateVersion:scope.revision,
    state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:at}),revision:scope.revision}}),
    commit:async()=>{casCalls++;throw Error('J1_OFFLINE_HANDOFF_FORBIDDEN');},
    policy:async()=>{const r=await policy();assert(r.bundle);return r.bundle;}},
   effects:{conversationKey:scope.conversationId,repository:{read:async()=>structuredClone(state),compareAndSwap:async()=>{casCalls++;throw Error('J1_OFFLINE_EFFECT_FORBIDDEN');}},
    identity:{cartId:commerceUuid(commerceHash(['offline-j1','cart'])),salesEpisodeId:commerceUuid(commerceHash(['offline-j1','episode'])),customerProfileId:commerceUuid(commerceHash(['offline-j1','profile']))},
    authorize:async()=>true,policy:async()=>{const r=await policy();assert(r.bundle);return r.bundle;},
    select:q=>facts.resolveCartSelection(q,at),readReceipt:async()=>null}});
 };
 const bad=await make(),badCalls=[...['M','L'].map(size=>({name:'add_to_cart',args:{subjectRef,offerType,size,color:null,quantity:1}})),{name:'quote_cart',args:{}}];
 await bad.prepare?.();const badResults=await bad.invokeBatch(badCalls);
 assert(badResults.slice(0,2).every(r=>r.status==='UNAVAILABLE'&&r.reason==='SELECTION_UNAVAILABLE'),'J1_REPLAY_WRONG_PATH_REASON');
 assert.equal(badResults[2].reason,'DEPENDENT_EFFECT_REJECTED');assert.equal(casCalls,0);
 const good=await make();await good.prepare?.();const receipts=structuredClone(good.snapshot().effectReceipts);
 const goodResult=await good.invoke({name:'quote_product',args:{subjectRef,offerTypes:[offerType],quantity:2}});
 assert.equal(goodResult.status,'OK',JSON.stringify(goodResult));
 const proof=good.snapshot().policyLiterals.filter(p=>p.ref.startsWith('pre-cart-quote:')).map(p=>JSON.parse(p.text)).find(p=>p.subjectRef===subjectRef);
 assert(proof&&proof.quantity===2&&Number.isSafeInteger(proof.grandTotalVnd),'J1_CODE_TOTAL_REQUIRED');
 assert.equal(casCalls,0);assert.deepEqual(good.snapshot().effectReceipts,receipts);assert.equal(good.snapshot().state.cartItems.length,0);
 await good.readback();
 return {kind:'OFFLINE_J1_CAPACITY_NOT_MODEL_OR_FULL_DATABASE_REPLAY',worldHash:digest(world),nativeHash:digest(native),
  capturedClock:at.toISOString(),clockPurpose:'OFFLINE_ONLY_NEVER_PROVIDER_OR_SEND',beforeStateHash:digest(before),subjectRef,offerType,
  actualBadBatch:badCalls,badResults,goodResult,proof,casCalls,providerRequests:0,sendEnabled:false,
  limitations:['Reconstructs captured empty sales-cycle business state, not a full historical database',
   'Scripted paths prove available code capacity only; they do not predict owner selection or sales quality']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [worldFile,nativeFile,subjectRef,offerType,out]=process.argv.slice(2);assert(out,'J1_REPLAY_ARGS');
 const worldRaw=readFileSync(worldFile),nativeRaw=readFileSync(nativeFile);
 const result=await replayJ1Code({world:JSON.parse(worldRaw),native:JSON.parse(nativeRaw),subjectRef,offerType});
 writeFileSync(out,JSON.stringify({...result,inputRawHashes:{world:byteHash(worldRaw),native:byteHash(nativeRaw)}},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({bad:result.badResults.map(r=>[r.status,r.reason]),totalVnd:result.proof.grandTotalVnd,casCalls:0,providerRequests:0}));
}
