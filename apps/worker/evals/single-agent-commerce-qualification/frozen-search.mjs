// Evaluation-only immutable public index; native Qdrant document parsing/search thresholds are reused.
import assert from 'node:assert/strict';
import {QdrantStableCatalogSearchAdapter,ProductSearchService,stableProductDocumentFromQdrantPayload} from '@lana/business-tools';
import {candidateDescription,candidateSearchResult} from '../single-agent-commerce-read-only/candidate-description.mjs';
import {digest} from './qualification.mjs';
const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite)&&v.some(x=>x!==0);
const pointId=v=>Number.isSafeInteger(v)&&v>=0||typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const idOrder=(a,b)=>typeof a==='number'&&typeof b==='number'?a-b:typeof a==='number'?-1:typeof b==='number'?1:String(a)<String(b)?-1:String(a)>String(b)?1:0;
const match=(payload,filter)=>{
 assert(filter&&Object.keys(filter).length===1&&Array.isArray(filter.must),'C_FROZEN_FILTER');
 return filter.must.every(c=>{
  assert(['active','product_id','ma_sp','aliases'].includes(c.key)&&c.match&&Object.keys(c.match).join(',')==='value','C_FROZEN_FILTER');
  const value=payload[c.key];return Array.isArray(value)?value.includes(c.match.value):value===c.match.value;
 });
};
export function validateFrozenIndex(index,dimension){
 assert(index?.status==='FROZEN_NATIVE_INDEX'&&index.version===1&&index.distance==='Cosine'&&index.dimension===dimension&&
  index.queryVector==='product_text'&&index.ranking==='EXACT_COSINE_SHARED_NATIVE_ADAPTER_V1','C_FROZEN_INDEX_CONFIG');
 assert(Array.isArray(index.points)&&index.points.length>0&&index.points.length<=2000&&
  new Set(index.points.map(p=>String(p.id))).size===index.points.length,'C_FROZEN_INDEX_POINTS');
 assert(index.points.every(p=>pointId(p.id)&&p.payload?.active===true&&(p.vector?.product_text===undefined||vector(p.vector.product_text,dimension)))&&
  index.points.some(p=>vector(p.vector?.product_text,dimension)),'C_FROZEN_INDEX_VECTOR');
 assert.equal(index.pointsHash,digest(index.points),'C_FROZEN_INDEX_CHANGED');return index;
}
export function frozenIndexFetch(index){
 validateFrozenIndex(index,index.dimension);
 return async(url,options)=>{
  assert(options.method==='POST','C_FROZEN_INDEX_READ_ONLY');const request=JSON.parse(options.body);
  let points=index.points.filter(p=>match(p.payload,request.filter));
  const path=new URL(url).pathname;
  if(path.endsWith('/points/scroll')){
   assert.equal(request.with_vector,false);assert.equal(request.with_payload,true);
   points=points.slice(0,request.limit);
  }else if(path.endsWith('/points/query')){
   assert.equal(request.using,'product_text');assert(vector(request.query,index.dimension),'C_FROZEN_QUERY_VECTOR');
   const q=request.query,qn=Math.sqrt(q.reduce((n,x)=>n+x*x,0));
   points=points.filter(p=>p.vector?.product_text).map(p=>{const v=p.vector.product_text,norm=Math.sqrt(v.reduce((n,x)=>n+x*x,0));
    return {...p,score:q.reduce((n,x,i)=>n+x*v[i],0)/(qn*norm)};})
    .sort((a,b)=>b.score-a.score||idOrder(a.id,b.id)).slice(0,request.limit);
  }else throw Error('C_FROZEN_INDEX_OPERATION');
  return Response.json({result:{points:points.map(({id,payload,score})=>({id,payload,...(score===undefined?{}:{score})})),next_page_offset:null}});
 };
}
export function createFrozenSearch(world,embedding){
 const index=validateFrozenIndex(world.search,world.config.vertex.embeddingDimension),
  native=new QdrantStableCatalogSearchAdapter({baseUrl:'https://phase-c-frozen.invalid',apiKey:'LOCAL_FROZEN_INDEX_NO_CREDENTIAL',
   collection:world.config.qdrantCollection,expectedDimension:index.dimension,embedding,
   fetchImpl:frozenIndexFetch(index)}),service=new ProductSearchService(native,world.config.searchThresholds);
 return {catalog:{findByExactCode:async code=>candidateDescription(await native.findByExactCode(code),world.config.candidateDescriptions)},
  search:{searchText:async query=>candidateSearchResult(await service.searchText(query),world.config.candidateDescriptions)}};
}
const publicKeys=['active','product_id','ma_sp','parent_product_id','aliases','title','description_xml','description','description_authority','description_source_version',
 'catalog_version','ingestion_version','product_attributes','search_colors','colors','search_materials','material','materials','search_silhouettes','silhouettes',
 'search_occasions','occasions','images_array','image_url','image_role','image_angle','image_type','image_intents','image_parts_visible','image_sort_order',
 'image_quality_score','feedback_verified','published_at','ai_updated_at','source_updated_at','image_content_sha256','image_metadata_review_status','metadata_verified',
 'image_verified_product_color','image_color_binding_status','image_color_binding_sha256','normalized_image_url','image_metadata_version','image_revalidation'];
