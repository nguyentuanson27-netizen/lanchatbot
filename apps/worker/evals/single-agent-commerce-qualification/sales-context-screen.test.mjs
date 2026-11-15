import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnosticScope,diagnosticSlots} from './diagnostic.mjs';
import {nativeContextJobs,CONTEXT_BUDGET,CONTEXT_BASELINE_SHA,contextNativeDrafts} from './sales-context-screen.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const scopes=Object.fromEntries(['PRIMARY','CONTROLS'].map(k=>[k,read('./SALES_CONTEXT_'+k+'_SCOPE_20261115.json')]));
const scripts=read('./SALES_CONTEXT_CONTROL_CASES_20261115.json').scenarios;
test('native control scripts are natural dialogue with fixed population and no added repetitions',()=>{
 const corpus={provenance:{diagnosticScope:scopes.CONTROLS.name},scenarios:scripts};
 const slots=diagnosticSlots(corpus,1);
 assert.equal(slots.length,4);assert.equal(slots.reduce((n,s)=>n+s.maximumGenerations,0),24);
 assert.equal(diagnosticScope(corpus).maximumNativeCustomerTurns,6);
 assert.equal(CONTEXT_BUDGET.total,CONTEXT_BUDGET.replayOwner+CONTEXT_BUDGET.replayJudge+CONTEXT_BUDGET.nativeOwner+CONTEXT_BUDGET.nativeVerifier+CONTEXT_BUDGET.nativeJudge);
 assert(scripts.every(s=>s.turns.every(t=>t.history.length===0)));
});
test('native phase is blocked before replay passes and requires the pinned baseline',()=>{
 assert.throws(()=>nativeContextJobs({score:{stage:'CONTEXT',status:'STOP'}}),/CONTEXT_REPLAY_NOT_PASSED/);
 assert.throws(()=>nativeContextJobs({score:{stage:'CONTEXT',status:'PASS'},baseline:{runSourceSha:'wrong'}}),/CONTEXT_BASELINE_SOURCE/);
 assert.match(CONTEXT_BASELINE_SHA,/^[0-9a-f]{40}$/);
});
test('fresh source binding can replace evidence, but cannot change the preregistered customer scripts',()=>{
 const missing={scenarios:[],provenance:{}};
 assert.throws(()=>contextNativeDrafts(missing,{scenarios:scripts}),/CONTEXT_PRIMARY_MISSING/);
 const fake=scopes.PRIMARY.cases.map(c=>({id:c.sourceCase,mode:c.mode,turns:Array.from({length:c.turns},()=>({latest:'wrong',history:[],initialProductCodes:[]}))}));
 assert.throws(()=>contextNativeDrafts({scenarios:fake},{scenarios:scripts}),/CONTEXT_CUSTOMER_SCRIPTS/);
});

test('one frozen world yields exactly five baseline, 25 candidate and four control attempts',()=>{
 const primary=read('./SALES_CONTEXT_PRIMARY_SCRIPTS_20261115.json'),controlCases=read('./SALES_CONTEXT_CONTROL_CASES_20261115.json');
 const drafts=contextNativeDrafts({scenarios:primary,provenance:{}},controlCases);
 const candidate={runSourceSha:'a'.repeat(40),worldHash:'b'.repeat(64),config:{repetitions:5,salesContextPresentation:true,salesContextScreen:true},
  corpus:drafts.primary,slots:diagnosticSlots(drafts.primary,5)};
 const controls={runSourceSha:candidate.runSourceSha,worldHash:candidate.worldHash,config:{repetitions:5,salesContextPresentation:true},
  corpus:drafts.controls,slots:diagnosticSlots(drafts.controls,1)};
 const baseline={...structuredClone(candidate),runSourceSha:CONTEXT_BASELINE_SHA};
 const score={stage:'CONTEXT',status:'PASS',sourceSha:candidate.runSourceSha,rows:Array.from({length:12},()=>({})),
  registrationHash:'c'.repeat(64),resultsHash:'d'.repeat(64),gradesHash:'e'.repeat(64)};
 const jobs=nativeContextJobs({score,baseline,candidate,controls});
 assert.deepEqual(jobs.jobs.map(j=>j.slotIds.length),[5,25,4]);
 assert.equal(jobs.jobs.reduce((n,j)=>n+j.turns,0),66);
 assert.equal(jobs.jobs.reduce((n,j)=>n+j.maximumGenerationRequests,0),264);
 const other=structuredClone(candidate);other.runSourceSha='f'.repeat(40);
 assert.throws(()=>nativeContextJobs({score,baseline,candidate:other,controls}),/CONTEXT_REPLAY_SOURCE_CHANGED/);
 const wrong=structuredClone(controls);wrong.slots.push(wrong.slots[0]);
 assert.throws(()=>nativeContextJobs({score,baseline,candidate,controls:wrong}),/CONTEXT_NATIVE_DENOMINATOR/);
});

