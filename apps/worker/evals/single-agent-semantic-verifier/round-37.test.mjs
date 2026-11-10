import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(folder,file)=>readFileSync(new URL('./'+folder+'/'+file,import.meta.url),'utf8');
const read=(folder,file)=>JSON.parse(raw(folder,file));
const m=read('round-37','manifest.json'),prior=read('round-36','manifest.json');
const a2=read('round-37','corpus-a2.json'),a3=read('round-37','corpus-a3.json'),old=read('round-36','corpus-a3.json');
const prepared='preparations/vietnamese-dialogue-20261010';

test('fixed37 admits the presented preparation and unchanged authority/configuration',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'37'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const file of ['corpus-a2.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.equal(raw('round-37',file),raw('round-36',file));
 for(const file of ['corpus-a3.json','reference-replies.json'])assert.equal(raw('round-37',file),raw(prepared,file));
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-vietnamese-chat-20261010.vi.txt',import.meta.url),'utf8'));
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 for(const field of ['models','bounds','stateAllowlist','verdictSchema','terminal','fallbacks','usability','measurements'])assert.deepEqual(m[field],prior[field]);
 let unchanged=0;
 for(const[c,i]of a3.cases.map((c,i)=>[c,i])){
  const{history,latestCustomerMessage,...world}=c.runtime;
  const{history:oldHistory,latestCustomerMessage:oldLatest,...oldWorld}=old.cases[i].runtime;
  assert.deepEqual(world,oldWorld);
  const{knownDecisions,...expectations}=c.evaluator,{knownDecisions:oldDecisions,...oldExpectations}=old.cases[i].evaluator;
  assert.deepEqual(expectations,oldExpectations);
  if(JSON.stringify(c)===JSON.stringify(old.cases[i]))unchanged++;
 }
 assert.equal(unchanged,13);
 assert.equal(hash(readFileSync(new URL('../../../../'+m.scoring.reviewProcedureFile,import.meta.url))),m.scoring.reviewProcedureHash);
});

test('all42 captured native/provider requests exclude evaluator labels and bind unchanged snapshots',async()=>{
 for(const[original,i]of a3.cases.map((c,i)=>[c,i])){
  const c=structuredClone(original),marker='ROUND37_EVALUATOR_ONLY';
  for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
  c.runtime.trusted.state.rubric=marker;
  const projection=projectRuntime(m,c,'conversation','opaque');
  assert.equal(projection.requestIdentity.trustedSnapshotId,projectRuntime(prior,old.cases[i],'conversation','opaque').requestIdentity.trustedSnapshotId);
  const request=buildRequest(m,'conversation',projection);
  assert.deepEqual(request.contents.slice(1,-1),c.runtime.history.map(turn=>({role:turn.role==='customer'?'user':'model',parts:[{text:turn.text}]})));
  assert.equal(request.contents.at(-1).parts[0].text,c.runtime.latestCustomerMessage);
  const captured=[];
  const attempt=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,requestBody:body,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(item=>item.role),['conversation','verifier']);
  assert.equal(attempt.terminal.disposition,'FALLBACK');
  for(const{body}of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric'])assert.ok(!JSON.stringify(body).includes(label),label);
 }
});

test('fixed37 native adapter retains exactly one generation on HTTP429 without retry',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'round37@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(prior,'conversation',projectRuntime(prior,old.cases[0],'conversation','opaque'));
 body.systemInstruction.parts[0].text=m.prompts.conversation;
 let calls=0,captured;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'UNIT_SECRET',expires_in:3600});calls++;captured=JSON.parse(options.body);return new Response(null,{status:429});}});
 const result=await generate(body);
 assert.equal(calls,1);assert.deepEqual(captured,body);
 assert.equal(result.providerRequests,1);assert.equal(result.httpStatus,429);assert.equal(result.status,'PROVIDER_ERROR');
 assert.ok(!JSON.stringify(result).includes('UNIT_SECRET'));
});

test('rehashing world/labels/prompt/bars or adopting historical results cannot qualify37',()=>{
 for(const change of [v=>v.bounds.totalBytes++,v=>v.scoring.naturalnessRequired=1,v=>v.models.conversation.effort='medium',v=>{v.prompts.conversation+=' Changed';v.promptHashes.conversation=hash(v.prompts.conversation);},v=>{v.scoring.reviewProcedureFile='tasks/plan.md';v.scoring.reviewProcedureHash=hash(readFileSync(new URL('../../../../tasks/plan.md',import.meta.url)));},v=>v.adoptedA2RunSourceSha='a'.repeat(40)]){
  const modified=structuredClone(m);change(modified);assert.throws(()=>validateProtocol(modified,a2,a3),/ROUND37|MODEL_IDENTITY|CONSULTATION_BAR/);
 }
 for(const change of [v=>v.cases[0].runtime.trusted.state.revision++,v=>v.cases[0].evaluator.requiredBehaviors.push('Changed'),v=>v.cases[0].runtime.latestCustomerMessage+=' Changed']){
  const changed=structuredClone(a3),modified=structuredClone(m);change(changed);modified.corpusHashes.a3=hash(JSON.stringify(changed)+'\n');assert.throws(()=>validateProtocol(modified,a2,changed),/ROUND37/);
 }
 const changed=structuredClone(a2),modified=structuredClone(m);changed.cases[121].evaluator.expected='UNSAFE';modified.corpusHashes.a2=hash(JSON.stringify(changed));assert.throws(()=>validateProtocol(modified,changed,a3));
});
