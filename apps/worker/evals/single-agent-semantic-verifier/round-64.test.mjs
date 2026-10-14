import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt} from './run-a2.mjs';
import {runCodexModel} from './codex-inference.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {generateKeyPairSync} from 'node:crypto';
import {request as httpRequest} from 'node:http';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8');
const m=JSON.parse(raw(64,'manifest.json')),old=JSON.parse(raw(63,'manifest.json')),a2=JSON.parse(raw(64,'corpus-a2.json')),a3=JSON.parse(raw(64,'corpus-a3.json')),plan=JSON.parse(raw(64,'a2-shard-plan.json'));

test('round64 admits only reviewed prompts with identical corpus, policy, authority and config',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:108,a2Safe:79,a3:42});
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','scoring','fallbacks','terminal','sourcePolicy','attemptRepetitions'])assert.deepEqual(m[key],old[key]);
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json','dialogue-edits.json','legacy-policy-source-view.json','label-review.json','regression-cohort.json'])assert.equal(raw(64,f),raw(63,f));
 for(const role of ['verifier','conversation']){const changed=structuredClone(m);changed.prompts[role]+=' changed';changed.promptHashes[role]=hash(changed.prompts[role]);assert.throws(()=>validateProtocol(changed,a2,a3));}
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'64'}}),/FROZEN_PROTOCOL_VALID/);
});

test('full351 slots partition117each; duplicate allocations or altered registrations fail closed',async()=>{
 const {prepareShard}=await import('./run-a2-shards.mjs');
 const ids=registerA2Attempts(m,a2).map(a=>a.attemptId);assert.equal(ids.length,351);
 assert.deepEqual(plan.registeredAttemptIds,ids);assert.equal(new Set(plan.shards.flatMap(s=>s.attemptIds)).size,351);
 for(let i=0;i<3;i++)assert.equal(prepareShard(m,a2,plan,'a'.repeat(40),i).shard.attemptIds.length,117);
 const bad=structuredClone(plan);bad.shards[1].attemptIds[0]=bad.shards[0].attemptIds[0];assert.throws(()=>prepareShard(m,a2,bad,'a'.repeat(40),1));
 assert.throws(()=>prepareShard(m,a2,plan,'not-a-source',0));assert.throws(()=>prepareShard(m,a2,plan,'a'.repeat(40),3));
});

test('all surviving fixture wire captures exclude evaluator labels and preserve exact draft and sources',async()=>{
 const marker='ROUND64_PRIVATE_EVALUATOR_SENTINEL';let requests=0;
 for(const original of a2.cases){const fixture=structuredClone(original);for(const k of Object.keys(fixture.evaluator))fixture.evaluator[k]=marker;fixture.labelReview=marker;
  const result=await evaluateA2Attempt(m,fixture,request=>runCodexModel(m,'verifier',request,{
   runClient:base=>new Promise((resolve,reject)=>{const req=httpRequest(base+'/responses',{method:'POST',agent:false,headers:{authorization:'LOCAL_SYNTHETIC_AUTH',connection:'close'}},res=>{res.resume();res.on('end',resolve);res.on('error',reject);});req.on('error',reject);req.end('{}');}),
   upstreamFetch:async(url,options)=>{requests++;assert.deepEqual(JSON.parse(options.body),request);assert.ok(!options.body.includes(marker));
    for(const key of ['caseId','split','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric'])assert.ok(!options.body.includes('"'+key+'"'));
    const p=JSON.parse(request.input[0].content[0].text);assert.equal(p.untrusted.finalDraft,original.runtime.finalDraft);assert.equal(p.untrusted.latestCustomerMessage,original.runtime.latestCustomerMessage);
    assert.deepEqual(p,projectRuntime(m,original,'verifier',p.requestIdentity.requestId));assert.deepEqual(request.tools,[]);
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',model:m.models.verifier.model,output:[{type:'message',content:[{type:'output_text',text:'{"verdict":"PASS","violations":[]}'}]}]}})+'\n\n',{status:200});}
  }));if(result.precheck==='SURVIVED'){assert.equal(result.provider.status,'OK',JSON.stringify({caseId:original.evaluator.caseId,error:result.provider.error,errorStage:result.provider.errorStage,clientRequests:result.provider.clientRequests,providerRequests:result.provider.providerRequests}));assert.equal(result.provider.providerRequests,1);}else assert.equal(result.provider,null);
 }assert.ok(requests>170);
 for(const fixture of a3.cases){const candidate=buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque')),control=buildRequest(old,'conversation',projectRuntime(old,fixture,'conversation','opaque'));assert.deepEqual(candidate,{...control,systemInstruction:{parts:[{text:m.prompts.conversation}]}});}
});

test('round64 owner native context retains existing one-request Gemini adapter semantics',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const request=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));let generations=0;
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});generations++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});}});
 const result=await run(request);assert.equal(result.status,'OK');assert.equal(generations,1);assert.equal(result.providerRequests,1);
});

test('dispatch start persists before generation, full diagnostic retains unsafe PASS and never retries',async()=>{
 const {prepareShard,runShard}=await import('./run-a2-shards.mjs');const e=prepareShard(m,a2,plan,'a'.repeat(40),0);let calls=0,saved;
 await runShard(m,a2,e,async request=>{calls++;const current=e.attempts.find(a=>a.invocationStartedAt&&!a.terminal);assert.ok(current);assert.ok(saved.attempts.find(a=>a.attemptId===current.attemptId).invocationStartedAt);
  return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1,clientRequests:1,requestBody:request,latencyMs:0,usage:null};
 },{save:()=>{saved=structuredClone(e);},checkSource:()=>{},log:()=>{}});
 assert.equal(e.attempts.filter(a=>a.terminal).length,117);assert.ok(calls>100);assert.equal(e.summary.status,'FAIL');assert.ok(e.summary.unsafeSendEligibleFalsePassCount>0);
 let rerun=0;await assert.rejects(()=>runShard(m,a2,e,async()=>{rerun++;},{save:()=>{},checkSource:()=>{},log:()=>{}}),/ALREADY/);assert.equal(rerun,0);
});

