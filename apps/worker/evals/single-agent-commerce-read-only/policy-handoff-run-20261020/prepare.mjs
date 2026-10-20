// No generations or source writes. Freeze five existing questions and the current public policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {publicPolicyLiteral,commerceHash} from '../../../dist/single-agent-commerce-read-only-context.js';
import {validateProtocol,sha256} from '../protocol.mjs';
const config=JSON.parse(readFileSync(new URL('../source-config.b1.json',import.meta.url)));
const manifest=validateProtocol(JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url))));
const old=JSON.parse(readFileSync(new URL('../policy-relationship-run-20261020/targeted-input.json',import.meta.url)));
const rows=[1,6,7,8,9].map((i,n)=>({caseId:'policy-handoff-'+(n+1),
 evaluator:{purpose:old[i].evaluator.purpose},runtime:old[i].runtime}));
const store=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL);
try{
 const now=new Date(),resolver=new RuntimePolicyResolver(store,{enabled:true,publishedEnabled:config.channel==='PUBLISHED'});
 const r=await resolver.resolve({pageId:config.scope.pageId,channel:config.channel,now});
 assert.equal(r.status,'RESOLVED');assert(r.bundle);
 const source={policy:publicPolicyLiteral(r.bundle,config.scope.pageId,config.scope.shopId,now),matrix:r.bundle.artifacts.handoffMatrix??null};
 const inputs=JSON.stringify(rows,null,2)+'\n';
 writeFileSync(new URL('./inputs.json',import.meta.url),inputs);
 writeFileSync(new URL('./SOURCE.json',import.meta.url),JSON.stringify(source,null,2)+'\n');
 writeFileSync(new URL('./REGISTRATION.json',import.meta.url),JSON.stringify({kind:'PRE_PROVIDER_REGISTRATION',models:manifest.models,
  promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,inputHash:sha256(inputs),sourceProjectionHash:commerceHash(source),
  registeredSlots:5,repetitions:1,maximumGenerationRequests:20,ownerPerSlotMax:3,verifierPerSlotMax:1,retry:0,
  mode:'REAL_POSTGRES_TEMP_DATABASE_CURRENT_POLICY_CAPTURE_TRANSPORT',sendEnabled:false},null,2)+'\n');
 console.log(JSON.stringify({status:'PREPARED',slots:rows.length,generations:0,matrixPresent:source.matrix!==null}));
}finally{await store.close();}
