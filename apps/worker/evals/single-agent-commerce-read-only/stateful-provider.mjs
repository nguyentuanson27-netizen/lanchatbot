// Evaluation-only live public reads and the existing approved inference adapters. No delivery transport here.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ProductSearchService,QdrantStableCatalogSearchAdapter} from '@lana/business-tools';
import {RedisBusinessFactsReader} from '../../dist/redis-business-facts.js';
import {VertexShadowModel} from '../../dist/vertex.js';
import {createCommerceReadSources} from '../../dist/single-agent-commerce-read-only-sources.js';
import {createGeminiCommerceInference,buildGeminiCommerceRequest,readOnlyDeclarations,stateDeclarations,effectDeclarations,handoffDeclarations,mediaDeclarations,OWNER_IMAGE_BOUNDS} from './gemini-inference.mjs';
import {createCommerceVerifier,buildVerifierRequest,validateProtocol,requiredSourceConfig,sha256} from './protocol.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {candidateDescription,candidateSearchResult} from './candidate-description.mjs';
import {registerJourneyOpenings,registerNegotiationProbe} from './sales-journeys-registration.mjs';

export function statefulPreflight(root){
 assert.notEqual(process.env.C3_TEST_CODEX_TRANSPORT,'1','TEST_TRANSPORT_FORBIDDEN_IN_PROVIDER_RUN');
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const paths=['apps/worker/src','packages','apps/worker/evals/single-agent-commerce-read-only','apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs','pnpm-lock.yaml'];
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all','--',...paths],{cwd:root,encoding:'utf8'}).trim(),'','DIRTY_EXECUTABLE_OR_CONFIG');
 const m=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)))),configBytes=readFileSync(new URL('./source-config.b1.json',import.meta.url)),config=JSON.parse(configBytes);
 assert.deepEqual(requiredSourceConfig(config),[],'SOURCE_CONFIG_UNAVAILABLE');
 const journeyOpenings=process.argv.includes('--journey-openings'),negotiationProbe=process.argv.includes('--negotiation-probe');
 assert(!(journeyOpenings&&negotiationProbe),'ONE_SELECTED_COHORT');
 const casesBytes=readFileSync(new URL(journeyOpenings||negotiationProbe?'./sales-journeys.candidate.json':'./stateful-cases.json',import.meta.url));
 const selection=journeyOpenings?registerJourneyOpenings(JSON.parse(casesBytes),['J02','J03','J05','J08']):null;
 const cases=selection?.samples??(negotiationProbe?registerNegotiationProbe(JSON.parse(casesBytes),JSON.parse(readFileSync(new URL('./stateful-cases.json',import.meta.url)))):JSON.parse(casesBytes));
 if(!journeyOpenings&&!negotiationProbe){assert.equal(cases.length,8);assert.equal(cases.filter(c=>c.runtime.latest).length,7);}
 assert.equal(new Set(cases.map(c=>c.caseId)).size,cases.length);
 const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));assert.equal(credential.type,'service_account');assert.equal(credential.project_id,config.vertex.projectId);
 return {m,config,cases,registration:{sourceSha:head,mode:'PROVIDER_REAL_POSTGRES_LIVE_PUBLIC_CATALOG_CURRENT_CAPTURED_POLICY_CAPTURE_DELIVERY',
  models:m.models,promptHashes:m.promptHashes,schemaHash:m.schemaHash,requestBounds:m.requestBounds,toolSchemaHash:sha256(JSON.stringify([...readOnlyDeclarations,...stateDeclarations,...effectDeclarations,...handoffDeclarations,...mediaDeclarations])),
  catalogInputMode:config.candidateDescriptions?'LIVE_PUBLIC_WITH_ISOLATED_REGISTRY_DESCRIPTION':'LIVE_PUBLIC',
  catalogImageInput:{...OWNER_IMAGE_BOUNDS,mediaResolution:'MEDIA_RESOLUTION_MEDIUM',maxDimension:1024,maxSourceBytes:2097152,maxSourceDimension:12000,maxSourcePixels:50000000,
   sourceHashRequired:true,hashContract:'APPROVED_REGISTRY_REF_PLUS_DOWNLOAD_SHA256_PLUS_PREPARED_SHA256',resize:'EXISTING_FFMPEG_GEOMETRY_JPEG_Q3_OR_PNG'},
  selection:journeyOpenings?{mode:'FOUR_OPENINGS_ONLY',registered:cases.map(c=>c.caseId),deferred:selection.deferred,day:new Date().toISOString().slice(0,10)}:negotiationProbe?{mode:'THREE_NEGOTIATION_COMPANION',registered:cases.map(c=>c.caseId),prerequisite:'Actual cart from setup, never synthetic provider completion.'}:{mode:'BASELINE_EIGHT_STATEFUL'},
  selectionHash:sha256(JSON.stringify(cases)),
  corpusHash:sha256(casesBytes),sourceConfigHash:sha256(configBytes),registeredOutcomes:process.argv.includes('--opening-only')?1:cases.length,publicTurns:process.argv.includes('--opening-only')?1:cases.filter(c=>c.runtime.latest).length,privateCodeTurns:journeyOpenings||negotiationProbe?0:1,repetitions:1,maximumGenerationRequests:(process.argv.includes('--opening-only')?1:cases.filter(c=>c.runtime.latest).length)*4,retry:0,codex:inspectCodex(),sendEnabled:false}};
}

