import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {QdrantStableCatalogSearchAdapter} from '@lana/business-tools';
import {RedisBusinessFactsReader} from '../../dist/redis-business-facts.js';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {candidateDescription} from './candidate-description.mjs';
import {readImageComparisonCases,imageComparisonSlots} from './protocol.mjs';

const {values:args}=parseArgs({options:{config:{type:'string'},cases:{type:'string'},out:{type:'string'}}});
if(!args.config||!args.cases||!args.out)throw new Error('CONFIG_CASES_AND_NEW_OUTPUT_REQUIRED');
const config=JSON.parse(readFileSync(resolve(args.config),'utf8'));
const corpus=readImageComparisonCases(resolve(args.cases));
for(const key of ['QDRANT_BASE_URL','QDRANT_API_KEY','REDIS_URL'])if(!process.env[key])throw new Error('MISSING_'+key);
const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
 embedding:{embedText:async()=>{throw new Error('NO_EMBEDDING_REQUIRED')},embedImageUrl:async()=>{throw new Error('NO_EMBEDDING_REQUIRED')}}});
const redis=new RedisBusinessFactsReader(process.env.REDIS_URL);
const cases=[];
try{
 for(let i=0;i<corpus.samples.length;i++){
  const code=corpus.inputs[i].initialProductCodes[0];
  const product=candidateDescription(await catalog.findByExactCode(code),config.candidateDescriptions);
  if(!product)throw new Error('INITIAL_SOURCE_UNAVAILABLE_'+code);
  const now=new Date();
  const scope={...config.scope,requestId:'image-registration-'+i,sourceMessageId:'image-registration-'+i,sourceObservedAt:now.toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true};
  const tools=await createCommerceTools({read:{scope,clock:()=>new Date(),initialProducts:[product],maxFactAgeSeconds:config.maxFactAgeSeconds,
   policy:async()=>{throw new Error('POLICY_NOT_REQUIRED')},catalog:{readProduct:async(id,withSnapshot=true)=>({product:candidateDescription(await catalog.findByExactCode(id),config.candidateDescriptions),snapshot:withSnapshot?await redis.readCatalogSnapshot(config.scope.shopAlias,id):null}),searchText:async()=>{throw new Error('SEARCH_NOT_REQUIRED')}}},
   media:{allowedHostSuffixes:['lanadesign.vn','content.pancake.vn','fbcdn.net','fbsbx.com']}});
  await tools.prepare();
  if(!tools.snapshot().boundSubjects.some(s=>s.kind==='PRODUCT'&&s.ref===code))throw new Error('IMAGE_SUBJECT_BINDING');
  const result=await tools.invoke({name:'view_product_media',args:{subjectRef:code,intent:'GENERIC'}});
  if(result.status!=='OK')throw new Error('IMAGE_UNAVAILABLE_'+code+'_'+result.reason);
  const images=tools.catalogImages();
  if(images.length<1||images.length>2||images.some(image=>image.subjectRef!==code))throw new Error('IMAGE_COUNT_OR_BINDING');
  cases.push({caseId:corpus.samples[i].caseId,productCode:code,images:images.map(({data,...metadata})=>metadata)});
 }
}finally{await redis.close();}
const registration={kind:'IMAGE_PRELOAD_VS_ON_DEMAND',corpusHash:corpus.hash,registered:12,repetitions:1,maximumGenerationRequests:48,retry:0,slots:imageComparisonSlots(),cases,prerequisiteCheckedAt:new Date().toISOString(),providerGenerations:0,sendEnabled:false};
writeFileSync(resolve(args.out),JSON.stringify(registration,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'IMAGE_REGISTRATION_READY',cases:cases.map(c=>({caseId:c.caseId,productCode:c.productCode,images:c.images.length})),providerGenerations:0,sendEnabled:false}));
