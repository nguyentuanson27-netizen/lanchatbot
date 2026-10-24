// No generations or source writes. Freeze five existing questions and the current public policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {HandoffMatrixAdminContentV1Schema} from '@lana/contracts';
import {PostgresRuntimePolicyStore} from '@lana/database';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {publicPolicyLiteral,commerceHash} from '../../../dist/single-agent-commerce-read-only-context.js';
import {validateProtocol,sha256} from '../protocol.mjs';
const config=JSON.parse(readFileSync(new URL('../source-config.b1.json',import.meta.url)));
const manifest=validateProtocol(JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url))));
// New runs get a new directory; never overwrite an earlier registration or source capture.
const directoryIndex=process.argv.indexOf('--registration-dir');
assert(directoryIndex>=0&&process.argv[directoryIndex+1],'NEW_REGISTRATION_DIRECTORY_REQUIRED');
const directory=resolve(process.argv[directoryIndex+1]);
const matrixIndex=process.argv.indexOf('--handoff-matrix');
assert(matrixIndex<0||process.argv[matrixIndex+1],'CANDIDATE_MATRIX_PATH_REQUIRED');
const candidateMatrix=matrixIndex<0?null:HandoffMatrixAdminContentV1Schema.parse(JSON.parse(readFileSync(resolve(process.argv[matrixIndex+1]))));
const old=JSON.parse(readFileSync(new URL('../policy-relationship-run-20261020/targeted-input.json',import.meta.url)));
const rows=[1,6,7,8,9].map((i,n)=>({caseId:'policy-handoff-'+(n+1),
 evaluator:{purpose:old[i].evaluator.purpose},runtime:old[i].runtime}));
const store=new PostgresRuntimePolicyStore(process.env.RUNTIME_POLICY_DATABASE_URL??process.env.DATABASE_URL);
try{
 const now=new Date(),resolver=new RuntimePolicyResolver(store,{enabled:true,publishedEnabled:config.channel==='PUBLISHED'});
 const r=await resolver.resolve({pageId:config.scope.pageId,channel:config.channel,now});
 assert.equal(r.status,'RESOLVED');assert(r.bundle);
 const upstream={policy:publicPolicyLiteral(r.bundle,config.scope.pageId,config.scope.shopId,now),matrix:r.bundle.artifacts.handoffMatrix??null};
 // This candidate preserves the observed default matrix. Do not replace newly published custom rules.
 assert(!candidateMatrix||upstream.matrix===null,'CANDIDATE_REQUIRES_ABSENT_UPSTREAM_MATRIX');
 const source=candidateMatrix?{...upstream,matrix:candidateMatrix}:upstream;
 mkdirSync(directory);
 const inputs=JSON.stringify(rows,null,2)+'\n';
 writeFileSync(join(directory,'inputs.json'),inputs,{flag:'wx'});
 writeFileSync(join(directory,'SOURCE.json'),JSON.stringify(source,null,2)+'\n',{flag:'wx'});
 writeFileSync(join(directory,'REGISTRATION.json'),JSON.stringify({kind:'PRE_PROVIDER_REGISTRATION',models:manifest.models,
  promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,inputHash:sha256(inputs),sourceProjectionHash:commerceHash(source),
  upstreamProjectionHash:commerceHash(upstream),candidateHandoff:!!candidateMatrix,
  registeredSlots:5,repetitions:1,maximumGenerationRequests:20,ownerPerSlotMax:3,verifierPerSlotMax:1,retry:0,
  mode:candidateMatrix?'REAL_POSTGRES_TEMP_DATABASE_ISOLATED_CANDIDATE_HANDOFF_CAPTURE_TRANSPORT':'REAL_POSTGRES_TEMP_DATABASE_CURRENT_POLICY_CAPTURE_TRANSPORT',sendEnabled:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'PREPARED',slots:rows.length,generations:0,matrixPresent:source.matrix!==null,candidateHandoff:!!candidateMatrix}));
}finally{await store.close();}
