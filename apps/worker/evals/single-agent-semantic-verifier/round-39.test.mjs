import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import * as a2Runner from './run-a2.mjs';
import {evaluateA3Attempt,validateA3Evidence,humanView,scoreWholeReplies,a3Operational} from './run-a3.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
const raw=(round,file)=>readFileSync(new URL('./round-'+round+'/'+file,import.meta.url),'utf8');
const read=(round,file)=>JSON.parse(raw(round,file));
const m=read(39,'manifest.json'),old=read(38,'manifest.json'),a2=read(39,'corpus-a2.json'),a3=read(39,'corpus-a3.json');
const quota=body=>({status:'PROVIDER_ERROR',providerRequests:1,requestBody:body,httpStatus:429,error:'UPSTREAM_HTTP',providerErrorCode:'usage_limit_reached'});
const registeredA3=()=>a3.cases.map(c=>({attemptId:c.evaluator.caseId+':1',caseId:c.evaluator.caseId,repetition:1,conversation:null,finalDraft:null,verification:null,terminal:null}));
const capacity=attempt=>({attemptId:attempt.attemptId,role:'verifier',providerErrorCode:'usage_limit_reached'});

test('fixed39 seals one evaluator correction without changing runtime facts, authority or numeric bars',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'39'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const file of ['corpus-a2.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(39,file),raw(38,file));
 const previous=read(38,'corpus-a3.json');assert.deepEqual(a3.cases.map(c=>c.runtime),previous.cases.map(c=>c.runtime));
 assert.deepEqual(a3.cases.filter(c=>c.evaluator.caseId!=='r5-wardrobe-budget'),previous.cases.filter(c=>c.evaluator.caseId!=='r5-wardrobe-budget'));
 for(const field of ['models','bounds','stateAllowlist','verdictSchema','terminal','fallbacks','usability','measurements'])assert.deepEqual(m[field],old[field]);
 const numeric=['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate'];
 for(const key of numeric)assert.deepEqual(m.scoring[key],old.scoring[key]);
 const heading='# Dữ kiện và phạm vi lời khẳng định';assert.equal(m.prompts.conversation.slice(m.prompts.conversation.indexOf(heading)),old.prompts.conversation.slice(old.prompts.conversation.indexOf(heading)));
 assert.equal(m.prompts.verifier,old.prompts.verifier);
 for(const change of [v=>v.scoring.naturalnessRequired=1,v=>{v.prompts.conversation+=' changed';v.promptHashes.conversation=hash(v.prompts.conversation);},v=>v.adoptedA2RunSourceSha='a'.repeat(40),v=>v.providerCapacityPolicy.stopCodes.push('generic429')]){
  const edited=structuredClone(m);change(edited);assert.throws(()=>validateProtocol(edited,a2,a3),/ROUND39|CONSULTATION_BAR/);
 }
});

test('all42 captured requests preserve V4, exact native context and mandatory verifier without evaluator labels',async()=>{
 for(const original of a3.cases){
  const c=structuredClone(original);for(const key of Object.keys(c.evaluator))c.evaluator[key]='R39_EVALUATOR_ONLY';
  const projection=projectRuntime(m,c,'conversation','opaque');assert.deepEqual(projection,projectRuntime(old,c,'conversation','opaque'));
  const captured=[];
  const result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,requestBody:body,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(v=>v.role),['conversation','verifier']);assert.equal(result.terminal.disposition,'FALLBACK');
  assert.deepEqual(captured[0].body.contents.slice(1,-1),c.runtime.history.map(v=>({role:v.role==='customer'?'user':'model',parts:[{text:v.text}]})));
  assert.equal(captured[0].body.contents.at(-1).parts[0].text,c.runtime.latestCustomerMessage);
  const ownerData=JSON.parse(captured[0].body.contents[0].parts[0].text.split('\n').slice(1).join('\n'));
  const priorProjection=projectRuntime(old,c,'conversation',ownerData.requestIdentity.requestId);
  assert.deepEqual(ownerData,JSON.parse(buildRequest(old,'conversation',priorProjection).contents[0].parts[0].text.split('\n').slice(1).join('\n')));
  for(const {body}of captured)for(const marker of ['R39_EVALUATOR_ONLY','caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','adequateResolution'])assert(!JSON.stringify(body).includes(marker),marker);
 }
});

