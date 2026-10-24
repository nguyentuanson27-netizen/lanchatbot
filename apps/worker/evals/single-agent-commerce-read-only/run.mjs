import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {requiredSourceConfig,validateProtocol,readRegisteredCases,createCommerceVerifier,sha256,dispatchRange,
 REGISTERED_CASE_COUNT,MAXIMUM_GENERATION_REQUESTS,readB1OwnerPrompt,readImageComparisonCases,readImageComparisonRegistration,imageComparisonSlots,prepareImageComparison,verifyImageComparisonPins} from './protocol.mjs';
import {createGeminiCommerceInference,buildGeminiCommerceRequest,readOnlyDeclarations,mediaDeclarations} from './gemini-inference.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {publicSnapshotDiff} from './snapshot-diagnosis.mjs';
import {candidateDescription,candidateSearchResult} from './candidate-description.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const {values:args}=parseArgs({options:{config:{type:'string'},cases:{type:'string'},out:{type:'string'},range:{type:'string'},run:{type:'boolean'},preflight:{type:'boolean'},'source-check':{type:'boolean'},'owner-registration':{type:'string'},'image-registration':{type:'string'}}});
const comparison=!!args['image-registration'];
if(comparison&&args.range)throw new Error('IMAGE_COMPARISON_FULL_DISPATCH_ONLY');
const dispatch=comparison?{first:1,last:12}:dispatchRange(args.range);
const registered=comparison?12:REGISTERED_CASE_COUNT,maximumGenerations=comparison?48:MAXIMUM_GENERATION_REQUESTS;
const effectiveDeclarations=comparison?[...readOnlyDeclarations,...mediaDeclarations]:readOnlyDeclarations;
const m=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8')));
const selectedOwner=readB1OwnerPrompt(args['owner-registration']);
const configBytes=args.config?readFileSync(resolve(args.config)):null;
const config=configBytes?JSON.parse(configBytes):{};
const missing=requiredSourceConfig(config);
if(!args.cases)missing.push(`--cases (${REGISTERED_CASE_COUNT} approved runtime cases with separate evaluator fields)`);
if(missing.length){console.log(JSON.stringify({status:'BLOCKED',stage:'SOURCE_PREFLIGHT',missing,providerGenerations:0,sendEnabled:false}));process.exit(2);}
const corpus=comparison?readImageComparisonCases(resolve(args.cases)):readRegisteredCases(resolve(args.cases));
const {samples,inputs,hash:inputHash}=corpus;
const imageRegistration=comparison?readImageComparisonRegistration(resolve(args['image-registration']),corpus):null;
const imageSlots=comparison?imageComparisonSlots():null;
if(!['CANARY_SHADOW','CANARY_LIVE','PUBLISHED'].includes(config.channel)||config.scope.pageId!=='1198992073286645'||
 !['shopId','shopAlias','conversationId','customerHash','recipient','bindingVersion','revision'].every(k=>config.scope[k]!==undefined)||
 !/^[a-f0-9]{64}$/.test(config.scope.customerHash)||!/^[a-f0-9]{64}$/.test(config.scope.recipient)||
 !Number.isSafeInteger(config.vertex.embeddingDimension)||config.vertex.embeddingDimension<1)throw new Error('SOURCE_CONFIG');
const codex=inspectCodex();
if(!args.run&&!args['source-check']){console.log(JSON.stringify({status:'CONFIG_READY_CONNECTIONS_UNVERIFIED',cases:registered,requestBounds:m.requestBounds,providerGenerations:0,codex,sendEnabled:false}));process.exit(0);}
if(!args.out)throw new Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
const sourcePaths=['apps/worker/src','apps/worker/package.json','apps/worker/tsconfig.json','tsconfig.base.json','pnpm-lock.yaml',
 'apps/worker/evals/single-agent-commerce-read-only','apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs','packages'];
