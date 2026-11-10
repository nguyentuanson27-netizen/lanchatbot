import {test} from 'node:test';
import assert from 'node:assert/strict';
import {capturePublicIndex,createFrozenSearch,validateFrozenIndex} from './frozen-search.mjs';
import {digest} from './qualification.mjs';
import {createMediaRevalidationProof,stableProductDocumentFromQdrantPayload} from '@lana/business-tools';
const payload=(id,title)=>({active:true,product_id:id,ma_sp:id,title,catalog_version:'public-unit-index',aliases:[],
 source_updated_at:'2026-10-28T00:00:00.000Z'});
function index(){const points=[{id:1,payload:payload('AA101','Áo đơn giản'),vector:{product_text:[1,0]}},
 {id:2,payload:payload('BB102','Váy dự tiệc'),vector:{product_text:[0,1]}}];
 return {version:1,status:'FROZEN_NATIVE_INDEX',distance:'Cosine',dimension:2,queryVector:'product_text',ranking:'EXACT_COSINE_SHARED_NATIVE_ADAPTER_V1',points,pointsHash:digest(points)};}
test('frozen index reuses native exact/alias/semantic contracts without network or case-specific query answers',async()=>{
 const search=index();let embeddings=0;
 const port=createFrozenSearch({search,config:{qdrantCollection:'unit_catalog',vertex:{embeddingDimension:2},
  searchThresholds:{textMinScore:.7,imageMinScore:.7,minTopGap:.04,maxCandidates:3}}},
 {embedText:async()=>{embeddings++;return [1,.1];},embedImageUrl:async()=>{throw Error('NO_IMAGE');}});
 assert.equal((await port.catalog.findByExactCode('AA101')).title,'Áo đơn giản');assert.equal(embeddings,0);
 const result=await port.search.searchText('Chị cần một áo mặc đơn giản thôi em.');
 assert.equal(result.status,'MATCHED');assert.equal(result.product.productId,'AA101');assert.equal(embeddings,1);
 assert.equal(search.pointsHash,digest(search.points));
 const corrupt=structuredClone(search);corrupt.points[0].vector.product_text[0]=.2;assert.throws(()=>validateFrozenIndex(corrupt,2),/CHANGED/);
});
test('capture preserves valid native proof after stripping extra proof keys and rejects nonpublic point IDs',async()=>{
 const point=index().points[0];Object.assign(point.payload,{image_url:'https://content.pancake.vn/unit.jpg',
  image_content_sha256:'a'.repeat(64),metadata_verified:true,image_metadata_review_status:'APPROVED'});
 point.payload.image_revalidation={...createMediaRevalidationProof(point.payload,'a'.repeat(64),'2026-10-28T00:00:00.000Z'),
  private_note:{secret:'PRIVATE_NESTED_PROOF'}};
 const options={baseUrl:'https://public-source.invalid',apiKey:'unit',collection:'unit_catalog',dimension:2,
  fetchImpl:async url=>Response.json({result:url.endsWith('/points/scroll')?{points:[point],next_page_offset:null}:
   {config:{params:{vectors:{product_text:{distance:'Cosine',size:2}}}}}})};
 const captured=await capturePublicIndex(options);
 assert.equal(stableProductDocumentFromQdrantPayload(captured.points[0].payload).images[0].revalidation.status,'VALID');
 assert(!JSON.stringify(captured).includes('PRIVATE_NESTED_PROOF'));
 point.id={private_note:'PRIVATE_POINT_ID'};await assert.rejects(capturePublicIndex(options),/CAPTURE_VECTOR/);
 point.id=Number.MAX_SAFE_INTEGER+1;await assert.rejects(capturePublicIndex(options),/CAPTURE_VECTOR/);
});
test('public source capture verifies two reads, distance/dimension and lossless native media metadata while excluding private fields',async()=>{
 const point=index().points[0],sha='a'.repeat(64);Object.assign(point.payload,{image_url:'https://content.pancake.vn/public-unit.jpg',
  image_type:'PRODUCT_ONLY',image_content_sha256:sha,image_color_binding_status:'VALID',image_verified_product_color:'be',image_color_binding_sha256:sha,
  image_metadata_review_status:'APPROVED',metadata_verified:true,private_note:'DO_NOT_EXPORT_PRIVATE_FIELD',
  image_revalidation:{version:1,status:'INVALID',private_note:'DO_NOT_EXPORT_PRIVATE_FIELD'},
  product_attributes:{nested:{private_note:'DO_NOT_EXPORT_PRIVATE_FIELD'}},aliases:['public-alias',{private_note:'DO_NOT_EXPORT_PRIVATE_FIELD'}]});
 let reads=0;
 const fetched=await capturePublicIndex({baseUrl:'https://public-source.invalid',apiKey:'unit-not-real',collection:'unit_catalog',dimension:2,
  fetchImpl:async(url,options)=>{
   assert(['GET','POST'].includes(options.method));
   if(url.endsWith('/points/scroll')){reads++;assert.equal(JSON.parse(options.body).with_vector[0],'product_text');return Response.json({result:{points:[point],next_page_offset:null}});}
   return Response.json({result:{config:{params:{vectors:{product_text:{distance:'Cosine',size:2}}}}}});
  }});
 assert.equal(reads,2);assert(!JSON.stringify(fetched).includes('DO_NOT_EXPORT_PRIVATE_FIELD'));
 assert.equal(fetched.points[0].payload.image_verified_product_color,'be');
 assert.equal(fetched.points[0].payload.image_revalidation.status,'INVALID');
 assert.equal(fetched.points[0].payload.product_attributes,null);
 await assert.rejects(capturePublicIndex({baseUrl:'https://public-source.invalid',apiKey:'unit',collection:'unit_catalog',dimension:2,
  fetchImpl:async()=>Response.json({result:{config:{params:{vectors:{product_text:{distance:'Dot',size:2}}}}}})}),/DISTANCE/);
});
