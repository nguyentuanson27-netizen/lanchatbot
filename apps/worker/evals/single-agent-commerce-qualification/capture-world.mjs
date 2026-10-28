// Authorized public source reads only. No embedding, generation, pin/audit writer or source mutation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {QdrantStableCatalogSearchAdapter,validateStableProductDocument} from '@lana/business-tools';
import {RedisBusinessFactsReader} from '../../dist/redis-business-facts.js';
import {candidateDescription} from '../single-agent-commerce-read-only/candidate-description.mjs';
import {digest} from './qualification.mjs';
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
 const records=await policy.loadActivePointers({pageId:config.scope.pageId,channel:config.channel});assert(records.length,'C_CAPTURE_POLICY_UNAVAILABLE');
 for(const code of codes){
  const original=validateStableProductDocument(await catalog.findByExactCode(code));
  products.push(candidateDescription(original,config.candidateDescriptions));
  snapshots[original.productId]=await facts.readCatalogSnapshot(config.scope.shopAlias,original.productId);
  assert(snapshots[original.productId],'C_CAPTURE_POS_UNAVAILABLE');
  assert.deepEqual(await catalog.findByExactCode(code),original,'C_CAPTURE_CATALOG_CHANGED');
  assert.deepEqual(await facts.readCatalogSnapshot(config.scope.shopAlias,original.productId),snapshots[original.productId],'C_CAPTURE_POS_CHANGED');
 }
 assert.deepEqual(await policy.loadActivePointers({pageId:config.scope.pageId,channel:config.channel}),records,'C_CAPTURE_POLICY_CHANGED');
 assert.equal(git('rev-parse','HEAD'),sourceSha);assert.equal(git('status','--porcelain'),'');
 const world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',version:1,sourceSha,capturedAt:at,config,products,snapshots,policyRecords:records,
  sourceEvidenceHashes:[digest(products),digest(snapshots),digest(records)],search:{status:'NOT_CAPTURED_NO_EMBEDDING'},providerRequests:0,sourceWrites:0};
 writeFileSync(resolve(out,'WORLD.json'),JSON.stringify(world,null,2)+'\n',{flag:'wx'});
 writeFileSync(resolve(out,'SUMMARY.json'),JSON.stringify({status:'CAPTURED',worldHash:digest(world),products:products.length,sourceSha,providerRequests:0,sourceWrites:0}),{flag:'wx'});
 console.log(JSON.stringify({status:'CAPTURED',products:products.length,worldHash:digest(world),providerRequests:0}));
}catch(e){
 writeFileSync(resolve(out,'SUMMARY.json'),JSON.stringify({status:'BLOCKED',stage:'PUBLIC_WORLD_CAPTURE',errorCode:/^[A-Z0-9_]+$/.test(e.message)?e.message:e.code??'SOURCE_READ_FAILED',providerRequests:0,sourceWrites:0}),{flag:'wx'});throw e;
}finally{await Promise.allSettled([policy.close(),facts.close()]);}
