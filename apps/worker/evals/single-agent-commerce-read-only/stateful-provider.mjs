// Evaluation-only live public reads and the existing approved inference adapters. No delivery transport here.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ProductSearchService,QdrantStableCatalogSearchAdapter} from '@lana/business-tools';
import {RedisBusinessFactsReader} from '../../dist/redis-business-facts.js';
import {VertexShadowModel} from '../../dist/vertex.js';
import {createCommerceReadSources} from '../../dist/single-agent-commerce-read-only-sources.js';
import {createGeminiCommerceInference,buildGeminiCommerceRequest,readOnlyDeclarations,stateDeclarations,effectDeclarations,handoffDeclarations} from './gemini-inference.mjs';
import {createCommerceVerifier,buildVerifierRequest,validateProtocol,requiredSourceConfig,sha256} from './protocol.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';

export function statefulPreflight(root){
 assert.notEqual(process.env.C3_TEST_CODEX_TRANSPORT,'1','TEST_TRANSPORT_FORBIDDEN_IN_PROVIDER_RUN');
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const paths=['apps/worker/src','packages','apps/worker/evals/single-agent-commerce-read-only','apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs','pnpm-lock.yaml'];
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all','--',...paths],{cwd:root,encoding:'utf8'}).trim(),'','DIRTY_EXECUTABLE_OR_CONFIG');
 const m=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)))),configBytes=readFileSync(new URL('./source-config.b1.json',import.meta.url)),config=JSON.parse(configBytes);
 assert.deepEqual(requiredSourceConfig(config),[],'SOURCE_CONFIG_UNAVAILABLE');
 const casesBytes=readFileSync(new URL('./stateful-cases.json',import.meta.url)),cases=JSON.parse(casesBytes);
 assert.equal(cases.length,7);assert.equal(cases.filter(c=>c.runtime.latest).length,6);assert.equal(new Set(cases.map(c=>c.caseId)).size,7);
 const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));assert.equal(credential.type,'service_account');assert.equal(credential.project_id,config.vertex.projectId);
 return {m,config,cases,registration:{sourceSha:head,mode:'PROVIDER_REAL_POSTGRES_LIVE_PUBLIC_CATALOG_CURRENT_CAPTURED_POLICY_CAPTURE_DELIVERY',
  models:m.models,promptHashes:m.promptHashes,schemaHash:m.schemaHash,toolSchemaHash:sha256(JSON.stringify([...readOnlyDeclarations,...stateDeclarations,...effectDeclarations,...handoffDeclarations])),
  corpusHash:sha256(casesBytes),sourceConfigHash:sha256(configBytes),registeredOutcomes:7,publicTurns:6,privateCodeTurns:1,repetitions:1,maximumGenerationRequests:24,retry:0,codex:inspectCodex(),sendEnabled:false}};
}

export async function createStatefulProvider(input){
 const {m,config,registration}=input.preflight,out=input.out;
 writeFileSync(out+'/registration.json',JSON.stringify(registration,null,2),{flag:'wx'});
 let activeSlot=null;
 const audit=(id,phase,value)=>appendFileSync(out+'/provider-requests.jsonl',JSON.stringify({caseId:activeSlot,id,phase,value})+'\n');
 const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
 const counters={embedding:0,owner:0,verifier:0};
 const embedding=new VertexShadowModel({projectId:config.vertex.projectId,location:'global',modelName:m.models.conversation.model,embeddingModel:config.vertex.embeddingModel,
  embeddingLocation:config.vertex.embeddingLocation,embeddingDimension:config.vertex.embeddingDimension,serviceAccount:{email:credential.client_email,privateKey:credential.private_key}});
 const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
  embedding:{embedText:async t=>{counters.embedding++;return embedding.embedText(t);},embedImageUrl:async()=>{throw new Error('IMAGE_SEARCH_NOT_EXPOSED');}}});
 const facts=new RedisBusinessFactsReader(process.env.REDIS_URL),search=new ProductSearchService(catalog,config.searchThresholds);
 const infer=createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
 const verify=createCommerceVerifier(m,undefined,(id,v)=>audit(id,v.phase,v.provider));
 const ownerPrompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 return {counters,ownerPrompt,verifierPrompt,facts,setSlot:id=>{activeSlot=id;},
  async read(bound,policyStore,policy){const product=await catalog.findByExactCode('SV2447');assert(product,'INITIAL_SOURCE_UNAVAILABLE');
   const sources=createCommerceReadSources({scope:bound,channel:config.channel,clock:()=>new Date(),initialProducts:[product],search,catalog,policyStore,facts});
   return {catalog:sources.catalog,policy,initialProducts:[product],maxFactAgeSeconds:config.maxFactAgeSeconds};},
  async owner(request){assert(counters.owner+counters.verifier<24,'GENERATION_BUDGET');counters.owner++;
   let completedTelemetry;
   try{const wire=buildGeminiCommerceRequest(request);assert(!/"(?:caseId|evaluator|purposeId|requiredBehaviors|expectedSafe|qualityScore)"/.test(JSON.stringify(wire)),'EVALUATOR_LABEL_LEAK');
    audit(request.generationId,'OWNER_REQUEST',wire);const r=await infer(request);completedTelemetry=r.telemetry;audit(request.generationId,'OWNER_RESULT',r);return r;}
   catch(error){const telemetry=error.telemetry??completedTelemetry??{generationId:request.generationId,providerRequests:0,httpStatus:null,stage:'BEFORE_PROVIDER_DISPATCH',
    ...(error.message==='OWNER_REQUEST_BOUND'&&Number.isSafeInteger(error.requestBytes)?{requestBytes:error.requestBytes}:{})};
    audit(request.generationId,'OWNER_ERROR',{code:error.message,telemetry});throw Object.assign(error,{telemetry});}},
  async verifier(request){assert(counters.owner+counters.verifier<24,'GENERATION_BUDGET');counters.verifier++;
   audit(request.generationId,'VERIFIER_REQUEST',buildVerifierRequest(m,request));try{return await verify(request);}catch(error){audit(request.generationId,'VERIFIER_ERROR',{code:error.message,telemetry:error.telemetry});throw error;}},
  close:()=>facts.close(),
 };
}
