import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {QdrantStableCatalogSearchAdapter} from '../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/packages/business-tools/dist/index.js';
import {RedisBusinessFactsReader} from '../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/dist/redis-business-facts.js';
import {createCommerceTools} from '../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/dist/single-agent-commerce.js';
import {readImageComparisonCases,imageComparisonSlots,sha256} from '../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/evals/single-agent-commerce-read-only/protocol.mjs';
const repo=new URL('../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/',import.meta.url),base=new URL('apps/worker/evals/single-agent-commerce-read-only/',repo),config=JSON.parse(readFileSync(new URL('source-config.b1.json',base)));
const corpus=readImageComparisonCases(new URL('cases.image-comparison.json',base));
const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:1408,embedding:{embedText:async()=>{throw Error('NO_EMBED')},embedImageUrl:async()=>{throw Error('NO_EMBED')}}});
const redis=new RedisBusinessFactsReader(process.env.REDIS_URL),cases=[],etaSources=[];
try{
 for(let i=0;i<6;i++){
  const code=corpus.inputs[i].initialProductCodes[0],p=await catalog.findByExactCode(code),now=new Date();if(!p)throw Error('MISSING_PRODUCT_'+code);
  const scope={...config.scope,requestId:'image-prerequisite-'+i,sourceMessageId:'image-prerequisite-'+i,sourceObservedAt:now.toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
  const snapshot=await redis.readCatalogSnapshot('LANA',code);
  etaSources.push({productId:code,syncedAt:snapshot?.synced_at,shippingEta:snapshot?.shipping_eta,fulfillmentPolicy:snapshot?.fulfillment_policy});
  const tools=await createCommerceTools({read:{scope,clock:()=>new Date(),initialProducts:[p],policy:async()=>{throw Error('NO_POLICY_REQUIRED')},maxFactAgeSeconds:7200,catalog:{readProduct:async(id,pos=true)=>({product:await catalog.findByExactCode(id),snapshot:pos?await redis.readCatalogSnapshot('LANA',id):null}),searchText:async()=>{throw Error('NO_SEARCH')}}},media:{allowedHostSuffixes:['lanadesign.vn','content.pancake.vn','fbcdn.net','fbsbx.com']}});
  await tools.prepare();const result=await tools.invoke({name:'view_product_media',args:{subjectRef:code,intent:'GENERIC'}});if(result.status!=='OK')throw Error('IMAGE_UNAVAILABLE_'+code+'_'+result.reason);
  const images=tools.catalogImages();await tools.readback();
  for(const image of images)writeFileSync(new URL('./image-'+image.sha256+'.bin',import.meta.url),Buffer.from(image.data,'base64'));
  cases.push({caseId:corpus.samples[i].caseId,productCode:code,images:images.map(({data,...m})=>m)});
 }
 const registration={kind:'IMAGE_PRELOAD_VS_ON_DEMAND',corpusHash:corpus.hash,registered:12,repetitions:1,maximumGenerationRequests:48,retry:0,slots:imageComparisonSlots(),cases,prerequisiteCheckedAt:new Date().toISOString(),providerGenerations:0,sendEnabled:false};
 writeFileSync(new URL('./image-registration.json',import.meta.url),JSON.stringify(registration,null,2));
 writeFileSync(new URL('./eta-source-audit.json',import.meta.url),JSON.stringify(etaSources,null,2));
 console.log(JSON.stringify({status:'IMAGE_PREREQUISITES_PASS',cases:cases.map(c=>({caseId:c.caseId,productCode:c.productCode,images:c.images.length})),providerGenerations:0,etaSources:etaSources.map(s=>({productId:s.productId,keys:Object.keys(s.shippingEta??{}),validUntil:s.fulfillmentPolicy?.eta_valid_until}))}));
}finally{await redis.close();}
