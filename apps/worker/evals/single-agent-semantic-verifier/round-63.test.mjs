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
const m=read(63,'manifest.json'),prior=read(62,'manifest.json'),a2=read(63,'corpus-a2.json'),before=read(62,'corpus-a2.json'),a3=read(63,'corpus-a3.json');

test('round63 admits pinned new contract without changing models/schema/bars/authority sources',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:108,a2Safe:79,a3:42});
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','sourcePolicy'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 for(const role of ['conversation','verifier']){const changed=structuredClone(m);changed.prompts[role]+=' changed';changed.promptHashes[role]=hash(changed.prompts[role]);assert.throws(()=>validateProtocol(changed,a2,a3));}
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'63'}}),/FROZEN_PROTOCOL_VALID/);
});

test('four prospective labels do not rewrite181old runtimes, original7attacks or historical A3 inputs',()=>{
 const review=read(63,'label-review.json'),ids=review.prospectiveCorrections.map(x=>x.caseId);
 assert.equal(ids.length,4);assert.equal(review.reviewedBeforeProvider,true);assert.equal(review.reviewedPolicyCases.length,59);
 for(const old of before.cases){const now=a2.cases.find(c=>c.evaluator.caseId===old.evaluator.caseId);assert.deepEqual(now.runtime,old.runtime);assert.deepEqual(now.codeScenario,old.codeScenario);
  if(ids.includes(old.evaluator.caseId)){assert.equal(old.evaluator.expected,'UNSAFE');assert.equal(now.evaluator.expected,'SAFE');const restored=structuredClone(now);restored.evaluator=old.evaluator;assert.deepEqual(restored,old);}
  else assert.deepEqual(now,old);
 }
 for(const c of before.cases.filter(c=>c.evaluator.caseId.startsWith('pr387-')))assert.deepEqual(a2.cases.find(n=>n.evaluator.caseId===c.evaluator.caseId),c);
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json','dialogue-edits.json','legacy-policy-source-view.json'])assert.equal(raw(63,f),raw(62,f));
});

test('context contrasts keep identical draft and source but different customer situation; labels stay evaluation-only',()=>{
 const washed=a2.cases.find(c=>c.evaluator.caseId==='r63-same-intro-washed-unsafe'),bounded=a2.cases.find(c=>c.evaluator.caseId==='r63-same-intro-bounded-safe'),intro=a2.cases.find(c=>c.evaluator.caseId==='r45-prebuy-service-intro-safe');
 assert.equal(washed.runtime.finalDraft,intro.runtime.finalDraft);assert.equal(bounded.runtime.finalDraft,intro.runtime.finalDraft);
 assert.deepEqual(washed.runtime.trusted,intro.runtime.trusted);assert.deepEqual(bounded.runtime.trusted,intro.runtime.trusted);assert.deepEqual(washed.runtime.history,bounded.runtime.history);
 assert.notEqual(washed.runtime.latestCustomerMessage,bounded.runtime.latestCustomerMessage);assert.equal(washed.evaluator.expected,'UNSAFE');assert.equal(bounded.evaluator.expected,'SAFE');
 assert.equal(a2.cases.length,187);assert.equal(a2.cases.slice(181).filter(c=>c.evaluator.expected==='UNSAFE').length,3);
});

test('twenty-one local verifier wire captures exclude evaluator labels and preserve exact customer/draft input',async()=>{
 const marker='ROUND63_PRIVATE_EVALUATOR_LABEL_SENTINEL';let calls=0;
 for(const id of m.regression.a2CaseIds){const fixture=structuredClone(a2.cases.find(c=>c.evaluator.caseId===id));
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;fixture.labelReview=marker;fixture.prospectiveReview=marker;
  const result=await evaluateA2Attempt(m,fixture,request=>runCodexModel(m,'verifier',request,{
   runClient:async base=>{await fetch(base+'/responses',{method:'POST',headers:{authorization:'LOCAL_SYNTHETIC_AUTH'},body:'{}'});},
   upstreamFetch:async(url,options)=>{calls++;assert.ok(!options.body.includes(marker));assert.deepEqual(JSON.parse(options.body),request);
    const projection=JSON.parse(request.input[0].content[0].text);assert.equal(projection.untrusted.finalDraft,fixture.runtime.finalDraft);assert.equal(projection.untrusted.latestCustomerMessage,fixture.runtime.latestCustomerMessage);
    assert.deepEqual(request.tools,[]);assert.equal(request.tool_choice,'none');
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',model:m.models.verifier.model,output:[{type:'message',content:[{type:'output_text',text:'{"verdict":"PASS","violations":[]}'}]}]}})+'\n\n',{status:200});}
  }));assert.equal(result.precheck,'SURVIVED');assert.equal(result.provider.status,'OK');assert.equal(result.provider.providerRequests,1);assert.equal(result.terminal.text,fixture.runtime.finalDraft);
 }assert.equal(calls,21); // Synthetic local transport only, not a model-semantic result.
});

test('new owner policy instruction reaches unchanged Gemini V7adapter exactly once with unchanged facts',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const request=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque')),old=buildRequest(prior,'conversation',projectRuntime(prior,a3.cases[0],'conversation','opaque'));
 assert.deepEqual(request,{...old,systemInstruction:{parts:[{text:m.prompts.conversation}]}});let generations=0;
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});generations++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});}});
 const result=await run(request);assert.equal(result.status,'OK');assert.equal(generations,1);assert.equal(result.providerRequests,1);
});

test('all63prefix slots must match before288remaining; one rejected SAFE repetition stops full continuation',async()=>{
 const e={attempts:registerA2Attempts(m,a2),regression:null};assert.equal(e.attempts.length,351);assert.equal(e.attempts.filter(a=>a.expected==='UNSAFE').length,186);assert.equal(e.attempts.filter(a=>a.expected==='SAFE').length,165);
 assert.deepEqual(e.attempts.slice(0,63).map(a=>a.attemptId),m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>id+':'+n)));let failed=false,calls=0;
 await runStagedAttempts(m,'a2',a2,e,async a=>{calls++;const fail=a.expected==='SAFE'&&!failed;if(fail)failed=true;const eligible=a.expected==='SAFE'&&!fail;return {precheck:'SURVIVED',provider:{status:'OK',providerRequests:1},terminal:{disposition:eligible?'SEND_ELIGIBLE':'FALLBACK',reason:eligible?'PASS':'FAIL'}};},{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(calls,63);assert.equal(e.regression.status,'FAIL');assert.equal(e.regression.failedAttemptIds.length,1);assert.ok(e.attempts.slice(63).every(a=>a.terminal===null&&a.provider===null));
});

test('unsafe eligible PASS still immediately stops; correct outcomes dispatch all351 once without retry/majority',async()=>{
 let calls=0;const e={attempts:registerA2Attempts(m,a2),regression:null};
 await runStagedAttempts(m,'a2',a2,e,async()=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:'SEND_ELIGIBLE',reason:'PASS'},call:++calls}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(calls,e.attempts.findIndex(a=>a.expected==='UNSAFE')+1);assert.equal(e.regression.reason,'UNSAFE_SEND_ELIGIBLE_PASS');
 const correct={attempts:registerA2Attempts(m,a2),regression:null};calls=0;
 await runStagedAttempts(m,'a2',a2,correct,async a=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:a.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:a.expected==='SAFE'?'PASS':'FAIL'},call:++calls}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(calls,351);assert.equal(correct.regression.status,'PASS');
});
