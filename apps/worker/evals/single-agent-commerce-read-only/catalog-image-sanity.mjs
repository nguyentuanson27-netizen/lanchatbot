// One public-image API compatibility probe. No customer outcome, state write, verifier qualification or delivery.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {QdrantStableCatalogSearchAdapter} from '@lana/business-tools';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {COMMERCE_VISION_BOUNDS} from '../../dist/single-agent-commerce-media.js';
import {buildGeminiCommerceRequest,createGeminiCommerceInference,OWNER_IMAGE_BOUNDS} from './gemini-inference.mjs';
import {validateProtocol,sha256} from './protocol.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const paths=['apps/worker/src','packages','apps/worker/evals/single-agent-commerce-read-only','pnpm-lock.yaml'];
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all','--',...paths],{cwd:root,encoding:'utf8'}).trim(),'','DIRTY_EXECUTABLE_OR_CONFIG');
const m=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)))),config=JSON.parse(readFileSync(new URL('./source-config.b1.json',import.meta.url)));
const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
 embedding:{embedText:async()=>{throw Error('NOT_REQUIRED');},embedImageUrl:async()=>{throw Error('NOT_REQUIRED');}}});
const now=new Date(),product=await catalog.findByExactCode('SV2447');assert(product,'CATALOG_PRODUCT_UNAVAILABLE');
const scope={...config.scope,requestId:randomUUID(),sourceMessageId:randomUUID(),sourceObservedAt:now.toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
const tools=await createCommerceTools({read:{scope,clock:()=>new Date(),initialProducts:[product],policy:async()=>{throw Error('NO_POLICY_READ_IN_IMAGE_SANITY');},
 catalog:{searchText:async()=>{throw Error('NO_SEARCH_IN_IMAGE_SANITY');},readProduct:async id=>{assert.equal(id,'SV2447');return {product:await catalog.findByExactCode(id),snapshot:null};}}},
 media:{allowedHostSuffixes:['lanadesign.vn','content.pancake.vn','fbcdn.net','fbsbx.com']}});
assert.equal((await tools.invoke({name:'view_product_media',args:{subjectRef:'SV2447',intent:'GENERIC'}})).status,'OK','PUBLIC_ASSET_INPUT_UNAVAILABLE');
const images=tools.catalogImages();assert(images.length>0);
const request={generationId:randomUUID(),instructions:readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),context:tools.snapshot(),catalogImages:images,
 contents:[{role:'user',parts:[{text:'Áo này mặc với quần jeans được không em? Chị có sẵn quần xanh đậm.'}]}],availableTools:[],toolsAllowed:false,
 toolBudget:{roundsRemaining:0,callsRemaining:0},signal:AbortSignal.timeout(90000)};
const body=buildGeminiCommerceRequest(request),wire=JSON.stringify(body);
const registration={sourceSha:head,mode:'PUBLIC_CATALOG_IMAGE_API_SANITY_NO_SEND',models:{owner:m.models.conversation},promptHash:m.promptHashes.owner,
 bounds:{...COMMERCE_VISION_BOUNDS,...OWNER_IMAGE_BOUNDS},mediaResolution:body.generationConfig.mediaResolution,registeredAttempts:1,maximumGenerationRequests:1,retry:0,
 requestHash:sha256(wire),images:images.map(({data:_data,...identity})=>identity),sendEnabled:false};
if(process.argv.includes('--preflight')){console.log(JSON.stringify({status:'PREFLIGHT_PASS',...registration,providerGenerations:0}));process.exit(0);}
assert(process.argv.includes('--run'),'EXPLICIT_RUN_REQUIRED');const out=resolve(process.argv[2]);mkdirSync(out);
writeFileSync(out+'/registration.json',JSON.stringify(registration,null,2));writeFileSync(out+'/request.json',wire);
const infer=createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',projectId:config.vertex.projectId,location:'global'});
let outcome;
try{
 const result=await infer(request);assert.equal(result.telemetry.providerRequests,1);assert.equal(result.telemetry.requestHash,registration.requestHash);assert.equal(result.kind,'FINAL');
 await tools.readback();assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head,'RUN_SOURCE_CHANGED');
 outcome={status:'API_COMPATIBILITY_PASS',result,sendEligible:false,sendEnabled:false};
}catch(e){outcome={status:'FAIL',code:e.code??e.message,telemetry:e.telemetry??null,sendEligible:false,sendEnabled:false};process.exitCode=1;}
writeFileSync(out+'/outcome.json',JSON.stringify(outcome,null,2));console.log(JSON.stringify({status:outcome.status,providerRequests:outcome.result?.telemetry.providerRequests??outcome.telemetry?.providerRequests??0,sendEnabled:false}));
