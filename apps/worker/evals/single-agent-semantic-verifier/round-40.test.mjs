import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
const raw=(n,f)=>readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8');
const read=(n,f)=>JSON.parse(raw(n,f));
const m=read(40,'manifest.json'),old=read(39,'manifest.json'),a2=read(40,'corpus-a2.json'),a3=read(40,'corpus-a3.json');
const visible=body=>JSON.parse(body.contents[0].parts[0].text.slice(body.contents[0].parts[0].text.indexOf('\n')+1)).trusted;
test('fixed40 protocol freezes prospective review without changing canonical world, verifier, configuration or numeric bars',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'40'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const f of ['corpus-a2.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(40,f),raw(39,f));
 const prior=read(39,'corpus-a3.json');assert.deepEqual(a3.cases.map(c=>c.runtime),prior.cases.map(c=>c.runtime));
 assert.deepEqual(a3.cases.filter(c=>!m.cohorts.revisedEvaluatorCaseIds.includes(c.evaluator.caseId)),prior.cases.filter(c=>!m.cohorts.revisedEvaluatorCaseIds.includes(c.evaluator.caseId)));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','terminal','fallbacks','usability','measurements'])assert.deepEqual(m[k],old[k]);
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate'])assert.deepEqual(m.scoring[k],old.scoring[k]);
 assert.equal(m.prompts.verifier,old.prompts.verifier);
 for(const change of [v=>v.ownerProfilePresentation[0].display.material+=' unsupported',v=>v.scoring.minimumFamilyPassRate=.5,v=>v.adoptedA2RunSourceSha='a'.repeat(40)]){
  const edited=structuredClone(m);change(edited);assert.throws(()=>validateProtocol(edited,a2,a3),/ROUND40|CONSULTATION_BAR/);
 }
});
test('owner sees bounded product evidence presentation; canonical verifier and all other business values remain exact',()=>{
 let applied=0;
 for(const c of a3.cases){
  const projection=projectRuntime(old,c,'conversation','opaque');
  assert.deepEqual(projectRuntime(m,c,'conversation','opaque'),projection);
  const body=buildRequest(m,'conversation',projection),previous=visible(buildRequest(old,'conversation',projection)),display=visible(body),expected=structuredClone(previous);
  for(const profile of expected.productProfiles??[]){
   const row=m.ownerProfilePresentation.find(p=>p.subjectRef===profile.subjectRef&&p.source.material===profile.details.material&&p.source.limitations===profile.details.limitations);
   if(row){Object.assign(profile.details,row.display);applied++;}
  }
  assert.deepEqual(display,expected);
  assert.deepEqual(body.contents.slice(1),buildRequest(old,'conversation',projection).contents.slice(1));
  const fixture=structuredClone(c);fixture.runtime.finalDraft='Dạ, chị nhé.';
  assert.deepEqual(buildRequest(m,'verifier',projectRuntime(m,fixture,'verifier','opaque')),buildRequest(old,'verifier',projectRuntime(old,fixture,'verifier','opaque')));
 }
 assert.ok(applied>0,'The presentation must actually apply to its frozen source');
});
test('changed source never receives the old product presentation',()=>{
 const c=structuredClone(a3.cases[0]),profile=c.runtime.trusted.productProfiles.find(p=>p.subjectRef==='ST411');
 profile.details.material='Nguồn mới: không có kết quả thử độ nhăn.';
 const projection=projectRuntime(old,c,'conversation','opaque');
 assert.deepEqual(visible(buildRequest(m,'conversation',projection)),visible(buildRequest(old,'conversation',projection)));
});
test('all42 captured provider requests exclude evaluator labels and every surviving draft still invokes verifier',async()=>{
 for(const original of a3.cases){
  const fixture=structuredClone(original);for(const k of Object.keys(fixture.evaluator))fixture.evaluator[k]='R40_EVALUATOR_ONLY_SECRET_MARKER';
  const captured=[];
  const result=await evaluateA3Attempt(m,fixture,async(role,body)=>{
   captured.push({role,body});
   if(role==='conversation')return{status:'OK',answer:'Dạ, chị nhé.',requestBody:body,providerRequests:1};
   const identity=JSON.parse(body.input[0].content[0].text).requestIdentity;
   return{status:'OK',answer:JSON.stringify({...identity,verdict:'PASS',violations:[]}),providerRequests:1,requestBody:body};
  });
  assert.deepEqual(captured.map(v=>v.role),['conversation','verifier']);
  assert.ok(captured.every(v=>!JSON.stringify(v.body).includes('R40_EVALUATOR_ONLY_SECRET_MARKER')&&!JSON.stringify(v.body).includes(original.evaluator.caseId)));
  assert.equal(result.finalDraft,'Dạ, chị nhé.');
 }
});
test('fixed40 native Gemini request makes one generation on429 without retry or altered history',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'r40@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(old,'conversation',projectRuntime(old,a3.cases[0],'conversation','opaque'));body.systemInstruction.parts[0].text=m.prompts.conversation;
 let calls=0,captured;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'TEST_ONLY',expires_in:3600});calls++;captured=JSON.parse(options.body);return new Response(null,{status:429});}});
 const r=await generate(body);assert.equal(calls,1);assert.deepEqual(captured,body);assert.equal(r.providerRequests,1);assert.equal(r.status,'PROVIDER_ERROR');assert.equal(r.httpStatus,429);
});

