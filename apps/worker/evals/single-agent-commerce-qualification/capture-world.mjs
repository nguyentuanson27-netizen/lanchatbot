// Authorized public source reads only. No embedding, generation, pin/audit writer or source mutation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {QdrantStableCatalogSearchAdapter,validateStableProductDocument,normalizeProductCode} from '@lana/business-tools';
import {RedisBusinessFactsReader} from '../../dist/redis-business-facts.js';
import {candidateDescription} from '../single-agent-commerce-read-only/candidate-description.mjs';
import {digest} from './qualification.mjs';
import {capturePublicIndex,createFrozenSearch} from './frozen-search.mjs';
const [out,codesFile]=process.argv.slice(2);assert(out&&codesFile,'C_CAPTURE_ARGUMENTS');
const outside=relative(process.cwd(),resolve(out));assert(outside&&(outside==='..'||outside.startsWith('..'+sep)||isAbsolute(outside)),'C_CAPTURE_OUTSIDE_SOURCE');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();assert.equal(git('status','--porcelain'),'','C_DIRTY_SOURCE');
const sourceSha=git('rev-parse','HEAD'),codes=JSON.parse(readFileSync(codesFile,'utf8'));
assert(Array.isArray(codes)&&codes.length>0&&codes.length<=12&&new Set(codes).size===codes.length&&codes.every(c=>typeof c==='string'&&/^[A-Z0-9]{3,24}$/.test(c)),'C_CAPTURE_PRODUCT_CODES');
const config=JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/source-config.b1.json',import.meta.url)));
const catalog=new QdrantStableCatalogSearchAdapter({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,
 collection:config.qdrantCollection,expectedDimension:config.vertex.embeddingDimension,
 embedding:{embedText:async()=>{throw Error('C_CAPTURE_NO_EMBEDDING');},embedImageUrl:async()=>{throw Error('C_CAPTURE_NO_EMBEDDING');}}});
const policy=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL),facts=new RedisBusinessFactsReader(process.env.REDIS_URL);
mkdirSync(resolve(out));
try{
 const products=[],snapshots={},at=new Date().toISOString();
 const search=await capturePublicIndex({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,
  collection:config.qdrantCollection,dimension:config.vertex.embeddingDimension});
 const frozen=createFrozenSearch({config,search},{embedText:async()=>{throw Error('C_CAPTURE_NO_EMBEDDING');},embedImageUrl:async()=>{throw Error('C_CAPTURE_NO_EMBEDDING');}});
 const records=await policy.loadActivePointers({pageId:config.scope.pageId,channel:config.channel});assert(records.length,'C_CAPTURE_POLICY_UNAVAILABLE');
 const allCodes=[...new Set([...codes,...search.points.map(p=>p.payload.product_id??p.payload.ma_sp).filter(Boolean)].map(normalizeProductCode))];
 assert(allCodes.length<=1000,'C_CAPTURE_PRODUCT_BOUND');
 for(const code of allCodes){
  const product=validateStableProductDocument(await frozen.catalog.findByExactCode(code));
  const original=validateStableProductDocument(await catalog.findByExactCode(code));
  assert.deepEqual(candidateDescription(original,config.candidateDescriptions),product,'C_CAPTURE_NATIVE_CATALOG_MISMATCH');
  products.push(product);
  snapshots[original.productId]=await facts.readCatalogSnapshot(config.scope.shopAlias,original.productId);
  if(codes.includes(code))assert(snapshots[original.productId],'C_CAPTURE_POS_UNAVAILABLE');
  assert.deepEqual(await catalog.findByExactCode(code),original,'C_CAPTURE_CATALOG_CHANGED');
  assert.deepEqual(await facts.readCatalogSnapshot(config.scope.shopAlias,original.productId),snapshots[original.productId],'C_CAPTURE_POS_CHANGED');
 }
 assert.deepEqual(await capturePublicIndex({baseUrl:process.env.QDRANT_BASE_URL,apiKey:process.env.QDRANT_API_KEY,
  collection:config.qdrantCollection,dimension:config.vertex.embeddingDimension}),search,'C_CAPTURE_INDEX_CHANGED');
 for(const p of products)assert.deepEqual(await facts.readCatalogSnapshot(config.scope.shopAlias,p.productId),snapshots[p.productId],'C_CAPTURE_POS_CHANGED');
 assert.deepEqual(await policy.loadActivePointers({pageId:config.scope.pageId,channel:config.channel}),records,'C_CAPTURE_POLICY_CHANGED');
 assert.equal(git('rev-parse','HEAD'),sourceSha);assert.equal(git('status','--porcelain'),'');
 const world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',version:1,sourceSha,capturedAt:at,config,products,snapshots,policyRecords:records,
  sourceEvidenceHashes:[digest(products),digest(snapshots),digest(records),digest(search)],search,providerRequests:0,sourceWrites:0};
 writeFileSync(resolve(out,'WORLD.json'),JSON.stringify(world,null,2)+'\n',{flag:'wx'});
 writeFileSync(resolve(out,'SUMMARY.json'),JSON.stringify({status:'CAPTURED',worldHash:digest(world),products:products.length,sourceSha,providerRequests:0,sourceWrites:0}),{flag:'wx'});
 console.log(JSON.stringify({status:'CAPTURED',products:products.length,worldHash:digest(world),providerRequests:0}));
}catch(e){
 writeFileSync(resolve(out,'SUMMARY.json'),JSON.stringify({status:'BLOCKED',stage:'PUBLIC_WORLD_CAPTURE',errorCode:/^[A-Z0-9_]+$/.test(e.message)?e.message:e.code??'SOURCE_READ_FAILED',providerRequests:0,sourceWrites:0}),{flag:'wx'});throw e;
}finally{await Promise.allSettled([policy.close(),facts.close()]);}
