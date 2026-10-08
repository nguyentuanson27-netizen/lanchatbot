import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {runCodexModel} from './codex-inference.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(17,'manifest.json'),a2=read(17,'corpus-a2.json'),a3=read(17,'corpus-a3.json'),old=read(16,'manifest.json');

test('Round17 permits only approved owner medium and retains every frozen input and quality bar',()=>{
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','context-preparation.json','size-inputs.json','quote-inputs.json','reference-replies.json'])
  assert.deepEqual(readFileSync(new URL('./round-17/'+f,import.meta.url)),readFileSync(new URL('./round-16/'+f,import.meta.url)));
 for(const key of ['prompts','promptHashes','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions','scoring'])assert.deepEqual(m[key],old[key]);
 assert.deepEqual(m.models.verifier,old.models.verifier);
 assert.deepEqual(m.models.conversation,{...old.models.verifier,effort:'medium',generationConfig:{...old.models.verifier.generationConfig,reasoningEffort:'medium'}});
 const output=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'17'}});
 assert.match(output,/FROZEN_PROTOCOL_VALID/);assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:57,a2Safe:27,a3:42});
 for(const role of ['conversation','verifier']){const changed=structuredClone(m);changed.models[role].effort=role==='conversation'?'high':'medium';assert.throws(()=>validateProtocol(changed,a2,a3),/MODEL_IDENTITY/);}
 const changed=structuredClone(a3);changed.cases[0].runtime.latestCustomerMessage+='altered';
 const manifest=structuredClone(m);manifest.corpusHashes.a3=hash(JSON.stringify(changed));
 assert.throws(()=>validateProtocol(manifest,a2,changed),/ROUND17_RETAINED/);
});

test('Round17 both role requests remain within bounds with current fit bindings intact',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const p=projectRuntime(m,f,role,'opaque-request');assert.deepEqual(p.trusted,c.runtime.trusted);
  assert.deepEqual(p.untrusted.recentAcceptedDialogue,c.runtime.history);
  assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  const body=buildRequest(m,role,p);assert.equal(body.reasoning.effort,role==='conversation'?'medium':'high');
  assert.ok(Buffer.byteLength(JSON.stringify(body))<=m.bounds.totalBytes);
 }
});

test('Round17 captured requests exclude evaluator labels and verify every surviving owner draft',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND17_OFFLINE_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];const result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 assert.deepEqual(captured.map(v=>v.reasoning.effort),['medium','high']);
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','destinationEstablished','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});

test('Codex launch and forwarded body use the frozen effort independently for both roles',async()=>{
 for(const role of ['conversation','verifier']){
  const request=buildRequest(m,role,projectRuntime(m,a2.cases[1],role,'opaque'));
  let launchArgs,captured;
  const result=await runCodexModel(m,role,request,{
   spawnClient(_binary,args){launchArgs=args;const child=new EventEmitter();child.kill=()=>{};
    const base=args.find(v=>v.startsWith('model_providers.c3_checkpoint_a=')).match(/base_url="([^"]+)"/)[1];
    queueMicrotask(async()=>{await fetch(base+'/responses',{method:'POST',headers:{authorization:'synthetic-local-only'},body:'{}'});child.emit('exit',0);});
    return child;},
   upstreamFetch:async(_url,init)=>{captured=JSON.parse(init.body);return new Response('data: '+JSON.stringify({type:'response.completed',response:{model:m.models[role].model,output:[{type:'message',content:[{type:'output_text',text:'Dạ chị.'}]}]}})+'\n\n',{status:200});}
  });
  assert.equal(result.status,'OK');assert.equal(result.providerRequests,1);
  assert.deepEqual(captured,request);
  assert.ok(launchArgs?.includes('model_reasoning_effort="'+m.models[role].effort+'"'));
 }
});

test('Codex rejects a request or generation config with effort different from the frozen role',async()=>{
 const request=buildRequest(m,'conversation',projectRuntime(m,a2.cases[1],'conversation','opaque'));
 const dependencies={runClient:async()=>{throw new Error('must not launch');}};
 await assert.rejects(runCodexModel(m,'conversation',{...request,reasoning:{effort:'high'}},dependencies),/FROZEN_REQUEST/);
 const changed=structuredClone(m);changed.models.conversation.generationConfig.reasoningEffort='high';
 await assert.rejects(runCodexModel(changed,'conversation',request,dependencies),/FROZEN_REQUEST/);
});

test('installed Codex owner medium forwards the exact request to local stub without generation',
 {skip:process.env.C3_TEST_CODEX_TRANSPORT!=='1'},async()=>{
  const request=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));let captured;
  const result=await runCodexModel(m,'conversation',request,{upstreamFetch:async(_url,init)=>{captured=JSON.parse(init.body);return new Response('stub',{status:503});}});
  assert.deepEqual(captured,request);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerRequests,1);assert.equal(result.httpStatus,503);
 });
