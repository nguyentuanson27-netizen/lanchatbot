import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const repo='C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005';
const load=p=>import(pathToFileURL(repo+'/'+p));
const {PostgresRuntimePolicyStore}=await load('packages/database/dist/index.js');
const {RuntimePolicyResolver}=await load('packages/chat-runtime/dist/index.js');
const {QdrantStableCatalogSearchAdapter}=await load('packages/business-tools/dist/index.js');
const {RedisBusinessFactsReader}=await load('apps/worker/dist/redis-business-facts.js');
const config=JSON.parse(readFileSync(repo+'/apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json'));
const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,
 collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
 embedding:{embedText:async()=>{throw Error('NO_EMBEDDING');},embedImageUrl:async()=>{throw Error('NO_EMBEDDING');}}});
const store=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL),facts=new RedisBusinessFactsReader(process.env.REDIS_URL);
try{
 const policy=await new RuntimePolicyResolver(store,{enabled:true,publishedEnabled:true}).resolve({pageId:config.scope.pageId,channel:config.channel,now:new Date()});
 const products=[];
 for(const id of ['SV2447','SQ2447','SQ520']){const product=await catalog.findByExactCode(id),snapshot=await facts.readCatalogSnapshot(config.scope.shopAlias,id);products.push({id,product,snapshot});}
 const report={observedAt:new Date().toISOString(),providerRequests:0,embeddingRequests:0,sourceWrites:0,products,
  charts:policy.bundle?Object.entries(policy.bundle.artifacts.sizeCharts).map(([key,value])=>({key,value})):[],policyStatus:policy.status};
 writeFileSync('C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-chart-audit-20261024.json',JSON.stringify(report,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'READ_ONLY_AUDIT_CAPTURED',charts:report.charts.length,products:products.map(p=>({id:p.id,found:!!p.product,snapshot:!!p.snapshot})),providerRequests:0,sourceWrites:0}));
}finally{await Promise.allSettled([store.close(),facts.close()]);}
