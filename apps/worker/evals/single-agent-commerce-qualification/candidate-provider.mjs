// Reuses the approved native B inference/serialization. No prompt changes, retry or new model role.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCommerceReadSources} from '../../dist/single-agent-commerce-read-only-sources.js';
import {createGeminiCommerceInference,buildGeminiCommerceRequest} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {createCommerceVerifier,buildVerifierRequest,validateProtocol} from '../single-agent-commerce-read-only/protocol.mjs';
import {withNativePresentation} from '../single-agent-commerce-read-only/native-presentation.mjs';
import {frozenFacts,frozenCatalog} from './frozen-world.mjs';
import {NATIVE_CODECS,decodeVerifierWire,assertNativeRuntime} from './native-wire.mjs';
import {digest,qualificationIdentity,readiness,assertRuntimeFirewall,validateCorpus,registerSlots} from './qualification.mjs';
import {assertCurrentCandidate,assertApprovedDecisions} from './source-identity.mjs';
import {createReferenceRunner} from './c3-reference.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {createFrozenSearch,validateFrozenIndex} from './frozen-search.mjs';
import {VertexShadowModel} from '../../dist/vertex.js';
import {embeddingHttpAccounting,EMBEDDING_POLICY} from './embedding-accounting.mjs';
import {MEASUREMENT_POLICY} from './qualification.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export function assertSealedInputs(sealed,world){
 assert.equal(sealed.sendEnabled,false,'C_SEALED_SEND_POLICY');
 assert.deepEqual(sealed.identity,qualificationIdentity(sealed.config));validateCorpus(sealed.corpus);
 assert.equal(digest(sealed.corpus),sealed.corpusHash,'C_SEALED_CORPUS_CHANGED');
 assert.deepEqual(sealed.slots,registerSlots(sealed.config,sealed.corpus),'C_SEALED_SLOTS_CHANGED');
 assert(sealed.corpus.review?.status==='APPROVED'&&sealed.corpus.review.worldHash===sealed.worldHash&&
  sealed.corpus.review.newProviderResultsObserved===0&&!JSON.stringify(sealed.corpus).includes('{{'),'C_CORPUS_BINDING_AND_REVIEW');
 assert(Number.isFinite(Date.parse(sealed.registeredAt))&&Date.parse(sealed.registeredAt)<=Date.now(),'C_REGISTRATION_TIME');
 assert.equal(readiness(sealed.config,{stage:'ABSOLUTE'}).status,'READY','C_ABSOLUTE_PROTOCOL_BLOCKED');
 assert.equal(sealed.status,'SEALED_NOT_EXECUTED');assert.equal(digest(world),sealed.worldHash,'C_WORLD_CHANGED');
 if(sealed.corpus.requiredCapabilities?.includes('PRODUCT_SEARCH'))validateFrozenIndex(world.search,world.config.vertex.embeddingDimension);
 assert(sealed.config.nativeCodecs&&digest(sealed.config.nativeCodecs)===digest(NATIVE_CODECS),'C_NATIVE_CODEC_REGISTRATION');
 assert(sealed.corpus.scenarios.filter(s=>s.mode!=='SAFETY').every(s=>s.turns.every(t=>t.history.length===0)),
  'C_INITIAL_HISTORY_SEED_NOT_IMPLEMENTED');
}
export function candidatePreflight(root,registrationPath,worldPath){
 const sealed=read(registrationPath),world=read(worldPath);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','C_DIRTY_SOURCE');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sealed.runSourceSha,'C_RUN_SOURCE_CHANGED');
 assertCurrentCandidate(root,sealed.config);assertApprovedDecisions(root,sealed.config);assertSealedInputs(sealed,world);
 const m=validateProtocol(read(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/manifest.json')));
 const codex=inspectCodex();assert.equal(codex.version,'codex-cli '+m.models.verifier.generationConfig.cliVersion,'C_PINNED_VERIFIER_CLIENT');
 assert.deepEqual(m.models.conversation,sealed.config.candidate.model);assert.deepEqual(m.models.verifier,sealed.config.candidate.verifier.model);
 frozenFacts(world);
 return {root,m,codex,config:world.config,sealed,world,registration:{sourceSha:sealed.runSourceSha,mode:'PHASE_C_FROZEN_NATIVE_PERSISTED',
  maximumGenerationRequests:sealed.slots.filter(s=>s.arm==='CANDIDATE').reduce((n,s)=>n+s.maximumGenerations,0),ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'}};
}
export function assertCandidateSource(preflight){
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:preflight.root,encoding:'utf8'}).trim(),preflight.sealed.runSourceSha,'C_RUN_SOURCE_CHANGED');
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:preflight.root,encoding:'utf8'}).trim(),'','C_DIRTY_SOURCE');
}
const metrics=(telemetry,latencyMs)=>({latencyMs,inputTokens:telemetry?.inputTokens??telemetry?.usage?.input_tokens??null,outputTokens:telemetry?.outputTokens??telemetry?.usage?.output_tokens??null,
 costUSD:telemetry?.cost??null,unavailable:{inputTokens:'PROVIDER_NOT_EXPOSED',outputTokens:'PROVIDER_NOT_EXPOSED',costUSD:'PROVIDER_NOT_EXPOSED'}});
