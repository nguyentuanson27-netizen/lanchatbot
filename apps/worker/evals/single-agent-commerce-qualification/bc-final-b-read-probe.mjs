// Read-only component comparison against exact final B. No provider, state write or send.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {read,write,digest,byteHash} from './bc-control.mjs';
const[root,worldPath,out,baselineSeal]=process.argv.slice(2);assert(out,'FINAL_B_PROBE_ARGS');
const world=read(worldPath),at=new Date(world.capturedAt),load=p=>import(pathToFileURL(resolve(root,p)).href);
const [{createCommerceTools},{RuntimePolicyResolver},{candidateCartOptions}]=await Promise.all([load('apps/worker/dist/single-agent-commerce.js'),load('packages/chat-runtime/dist/index.js'),load('apps/worker/dist/realtime-sales-catalog.js')]);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
let verifiedBaselineRuntime=null;
if(baselineSeal){const seal=read(baselineSeal),prefix=resolve(root,'apps/worker/dist');let count=0;
 for(const artifact of seal.artifacts)if(artifact.path.startsWith(prefix)){assert.equal(byteHash(readFileSync(artifact.path)),artifact.sha256,'FINAL_B_OLD_DIST_CHANGED');count++;}
 assert(count>0,'FINAL_B_BASELINE_DIST_MISSING');verifiedBaselineRuntime={sourceSha:seal.cRuntimeSourceSha,files:count};}
const policy=()=>new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(world.policyRecords)},{enabled:true,publishedEnabled:world.config.channel==='PUBLISHED'}).resolve({pageId:world.config.scope.pageId,channel:world.config.channel,now:at});
const rows=[];
for(const args of[{subjectRef:'SV2447'},{subjectRef:'SV2447',offerTypes:['AO','CV','SET_VAY']},{subjectRef:'SV2447',offerType:'AO'},{subjectRef:'SV2447',offerType:'SET_VAY'},{subjectRef:'SV1561'},{subjectRef:'SV1561',offerType:'SET_VAY'}]){
 const product=structuredClone(world.products.find(p=>p.productId===args.subjectRef)),source=structuredClone(world.snapshots[args.subjectRef]);assert(product&&source);
 const tools=await createCommerceTools({read:{scope:{...world.config.scope,requestId:'frozen-read-probe',sourceMessageId:'frozen-read-probe',sourceObservedAt:at.toISOString(),conversationOwner:'BOT',permission:true,privacyAllowed:true},clock:()=>at,policy,initialProducts:[product],maxFactAgeSeconds:world.config.maxFactAgeSeconds,productGroups:world.config.productGroups,
  catalog:{readProduct:async()=>({product:structuredClone(product),snapshot:structuredClone(source)}),searchText:async()=>{throw Error('FINAL_B_NO_SEARCH');}}}});
 const result=await tools.invoke({name:'read_product',args}),snapshot=tools.snapshot();let readback;
 try{readback=digest(await tools.readback())===digest(snapshot)?'UNCHANGED':'CHANGED';}catch{readback='REJECTED';}
 const data=result.data??{},evidence=snapshot.runtimeProducts?.[0];
 const tuples=(evidence?.selectionEvidence??[]).map(e=>({query:{productId:e.productId,offerType:e.offerType,size:e.size,color:e.color,quantity:e.quantity},sourceHash:e.sourceHash,
  options:e.options.map(o=>({...o,productId:e.productId,offerType:e.offerType,quantity:e.quantity,sourceVersion:e.sourceVersion,observedAt:e.observedAt,expiresAt:e.expiresAt}))}));
 for(const e of tuples){const expected=candidateCartOptions(source,{shopAlias:world.config.scope.shopAlias,productId:args.subjectRef,offerType:e.query.offerType,size:e.query.size,color:e.query.color,quantity:e.query.quantity,lineId:'00000000-0000-4000-8000-000000000001'},at).slice(0,8).map(o=>({...o,expiresAt:e.options[0]?.expiresAt??o.expiresAt}));
  assert.equal(digest(e.options),digest(expected),'FINAL_B_EXPANDED_TUPLE_MEANING_CHANGED');}
 rows.push({query:args,sourceInputHash:digest({product,source,at:at.toISOString()}),status:result.status,reason:result.reason??null,readback,
  rawResultBytes:Buffer.byteLength(JSON.stringify(result)),runtimeProductBytes:Buffer.byteLength(JSON.stringify(evidence??{})),envelopeBytes:(evidence?.selectionEvidence??[]).map(e=>Buffer.byteLength(JSON.stringify(e))),
  returnedOptions:data.selectionOptions??[],tupleSemantics:tuples,claims:snapshot.protectedClaims.map(c=>({type:c.type,scope:c.scope,value:c.value}))});
}
const report={kind:'FINAL_B_READ_COMPONENT_NOT_END_TO_END',head:git('rev-parse','HEAD'),sourceDirty:!!git('status','--porcelain'),verifiedBaselineRuntime,
 worldHash:byteHash(readFileSync(worldPath)),clock:at.toISOString(),providerRequests:0,effects:0,sendEnabled:false,rows};
write(out,report);console.log(JSON.stringify({head:report.head,sourceDirty:report.sourceDirty,baseline:verifiedBaselineRuntime,rows:rows.map(({query,status,reason,runtimeProductBytes,readback})=>({query,status,reason,runtimeProductBytes,readback}))}));
