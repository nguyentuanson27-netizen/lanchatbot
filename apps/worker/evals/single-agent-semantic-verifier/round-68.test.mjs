import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest,repetitionCount} from './protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt} from './run-a2.mjs';
import {runStagedAttempts} from './run-staged-round52.mjs';import {createGeminiInference} from './gemini-inference.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(68,'manifest.json'),old=read(67,'manifest.json'),a2=read(68,'corpus-a2.json'),a3=read(68,'corpus-a3.json');
const prepared=JSON.parse(readFileSync(new URL('./corpus-reduction-preparation-20261014/corpus-a2.json',import.meta.url),'utf8'));

test('Round68 freezes current prompt pair and full retained population without changing authority or other controls',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:87,a2Safe:51,a3:42});assert.deepEqual(a2,prepared);
 assert.equal(m.prompts.verifier,readFileSync(new URL('./prompts/semantic-verifier-sales-principles-20261014.vi.txt',import.meta.url),'utf8'));
 for(const key of ['models','inspectedClient','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','sourcePolicy','serialization','scoring']){
  if(key==='scoring')assert.deepEqual({...m.scoring,evidencePolicy:old.scoring.evidencePolicy},old.scoring);else assert.deepEqual(m[key],old[key]);
 }
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-sales-principles-20261014.vi.txt',import.meta.url),'utf8'));
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json','dialogue-edits.json','legacy-policy-source-view.json','label-review.json'])assert.equal(raw(68,f),raw(67,f));
 const changed=structuredClone(m);changed.repetitions=2;assert.throws(()=>validateProtocol(changed,a2,a3));
 const env={...process.env,C3_CHECKPOINT_A_ROUND:'68',A2_RUN_SOURCE_SHA:'',C3_TEST_CODEX_TRANSPORT:'1'};
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{env,encoding:'utf8'}),/FROZEN_PROTOCOL_VALID/);
 // The CLI deliberately sanitizes errors. Observe its actual guard in a child
 // without changing production diagnostics; the empty seal prevents generation.
 const entry=new URL('./run-a2.mjs',import.meta.url);
 const probe=`const NativeError=globalThis.Error;globalThis.Error=class extends NativeError{constructor(message){super(message);if(message==='STAGED_RUN_REQUIRED')process.stdout.write('STAGED_GUARD_OBSERVED\\n');}};process.argv[1]=${JSON.stringify(fileURLToPath(entry))};await import(${JSON.stringify(entry.href)});`;
 assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',probe],{env,encoding:'utf8',stdio:'pipe'}),error=>error.status===1&&error.stdout.includes('STAGED_GUARD_OBSERVED'));
});

test('142 fresh slots use two historical regression groups x3 first; every other case and all42 A3 exactly once',()=>{
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,142);assert.equal(attempts.filter(a=>a.expected==='UNSAFE').length,91);assert.equal(attempts.filter(a=>a.expected==='SAFE').length,51);
 assert.deepEqual(attempts.slice(0,6).map(a=>a.attemptId),['pr387-negation-inversion:1','pr387-negation-inversion:2','pr387-negation-inversion:3','pr387-dropped-material-policy-condition:1','pr387-dropped-material-policy-condition:2','pr387-dropped-material-policy-condition:3']);
 for(const c of a2.cases)assert.equal(attempts.filter(a=>a.caseId===c.evaluator.caseId).length,m.regression.a2CaseIds.includes(c.evaluator.caseId)?3:1);
 assert.ok(attempts.every(a=>!a.provider&&!a.terminal));assert.ok(a3.cases.every(c=>repetitionCount(m,'a3',c.evaluator.caseId)===1));assert.deepEqual(m.regression.a3CaseIds,[]);
});

test('six-slot prefix rejects malformed outcomes before remainder, unsafe eligible PASS stops at once, and early checkpoint is retained',async()=>{
 for(const outcome of ['MALFORMED','UNSAFE_PASS','VALID']){
  const e={attempts:registerA2Attempts(m,a2),regression:null};let calls=0,early=0;
  await runStagedAttempts(m,'a2',a2,e,async(a,options)=>{
   calls++;assert.equal(typeof options?.onCheckpoint,'function');options.onCheckpoint({stage:'LOCAL_MOCK'});early++;
   const unsafePass=outcome==='UNSAFE_PASS'&&calls===1,malformed=outcome==='MALFORMED'&&calls===1;
   return {precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:unsafePass||a.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:malformed?'MALFORMED':unsafePass||a.expected==='SAFE'?'PASS':'FAIL'}};
  },{mode:'ALL',save:()=>{},checkSource:()=>{},log:()=>{}});
  assert.equal(calls,outcome==='UNSAFE_PASS'?1:outcome==='MALFORMED'?6:142);assert.equal(early,calls);
  assert.equal(e.regression.status,outcome==='VALID'?'PASS':'FAIL');assert.ok(e.attempts.slice(calls).every(a=>!a.terminal&&!a.dispatchStartedAt));
 }
});

test('every hard-precheck survivor invokes verifier with exact unchanged runtime and no evaluator labels; native owner adapter stays compatible',async()=>{
 let captured=0,safeNonprotected=false;
 for(const c of a2.cases){const poisoned=structuredClone(c);for(const key of Object.keys(poisoned.evaluator))poisoned.evaluator[key]='ROUND68_PRIVATE_EVALUATOR';
  const result=await evaluateA2Attempt(m,poisoned,async request=>{
   captured++;if(c.evaluator.caseId==='safe-nonprotected')safeNonprotected=true;
   const projection=JSON.parse(request.input[0].content[0].text);
   const control=buildRequest(old,'verifier',projectRuntime(old,c,'verifier',projection.requestIdentity.requestId));
   assert.deepEqual(request,{...control,instructions:m.prompts.verifier});
   assert.ok(!JSON.stringify(request).includes('ROUND68_PRIVATE_EVALUATOR'));
   return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',requestBody:request,providerRequests:1,clientRequests:1,usage:null,latencyMs:0};
  });
  if(result.precheck==='SURVIVED')assert.ok(result.provider);
 }
 assert.ok(captured>120);assert.equal(safeNonprotected,true);
 for(const c of a3.cases){
  const poisoned=structuredClone(c);for(const key of Object.keys(poisoned.evaluator))poisoned.evaluator[key]='ROUND68_PRIVATE_EVALUATOR';
  const request=buildRequest(m,'conversation',projectRuntime(m,poisoned,'conversation','opaque'));
  const control=buildRequest(old,'conversation',projectRuntime(old,c,'conversation','opaque'));
  assert.deepEqual(request,{...control,systemInstruction:{parts:[{text:m.prompts.conversation}]}});
  assert.ok(!JSON.stringify(request).includes('ROUND68_PRIVATE_EVALUATOR'));
 }
 const request=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});let calls=0;
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'local@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})};
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});calls++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});}});
 const result=await run(request);assert.equal(result.status,'OK');assert.equal(calls,1);assert.equal(result.providerRequests,1);
});