export function createCandidateProvider({preflight,out,dependencies={}}){
 const {m,world}=preflight,facts=frozenFacts(world);
 const ownerPrompt=readFileSync(new URL('../single-agent-commerce-read-only/prompts/owner.vi.txt',import.meta.url),'utf8'),
  verifierPrompt=readFileSync(new URL('../single-agent-commerce-read-only/prompts/verifier.vi.txt',import.meta.url),'utf8');
 let active=null,inFlight=null;const generations=[],pending=new Set(),counters={owner:0,verifier:0,embedding:0,catalogReads:0,posReads:0,selectorCalls:0,readPolicyCalls:0};
 const audit=(phase,value)=>appendFileSync(resolve(out,'NATIVE_REQUESTS.jsonl'),JSON.stringify({slotId:value.slotId??active?.slotId,turnIndex:value.turnIndex??active?.turnIndex,phase,value})+'\n');
 assert.deepEqual(EMBEDDING_POLICY,MEASUREMENT_POLICY.embedding);
 const embeddingHttp=embeddingHttpAccounting({fetchImpl:dependencies.embeddingFetchImpl??fetch,observe:audit,
  context:()=>({slotId:active?.slotId,turnIndex:active?.turnIndex,invocation:counters.embedding})});
 let encoder;
 const frozenSearch=world.search?.status==='FROZEN_NATIVE_INDEX'?createFrozenSearch(world,{embedText:async query=>{
  assert(active,'C_ACTIVE_SLOT_REQUIRED');const ordinal=++counters.embedding,started=performance.now();audit('EMBEDDING_STARTED',{ordinal,query});
  try{if(!encoder){const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
   assert(credential.type==='service_account'&&credential.project_id===world.config.vertex.projectId,'C_EMBEDDING_CREDENTIAL_SCOPE');
   encoder=new VertexShadowModel({projectId:world.config.vertex.projectId,location:'global',modelName:m.models.conversation.model,
    embeddingModel:world.config.vertex.embeddingModel,embeddingLocation:world.config.vertex.embeddingLocation,embeddingDimension:world.config.vertex.embeddingDimension,
    serviceAccount:{email:credential.client_email,privateKey:credential.private_key},fetchImpl:embeddingHttp.fetchImpl});}
   const vector=await embeddingHttp.run({slotId:active.slotId,turnIndex:active.turnIndex,invocation:ordinal},()=>encoder.embedText(query));
   audit('EMBEDDING_RESULT',{ordinal,vectorHash:digest(vector),latencyMs:performance.now()-started});return vector;}
  catch(error){audit('EMBEDDING_ERROR',{ordinal,code:error.code??error.name,latencyMs:performance.now()-started});throw error;}
 },embedImageUrl:async()=>{throw Error('C_FROZEN_IMAGE_SEARCH_NOT_REGISTERED');}}):null;
 const catalog=frozenSearch?.catalog??frozenCatalog(world);
 const validateActual=(row,body)=>{
  assertRuntimeFirewall(body,preflight.sealed.corpus.scenarios.map(s=>s.id));assertNativeRuntime(body,NATIVE_CODECS[row.role],row.runtimeInput);
  row.requestBody=body;row.requestHash=digest(body);
 };
 const monitoredFetch=async(url,options)=>{
  const row=inFlight;assert(row?.role==='OWNER','C_OWNER_DISPATCH_CONTEXT');
  if(String(url).includes(':generateContent')){
   assert.equal(row.providerRequests,0,'C_PROVIDER_RETRY_FORBIDDEN');validateActual(row,JSON.parse(options.body));row.providerRequests=1;audit('DISPATCHED',row);
  }else{row.authRequests++;audit('AUTH_STARTED',{id:row.id,slotId:row.slotId,turnIndex:row.turnIndex,authRequests:row.authRequests});}
  return (dependencies.fetchImpl??fetch)(url,options);
 };
 const infer=dependencies.owner??createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',location:'global',projectId:world.config.vertex.projectId},
  {fetchImpl:monitoredFetch,...(dependencies.getToken?{getToken:dependencies.getToken}:{})});
 const verify=dependencies.verifier??createCommerceVerifier(m,dependencies.runVerifierModel,(id,value)=>{
  const row=generations.find(g=>g.id===id);assert(row?.role==='VERIFIER','C_VERIFIER_DISPATCH_CONTEXT');
  assert(value.provider.providerRequests<=1,'C_PROVIDER_RETRY_FORBIDDEN');validateActual(row,value.provider.requestBody);
  row.providerRequests=value.provider.providerRequests;row.authRequests=value.provider.authRequests??0;audit('VERIFIER_'+value.phase,{...row,checkpoint:value.provider});
 });
 async function generate(role,request){
  if(!dependencies.unitFixture)assertCandidateSource(preflight);
  assert(active,'C_ACTIVE_SLOT_REQUIRED');assert(generations.length<preflight.registration.maximumGenerationRequests,'C_GENERATION_BUDGET');
  assert(inFlight===null,'C_PENDING_GENERATION');assert(!generations.some(g=>g.id===request.generationId),'C_DUPLICATE_GENERATION_ID');
  const slot=preflight.sealed.slots.find(s=>s.slotId===active.slotId&&s.arm==='CANDIDATE');assert(slot,'C_REGISTERED_SLOT_REQUIRED');
  const scenario=preflight.sealed.corpus.scenarios.find(s=>s.id===slot.caseId);assert(active.turnIndex>=0&&active.turnIndex<scenario.turns.length,'C_REGISTERED_TURN');
  assert(slot.mode!=='SAFETY'||role==='VERIFIER','C_SAFETY_ROLE');
  const same=generations.filter(g=>g.slotId===active.slotId&&g.turnIndex===active.turnIndex);
  assert(same.filter(g=>g.role===role).length<(role==='OWNER'?3:1)&&!same.some(g=>g.status!=='OK'),'C_REGISTERED_ROLE_CAP_OR_PRIOR_FAILURE');
  const model=role==='OWNER'?m.models.conversation:m.models.verifier;
  const row={id:request.generationId,role,turnIndex:active.turnIndex,slotId:active.slotId,runtimeInput:structuredClone(active.runtimeInput),
   boundRuntimeHash:digest(active.runtimeInput),wireCodec:NATIVE_CODECS[role],requestBody:null,requestHash:null,modelConfigHash:digest(model),
   observedModelVersion:null,status:'PENDING',providerRequests:0,authRequests:0,metrics:null};
  const started=performance.now();row.startedMonotonicMs=started;row.startedAt=new Date().toISOString();
  generations.push(row);counters[role.toLowerCase()]++;audit('STARTED',row);
  try{
   const original=role==='OWNER'?withNativePresentation(request,'VI_DATA_BLOCKS_COMPACT_V2'):request;
   const body=role==='OWNER'?buildGeminiCommerceRequest(original):buildVerifierRequest(m,original);
   row.requestBody=body;row.requestHash=digest(body);
   assertRuntimeFirewall(body,preflight.sealed.corpus.scenarios.map(s=>s.id));
   assertNativeRuntime(body,NATIVE_CODECS[role],active.runtimeInput);
   if(role==='VERIFIER'){
    row.verifierInput=decodeVerifierWire(body).binding;row.boundDraftHash=row.verifierInput.draftHash;row.boundSnapshotHash=row.verifierInput.snapshotHash;
   }
   audit('REQUEST',row);
   inFlight=row;const value=await(role==='OWNER'?infer(original):verify(original)),t=value.telemetry;
   row.providerRequests=t?.providerRequests??row.providerRequests;row.observedModelVersion=t?.modelVersion??null;
   row.status='OK';row.metrics=metrics(t,performance.now()-started);row.telemetry=t??null;
   if(role==='VERIFIER'){
    row.rawVerdict=structuredClone(value.result);
    try{const parsed=typeof value.result==='string'?JSON.parse(value.result):value.result;
     row.verdict=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?structuredClone(parsed):null;
    }catch{row.verdict=null;}
    // This is evidence decoding only. The original result goes unchanged to the native final gate.
   }
   audit('RESULT',{id:row.id,slotId:row.slotId,turnIndex:row.turnIndex,status:row.status,metrics:row.metrics,telemetry:row.telemetry,...(role==='VERIFIER'?{verdict:row.verdict}:{output:value})});
   return value;
  }catch(error){
   const t=error.telemetry;row.providerRequests=t?.providerRequests??row.providerRequests;row.observedModelVersion=t?.modelVersion??null;
   row.status=/TIMEOUT/.test(error.message)?'TIMEOUT':t?.httpStatus===200?'MALFORMED':'PROVIDER_ERROR';row.metrics=metrics(t,performance.now()-started);
   row.failureLayer=row.providerRequests>0?t?.httpStatus===200?'MODEL_OUTPUT':'PROVIDER':'PRE_DISPATCH';
   row.errorCode=/^[A-Z0-9_]+$/.test(error.message)?error.message:'PROVIDER_ERROR';row.telemetry=t??null;
   audit('ERROR',row);throw error;
  }finally{if(inFlight===row)inFlight=null;}
 }
 const tracked=(role,request)=>{const work=generate(role,request);pending.add(work);work.then(()=>pending.delete(work),()=>pending.delete(work));return work;};
 const ports={ownerPrompt,verifierPrompt,counters,facts,close:()=>facts.close(),assertSource:()=>assertCandidateSource(preflight),
  async attachReference({baselineRoot,baselineBuild}){
   assert(generations.length===0&&pending.size===0,'C_REFERENCE_BEFORE_DISPATCH');
   ports.evaluationTurn=await createReferenceRunner({preflight,baselineRoot,baselineBuild,active:()=>active,
    assertCurrent:()=>assertCandidateSource(preflight),observe:(row,phase)=>{
     const index=generations.findIndex(g=>g.id===row.id);if(index<0)generations.push(row);else generations[index]=row;
     audit('C3_'+phase,row);
    }});
  },
  setSlot:value=>{assert(pending.size===0,'C_PENDING_GENERATION');assert(value?.runtimeInput&&Number.isInteger(value.turnIndex));active=structuredClone(value);},
  async awaitSettled(timeoutMs=5000){let timer;try{return await Promise.race([Promise.allSettled([...pending]).then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})]);}finally{clearTimeout(timer);}},
  observed:()=>structuredClone(generations),observedAuxiliary:embeddingHttp.observed,factsForMode:mode=>{assert.equal(mode,'LIVE');return facts;},
  owner:r=>tracked('OWNER',r),verifier:r=>tracked('VERIFIER',r),
  async read(bound,policyStore,policy,initialProductCodes){
   const initialProducts=await Promise.all(initialProductCodes.map(c=>catalog.findByExactCode(c)));assert(initialProducts.every(Boolean),'C_INITIAL_PRODUCT_NOT_FROZEN');
   const sources=createCommerceReadSources({scope:bound,channel:world.config.channel,clock:()=>new Date(),initialProducts,catalog,
    search:frozenSearch?.search??{searchText:catalog.searchText},policyStore,facts});
   return {catalog:sources.catalog,policy,initialProducts,maxFactAgeSeconds:world.config.maxFactAgeSeconds,productGroups:world.config.productGroups};
  }};
 return ports;
}
