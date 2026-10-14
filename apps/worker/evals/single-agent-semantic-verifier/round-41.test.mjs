import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt,validateA2Evidence} from './run-a2.mjs';
import {evaluateA3Attempt,scoreWholeReplies,validateA3Evidence} from './run-a3.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
const raw=(n,f)=>readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'),read=(n,f)=>JSON.parse(raw(n,f));
const m=read(41,'manifest.json'),old=read(40,'manifest.json'),a2=read(41,'corpus-a2.json'),a3=read(41,'corpus-a3.json');
const count=(phase,c)=>m.attemptRepetitions[phase][c.evaluator.caseId]??m.repetitions;

test('fixed41 admits only its frozen claim-scope, terminal and complete repetition policy',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'41'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:84,a2Safe:54,a3:42});
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(41,f),raw(40,f));
 const prior=read(40,'corpus-a2.json');assert.deepEqual(a2.cases.slice(0,122).filter(c=>c.evaluator.caseId!=='r32-advisory-care-safe'),prior.cases.filter(c=>c.evaluator.caseId!=='r32-advisory-care-safe'));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements'])assert.deepEqual(m[k],old[k]);
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate'])assert.deepEqual(m.scoring[k],old.scoring[k]);
 for(const edit of [v=>v.attemptRepetitions.a3['r15-value-use']=1,v=>v.fallbacks[0].text+=' Đơn đã tạo.',v=>v.prompts.verifier+=' bypass',v=>v.adoptedA2RunSourceSha='a'.repeat(40)]){const edited=structuredClone(m);edit(edited);assert.throws(()=>validateProtocol(edited,a2,a3));}
});
test('A2 registers all172 frozen slots, keeping every unsafe and safe repetition',()=>{
 const attempts=registerA2Attempts(m,a2);
 assert.equal(attempts.length,172);assert.equal(new Set(attempts.map(x=>x.attemptId)).size,172);
 assert.equal(attempts.filter(x=>x.expected==='UNSAFE').length,102);assert.equal(attempts.filter(x=>x.expected==='SAFE').length,70);
 for(const c of a2.cases)assert.deepEqual(attempts.filter(x=>x.caseId===c.evaluator.caseId).map(x=>x.repetition),Array.from({length:count('a2',c)},(_,i)=>i+1));
 const missing=attempts.filter(x=>x.attemptId!=='r41-alternative-opacity-implied-unsafe:3');
 assert.throws(()=>validateA2Evidence(m,a2,{attempts:missing}),/ATTEMPT_DENOMINATOR/);
});
test('A3 scores all62 actual outcomes, no majority vote or best-of-three',()=>{
 const attempts=a3.cases.flatMap(c=>Array.from({length:count('a3',c)},(_,i)=>({caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':'+(i+1),terminal:{disposition:'SEND_ELIGIBLE'}})));
 const scores=attempts.map(x=>({attemptId:x.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));
 const failing=scores.find(x=>x.attemptId==='r15-value-use:2');failing.scores.factualActionSafety=1;
 const result=scoreWholeReplies(m,a3,attempts,scores);assert.equal(result.denominator,62);assert.equal(result.scored,62);assert.equal(result.status,'FAIL');assert.equal(result.rows.filter(x=>!x.pass).length,1);
 assert.equal(scoreWholeReplies(m,a3,attempts,scores.filter(x=>x!==failing)).status,'BLOCKED');
 assert.throws(()=>validateA3Evidence(m,a3,{attempts:attempts.filter(x=>x.attemptId!=='r15-value-use:3')}),/A3_DENOMINATOR/);
});
test('captured provider requests contain runtime only, including repeated attempts and new regression fixtures',()=>{
 for(const [phase,corpus]of [['a2',a2],['a3',a3]])for(const c of corpus.cases){
  if(c.evaluator.family==='oversized-context')continue;
  const marker='R41_EVALUATOR_ONLY_HIDDEN';const edited=structuredClone(c);for(const k of Object.keys(edited.evaluator))edited.evaluator[k]=marker;
  for(const role of phase==='a3'?['conversation','verifier']:['verifier']){
   if(role==='verifier'&&phase==='a3')edited.runtime.finalDraft='Dạ, chị nhé.';
   const body=buildRequest(m,role,projectRuntime(m,edited,role,'opaque-request'));
   const encoded=JSON.stringify(body);assert.ok(!encoded.includes(marker)&&!encoded.includes(c.evaluator.caseId));
   assert.deepEqual(body,buildRequest(m,role,projectRuntime(m,{runtime:edited.runtime},role,'opaque-request')));
   assert.ok(Buffer.byteLength(encoded)<=m.bounds.totalBytes);
  }
 }
});
test('every surviving final text invokes verifier, including ordinary unprotected text',async()=>{
 const roles=[];
 const result=await evaluateA3Attempt(m,a3.cases[0],async(role,body)=>{
  roles.push(role);return role==='conversation'?{status:'OK',answer:'Dạ, chị nhé.',requestBody:body,providerRequests:1}:{status:'TIMEOUT',requestBody:body,providerRequests:1};
 });
 assert.deepEqual(roles,['conversation','verifier']);assert.equal(result.finalDraft,'Dạ, chị nhé.');
 assert.equal(result.terminal.fallbackId,'C3_A_NONPROTECTED_V2');assert.equal(result.terminal.text,m.fallbacks[0].text);
});
test('semantic and provider failures use exact staticV2 without preserving protected clauses',async()=>{
 const f=a2.cases.find(c=>c.evaluator.caseId==='r32-advisory-care-safe');
 for(const verdict of ['FAIL','UNCERTAIN','MALFORMED','TIMEOUT','PROVIDER_ERROR']){
  const result=await evaluateA2Attempt(m,f,async body=>({status:['TIMEOUT','PROVIDER_ERROR'].includes(verdict)?verdict:'OK',answer:verdict==='MALFORMED'?'bad-json':JSON.stringify({verdict,violations:[]}),requestBody:body,providerRequests:1}));
  assert.equal(result.terminal.disposition,'FALLBACK');assert.equal(result.terminal.fallbackId,'C3_A_NONPROTECTED_V2');assert.equal(result.terminal.text,m.fallbacks[0].text);
 }
});
test('V2 cannot authorize arbitrary unverified fallback, old40 still emits unchangedV1',async()=>{
 const f=a2.cases.find(c=>c.evaluator.caseId==='r32-advisory-care-safe');
 const bad=structuredClone(m);bad.fallbacks[0].text='Size M vừa chị nhé, đơn đã tạo.';
 const generate=async body=>({status:'PROVIDER_ERROR',requestBody:body,providerRequests:1});
 assert.equal((await evaluateA2Attempt(bad,f,generate)).terminal.disposition,'NO_SEND');
 assert.equal((await evaluateA2Attempt(old,f,generate)).terminal.text,old.fallbacks[0].text);
});
test('fixed41 Gemini native request records exactly one generation401, with token refresh only on later attempt',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'r41@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));
 let generation=0,auth=0;const captures=[];
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2')){auth++;return Response.json({access_token:'LOCAL_TEST_ONLY',expires_in:3600});}generation++;captures.push(JSON.parse(options.body));return new Response(null,{status:401});}});
 const first=await generate(body);assert.equal(generation,1);assert.equal(auth,1);assert.equal(first.providerRequests,1);assert.equal(first.status,'PROVIDER_ERROR');assert.equal(first.httpStatus,401);assert.deepEqual(captures[0],body);
 const later=await generate(body);assert.equal(generation,2);assert.equal(auth,2);assert.equal(later.providerRequests,1);assert.equal(later.status,'PROVIDER_ERROR');
});
