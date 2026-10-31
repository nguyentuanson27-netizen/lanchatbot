// Offline source binding before any new results. It does not author shop facts or labels.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createCommerceReadSources} from '../../dist/single-agent-commerce-read-only-sources.js';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {frozenCatalog,frozenFacts} from './frozen-world.mjs';
import {digest,validateCorpus,runtimeProjection} from './qualification.mjs';
import {judgeSourceInventory,assertJudgeSourceInventory} from './evaluator-source.mjs';
export async function bindCorpus({draft,world,bindings,initialStateArtifact}){
 const worldHash=digest(world);
 assert(world.sourceWrites===0&&world.providerRequests===0,'C_WORLD_SOURCE_READS_ONLY');
 assert(bindings.review?.status==='APPROVED'&&bindings.review.worldHash===worldHash&&bindings.review.newProviderResultsObserved===0&&
  bindings.review.reviewer&&bindings.review.evidenceRef,'C_BINDINGS_REVIEW_REQUIRED');
 assert(initialStateArtifact.kind==='REAL_ADAPTER_NATIVE_INITIAL_STATE'&&initialStateArtifact.worldHash===worldHash&&
  initialStateArtifact.providerRequests===0&&initialStateArtifact.testDatabaseDropped===true&&initialStateArtifact.sourceDirty===false,'C_INITIAL_STATE_READBACK_REQUIRED');
 assert(Array.isArray(bindings.scenarios)&&bindings.scenarios.length===draft.scenarios.length&&
  new Set(bindings.scenarios.map(s=>s.id)).size===bindings.scenarios.length,'C_BINDINGS_DENOMINATOR');
 const corpus=structuredClone(draft),catalog=frozenCatalog(world),facts=frozenFacts(world),at=new Date(world.capturedAt);
 for(const s of corpus.scenarios){
  const b=bindings.scenarios.find(b=>b.id===s.id);assert(b&&Array.isArray(b.initialProductCodes)&&b.initialProductCodes.length<=3,'C_CASE_SOURCE_BINDING');
  const products=await Promise.all(b.initialProductCodes.map(c=>catalog.findByExactCode(c)));assert(products.every(Boolean),'C_BOUND_PRODUCT_NOT_FROZEN');
  const scope={...world.config.scope,conversationId:randomUUID(),requestId:randomUUID(),sourceMessageId:randomUUID(),sourceObservedAt:at.toISOString(),
   conversationOwner:'BOT',permission:true,privacyAllowed:true};
  const sources=createCommerceReadSources({scope,channel:world.config.channel,clock:()=>at,initialProducts:products,catalog,
   search:{searchText:catalog.searchText},facts,policyStore:{loadActivePointers:async()=>structuredClone(world.policyRecords)}});
  const mediaRead=(b.sourceReads??[]).some(c=>c.name==='select_product_media');
  if(mediaRead)assert(Array.isArray(b.mediaAllowedHostSuffixes)&&b.mediaAllowedHostSuffixes.length>0&&b.mediaAllowedHostSuffixes.every(h=>
   ['content.pancake.vn','lanadesign.vn','fbcdn.net','fbsbx.com'].includes(h)),'C_MEDIA_BINDING_HOST_SCOPE');
  const tools=await createCommerceTools({read:{scope,clock:()=>at,...sources,initialProducts:products,maxFactAgeSeconds:world.config.maxFactAgeSeconds,
   productGroups:world.config.productGroups},...(mediaRead?{media:{allowedHostSuffixes:b.mediaAllowedHostSuffixes}}:{})});
  await tools.prepare?.();
  for(const call of b.sourceReads??[]){assert(['read_product','read_policy','select_product_media'].includes(call.name),'C_BINDING_READ_ONLY');
   const result=await tools.invoke(call);assert(result.status==='OK'||call.name==='select_product_media'&&
    result.status==='UNAVAILABLE'&&result.reason==='NO_VERIFIED_MATCHING_MEDIA','C_CASE_SOURCE_UNAVAILABLE');}
  const trusted=tools.snapshot();assert.deepEqual(await tools.readback(),trusted,'C_WORLD_CHANGED_DURING_BINDING');
  for(const t of s.turns)t.initialProductCodes=[...b.initialProductCodes];
  if(s.mode==='SAFETY'){
   assert(typeof b.latest==='string'&&typeof b.finalDraft==='string'&&b.latest.trim()&&b.finalDraft.trim()&&
    b.expectedUnsafe===s.evaluator.unsafe&&Array.isArray(b.sourceRefs)&&b.sourceRefs.length>0&&b.reason,'C_SAFETY_BINDING_AND_LABEL_REVIEW');
   s.turns[0].latest=b.latest;s.turns[0].finalDraft=b.finalDraft;
   const refs=new Set([...trusted.boundSubjects.map(s=>s.ref),...trusted.protectedClaims.map(c=>c.claimId),
    ...trusted.policyLiterals.map(p=>p.ref),...(trusted.runtimeProducts??[]).map(p=>p.ref),...trusted.effectReceipts.map(r=>r.ref)]);
   assert(b.sourceRefs.every(ref=>typeof ref==='string'&&refs.has(ref)),'C_SAFETY_UNKNOWN_SOURCE_REF');
   assert.equal(hardPrecheck(trusted,b.finalDraft,at),null,'C_SAFETY_INITIAL_WORLD_INVALID');
   s.nativeSafety={trusted,worldHash,review:{status:'APPROVED',reviewer:bindings.review.reviewer,evidenceRef:bindings.review.evidenceRef,
    sourceRefs:b.sourceRefs,reason:b.reason},sourceHash:digest(trusted)};
  }else{
   // Native ingress needs genuine accepted history. Initial cases with authored shop history require separate seed evidence.
   assert(s.turns.every(t=>t.history.length===0),'C_INITIAL_HISTORY_SEED_NOT_IMPLEMENTED');
   s.initialContext={worldHash,initialStateHash:digest(initialStateArtifact.publicState),initialHistoryHash:digest([]),
    freshnessPolicyHash:digest({policy:'ACTUAL_WALL_CLOCK_CURRENT_SOURCE_READBACK',maxFactAgeSeconds:world.config.maxFactAgeSeconds})};
   const judgeCodes=[...new Set([...b.initialProductCodes,...(b.judgeProductCodes??[])])];
   assert(!b.noProductLookupRequired||judgeCodes.length===0,'C_JUDGE_SOURCE_SUBJECT_COVERAGE');
   const kind=b.judgeSourceKind??(b.initialProductCodes.length?'INITIAL_PRODUCTS':judgeCodes.length?'DISCOVERY_POOL':null);
   assert(kind,'C_JUDGE_SOURCE_REQUIREMENTS');
   s.judgeContext={sourceRequirements:{kind,productCodes:judgeCodes},sourceInventory:judgeSourceInventory(world,judgeCodes,
    {noProductLookupRequired:b.noProductLookupRequired===true}),facts:trusted.protectedClaims,policy:trusted.policyLiterals,products:trusted.runtimeProducts??[],
    initialState:initialStateArtifact.publicState,capabilities:bindings.capabilities};
   assertJudgeSourceInventory(s.judgeContext.sourceInventory,worldHash,world,s);
   if(b.nativeCodeOwnedTurns)s.nativeCodeOwnedTurns=b.nativeCodeOwnedTurns;
  }
  runtimeProjection(s,0);
 }
 corpus.status='SOURCE_BOUND_REQUIRES_FINAL_CORPUS_REVIEW';
 corpus.provenance.sourceBindingsPending=false;corpus.provenance.bindingArtifactHash=digest(bindings);
 corpus.review={status:'PENDING',worldHash,newProviderResultsObserved:0,bindingsReviewHash:digest(bindings.review),
  initialStateArtifactHash:digest(initialStateArtifact)};
 validateCorpus(corpus);return corpus;
}
if(process.argv[1]?.endsWith('bind-corpus.mjs')){
 const [draft,world,bindings,initial,out]=process.argv.slice(2);assert(out,'C_BIND_ARGUMENTS');
 const read=p=>JSON.parse(readFileSync(p,'utf8')),
  result=await bindCorpus({draft:read(draft),world:read(world),bindings:read(bindings),initialStateArtifact:read(initial)});
 writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.status,scenarios:result.scenarios.length,providerRequests:0}));
}
