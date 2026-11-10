import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(30,'manifest.json'),a2=read(30,'corpus-a2.json'),a3=read(30,'corpus-a3.json'),control=read(28,'manifest.json');

test('fixed30 registers only readable owner presentation and retains the complete round28 control',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'30'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:45,a3:42});
 assert.equal(m.conversationContextFormat,'READABLE_FACTS_V1');
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json'])assert.equal(readFileSync(new URL('./round-30/'+f,import.meta.url),'utf8'),readFileSync(new URL('./round-28/'+f,import.meta.url),'utf8'));
 for(const key of ['models','prompts','promptHashes','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','repetitions','retries','repair','maxGenerationRequestsPerAttempt','unsafeRule','usability','scoring','measurements'])assert.deepEqual(m[key],control[key]);
});

test('recomputed hashes cannot authorize changing retained truth, history or evaluation labels',()=>{
 for(const [name,corpus,other,index] of [['a2',a2,a3,119],['a3',a3,a2,0]])for(const mutate of [c=>{c.cases[index].runtime.latestCustomerMessage='Changed current need';},c=>{c.cases[index].evaluator.reason='Changed score interpretation';}]){
  const changed=structuredClone(corpus),manifest=structuredClone(m);mutate(changed);manifest.corpusHashes[name]=hash(JSON.stringify(changed));
  assert.throws(()=>validateProtocol(manifest,name==='a2'?changed:other,name==='a3'?changed:other),/ROUND30_RETAINED/);
 }
});

test('the one-variable run cannot accept a second prompt, fallback or quality-bar treatment',()=>{
 for(const mutate of [v=>{v.prompts.conversation+=' Changed advice';v.promptHashes.conversation=hash(v.prompts.conversation);},v=>{v.usability.maximumTerminalFailureRate=.15;},v=>{v.scoring.minimumFamilyPassRate=.8;},v=>{v.bounds.totalBytes+=1;},v=>{v.fallbacks[0].text='Dạ chị.';v.fallbacks[0].hash=hash(v.fallbacks[0].text);}]){
  const changed=structuredClone(m);mutate(changed);
  assert.throws(()=>validateProtocol(changed,a2,a3),/ROUND30_CONTROL_CONFIGURATION/);
 }
 const historical={...control,conversationContextFormat:m.conversationContextFormat};
 assert.throws(()=>validateProtocol(historical,read(28,'corpus-a2.json'),read(28,'corpus-a3.json')),/UNREGISTERED_CONTEXT_PRESENTATION/);
 assert.throws(()=>validateProtocol({...m,conversationContextFormat:undefined},a2,a3),/UNREGISTERED_CONTEXT_PRESENTATION/);
});

test('all42 readable captures exclude evaluator labels and every surviving owner draft reaches unchanged verifier',async()=>{
 const marker='ROUND30_EVALUATOR_ONLY';
 for(const original of a3.cases){
  const fixture=structuredClone(original),captured=[];
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
  fixture.reviewFinding=marker;fixture.runtime.trusted.state.rubric=marker;
  const attempt=await evaluateA3Attempt(m,fixture,async(role,body)=>{
   captured.push({role,body});
   return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};
  });
  assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);
  assert.equal(attempt.finalDraft,'Dạ chị.');assert.equal(attempt.terminal.disposition,'FALLBACK');
  assert.match(captured[0].body.contents[0].parts[0].text,/^# Context tư vấn — READABLE_FACTS_V1/);
  const identityLine=captured[0].body.contents[0].parts[0].text.split('\n').find(x=>x.startsWith('Identity: '));
  assert.equal(attempt.conversationRequestId,JSON.parse(identityLine.slice('Identity: '.length)).requestId);
  const runtime={runtime:{...fixture.runtime,finalDraft:attempt.finalDraft}};
  const expected=buildRequest(control,'verifier',projectRuntime(control,runtime,'verifier',attempt.verification.binding.requestId));
  assert.deepEqual(captured[1].body,expected);
  for(const {body} of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding'])assert.ok(!JSON.stringify(body).includes(label),label);
 }
});