const head=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const dirty=()=>execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:root,encoding:'utf8'}).trim();
if(args.run&&dirty())throw new Error('DIRTY_EXECUTABLE_OR_CONFIG');
// Compile from this source before importing candidate dist. No generated source is committed back into the run identity.
if(process.platform==='win32')execFileSync(process.env.ComSpec??'cmd.exe',['/d','/c','pnpm --filter @lana/worker build'],{cwd:root,stdio:'pipe',windowsHide:true});
else execFileSync('pnpm',['--filter','@lana/worker','build'],{cwd:root,stdio:'pipe'});
const bRunSourceSha=head();
const ownerPrompt=selectedOwner.text;
const verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
const out=resolve(args.out);mkdirSync(out); // Existing evidence is never overwritten.
const audit=(id,phase,value)=>appendFileSync(join(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
if(args.run)writeFileSync(join(out,'registration.json'),JSON.stringify({bRunSourceSha,manifestHash:sha256(JSON.stringify(m)),sourceConfigHash:sha256(configBytes),
 promptHashes:m.promptHashes,schemaHash:m.schemaHash,requestBounds:m.requestBounds,toolSchemaHash:sha256(JSON.stringify(effectiveDeclarations)),
 inputHash,caseIds:samples.map(c=>c.caseId),registered,repetitions:1,maximumGenerationRequests:maximumGenerations,
 ...(comparison?{mode:"IMAGE_PRELOAD_VS_ON_DEMAND",imageRegistrationHash:imageRegistration.hash,slots:imageSlots}:{}),
 dispatch,effectiveOwnerPromptHash:selectedOwner.sha256,ownerRegistrationHash:selectedOwner.registrationHash,
 dispatchedCases:dispatch.last-dispatch.first+1,dispatchedMaximumGenerationRequests:(dispatch.last-dispatch.first+1)*4,
 catalogInputMode:config.candidateDescriptions?'LIVE_PUBLIC_WITH_ISOLATED_REGISTRY_DESCRIPTION':'LIVE_PUBLIC',
 registeredAt:new Date().toISOString(),codex,sendEnabled:false},null,2),{flag:'wx'});
const [{PostgresRuntimePolicyStore},{ProductSearchService,QdrantStableCatalogSearchAdapter},{RedisBusinessFactsReader},
 {VertexShadowModel},{createCommerceReadSources},{createCommerceTools},{runCommerceTurn}]=await Promise.all([
 import('@lana/database'),import('@lana/business-tools'),import('../../dist/redis-business-facts.js'),import('../../dist/vertex.js'),
 import('../../dist/single-agent-commerce-read-only-sources.js'),import('../../dist/single-agent-commerce.js'),import('../../dist/single-agent-commerce-read-only.js')]);
const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
if(credential.type!=='service_account'||credential.project_id!==config.vertex.projectId)throw new Error('CREDENTIAL_SCOPE');
const counters={embeddingCalls:0,policyReads:0,catalogReads:0,posReads:0};
const embedding=new VertexShadowModel({projectId:config.vertex.projectId,location:'global',modelName:m.models.conversation.model,
 embeddingModel:config.vertex.embeddingModel,embeddingLocation:config.vertex.embeddingLocation,embeddingDimension:config.vertex.embeddingDimension,
 serviceAccount:{email:credential.client_email,privateKey:credential.private_key}});
const index=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,
 expectedDimension:config.vertex.embeddingDimension,embedding:{embedText:async text=>{counters.embeddingCalls++;return embedding.embedText(text);},
  embedImageUrl:async()=>{throw new Error('IMAGE_SEARCH_NOT_EXPOSED');}}});