test('native campaign guard refuses other slots, altered replay proof and excess generations',async()=>{
 const {checkedContextJob,contextGenerationGuard}=await import('./sales-context-campaign.mjs');
 const {digest}=await import('./qualification.mjs');
 const primary=read('./SALES_CONTEXT_PRIMARY_SCRIPTS_20261115.json'),controlCases=read('./SALES_CONTEXT_CONTROL_CASES_20261115.json');
 const drafts=contextNativeDrafts({scenarios:primary,provenance:{}},controlCases),world={testOnly:true};
 const candidate={runSourceSha:'a'.repeat(40),worldHash:digest(world),config:{repetitions:5,salesContextPresentation:true,salesContextScreen:true},
  corpus:drafts.primary,slots:diagnosticSlots(drafts.primary,5)};
 const controls={runSourceSha:candidate.runSourceSha,worldHash:candidate.worldHash,config:{repetitions:5,salesContextPresentation:true},
  corpus:drafts.controls,slots:diagnosticSlots(drafts.controls,1)};
 const baseline={...structuredClone(candidate),runSourceSha:CONTEXT_BASELINE_SHA};
 const score={stage:'CONTEXT',status:'PASS',sourceSha:candidate.runSourceSha,rows:Array.from({length:12},()=>({})),
  registrationHash:'c'.repeat(64),resultsHash:'d'.repeat(64),gradesHash:'e'.repeat(64)};
 const campaign=nativeContextJobs({score,baseline,candidate,controls}),seal=digest(campaign);
 const proof={campaign,seal,kind:'CONTROLS',score},registration=controls,source=controls.runSourceSha;
 const job=checkedContextJob({...proof,registration,world,source});
 const g=contextGenerationGuard({load:()=>proof,registration,world,source});
 const active={slotId:job.slotIds[0],turnIndex:0};
 g.beforeGeneration({generations:[],active,role:'OWNER'});
 assert.throws(()=>g.beforeGeneration({generations:[],active:{...active,slotId:'other'},role:'OWNER'}),/CONTEXT_UNREGISTERED_SLOT/);
 assert.throws(()=>g.beforeGeneration({generations:Array.from({length:24},()=>active),active,role:'OWNER'}),/CONTEXT_JOB_CAP/);
 proof.score={...score,status:'STOP'};assert.throws(()=>g.check(),/CONTEXT_REPLAY_SCORE_CHANGED/);
});

test('the pinned runner receives the private seed and exact slot file without accepting an extra verifier probe',async()=>{
 const {contextNativeInvocation}=await import('./sales-context-campaign.mjs');
 const args=contextNativeInvocation({proof:{kind:'BASELINE_J2'},registrationPath:'registration.json',worldPath:'world.json',
  sourceRoot:'.',out:'unused',seedPath:'private.json',slotFile:'slots.json'});
 assert.match(args[args.indexOf('--phase-c-seed')+1],/private\.json$/);
 assert.equal(args[args.indexOf('--phase-c-slot-ids')+1],'slots.json');
 assert(!args.includes('--sales-context-campaign'));
 assert.throws(()=>nativeContextJobs({score:{stage:'CONTEXT',status:'PASS'},baseline:{runSourceSha:CONTEXT_BASELINE_SHA,slots:[{mode:'SAFETY'}]}}),/CONTEXT_NATIVE_NO_PROBES/);
});

