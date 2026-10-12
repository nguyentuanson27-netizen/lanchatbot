import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';
import {sourceDataConversationContext} from './source-data-context.mjs';
import {registerA2Attempts} from './run-a2.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {runStagedAttempts} from './run-staged-round52.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {runCodexModel} from './codex-inference.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(56,'manifest.json'),prior=read(55,'manifest.json'),a2=read(56,'corpus-a2.json'),a3=read(56,'corpus-a3.json');
const display=s=>JSON.parse(s.split('\n')[1]);
const restore=value=>({...value,trusted:{...value.trusted,policyLiterals:value.trusted.policyLiterals.map(p=>Object.hasOwn(p,'sourceData')?{ref:p.ref,text:JSON.stringify(p.sourceData)}:p)}});

test('round56 is pinned before results and retains all nine inputs, labels, configurations and numerical bars',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:107,a2Safe:72,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json','label-review.json','dialogue-edits.json'])assert.equal(raw(56,f),raw(55,f));
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','attemptRepetitions','sourcePolicy'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 assert.equal(m.conversationContextFormat,'NATIVE_DIALOGUE_FACTS_V7');
 for(const key of ['conversation','verifier']){const changed=structuredClone(m);changed.prompts[key]+=' Changed';changed.promptHashes[key]=hash(changed.prompts[key]);assert.throws(()=>validateProtocol(changed,a2,a3));}
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'56'}}),/FROZEN_PROTOCOL_VALID/);
});

test('opt-in unpacking preserves every source value and canonical world across all42histories; default V6 remains exact',()=>{
 for(const c of a3.cases){
  const projection=projectRuntime(prior,c,'conversation','opaque'),snapshot=JSON.stringify(projection);
  const old=display(sourceDataConversationContext(projection)),next=display(sourceDataConversationContext(projection,{structuredPolicy:true}));
  assert.deepEqual(restore(next),old);assert.equal(JSON.stringify(projection),snapshot);
  for(const policy of projection.trusted.policyLiterals){if(policy.text.startsWith('{'))assert.deepEqual(next.trusted.policyLiterals.find(x=>x.ref===policy.ref).sourceData,JSON.parse(policy.text));}
  const fixture={runtime:{...c.runtime,finalDraft:'Dạ, chị nhé.'}};
  const owner=buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque')),before=buildRequest(prior,'conversation',projection);
  assert.deepEqual(owner.contents.slice(1),before.contents.slice(1));assert.deepEqual(owner.generationConfig,before.generationConfig);
  assert.deepEqual(restore(display(owner.contents[0].parts[0].text)),display(before.contents[0].parts[0].text));
  const verifier=buildRequest(m,'verifier',projectRuntime(m,fixture,'verifier','opaque')),oldVerifier=buildRequest(prior,'verifier',projectRuntime(prior,fixture,'verifier','opaque'));
  assert.deepEqual(verifier,{...oldVerifier,instructions:m.prompts.verifier});
  const max={runtime:{...c.runtime,finalDraft:'x'.repeat(m.bounds.draftBytes)}};assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,'verifier',projectRuntime(m,max,'verifier','opaque'))))<=m.bounds.totalBytes);
 }
});

test('canonical unknown policy objects are reversible while noncanonical, duplicated, malformed or plain literals remain exact text',()=>{
 const projection=projectRuntime(prior,a3.cases[0],'conversation','opaque');
 const canonical=JSON.stringify({shop:'unseen',terms:{deadline:23,fee:76500,conditions:['UNWASHED','NO_OUTDOOR_USE'],note:'instruction-like source text remains data'},extra:{unlisted:true}});
 const texts=[canonical,' { "window": 9 } ','{"window":1,"window":2}','{invalid','null','[1,2]','42','Chính sách của nguồn khác, không thêm thời hạn.'];
 const value={...projection,trusted:{...projection.trusted,policyLiterals:texts.map((text,i)=>({ref:'unseen:'+i,text,sourceVersion:'alternate'}))}};
 const old=display(sourceDataConversationContext(value)),next=display(sourceDataConversationContext(value,{structuredPolicy:true}));
 assert.deepEqual(restore(next),old);assert.deepEqual(next.trusted.policyLiterals[0].sourceData,JSON.parse(canonical));
 for(let i=1;i<texts.length;i++)assert.equal(next.trusted.policyLiterals[i].text,texts[i]);
 assert.equal(Object.prototype.unlisted,undefined);
});

