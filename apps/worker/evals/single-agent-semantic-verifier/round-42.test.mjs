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
const m=read(42,'manifest.json'),prior=read(41,'manifest.json'),a2=read(42,'corpus-a2.json'),a3=read(42,'corpus-a3.json');

test('fixed42 admission binds the prospective configuration and preserves historical populations',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'42'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:86,a2Safe:56,a3:42});
 assert.deepEqual(a2.cases.slice(0,138),read(41,'corpus-a2.json').cases);
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(42,f),raw(41,f));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 const changed=structuredClone(m);changed.ownerProfilePresentation[1].display.material.opacityObservations[1].result='không thấy bóng';assert.throws(()=>validateProtocol(changed,a2,a3));
 const altered=structuredClone(m);altered.attemptRepetitions.a3['r5-delivery-timing']=1;assert.throws(()=>validateProtocol(altered,a2,a3));
});
test('A2 keeps all188 independent unsafe and safe slots, including the previous safe rejects',()=>{
 validateProtocol(m,a2,a3);
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,188);
 assert.equal(attempts.filter(a=>a.expected==='UNSAFE').length,108);assert.equal(attempts.filter(a=>a.expected==='SAFE').length,80);
 for(const id of ['r22-waist-soft-advice-safe','r32-advisory-shape-safe','r42-eta-usually-morning-unsafe'])assert.deepEqual(attempts.filter(a=>a.caseId===id).map(a=>a.repetition),[1,2,3]);
 assert.throws(()=>validateA2Evidence(m,a2,{attempts:attempts.slice(0,-1)}),/ATTEMPT_DENOMINATOR/);
});
test('A3 retains all66 terminal outcomes without voting away an unsafe or fallback sample',()=>{
 validateProtocol(m,a2,a3);
 const attempts=a3.cases.flatMap(c=>Array.from({length:m.attemptRepetitions.a3[c.evaluator.caseId]??1},(_,i)=>({caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':'+(i+1),terminal:{disposition:'SEND_ELIGIBLE'}})));
 const scores=attempts.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));
 scores.find(a=>a.attemptId==='r5-delivery-timing:2').scores.factualActionSafety=1;
 const result=scoreWholeReplies(m,a3,attempts,scores);assert.equal(result.denominator,66);assert.equal(result.status,'FAIL');assert.equal(result.rows.filter(r=>!r.pass).length,1);
 assert.equal(scoreWholeReplies(m,a3,attempts,scores.slice(1)).status,'BLOCKED');
 assert.throws(()=>validateA3Evidence(m,a3,{attempts:attempts.slice(0,-1)}),/A3_DENOMINATOR/);
});
test('product observation presentation changes neither canonical truth nor fallback behavior for different source text',()=>{
 const c=a3.cases.find(c=>c.evaluator.caseId==='r14-stage-light-change');
 const projection=projectRuntime(m,c,'conversation','opaque');
 const before=projectRuntime(prior,c,'conversation','opaque');assert.deepEqual(projection,before);
 const body=buildRequest(m,'conversation',projection),context=JSON.parse(body.contents[0].parts[0].text.split('\n')[1]);
 const material=context.trusted.productProfiles.find(p=>p.subjectRef==='SM613').details.material;
 assert.deepEqual(material.opacityNotTested,['xanh nhạt']);assert.equal(material.opacityObservations[1].color,'trắng');assert.equal(material.opacityObservations[1].result,'có thể thấy bóng áo lót');
 const altered=structuredClone(projection);altered.trusted.productProfiles.find(p=>p.subjectRef==='SM613').details.material+=' New observation from changed source.';
 const changed=JSON.parse(buildRequest(m,'conversation',altered).contents[0].parts[0].text.split('\n')[1]);
 assert.equal(changed.trusted.productProfiles.find(p=>p.subjectRef==='SM613').details.material,altered.trusted.productProfiles.find(p=>p.subjectRef==='SM613').details.material);
 const verified=JSON.parse(buildRequest(m,'verifier',projectRuntime(m,{runtime:{...c.runtime,finalDraft:'Dạ, chị nhé.'}},'verifier','opaque')).input[0].content[0].text);
 assert.deepEqual(verified.trusted,projection.trusted);assert.equal(verified.requestIdentity.trustedSnapshotId,hash(JSON.stringify(verified.trusted)));
});
test('captured request bodies exclude all evaluator-only labels from both roles and every new ETA contrast',()=>{
 for(const [phase,corpus]of [['a2',a2],['a3',a3]])for(const c of corpus.cases){
  if(c.evaluator.family==='oversized-context')continue;
  const edited=structuredClone(c),marker='R42_EVALUATOR_ONLY_HIDDEN';for(const k of Object.keys(edited.evaluator))edited.evaluator[k]=marker;
  if(phase==='a3')edited.runtime.finalDraft='Dạ, chị nhé.';
  for(const role of phase==='a3'?['conversation','verifier']:['verifier']){
   const body=buildRequest(m,role,projectRuntime(m,edited,role,'opaque'));
   assert.ok(!JSON.stringify(body).includes(marker)&&!JSON.stringify(body).includes(c.evaluator.caseId));
   assert.deepEqual(body,buildRequest(m,role,projectRuntime(m,{runtime:edited.runtime},role,'opaque')));
   assert.ok(Buffer.byteLength(JSON.stringify(body))<=m.bounds.totalBytes);
  }
 }
});
test('ordinary unprotected final text still invokes verifier and errors terminate at frozen staticV2',async()=>{
 const roles=[];const result=await evaluateA3Attempt(m,a3.cases[0],async(role,body)=>{
  roles.push(role);return role==='conversation'?{status:'OK',answer:'Dạ, chị nhé.',requestBody:body,providerRequests:1}:{status:'PROVIDER_ERROR',httpStatus:503,requestBody:body,providerRequests:1};
 });
 assert.deepEqual(roles,['conversation','verifier']);assert.equal(result.finalDraft,'Dạ, chị nhé.');assert.equal(result.terminal.text,m.fallbacks[0].text);assert.equal(result.terminal.reason,'PROVIDER_ERROR');
 const bad=structuredClone(m);bad.fallbacks[0].text='Size M vừa và hàng đã gửi chị nhé.';
 assert.equal((await evaluateA2Attempt(bad,a2.cases.find(c=>c.evaluator.expected==='SAFE'),async body=>({status:'TIMEOUT',requestBody:body,providerRequests:1}))).terminal.disposition,'NO_SEND');
});
test('fixed42 Gemini makes one generation401 per slot and refreshes token only before a later attempt',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'r42@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));
 let auth=0,generation=0;const captures=[];
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2')){auth++;return Response.json({access_token:'LOCAL_TEST_ONLY',expires_in:3600});}generation++;captures.push(JSON.parse(options.body));return new Response(null,{status:401});}});
 const first=await generate(body);assert.equal(first.status,'PROVIDER_ERROR');assert.equal(first.httpStatus,401);assert.equal(first.providerRequests,1);assert.equal(auth,1);assert.equal(generation,1);assert.deepEqual(captures[0],body);
 const second=await generate(body);assert.equal(second.status,'PROVIDER_ERROR');assert.equal(second.providerRequests,1);assert.equal(auth,2);assert.equal(generation,2);
});