test('control registration passes source binding with four slots while decisions keep five repetitions',async()=>{
 const {fixtureProduct,fixturePolicyPointers,commerceScope,commerceNow}=await import('../../dist/single-agent-commerce.test-support.js');
 const {bindCorpus}=await import('./bind-corpus.mjs');
 const {collectNativePopulation}=await import('./native-population.mjs');
 const {digest,qualificationIdentity,validateCorpus}=await import('./qualification.mjs');
 const {diagnosticRepetitions,validateDiagnostic}=await import('./diagnostic.mjs');
 const {assertApprovedDecisions}=await import('./source-identity.mjs');
 const {assertPopulationReadiness}=await import('./source-readiness.mjs');
 const {OPENING_PRODUCT_MEDIA_RULE}=await import('../../dist/single-agent-commerce-opening-media.js');
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const draft=read('./SALES_CONTEXT_CONTROL_CASES_20261115.json'),decisions=read('./owner-decisions.json');
 const src='a'.repeat(40), hash='a'.repeat(64), seed='f'.repeat(64);
 const model={model:'fixture',version:'fixture',effort:'fixture'};
 const config={version:1,implementationBaseSha:src,retry:0,sendEnabled:false,repetitions:5,thresholds:decisions.thresholds,
  ownerDecision:{decisionHash:digest(decisions)},baseline:{sourceSha:decisions.comparisonBaselineSha},salesContextPresentation:true,
  judge:{...decisions.judge,promptHash:digest(readFileSync(new URL('./prompts/judge.vi.txt',import.meta.url),'utf8'))},
  onlineRoles:['OWNER','VERIFIER'],maximumOwnerGenerations:3,maximumVerifierGenerations:1,blinding:{seedCommitment:digest(seed)},
  candidate:{sourceSha:src,promptHash:hash,contextPolicyHash:hash,toolContractHash:hash,assemblyHash:hash,runtimeHash:hash,
   openingMediaRule:OPENING_PRODUCT_MEDIA_RULE,model,verifier:{model,promptHash:hash,schemaHash:hash,serializationHash:hash,bindingHash:hash,boundsHash:hash}}};
 const root=new URL('../../../../', import.meta.url);
 const {fileURLToPath}=await import('node:url');
 assertApprovedDecisions(fileURLToPath(root),config);
 assert.throws(()=>assertApprovedDecisions(fileURLToPath(root),{...config,repetitions:1}),/C_OWNER_DECISION_CHANGED/);
 const fixtures=['V168','SV2447','SD023'].map(id=>fixtureProduct(id)),policyRecords=fixturePolicyPointers();
 const products=fixtures.map(({product})=>({...product,images:[{
  url:'https://content.pancake.vn/fixture.jpg',role:'PRIMARY',angle:'FRONT',imageType:'MODEL',intents:[],sortOrder:0,qualityScore:null,
  feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:hash,observedAt:commerceNow.toISOString(),
 }]}));
 const snapshots=Object.fromEntries(fixtures.map(({product,snapshot})=>[product.productId,snapshot]));
 const world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',sourceWrites:0,providerRequests:0,capturedAt:commerceNow.toISOString(),
  config:{scope:commerceScope(),channel:'CANARY_SHADOW',maxFactAgeSeconds:1200},products,snapshots,policyRecords,
  sourceEvidenceHashes:[digest(products),digest(snapshots),digest(policyRecords)]};
 const worldHash=digest(world), initial={kind:'REAL_ADAPTER_NATIVE_INITIAL_STATE',worldHash,sourceSha:src,sourceDirty:false,
  testDatabaseDropped:true,providerRequests:0,publicState:{}};
 const bindings={review:{status:'APPROVED',worldHash,newProviderResultsObserved:0,reviewer:'fixture',evidenceRef:'fixture'},
  scenarios:draft.scenarios.map(s=>{
   const ids=s.turns[0].initialProductCodes,productId=ids[0],host='content.pancake.vn';
   return {id:s.id,initialProductCodes:ids,sourceReads:[{name:'read_policy',args:{}}],
    ...(productId?{}:{judgeSourceKind:'NO_PRODUCT_FACTS',noProductLookupRequired:true}),
    readiness:{version:3,task:{purpose:'SALE',...(productId?{productId}:{})},cohort:'SALES_READY',
     checks:productId?[{facet:'PRICE',productId,offerType:'DIRECT'},{facet:'MEDIA',productId,intent:'GENERIC',allowedHostSuffixes:[host]}]:[],
     executionPaths:productId?[{kind:'DISCOVERY',productIds:ids}]:[],...(productId?{}:{noProductFactsRequired:true})}};
  })};
 const bound=await bindCorpus({draft,world,bindings,initialStateArtifact:initial,diagnosticOpeningMediaRule:OPENING_PRODUCT_MEDIA_RULE});
 assert.throws(()=>validateCorpus(bound),/C_DIAGNOSTIC_NOT_QUALIFICATION/);
 await assertPopulationReadiness(world,bound,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 const scope=diagnosticScope(bound),sourceChecks=bound.scenarios.map(s=>s.diagnosticTrusted),corpusHash=digest(bound);
 const slots=diagnosticSlots(bound,diagnosticRepetitions(bound,config.repetitions));
 const reg={kind:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1',status:'REGISTERED_DEVELOPMENT_NOT_QUALIFICATION',scopeHash:digest(scope),
  runSourceSha:src,registeredAt:commerceNow.toISOString(),sendEnabled:false,config,identity:qualificationIdentity(config),corpus:bound,
  corpusHash,worldHash,initialStateArtifact:initial,initialStateArtifactHash:digest(initial),sourceChecks,slots,
  review:{...bindings.review,corpusHash,sourceChecksHash:digest(sourceChecks)}};
 validateDiagnostic(reg,world);
 assert.deepEqual(slots.map(s=>s.repetition),[1,1,1,1]);
 const out=mkdtempSync(join(tmpdir(),'sales-context-controls-'));
 try{
  const seedPath=join(out,'seed.json');
  writeFileSync(seedPath,JSON.stringify({seed}));
  await collectNativePopulation({preflight:{sealed:reg,registration:{arm:'CANDIDATE'},contextJob:{kind:'CONTROLS',slotIds:slots.map(s=>s.slotId)}},
   queue:{blocked:()=>true},providerPorts:{assertSource(){},observed:()=>[]},out,seedPath});
  const {attempts}=JSON.parse(readFileSync(join(out,'CANDIDATE_EVIDENCE.partial.json')));
  assert.equal(attempts.length,4);assert(attempts.every(s=>s.status==='NOT_RUN'));
 }finally{rmSync(out,{recursive:true});}
});

test('explicit post-STOP diagnostic keeps both source identities and binds the exact replay score',async()=>{
 const {assertContextReplayAuthority}=await import('./sales-context-campaign.mjs');
 const {digest}=await import('./qualification.mjs');
 const score={stage:'CONTEXT',status:'STOP',sourceSha:'b'.repeat(40)};
 const ownerDecision={kind:'OWNER_REQUESTED_NATIVE_DIAGNOSTIC',replaySourceSha:score.sourceSha,
  nativeSourceSha:'c'.repeat(40),replayScoreHash:digest(score),evidenceRef:'owner message reference',qualificationEligible:false};
 assert.throws(()=>assertContextReplayAuthority(score),/CONTEXT_REPLAY_NOT_PASSED/);
 assert.doesNotThrow(()=>assertContextReplayAuthority(score,ownerDecision));
 assert.throws(()=>assertContextReplayAuthority({...score,rows:[]},ownerDecision),/CONTEXT_OVERRIDE_BINDING/);
 assert.throws(()=>assertContextReplayAuthority(score,{...ownerDecision,qualificationEligible:true}),/CONTEXT_OVERRIDE_BINDING/);
});