test('capacity outcome remains in denominator and stops peer dispatch without extra generation',async()=>{
 const {prepareShard,runShard}=await import('./run-a2-shards.mjs');const e=prepareShard(m,a2,plan,'a'.repeat(40),1);let calls=0;
 await runShard(m,a2,e,async request=>{calls++;return {status:'PROVIDER_ERROR',providerErrorCode:'usage_limit_reached',httpStatus:429,errorStage:'GENERATION_HTTP',providerRequests:1,requestBody:request};},{save:()=>{},checkSource:()=>{},log:()=>{}});
 assert.equal(calls,1);assert.equal(e.attempts.filter(a=>a.terminal).length,1);assert.equal(e.shard.capacityBlock.providerErrorCode,'usage_limit_reached');assert.equal(e.summary.registeredDenominator,351);
 const peer=prepareShard(m,a2,plan,'a'.repeat(40),2);await runShard(m,a2,peer,async()=>{calls++;},{save:()=>{},checkSource:()=>{},peerCapacity:()=>e.shard.capacityBlock,log:()=>{}});assert.equal(calls,1);assert.ok(peer.attempts.every(a=>a.terminal===null));
});

test('three complete shards merge every slot once, reject altered peer slots and preserve FAIL',()=>{
 const source=`import assert from 'node:assert/strict';import {loadInputs} from ${JSON.stringify(new URL('./run-a2.mjs',import.meta.url).href)};import {readFileSync} from 'node:fs';import {prepareShard,runShard,mergeShards} from ${JSON.stringify(new URL('./run-a2-shards.mjs',import.meta.url).href)};const {manifest:m,a2}=loadInputs(),p=JSON.parse(readFileSync(${JSON.stringify(fileURLToPath(new URL('./round-64/a2-shard-plan.json',import.meta.url)))},'utf8'));const shards=[];for(let i=0;i<3;i++){const e=prepareShard(m,a2,p,'a'.repeat(40),i);await runShard(m,a2,e,async r=>({status:'OK',answer:'{"verdict":"PASS","violations":[]}',requestBody:r,providerRequests:1,clientRequests:1,latencyMs:0,usage:null}),{save:()=>{},checkSource:()=>{},log:()=>{}});shards.push(e);}const combined=mergeShards(m,a2,p,shards,'a'.repeat(40));assert.equal(combined.summary.executedDenominator,351);assert.equal(combined.summary.status,'FAIL');assert.equal(new Set(combined.attempts.map(a=>a.attemptId)).size,351);const bad=structuredClone(shards);bad[1].attempts[0].terminal={disposition:'SEND_ELIGIBLE'};assert.throws(()=>mergeShards(m,a2,p,bad,'a'.repeat(40)));assert.throws(()=>mergeShards(m,a2,p,[shards[0],shards[0],shards[2]],'a'.repeat(40)));console.log('MERGE_ACCOUNTING_GREEN');`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'64'}}),/MERGE_ACCOUNTING_GREEN/);
});

test('interleaved capacity evidence validates its own prefix and merges retained error without global-prefix assumption',()=>{
 const source=`import assert from 'node:assert/strict';import {loadInputs,validateA2Evidence} from ${JSON.stringify(new URL('./run-a2.mjs',import.meta.url).href)};import {readFileSync} from 'node:fs';import {prepareShard,runShard,mergeShards} from ${JSON.stringify(new URL('./run-a2-shards.mjs',import.meta.url).href)};const {manifest:m,a2}=loadInputs(),p=JSON.parse(readFileSync(${JSON.stringify(fileURLToPath(new URL('./round-64/a2-shard-plan.json',import.meta.url)))},'utf8'));const e=prepareShard(m,a2,p,'a'.repeat(40),1);await runShard(m,a2,e,async r=>({status:'PROVIDER_ERROR',providerErrorCode:'usage_limit_reached',httpStatus:429,errorStage:'GENERATION_HTTP',requestBody:r,providerRequests:1,clientRequests:1,latencyMs:0,usage:null}),{save:()=>{},checkSource:()=>{},log:()=>{}});assert.doesNotThrow(()=>validateA2Evidence(m,a2,e));const block=e.shard.capacityBlock;assert.equal(block.providerErrorCode,'usage_limit_reached');const shards=[e];for(const i of [0,2]){const peer=prepareShard(m,a2,p,'a'.repeat(40),i);await runShard(m,a2,peer,async()=>{throw Error('EXTRA_GENERATION');},{save:()=>{},checkSource:()=>{},peerCapacity:()=>block,log:()=>{}});shards.push(peer);}const merged=mergeShards(m,a2,p,shards,'a'.repeat(40));assert.equal(merged.summary.executedDenominator,1);assert.equal(merged.summary.unexecuted,350);assert.equal(merged.summary.status,'BLOCKED');assert.equal(merged.operational.providerRequests,1);assert.equal(merged.operational.errorCount,1);const changed=structuredClone(shards);changed[0].shard.capacityBlock.attemptId='unassigned';assert.throws(()=>mergeShards(m,a2,p,changed,'a'.repeat(40)));console.log('SHARD_CAPACITY_ACCOUNTING_GREEN');`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'64'}}),/SHARD_CAPACITY_ACCOUNTING_GREEN/);
});
