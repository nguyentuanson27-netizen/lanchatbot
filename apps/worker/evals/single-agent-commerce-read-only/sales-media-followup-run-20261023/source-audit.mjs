import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {QdrantStableCatalogSearchAdapter}=await import(pathToFileURL(resolve('packages/business-tools/dist/index.js')));
const config=JSON.parse(readFileSync('apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json'));
const adapter=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,collection:config.qdrantCollection,expectedDimension:1408,
 embedding:{embedText:async()=>{throw Error('NO_EMBEDDING_IN_AUDIT');},embedImageUrl:async()=>{throw Error('NO_EMBEDDING_IN_AUDIT');}}});
const products=[];
for(const code of ['SV2447','SQ748','SQ634']){
 const p=await adapter.findByExactCode(code);
 products.push(p?{code,productId:p.productId,title:p.title,catalogVersion:p.catalogVersion,observedAt:p.observedAt,colors:p.colors,
  images:(p.images??[]).map(({url,angle,imageType,feedback,partsVisible,role,sortOrder,reviewStatus,metadataVerified,sourceContentSha256,observedAt})=>
   ({url,angle,imageType,feedback,partsVisible,role,sortOrder,reviewStatus,metadataVerified,sourceContentSha256,observedAt}))}:{code,status:'NOT_FOUND'});
}
writeFileSync(new URL('./SOURCE_AUDIT.json',import.meta.url),JSON.stringify({readAt:new Date().toISOString(),mode:'LIVE_PUBLIC_QDRANT_READ_ONLY',providerGenerations:0,sourceWrites:0,products},null,2)+'\n');
console.log(JSON.stringify({products:products.map(p=>({code:p.code,images:p.images?.length??0,feedback:p.images?.filter(i=>i.feedback===true).length??0})),providerGenerations:0}));
