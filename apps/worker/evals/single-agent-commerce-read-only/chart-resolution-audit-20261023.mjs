// Read-only source audit. Resolver pin/audit writes are kept in memory, never forwarded.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {QdrantStableCatalogSearchAdapter} from '@lana/business-tools';
import {sizeChartTarget} from '../../dist/size-chart-target.js';
import {evaluateSizeChartEligibility} from '../../dist/size-chart-eligibility.js';
const out=process.argv[2];assert(out);
const config=JSON.parse(readFileSync(new URL('./source-config.b1.json',import.meta.url)));
const store=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL);
try {
 const records=await store.loadActivePointers({pageId:'1198992073286645',channel:'PUBLISHED'});
 const memory={loadPin:async()=>null,savePinIfAbsent:async p=>p,recordResolution:async()=>{}};
 const resolver=new RuntimePolicyResolver({loadActivePointers:async()=>records},{enabled:true,publishedEnabled:true},memory);
 const policy=await resolver.resolve({pageId:'1198992073286645',channel:'PUBLISHED',pin:{scopeType:'SALES_EPISODE',scopeId:'read-only-chart-audit'},now:new Date()});
 const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
  embedding:{embedText:async()=>{throw Error('AUDIT_NO_EMBEDDING');},embedImageUrl:async()=>{throw Error('AUDIT_NO_EMBEDDING');}}});
 const products=[];
 for(const code of ['SV2447','SQ2447']){
  const p=await catalog.findByExactCode(code);
  products.push(p?{code,productId:p.productId,title:p.title,target:sizeChartTarget(p),evaluation:evaluateSizeChartEligibility({policy,productId:p.productId,target:sizeChartTarget(p)})}:{code,found:false});
 }
 const charts=records.filter(r=>r.version.artifactKind==='SIZE_CHART').map(r=>({artifactKey:r.version.artifactKey,version:r.version.versionNumber,lifecycle:r.version.lifecycle,contentHash:r.version.contentHash,content:r.version.content}));
 writeFileSync(out,JSON.stringify({observedAt:new Date().toISOString(),mode:'READ_ONLY_LIVE_POLICY_AND_CATALOG_NO_GENERATION',products,charts,aliasApplied:false,sourceWrites:0},null,2));
 console.log(JSON.stringify({products:products.map(p=>({code:p.code,productId:p.productId,eligibility:p.evaluation?.eligibility})),sourceWrites:0}));
}finally{await store.close();}