// Keep invalid explicit proofs present. Dropping them could enable the legacy freshness fallback.
const scalar=v=>v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v)?v:null;
function publicPayload(original){
 const native=stableProductDocumentFromQdrantPayload(original);
 const projected=Object.fromEntries(publicKeys.filter(k=>Object.hasOwn(original,k)).map(k=>{
  const v=original[k];
  if(k==='product_attributes')return [k,native?.attributes??null]; // Native schema is strict at every level.
  if(k==='image_revalidation')return [k,v&&typeof v==='object'&&!Array.isArray(v)
   ?Object.fromEntries(['version','status','checkedAt','metadataSha256'].filter(f=>Object.hasOwn(v,f)).map(f=>[f,scalar(v[f])])):null];
  return [k,Array.isArray(v)?v.map(scalar):scalar(v)];
 }));
 assert.deepEqual(stableProductDocumentFromQdrantPayload(projected),native,'C_INDEX_PUBLIC_PROJECTION_LOSS');
 return projected;
}
export async function capturePublicIndex({baseUrl,apiKey,collection,dimension,fetchImpl=fetch}){
 const origin=new URL(baseUrl);assert.equal(origin.protocol,'https:');assert(/^[A-Za-z0-9_.-]+$/.test(collection)&&apiKey,'C_INDEX_SOURCE_CONFIG');
 const endpoint=origin.toString().replace(/\/$/,''),request=async(path,body)=>{
  const response=await fetchImpl(endpoint+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(15000),
   headers:{'api-key':apiKey,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){await response.body?.cancel();throw Error('C_INDEX_CAPTURE_HTTP');}
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{for(;;){const row=await reader.read();if(row.done)break;bytes+=row.value.byteLength;if(bytes>32*1024*1024){await reader.cancel();throw Error('C_INDEX_CAPTURE_BYTES');}chunks.push(Buffer.from(row.value));}}
  finally{reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')).result;
 };
 const info=await request(`/collections/${collection}`),params=info.config?.params?.vectors?.product_text;
 assert(params?.distance==='Cosine'&&params.size===dimension,'C_INDEX_SOURCE_DISTANCE');
 const capture=async()=>{
  const points=[],seenOffsets=new Set();let offset;
  do{
   const page=await request(`/collections/${collection}/points/scroll`,{filter:{must:[{key:'active',match:{value:true}}]},
    limit:128,with_payload:true,with_vector:['product_text'],...(offset===undefined?{}:{offset})});
   assert(Array.isArray(page.points),'C_INDEX_CAPTURE_SHAPE');
   for(const point of page.points){
    assert(pointId(point.id)&&(point.vector?.product_text===undefined||vector(point.vector.product_text,dimension)),'C_INDEX_CAPTURE_VECTOR');
    const payload=publicPayload(point.payload??{});
    points.push({id:point.id,payload,vector:point.vector?.product_text?{product_text:point.vector.product_text}:{}});
   }
   assert(points.length<=2000,'C_INDEX_CAPTURE_BOUND');offset=page.next_page_offset;
   if(offset!=null){assert(!seenOffsets.has(String(offset)),'C_INDEX_OFFSET_LOOP');seenOffsets.add(String(offset));}
  }while(offset!=null);
  return points.sort((a,b)=>idOrder(a.id,b.id));
 };
 const points=await capture();assert.deepEqual(await capture(),points,'C_INDEX_CHANGED_DURING_CAPTURE');
 return validateFrozenIndex({version:1,status:'FROZEN_NATIVE_INDEX',distance:'Cosine',dimension,queryVector:'product_text',
  ranking:'EXACT_COSINE_SHARED_NATIVE_ADAPTER_V1',points,pointsHash:digest(points),sourceConfigurationHash:digest(info.config)},dimension);
}
