// Evaluation-only owner comparison, with either preloaded facts or native B1 read tools.
// Reuses the existing transports, mandatory verifier, source readback and final gate.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {sha256,runtimeCase,validateProtocol,requiredSourceConfig,createCommerceVerifier} from './protocol.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference,readOnlyDeclarations} from './gemini-inference.mjs';
import {runCodexModel,inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';

const check=(ok,reason)=>{if(!ok)throw new Error(reason);};
export function readComparisonManifest(path=new URL('./owner-comparison-20261015/manifest.json',import.meta.url)){
 return JSON.parse(readFileSync(path,'utf8'));
}
export function validateComparison(c,base){
 // These existing LIVE cases can be answered from the same preloaded product/policy surface.
 const cases=['b1-changed-occasion','b1-current-policy','b1-price','b1-buying-concern','b1-policy-used'];
 const native=c.surface==='NATIVE_READ_ONLY_OWNER_COMPARISON';
 check(c.schemaVersion===1&&(native||c.surface==='POST_READ_OWNER_DIAGNOSTIC')&&(native?c.repetitions===1:[1,3].includes(c.repetitions))&&
  c.ownerGenerationsPerSlot===(native?3:1)&&(!native||c.toolRounds===2&&c.toolCalls===6)&&c.verifierGenerationsPerSlot===1&&c.sendEnabled===false&&
  Array.isArray(c.caseIds)&&c.caseIds.length>0&&new Set(c.caseIds).size===c.caseIds.length&&c.caseIds.every(id=>cases.includes(id))&&
  c.maximumGenerationRequests===c.caseIds.length*c.repetitions*(native?8:4)&&c.maximumGenerationRequests<=(native?40:24),'COMPARISON_REGISTRATION');
 const sol={...base.models.verifier,effort:'low',generationConfig:{...base.models.verifier.generationConfig,reasoningEffort:'low'}};
 if(native)Object.assign(sol.generationConfig,{tools:solReadOnlyTools,tool_choice:'auto',include:['reasoning.encrypted_content']});
 check(JSON.stringify(c.owners.gemini)===JSON.stringify(base.models.conversation)&&
  JSON.stringify(c.owners.sol)===JSON.stringify(sol)&&JSON.stringify(c.verifier)===JSON.stringify(base.models.verifier),'COMPARISON_MODEL');
 return c;
}
export function comparisonSlots(c,samples){
 const cases=c.caseIds.map(id=>samples.find(s=>s.caseId===id));
 check(cases.every(s=>s&&(s.sourceMode??'LIVE')==='LIVE'),'COMPARISON_CASES');
 const slots=[];
 for(let repetition=1;repetition<=c.repetitions;repetition++)for(const sample of cases)for(const owner of ['gemini','sol']){
  slots.push({slot:slots.length+1,owner,repetition,caseId:sample.caseId,runtime:runtimeCase(sample)});
 }
 return slots;
}
function comparisonRuntimeRequest(request){
 // Keep the actual read results, including SHOP_RULES/orderEligibility, available to both owners.
 const reads=structuredClone(request.sourceReads??[]);
 for(const read of reads)if(read.name==='read_product'&&read.response?.data?.availability){
  read.response.data.availability=Object.fromEntries(Object.entries(read.response.data.availability).map(([k,v])=>[k,{status:v.status}]));
 }
 return {...request,toolsAllowed:false,toolBudget:{roundsRemaining:0,callsRemaining:0},
  contents:[{role:'user',parts:[{text:JSON.stringify({trustedSourceReads:reads})}]},...request.contents]};
}
export function comparisonOwnerRequest(owner,c,request){
 const native=c.surface==='NATIVE_READ_ONLY_OWNER_COMPARISON';
 const prepared=comparisonRuntimeRequest(request);
 if(native){prepared.toolsAllowed=request.toolsAllowed;prepared.toolBudget=request.toolBudget;}
 const body=buildGeminiCommerceRequest(prepared,native?readOnlyDeclarations:[]);
 check(Buffer.byteLength(JSON.stringify(body))<=32768,'COMPARISON_INPUT_BOUND');
 if(owner==='gemini')return body;
 check(owner==='sol','COMPARISON_MODEL');
 const input=[];
 for(const message of body.contents){
  // Preserve provider-native continuations, including encrypted reasoning, in order.
  for(const part of message.parts){
   if(typeof part.text==='string')input.push({type:'message',role:message.role==='model'?'assistant':'user',content:part.text});
   else if(native&&Array.isArray(part.codexOutput))input.push(...part.codexOutput);
   else if(native&&part.functionResponse){const response=part.functionResponse;
    check(typeof response.id==='string'&&response.id,'COMPARISON_CALL_ID');
    input.push({type:'function_call_output',call_id:response.id,output:JSON.stringify(response.response)});
   }else throw new Error('COMPARISON_TEXT_ONLY');
  }
 }
 const tools=native?body.tools.flatMap(t=>t.functionDeclarations.map(d=>{
  if(d.name==='request_handoff')return {type:'function',name:d.name,description:d.description,strict:false,
   parameters:{type:'object',properties:{reason:{type:'string',enum:d.parameters.properties.reason.enum}},required:['reason'],additionalProperties:false}};
  const known=solReadOnlyTools.find(t=>t.name===d.name);check(known,'COMPARISON_TOOL_SCOPE');return known;
 })):[];
 const wire={model:c.owners.sol.model,reasoning:{effort:c.owners.sol.effort},instructions:body.systemInstruction.parts.map(p=>p.text).join('\n'),
  input,tools,tool_choice:tools.length?'auto':'none',
  parallel_tool_calls:false,store:false,stream:true,...(native?{include:['reasoning.encrypted_content']}:{})};
 check(Buffer.byteLength(JSON.stringify(wire))<=32768,'COMPARISON_INPUT_BOUND');return wire;
}
export function createSolComparisonOwner(c,runModel=runCodexModel,onCheckpoint){
 const native=c.surface==='NATIVE_READ_ONLY_OWNER_COMPARISON';
 const m={models:{conversation:c.owners.sol},...(native?{readOnlyCommerce:true}:{})};
 return async request=>{
  const wire=comparisonOwnerRequest('sol',c,request);
  const telemetry=await runModel(m,'conversation',wire,{onCheckpoint:value=>onCheckpoint?.(request.generationId,value)});
  if(telemetry.status!=='OK')throw Object.assign(new Error(telemetry.status==='TIMEOUT'?'PROVIDER_TIMEOUT':'PROVIDER_ERROR'),{telemetry});
  if(native&&telemetry.outputItems){const items=telemetry.outputItems;
   return {kind:'TOOLS',calls:items.filter(item=>item.type==='function_call').map(item=>({name:item.name,id:item.call_id,args:JSON.parse(item.arguments)})),
    content:{role:'model',parts:[{codexOutput:items}]},telemetry};
  }
  return {kind:'FINAL',text:telemetry.answer,telemetry};
 };
}
export function createGeminiComparisonOwner(c,projectId,dependencies={}){
 const native=c.surface==='NATIVE_READ_ONLY_OWNER_COMPARISON';
 const infer=createGeminiCommerceInference({model:c.owners.gemini.model,effort:'high',location:'global',projectId,
  declarations:native?readOnlyDeclarations:[]},dependencies);
 return async request=>{
  const prepared=comparisonRuntimeRequest(request);
  if(native){prepared.toolsAllowed=request.toolsAllowed;prepared.toolBudget=request.toolBudget;}
  const result=await infer(prepared);
  if(!native&&result.kind!=='FINAL')throw Object.assign(new Error('COMPARISON_TEXT_ONLY'),{telemetry:result.telemetry});
  return result;
 };
}

// These three B1 schemas only use scalar string fields; code validates args/refs.
export const solReadOnlyTools=readOnlyDeclarations.map(d=>({type:'function',name:d.name,description:d.description,strict:false,
 parameters:{type:'object',properties:Object.fromEntries(Object.entries(d.parameters.properties??{}).map(([key,value])=>[key,{...value,type:value.type.toLowerCase()}])),
  required:d.parameters.required??[],additionalProperties:false}}));
export async function dispatchComparison(slots,execute,persist){
 for(const slot of slots){
  let result;
  try{result=await execute(slot);}catch(error){result={terminal:{disposition:'NO_SEND',reason:'SOURCE_OR_ATTEMPT_UNAVAILABLE',text:null,fallbackId:null},
   errorCode:/^[A-Z0-9_]{1,128}$/.test(error.message??'')?error.message:null,sendEnabled:false};}
  await persist(slot,result); // Persistence errors stop dispatch; they are never converted into model outcomes.
 }
}

async function main(){
 const root=fileURLToPath(new URL('../../../../',import.meta.url));
 const {values:args}=parseArgs({options:{run:{type:'boolean'},preflight:{type:'boolean'},out:{type:'string'},manifest:{type:'string'}}});
 check(args.out&&(args.run!==args.preflight),'EXPLICIT_RUN_OR_PREFLIGHT_REQUIRED');
 const base=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))));
 const c=validateComparison(readComparisonManifest(args.manifest),base);
 const native=c.surface==='NATIVE_READ_ONLY_OWNER_COMPARISON';
 const configBytes=readFileSync(new URL('./source-config.b1.json',import.meta.url)),config=JSON.parse(configBytes);
 const caseBytes=readFileSync(new URL('./cases.b1.json',import.meta.url)),samples=JSON.parse(caseBytes);
 check(sha256(configBytes)===c.sourceConfigHash&&sha256(caseBytes)===c.casesHash&&
  JSON.stringify(base.promptHashes)===JSON.stringify(c.promptHashes)&&base.schemaHash===c.schemaHash&&
  (!native||c.toolSchemaHashes?.gemini===sha256(JSON.stringify(readOnlyDeclarations))&&
   c.toolSchemaHashes?.sol===sha256(JSON.stringify(solReadOnlyTools))),'COMPARISON_FROZEN_INPUT');
 const slots=comparisonSlots(c,samples),missing=requiredSourceConfig(config);
 check(missing.length===0,'SOURCE_OR_CREDENTIAL_ROUTE_UNAVAILABLE');
 const codex=inspectCodex();
 const head=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const dirty=()=>execFileSync('git',['status','--porcelain','--untracked-files=all','--','apps/worker/src','apps/worker/evals',
  'apps/worker/package.json','apps/worker/tsconfig.json','packages','pnpm-lock.yaml','tsconfig.base.json'],{cwd:root,encoding:'utf8'}).trim();
 check(!dirty(),'DIRTY_EXECUTABLE_OR_CONFIG');
 if(process.platform==='win32')execFileSync(process.env.ComSpec??'cmd.exe',['/d','/c','pnpm --filter @lana/worker build'],{cwd:root,stdio:'pipe',windowsHide:true});
 else execFileSync('pnpm',['--filter','@lana/worker','build'],{cwd:root,stdio:'pipe'});
 const runSourceSha=head(),out=resolve(args.out);mkdirSync(out);
 const audit=(id,phase,value)=>appendFileSync(join(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
 const ownerPrompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
 const verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 const registration={runSourceSha,surface:c.surface,registered:slots.length,repetitions:c.repetitions,maximumGenerationRequests:c.maximumGenerationRequests,
  manifest:c,manifestHash:sha256(JSON.stringify(c)),registeredAt:new Date().toISOString(),slots,codex,sendEnabled:false};
 writeFileSync(join(out,'registration.json'),JSON.stringify(registration,null,2),{flag:'wx'});
 const [{PostgresRuntimePolicyStore},{QdrantStableCatalogSearchAdapter,ProductSearchService},{VertexShadowModel},{RedisBusinessFactsReader},
  {createCommerceReadSources},{createReadOnlyTools},{runCommerceTurn},{hardPrecheck}]=await Promise.all([
  import('@lana/database'),import('@lana/business-tools'),import('../../dist/vertex.js'),import('../../dist/redis-business-facts.js'),
  import('../../dist/single-agent-commerce-read-only-sources.js'),import('../../dist/single-agent-commerce-read-only-tools.js'),
  import('../../dist/single-agent-commerce-read-only.js'),import('../../dist/single-agent-semantic-verifier-boundary.js')]);
 const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
 check(credential.type==='service_account'&&credential.project_id===config.vertex.projectId,'CREDENTIAL_SCOPE');
 const counters={catalogReads:0,posReads:0,policyReads:0,embeddingCalls:0};
 const embedding=native?new VertexShadowModel({projectId:config.vertex.projectId,location:'global',modelName:base.models.conversation.model,
  embeddingModel:config.vertex.embeddingModel,embeddingLocation:config.vertex.embeddingLocation,embeddingDimension:config.vertex.embeddingDimension,
  serviceAccount:{email:credential.client_email,privateKey:credential.private_key}}):null;
 const index=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,
  collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
  embedding:{embedText:async text=>{check(native,'SEARCH_OUTSIDE_COMPARISON');counters.embeddingCalls++;return embedding.embedText(text);},
   embedImageUrl:async()=>{throw new Error('IMAGE_SEARCH_NOT_EXPOSED');}}});
 const search=native?new ProductSearchService(index,config.searchThresholds):{searchText:async()=>{throw new Error('SEARCH_OUTSIDE_COMPARISON');}};
 const database=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL);
 const redis=new RedisBusinessFactsReader(process.env.REDIS_URL),clock=()=>new Date();
 const checkpoints=(id,value)=>audit(id,value.phase,value.provider);
 const sol=createSolComparisonOwner(c,undefined,checkpoints);
 // Both owners use the same declarations and code-owned tool loop in native mode.
 const gemini=createGeminiComparisonOwner(c,config.vertex.projectId);
 const verifier=createCommerceVerifier(base,undefined,checkpoints);
 const viewHashes=new Map();
 const makeTools=async(slot,requestId)=>{
  const scope={...config.scope,requestId,sourceMessageId:requestId,sourceObservedAt:clock().toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
  const products=[];
  for(const code of slot.runtime.initialProductCodes){counters.catalogReads++;const p=await index.findByExactCode(code);check(p,'INITIAL_SOURCE_UNAVAILABLE');products.push(p);}
  const sources=createCommerceReadSources({scope,channel:config.channel,clock,initialProducts:products,
   search,
   catalog:{findByExactCode:async code=>{counters.catalogReads++;return index.findByExactCode(code);}},
   policyStore:{loadActivePointers:async q=>{counters.policyReads++;return database.loadActivePointers(q);}},
   facts:{readCatalogSnapshot:async(alias,id)=>{counters.posReads++;return redis.readCatalogSnapshot(alias,id);}}});
  const rawTools=createReadOnlyTools({scope,clock,...sources,initialProducts:products,maxFactAgeSeconds:config.maxFactAgeSeconds});
  const tools={...rawTools,invokeBatch:async calls=>{const results=await rawTools.invokeBatch(calls);audit(requestId,'TOOL_RESULTS',{calls,results});return results;},
   readback:async()=>{const current=await rawTools.readback();audit(requestId,'FINAL_READBACK',current);return current;}};
  const calls=products.length?products.map(p=>({name:'read_product',args:{subjectRef:p.productId}})):[{name:'read_policy',args:{}}];
  const results=await tools.invokeBatch(calls);
  audit(requestId,'CODE_SOURCE_READS',{calls,results,snapshot:tools.snapshot()});
  check(results.every(r=>r.status==='OK'),'SOURCE_PRELOAD_UNAVAILABLE');
  check(!hardPrecheck(tools.snapshot(),'Dạ chị.',clock()),'SOURCE_HARD_PRECHECK');
  return {scope,tools,sourceReads:calls.map((call,i)=>({name:call.name,response:results[i]}))};
 };
 try{
  if(args.preflight){
   if(native){const result=await search.searchText(config.sourceSearchProbe);audit('source-preflight','SEARCH_PREFLIGHT',result);}
   for(const slot of slots.filter(s=>s.owner==='gemini'&&s.repetition===1)){
    const {tools}=await makeTools(slot,'comparison-preflight-'+slot.slot);
    const before=tools.snapshot(),after=await tools.readback();
    check(JSON.stringify(before)===JSON.stringify(after),'SOURCE_CHANGED_DURING_PREFLIGHT');
   }
   writeFileSync(join(out,'completion.json'),JSON.stringify({status:'SOURCE_PREFLIGHT_PASS',providerGenerations:0,counters,sendEnabled:false},null,2));return;
  }
  await dispatchComparison(slots,async slot=>{
   const started=performance.now(),requestId=sha256(runSourceSha+':comparison:'+slot.slot);
   const {scope,tools,sourceReads}=await makeTools(slot,requestId);
   const owner=async request=>{
    const r={...request,sourceReads},body=comparisonOwnerRequest(slot.owner,c,r);
    const texts=(slot.owner==='gemini'?body.contents:body.input.filter(m=>m.type==='message')).map(m=>m.content??m.parts?.[0]?.text);
    const viewHash=sha256(JSON.stringify({instructions:ownerPrompt,texts}));
    const initial=request.generationId.endsWith(':owner:1');
    if(initial&&!viewHashes.has(slot.caseId))viewHashes.set(slot.caseId,viewHash);
    if((initial||!native)&&viewHashes.get(slot.caseId)!==viewHash){
     audit(request.generationId,'SOURCE_VIEW_CHANGED',{expected:viewHashes.get(slot.caseId),actual:viewHash,providerRequests:0});
     throw Object.assign(new Error('COMPARISON_SOURCE_VIEW_CHANGED'),{telemetry:{providerRequests:0,errorStage:'COMPARISON_SOURCE'}});
    }
    audit(request.generationId,'OWNER_REQUEST',{body,viewHash});
    let generated;
    if(slot.owner==='sol')generated=await sol(r);
    else generated=await gemini(r);
    audit(request.generationId,'OWNER_RESULT',generated);return generated;
   };
   const result=await runCommerceTurn({scope,clock,tools,latest:slot.runtime.latest,history:slot.runtime.history,ownerPrompt,verifierPrompt,owner,verifier});
   return {...result,elapsedMs:performance.now()-started};
  },async(slot,result)=>{
   writeFileSync(join(out,`attempt-${slot.slot}.json`),JSON.stringify({...slot,result},null,2),{flag:'wx'});
   console.log(JSON.stringify({slot:slot.slot,registered:slots.length,terminal:result.terminal.disposition}));
  });
  writeFileSync(join(out,'completion.json'),JSON.stringify({status:head()===runSourceSha&&!dirty()?'COMPLETE_REVIEW_PENDING':'INVALID_SOURCE_IDENTITY',
   registered:slots.length,recorded:slots.length,counters,ownerViewHashes:Object.fromEntries(viewHashes),sendEnabled:false},null,2),{flag:'wx'});
 }finally{await Promise.allSettled([database.close(),redis.close()]);}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