test('capacity stop requires an explicit error code, preserves generic429 semantics and leaves old rounds unchanged',()=>{
 for(const code of ['usage_limit_reached','insufficient_quota'])assert.equal(a2Runner.providerCapacityExhausted(m,{status:'PROVIDER_ERROR',httpStatus:429,providerErrorCode:code}),true);
 for(const provider of [null,{status:'PROVIDER_ERROR',httpStatus:429},{status:'PROVIDER_ERROR',httpStatus:429,providerErrorCode:'rate_limit_exceeded'},{status:'TIMEOUT',providerErrorCode:'usage_limit_reached'},{status:'OK',providerErrorCode:'usage_limit_reached'}])assert.equal(a2Runner.providerCapacityExhausted(m,provider),false);
 assert.equal(a2Runner.providerCapacityExhausted(old,{status:'PROVIDER_ERROR',providerErrorCode:'usage_limit_reached'}),false);
});

test('A3 capacity-blocked prefix retains all42 slots and cannot fabricate terminal outcomes or score unexecuted slots',async()=>{
 const attempts=registeredA3();let ownerCalls=0,verifierCalls=0;
 Object.assign(attempts[0],await evaluateA3Attempt(m,a3.cases[0],async(role,body)=>{if(role==='conversation'){ownerCalls++;return{status:'OK',providerRequests:1,requestBody:body,answer:'Dạ chị.'};}verifierCalls++;return quota(body);}));
 assert.equal(ownerCalls,1);assert.equal(verifierCalls,1);assert.equal(attempts[0].terminal.disposition,'FALLBACK');
 const evidence={a3RunSourceSha:'a'.repeat(40),manifestHash:hash(raw(39,'manifest.json')),capacityBlock:capacity(attempts[0]),attempts,quality:scoreWholeReplies(m,a3,attempts,null),operational:a3Operational(attempts)};
 const result=validateA3Evidence(m,a3,evidence);assert.equal(result.registeredDenominator,42);assert.equal(result.executedDenominator,1);assert.equal(result.unexecuted,41);
 assert.equal(humanView(a3.cases[1],attempts[1]).customerOutcome.kind,'UNEXECUTED');
 const fabricatedScores=attempts.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));assert.equal(scoreWholeReplies(m,a3,attempts,fabricatedScores).status,'BLOCKED');
 for(const mutate of [e=>delete e.capacityBlock,e=>e.capacityBlock.providerErrorCode='rate_limit_exceeded',e=>e.capacityBlock.attemptId=e.attempts[1].attemptId,e=>e.attempts[1].terminal=structuredClone(e.attempts[0].terminal),e=>e.attempts[1].conversation={status:'OK'}]){
  const edited=structuredClone(evidence);mutate(edited);assert.throws(()=>validateA3Evidence(m,a3,edited),/A3_MISSING|A3_CAPACITY|A3_CONVERSATION/);
 }
});

test('A2 capacity-blocked prefix preserves the full denominator and validates the stopping provider evidence',async()=>{
 const attempts=a2Runner.registerA2Attempts(m,a2);let requests=0,executed=0;
 for(let i=0;i<attempts.length;i++){
  Object.assign(attempts[i],await a2Runner.evaluateA2Attempt(m,a2.cases[i],async body=>{requests++;return quota(body);}));executed++;
  if(attempts[i].provider)break;
 }
 assert.equal(requests,1);
 const last=attempts[executed-1],evidence={a2RunSourceSha:'a'.repeat(40),manifestHash:hash(raw(39,'manifest.json')),capacityBlock:capacity(last),attempts,summary:a2Runner.summarizeA2(m,attempts)};
 const summary=a2Runner.validateA2Evidence(m,a2,evidence);assert.equal(summary.status,'BLOCKED');assert.equal(summary.registeredDenominator,122);assert.equal(summary.executedDenominator,executed);assert.equal(summary.unexecuted,122-executed);
 const changed=structuredClone(evidence);changed.capacityBlock.providerErrorCode='rate_limit_exceeded';assert.throws(()=>a2Runner.validateA2Evidence(m,a2,changed),/A2_CAPACITY/);
});

test('fixed39 native Gemini adapter makes one generation on429 and never retries',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'r39@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(old,'conversation',projectRuntime(old,a3.cases[0],'conversation','opaque'));body.systemInstruction.parts[0].text=m.prompts.conversation;
 let calls=0,captured;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'TEST_ONLY',expires_in:3600});calls++;captured=JSON.parse(options.body);return new Response(null,{status:429});}});
 const result=await generate(body);assert.equal(calls,1);assert.deepEqual(captured,body);assert.equal(result.providerRequests,1);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.httpStatus,429);
});
