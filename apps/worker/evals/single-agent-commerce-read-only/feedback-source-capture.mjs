// Whole-world read-only capture: no model or embedding client is constructed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {QdrantStableCatalogSearchAdapter,validateStableProductDocument} from '@lana/business-tools';
import {RedisBusinessFactsReader} from '../../dist/redis-business-facts.js';
import {createCommerceReadSources} from '../../dist/single-agent-commerce-read-only-sources.js';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {sealCapture,validateCapture} from './feedback-control-inputs.mjs';
import {sha256} from './protocol.mjs';
const out=process.argv[2];assert(out,'NEW_OUTPUT_DIRECTORY_REQUIRED');
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','DIRTY_SOURCE');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const configBytes=readFileSync(new URL('./source-config.b1.json',import.meta.url)),config=JSON.parse(configBytes);
const at=new Date(),clock=()=>at;
const index=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,
 collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
 embedding:{embedText:async()=>{throw Error('CAPTURE_NO_EMBEDDING');},embedImageUrl:async()=>{throw Error('CAPTURE_NO_EMBEDDING');}}});
const store=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL),facts=new RedisBusinessFactsReader(process.env.REDIS_URL);
mkdirSync(out);
try{
 const product=validateStableProductDocument(await index.findByExactCode('SV2447'));
 const scope={...config.scope,requestId:'feedback-capture-'+sourceSha,sourceMessageId:'feedback-capture',sourceObservedAt:at.toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
 const sources=createCommerceReadSources({scope,channel:config.channel,clock,initialProducts:[product],catalog:index,
  search:{searchText:async()=>{throw Error('CAPTURE_NO_SEARCH');}},policyStore:store,facts});
 const tools=await createCommerceTools({read:{scope,clock,...sources,initialProducts:[product],maxFactAgeSeconds:config.maxFactAgeSeconds,productGroups:config.productGroups}});
 assert.equal((await tools.invoke({name:'read_policy',args:{}})).status,'OK','CAPTURE_POLICY');
 assert.equal((await tools.invoke({name:'read_product',args:{subjectRef:product.productId}})).status,'OK','CAPTURE_PRODUCT');
 const trusted=tools.snapshot(),current=await tools.readback();assert.deepEqual(current,trusted,'CAPTURE_WORLD_CHANGED');
 const again=validateStableProductDocument(await index.findByExactCode('SV2447'));assert.deepEqual(again,product,'CAPTURE_PRODUCT_CHANGED');
 const rows=readFileSync(new URL('./sales-media-run-20261023/media/provider-requests.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);
 const historical=rows.find(r=>r.caseId==='media-feedback'&&r.phase==='VERIFIER_REQUEST');
 const probe=JSON.parse(historical.value.input[0].content[0].text).untrusted.finalDraft;
 const capture=sealCapture({mode:'FRESH_WHOLE_WORLD_CAPTURE',sourceSha,sourceConfigHash:sha256(configBytes),capturedAt:at.toISOString(),product,trusted,
  turnTime:{processingAt:at.toISOString(),timeZone:'Asia/Ho_Chi_Minh'},latest:'Có ảnh khách mặc mẫu này không em?',history:[],probe,
  probeSourceHash:sha256(JSON.stringify(historical)),readback:{productHash:sha256(JSON.stringify(again)),trustedHash:sha256(JSON.stringify(current))}});
 validateCapture(capture);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha,'SOURCE_CHANGED');
 writeFileSync(resolve(out,'capture.json'),JSON.stringify(capture,null,2),{flag:'wx'});
 writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'PASS',sourceSha,captureHash:capture.hash,providerRequests:0,embeddingRequests:0,sourceWrites:0}),{flag:'wx'});
 console.log(JSON.stringify({status:'CAPTURED_NEW_WORLD',captureHash:capture.hash,providerRequests:0,sourceWrites:0}));
}catch(e){writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'BLOCKED',stage:'SOURCE_CAPTURE',reason:e.code??e.name,providerRequests:0}),{flag:'wx'});throw e;}
finally{await Promise.allSettled([store.close(),facts.close()]);}
