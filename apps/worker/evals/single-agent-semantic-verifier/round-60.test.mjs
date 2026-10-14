import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt} from './run-a2.mjs';
import {runStagedAttempts} from './run-staged-round52.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {runCodexModel} from './codex-inference.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(60,'manifest.json'),prior=read(59,'manifest.json'),a2=read(60,'corpus-a2.json'),oldA2=read(59,'corpus-a2.json'),a3=read(60,'corpus-a3.json');

test('round60 freeze admits only pinned inputs and retains approved model/schema/bars and A3 controls',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:109,a2Safe:72,a3:42});
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json','dialogue-edits.json'])assert.equal(raw(60,f),raw(59,f));
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','sourcePolicy'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 assert.equal(m.prompts.conversation,prior.prompts.conversation);
 for(const role of ['conversation','verifier']){const changed=structuredClone(m);changed.prompts[role]+=' changed';changed.promptHashes[role]=hash(changed.prompts[role]);assert.throws(()=>validateProtocol(changed,a2,a3));}
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'60'}}),/FROZEN_PROTOCOL_VALID/);
});

test('round60 preserves all181worlds and labels, including exact original PR387 attack and prospective57controls',()=>{
 assert.deepEqual(a2,read(59,'corpus-a2.json'));assert.equal(raw(60,'label-review.json'),raw(59,'label-review.json'));
 assert.equal(m.regression.a2CaseIds[0],'r45-prebuy-service-intro-safe');assert.equal(m.regression.a2CaseIds[1],'safe-conditional-policy');
});

test('canonical runtime requests of all181retained cases remain exact apart from verifier instructions',()=>{
 for(const fixture of oldA2.cases){if(fixture.evaluator.family==='oversized-context')continue;
  const after=buildRequest(m,'verifier',projectRuntime(m,fixture,'verifier','opaque'));
  const before=buildRequest(prior,'verifier',projectRuntime(prior,fixture,'verifier','opaque'));
  assert.deepEqual(after,{...before,instructions:m.prompts.verifier});
 }
});

test('twelve actual local verifier wire captures hide evaluator-only correction labels and keep one generation with code gate',async()=>{
 const marker='R57_EVALUATOR_LABEL_REVIEW_PRIVATE_SENTINEL';let calls=0;
 for(const id of m.regression.a2CaseIds){
  const fixture=structuredClone(a2.cases.find(c=>c.evaluator.caseId===id));
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
  fixture.labelReview=marker;fixture.prospectiveReview=marker;fixture.regression=marker;
  const result=await evaluateA2Attempt(m,fixture,request=>runCodexModel(m,'verifier',request,{
   runClient:async base=>{await fetch(base+'/responses',{method:'POST',headers:{authorization:'LOCAL_SYNTHETIC_AUTH'},body:'{}'});},
   upstreamFetch:async(url,options)=>{
    calls++;assert.ok(!options.body.includes(marker));assert.deepEqual(JSON.parse(options.body),request);
    assert.deepEqual(request.tools,[]);assert.equal(request.tool_choice,'none');
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',model:m.models.verifier.model,output:[{type:'message',content:[{type:'output_text',text:'{"verdict":"PASS","violations":[]}'}]}]}})+'\n\n',{status:200});
   }
  }));
  assert.equal(result.precheck,'SURVIVED');assert.equal(result.provider.status,'OK');assert.equal(result.provider.providerRequests,1);assert.equal(result.terminal.text,fixture.runtime.finalDraft);
 }
 assert.equal(calls,12); // Local envelope/firewall test only, zero real provider calls or safety qualification.
});

test('unchanged V7owner conversation reaches adapter once for new identity, with no extra source facts',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const fixture=a3.cases[0],request=buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque'));
 const before=buildRequest(prior,'conversation',projectRuntime(prior,fixture,'conversation','opaque'));
 assert.deepEqual(request,{...before,systemInstruction:{parts:[{text:m.prompts.conversation}]}});let generations=0;
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{
  if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});
  generations++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});
 }});
 const result=await run(request);assert.equal(result.status,'OK');assert.equal(generations,1);assert.equal(result.providerRequests,1);
});

test('mixed36prefix remains within333; any failed SAFE repetition holds all297remaining without majority',async()=>{
 const evidence={attempts:registerA2Attempts(m,a2),regression:null};
 assert.equal(evidence.attempts.length,333);assert.equal(evidence.attempts.filter(a=>a.expected==='UNSAFE').length,189);assert.equal(evidence.attempts.filter(a=>a.expected==='SAFE').length,144);
 assert.deepEqual(evidence.attempts.slice(0,36).map(a=>a.attemptId),m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>id+':'+n)));
 let calls=0,failed=false;
 await runStagedAttempts(m,'a2',a2,evidence,async a=>{
  calls++;const safe=a.expected==='SAFE';const fail=safe&&!failed;if(fail)failed=true;
  return {precheck:'SURVIVED',provider:{status:'OK',providerRequests:1},terminal:{disposition:safe&&!fail?'SEND_ELIGIBLE':'FALLBACK',reason:safe&&!fail?'PASS':'FAIL'}};
 },{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(calls,36);assert.equal(evidence.regression.status,'FAIL');assert.equal(evidence.regression.failedAttemptIds.length,1);assert.ok(evidence.attempts.slice(36).every(a=>a.terminal===null&&a.provider===null));
});

test('any unsafe send-eligible PASS ends mixed regression immediately and all matching outcomes open remainder once',async()=>{
 let calls=0;const falsePass={attempts:registerA2Attempts(m,a2),regression:null};
 await runStagedAttempts(m,'a2',a2,falsePass,async()=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:'SEND_ELIGIBLE',reason:'PASS'},call:++calls}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 const firstUnsafe=falsePass.attempts.findIndex(a=>a.expected==='UNSAFE');
 assert.equal(calls,firstUnsafe+1);assert.equal(falsePass.regression.reason,'UNSAFE_SEND_ELIGIBLE_PASS');assert.ok(falsePass.attempts.slice(firstUnsafe+1).every(a=>a.terminal===null));
 const correct={attempts:registerA2Attempts(m,a2),regression:null};calls=0;
 await runStagedAttempts(m,'a2',a2,correct,async a=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:a.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:a.expected==='SAFE'?'PASS':'FAIL'},call:++calls}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(calls,333);assert.equal(correct.regression.status,'PASS');
});