export async function createStatefulProvider(input){
 const {m,config,registration}=input.preflight,out=input.out;
 writeFileSync(out+'/registration.json',JSON.stringify(registration,null,2),{flag:'wx'});
 let activeSlot=null;
 const audit=(id,phase,value)=>appendFileSync(out+'/provider-requests.jsonl',JSON.stringify({caseId:activeSlot,id,phase,value})+'\n');
 const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
 const counters={embedding:0,owner:0,verifier:0,catalogReads:0,posReads:0,selectorCalls:0,readPolicyCalls:0};
 const embedding=new VertexShadowModel({projectId:config.vertex.projectId,location:'global',modelName:m.models.conversation.model,embeddingModel:config.vertex.embeddingModel,
  embeddingLocation:config.vertex.embeddingLocation,embeddingDimension:config.vertex.embeddingDimension,serviceAccount:{email:credential.client_email,privateKey:credential.private_key}});
 const sourceCatalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
  embedding:{embedText:async t=>{counters.embedding++;return embedding.embedText(t);},embedImageUrl:async()=>{throw new Error('IMAGE_SEARCH_NOT_EXPOSED');}}});
 const facts=new RedisBusinessFactsReader(process.env.REDIS_URL);
 const rawRead=facts.readCatalogSnapshot.bind(facts),rawSelect=facts.resolveCartSelection.bind(facts);
 facts.readCatalogSnapshot=async(...args)=>{counters.posReads++;return rawRead(...args);};
 facts.resolveCartSelection=async(...args)=>{counters.selectorCalls++;return rawSelect(...args);};
 const sourceSearch=new ProductSearchService(sourceCatalog,config.searchThresholds);
 const catalog={findByExactCode:async code=>{counters.catalogReads++;return candidateDescription(await sourceCatalog.findByExactCode(code),config.candidateDescriptions);}};
 const search={searchText:async query=>candidateSearchResult(await sourceSearch.searchText(query),config.candidateDescriptions)};
 const infer=createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
 const verify=createCommerceVerifier(m,undefined,(id,v)=>audit(id,v.phase,v.provider));
 const ownerPrompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 return {counters,ownerPrompt,verifierPrompt,facts,setSlot:id=>{activeSlot=id;},
  async read(bound,policyStore,policy,initialProductCodes=['SV2447']){const products=await Promise.all(initialProductCodes.map(code=>catalog.findByExactCode(code)));assert(products.every(Boolean),'INITIAL_SOURCE_UNAVAILABLE');
   const sources=createCommerceReadSources({scope:bound,channel:config.channel,clock:()=>new Date(),initialProducts:products,search,catalog,policyStore,facts});
   return {catalog:sources.catalog,policy:async()=>{counters.readPolicyCalls++;return policy();},initialProducts:products,maxFactAgeSeconds:config.maxFactAgeSeconds};},
  async owner(request){assert(counters.owner+counters.verifier<registration.maximumGenerationRequests,'GENERATION_BUDGET');counters.owner++;
   let completedTelemetry;
   try{const wire=buildGeminiCommerceRequest(request);assert(!/"(?:caseId|evaluator|purposeId|requiredBehaviors|expectedSafe|qualityScore)"/.test(JSON.stringify(wire)),'EVALUATOR_LABEL_LEAK');
    audit(request.generationId,'OWNER_REQUEST',wire);const r=await infer(request);completedTelemetry=r.telemetry;audit(request.generationId,'OWNER_RESULT',r);return r;}
   catch(error){const telemetry=error.telemetry??completedTelemetry??{generationId:request.generationId,providerRequests:0,httpStatus:null,stage:'BEFORE_PROVIDER_DISPATCH',
    ...(error.message==='OWNER_REQUEST_BOUND'&&Number.isSafeInteger(error.requestBytes)?{requestBytes:error.requestBytes}:{})};
    audit(request.generationId,'OWNER_ERROR',{code:error.message,telemetry});throw Object.assign(error,{telemetry});}},
  async verifier(request){assert(counters.owner+counters.verifier<registration.maximumGenerationRequests,'GENERATION_BUDGET');counters.verifier++;
   audit(request.generationId,'VERIFIER_REQUEST',buildVerifierRequest(m,request));try{return await verify(request);}catch(error){audit(request.generationId,'VERIFIER_ERROR',{code:error.message,telemetry:error.telemetry});throw error;}},
  close:()=>facts.close(),
 };
}