const sourceSearch=new ProductSearchService(index,config.searchThresholds);
const search={searchText:async query=>candidateSearchResult(await sourceSearch.searchText(query),config.candidateDescriptions)};
const catalog={findByExactCode:async code=>candidateDescription(await index.findByExactCode(code),config.candidateDescriptions)};
const database=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL);
const redis=new RedisBusinessFactsReader(process.env.REDIS_URL);
if(args['source-check']){
 const {hardPrecheck,makeBinding}=await import('../../dist/single-agent-semantic-verifier-boundary.js');
 const scope={...config.scope,requestId:'source-check',sourceMessageId:'source-check',sourceObservedAt:new Date().toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
 const codes=[...new Set(inputs.flatMap(s=>s.initialProductCodes))],products=[];
 const result={mode:'ADAPTER_READBACK',sourceSha:bRunSourceSha,providerGenerations:0,sendEnabled:false,products:[]};
 try{
  for(const code of codes){counters.catalogReads++;const p=await catalog.findByExactCode(code);if(!p)throw new Error('INITIAL_SOURCE_UNAVAILABLE');products.push(p);}
  const sources=createCommerceReadSources({scope,channel:config.channel,clock:()=>new Date(),initialProducts:products,search,catalog,policyStore:database,facts:redis});
  const tools=await createCommerceTools({read:{scope,clock:()=>new Date(),...sources,initialProducts:products,maxFactAgeSeconds:config.maxFactAgeSeconds}});
  result.policy=await tools.invoke({name:'read_policy',args:{}});if(result.policy.status!=='OK')throw new Error('POLICY_UNAVAILABLE');
  for(const p of products){const first=await tools.invoke({name:'read_product',args:{subjectRef:p.productId}});result.products.push(first);
   for(const offerType of first.data?.availableOffers??[])result.products.push(await tools.invoke({name:'read_product',args:{subjectRef:p.productId,offerType}}));}
  result.precheck=hardPrecheck(tools.snapshot(),'Dạ chị.',new Date());if(result.precheck)throw new Error('SOURCE_PRECHECK_'+result.precheck);
  result.before=makeBinding('source-check','Dạ chị.',tools.snapshot());result.after=makeBinding('source-check','Dạ chị.',await tools.readback());
  if(JSON.stringify(result.before)!==JSON.stringify(result.after))throw new Error('SOURCE_CHANGED_DURING_READBACK');
  if(comparison)result.imagePins=await verifyImageComparisonPins(corpus,imageRegistration.registration,async i=>{
   const product=products.find(p=>p.productId===imageRegistration.registration.cases[i].productCode);
   if(!product)throw new Error('IMAGE_SUBJECT_UNAVAILABLE');
   const imageSources=createCommerceReadSources({scope,channel:config.channel,clock:()=>new Date(),initialProducts:[product],search,catalog,policyStore:database,facts:redis});
   return createCommerceTools({read:{scope,clock:()=>new Date(),...imageSources,initialProducts:[product],maxFactAgeSeconds:config.maxFactAgeSeconds,productGroups:config.productGroups},media:{allowedHostSuffixes:['lanadesign.vn','content.pancake.vn','fbcdn.net','fbsbx.com']}});
  });
  if(config.sourceSearchProbe)result.search=await search.searchText(config.sourceSearchProbe);
  result.counters=counters;result.status='PASS';writeFileSync(join(out,'source-readback.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:'SOURCE_ADAPTERS_READ_BACK',products:codes,providerGenerations:0,out,sendEnabled:false}));
 }catch(error){result.status='FAIL';result.error=error.message;writeFileSync(join(out,'source-readback.json'),JSON.stringify(result,null,2));throw error;}
 finally{await Promise.allSettled([database.close(),redis.close()]);}
 process.exit(0);
}
const ownerInference=createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
const verifier=createCommerceVerifier(m,undefined,(id,value)=>audit(id,value.phase,value.provider));
const clock=()=>new Date();
try{
 for(let i=dispatch.first-1;i<dispatch.last;i++){
  const sampleIndex=comparison?imageSlots[i].caseIndex:i,arm=comparison?imageSlots[i].arm:null;
  const sample=inputs[sampleIndex],started=performance.now(),requestId=sha256(bRunSourceSha+':'+i+':'+sha256(JSON.stringify(sample)));
  const scope={...config.scope,requestId,sourceMessageId:requestId,sourceObservedAt:clock().toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
  let result;const preparation={};
  try{
   const initialProducts=[];
   for(const code of sample.initialProductCodes){counters.catalogReads++;const p=await catalog.findByExactCode(code);if(!p)throw new Error('INITIAL_SOURCE_UNAVAILABLE');initialProducts.push(p);}
   const sources=createCommerceReadSources({scope,channel:config.channel,clock,initialProducts,search,
    catalog:{findByExactCode:async code=>{counters.catalogReads++;return catalog.findByExactCode(code);}},
    policyStore:{loadActivePointers:async q=>{counters.policyReads++;return database.loadActivePointers(q);}},
    facts:{readCatalogSnapshot:async(alias,id)=>{counters.posReads++;return samples[sampleIndex].sourceMode==='POS_UNAVAILABLE'?null:redis.readCatalogSnapshot(alias,id);}}});
   const rawTools=await createCommerceTools({read:{scope,clock,...sources,initialProducts,maxFactAgeSeconds:config.maxFactAgeSeconds,productGroups:config.productGroups,entry:{firstContact:sample.history.length===0,fromAd:false}},...(comparison?{media:{allowedHostSuffixes:["lanadesign.vn","content.pancake.vn","fbcdn.net","fbsbx.com"]}}:{})});
   const preparedTools=comparison?prepareImageComparison(rawTools,{arm,subjectRef:initialProducts[0].productId,pinned:imageRegistration.registration.cases[sampleIndex].images},preparation):rawTools;
   const tools={...preparedTools,invokeBatch:async calls=>{
    const results=await rawTools.invokeBatch(calls);audit(requestId,'TOOL_RESULTS',{calls,results});return results;
   }};
   const owner=async request=>{audit(request.generationId,'PUBLIC_CONTEXT_CAPTURE',{generationId:request.generationId,toolsAllowed:request.toolsAllowed,capturedAt:clock().toISOString(),context:request.context});audit(request.generationId,'OWNER_REQUEST',buildGeminiCommerceRequest(request));
    const generated=await ownerInference(request);audit(request.generationId,'OWNER_RESULT',generated);return generated;};
   let before=null;const checkedVerifier=async request=>{before=request.trusted;return verifier(request);};
   result=await runCommerceTurn({scope,clock,tools,latest:sample.latest,history:sample.history,
    ownerPrompt,verifierPrompt,owner,verifier:checkedVerifier});
   if(result.currentPublicContext)result.snapshotDiagnosis=publicSnapshotDiff(before,result.currentPublicContext);
  }catch(error){result={terminal:{disposition:'NO_SEND',reason:'SOURCE_OR_ATTEMPT_UNAVAILABLE',text:null,fallbackId:null},errorType:error.name,
   errorCode:typeof error.message==='string'&&/^[A-Z0-9_]{1,128}$/.test(error.message)?error.message:null,sendEnabled:false};}
  writeFileSync(join(out,`attempt-${i+1}.json`),JSON.stringify({caseId:samples[sampleIndex].caseId,...(comparison?{arm,preparation}:{}),sourceMode:samples[sampleIndex].sourceMode??'LIVE',elapsedMs:performance.now()-started,runtime:sample,result,counters:{...counters}},null,2),{flag:'wx'});
  console.log(JSON.stringify({slot:i+1,recorded:i-dispatch.first+2,registered,terminal:result.terminal.disposition}));
 }
 const recorded=dispatch.last-dispatch.first+1;
 const status=head()===bRunSourceSha&&!dirty()?(recorded===registered?'AWAITING_WHOLE_REPLY_REVIEW':'DISPATCH_RANGE_COMPLETE_REVIEW_PENDING'):'INVALID_SOURCE_IDENTITY';
 writeFileSync(join(out,'completion.json'),JSON.stringify({status,registered,recorded,dispatch,counters,sendEnabled:false},null,2),{flag:'wx'});
 console.log(JSON.stringify({status,registered,recorded,out,sendEnabled:false}));
}finally{await Promise.allSettled([database.close(),redis.close()]);}