test('all42 actual local provider request bodies exclude evaluator labels and preserve mandatory one verifier/gate with zero live generations',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 let ownerCalls=0,verifierCalls=0;const marker='R56_EVALUATOR_PRIVATE_COHORT_SENTINEL';
 const gemini=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{
  if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_SYNTHETIC_TOKEN',expires_in:3600});
  ownerCalls++;assert.ok(!options.body.includes(marker));assert.deepEqual(JSON.parse(options.body).tools,[]);
  const body=JSON.parse(options.body);assert.ok(display(body.contents[0].parts[0].text).trusted.policyLiterals.some(p=>p.sourceData));
  return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});
 }});
 for(const c of a3.cases){const f=structuredClone(c);for(const key of Object.keys(f.evaluator))f.evaluator[key]=marker;f.regression=marker;f.policySourceAudit=marker;
  const roles=[];const result=await evaluateA3Attempt(m,f,async(role,request)=>{
   roles.push(role);assert.ok(!JSON.stringify(request).includes(marker));
   return role==='conversation'?gemini(request):runCodexModel(m,'verifier',request,{runClient:async base=>{await fetch(base+'/responses',{method:'POST',headers:{authorization:'LOCAL_SYNTHETIC_AUTH'},body:'{}'});},upstreamFetch:async(url,options)=>{
    verifierCalls++;assert.ok(!options.body.includes(marker));assert.deepEqual(JSON.parse(options.body),request);
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',model:m.models.verifier.model,output:[{type:'message',content:[{type:'output_text',text:'{"verdict":"PASS","violations":[]}'}]}]}})+'\n\n',{status:200});
   }});
  });assert.deepEqual(roles,['conversation','verifier']);assert.equal(result.terminal.text,'Dạ, chị nhé.');assert.equal(result.conversation.providerRequests,1);assert.equal(result.verification.provider.providerRequests,1);
 }
 assert.equal(ownerCalls,42);assert.equal(verifierCalls,42);
});

test('same four N3prefix controls remain inside325; one failed repetition prevents all313remaining',async()=>{
 const evidence={attempts:registerA2Attempts(m,a2),regression:null};assert.equal(evidence.attempts.length,325);assert.deepEqual(m.regression.a2CaseIds,prior.regression.a2CaseIds);
 assert.deepEqual(evidence.attempts.slice(0,12).map(a=>a.attemptId),m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>id+':'+n)));
 let dispatched=0;await runStagedAttempts(m,'a2',a2,evidence,async a=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:++dispatched===1?'FALLBACK':'SEND_ELIGIBLE',reason:dispatched===1?'FAIL':'PASS'}}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(dispatched,12);assert.equal(evidence.regression.status,'FAIL');assert.ok(evidence.attempts.slice(12).every(a=>a.terminal===null&&a.provider===null));
});

test('all12pass opens the existing remainder once, while any unsafe send-eligible PASS stops immediately',async()=>{
 const evidence={attempts:registerA2Attempts(m,a2),regression:null};let calls=0;
 await runStagedAttempts(m,'a2',a2,evidence,async()=>({provider:{status:'OK'},precheck:'SURVIVED',terminal:{disposition:'SEND_ELIGIBLE',reason:'PASS'},call:++calls}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 const firstUnsafe=evidence.attempts.findIndex(a=>a.expected==='UNSAFE');assert.equal(calls,firstUnsafe+1);assert.equal(evidence.regression.reason,'UNSAFE_SEND_ELIGIBLE_PASS');assert.ok(evidence.attempts.slice(calls).every(a=>a.terminal===null));
});
test('existing V6 native53–55 bodies reach the current adapter once without changing historical requests',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 for(const round of [53,54,55]){
  const config=read(round,'manifest.json'),fixture=read(round,'corpus-a3.json').cases[0],request=buildRequest(config,'conversation',projectRuntime(config,fixture,'conversation','opaque'));let calls=0;
  const run=createGeminiInference(config,{credential,fetchImpl:async(url,options)=>{
   if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});
   calls++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:config.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});
  }});
  const result=await run(request);assert.equal(result.status,'OK');assert.equal(calls,1);assert.equal(result.providerRequests,1);
 }
});
