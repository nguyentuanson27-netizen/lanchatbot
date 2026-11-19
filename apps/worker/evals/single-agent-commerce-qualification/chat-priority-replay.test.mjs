import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {claimDiagnostic,diagnosticSlots,diagnosticRepetitions,diagnosticScope} from './diagnostic.mjs';
import {CHAT_PRIORITY_NATIVE_SCOPE,priorityNativeMessage} from './chat-priority-native-scope.mjs';
import {chatPriorityJudgeIdentity,priorityJudgePackets,scorePriorityReplay} from './chat-priority-replay.mjs';
import {digest} from './qualification.mjs';
import {read} from './bc-control.mjs';

const registry=read(new URL('./CHAT_PRIORITY_SCOPE_20261119.json',import.meta.url));
const corpus={provenance:{diagnosticScope:CHAT_PRIORITY_NATIVE_SCOPE.name},scenarios:CHAT_PRIORITY_NATIVE_SCOPE.cases.map(c=>({
 id:c.sourceCase,mode:c.mode,turns:Array.from({length:c.turns},()=>({}))
}))};
test('chat-priority native keeps its full nine-turn population, one repetition and one batch claim',()=>{
 const slots=diagnosticSlots(corpus,diagnosticRepetitions(corpus,5));
 assert.equal(diagnosticScope(corpus),CHAT_PRIORITY_NATIVE_SCOPE);
 assert.equal(slots.length,4);
 assert.equal(slots.reduce((n,s)=>n+s.maximumGenerations,0),36);
 assert.equal(corpus.scenarios.reduce((n,s)=>n+s.turns.length,0),9);
 const changed=structuredClone(corpus);
 changed.scenarios.pop();
 assert.throws(()=>diagnosticSlots(changed),/D_CASE_DENOMINATOR/);
 const wrong=structuredClone(corpus);
 wrong.scenarios[0].id='outside';
 assert.throws(()=>diagnosticSlots(wrong),/D_SCOPE_CHANGED/);
 const dir=mkdtempSync(resolve(tmpdir(),'c3-chat-priority-claim-'));
 try{
  const location=resolve(dir,'REGISTRATION.json'),registration={kind:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1',slots};
  claimDiagnostic(location,registration);
  assert.throws(()=>claimDiagnostic(location,registration),{code:'EEXIST'});
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('ADS metadata is wired only into the exact opening case and bound to the existing canned source',()=>{
 const ads=read(new URL('./SALES_CONTEXT_CONTROL_CASES_20261115.json',import.meta.url)).scenarios.find(s=>s.id==='c-context-opening');
 const input=ads.turns[0];
 assert.deepEqual(priorityNativeMessage(ads,0,input),{messages:[{text:input.latest,attachments:[],adsContext:{
  source:'ADS',adTitle:'SD023',postId:null,adId:null,ref:null}}]});
 assert.deepEqual(priorityNativeMessage(corpus.scenarios[0],0,input),{});
 assert.throws(()=>priorityNativeMessage(ads,1,input),/CHAT_PRIORITY_ADS_TURN/);
 assert.throws(()=>priorityNativeMessage(ads,0,{...input,initialProductCodes:['OTHER']}),/CHAT_PRIORITY_ADS_PRODUCT/);
});

function sample(){
 const seed='1'.repeat(64),slots=registry.pairs.map(pair=>({pair,armHashes:['baseline','candidate'],evidence:{dialogue:{latest:'Giá bao nhiêu em?'},verifiedFacts:[]}}));
 const r={source:'b'.repeat(40),seed,slots};
 const bit=createHmac('sha256',seed).update('dispatch').digest()[0]%2;
 const rows=slots.flatMap((_,index)=>[(index+bit)%2,1-(index+bit)%2].map(arm=>({
  index,arm,status:'OK',providerRequests:1,requestHash:slots[index].armHashes[arm],modelVersion:'gemini-3.5-flash-lite',text:arm?'Dạ 499k chị nhé.':'Em báo giá cho chị ạ.'
 })));
 return {r,owner:{registrationHash:digest(r),rows}};
}
const passing={voicePass:true,factsComplete:true,materialFailure:false,reason:'Trả đúng điều khách hỏi.'};
function mockJudge(r,owner){
 const packets=priorityJudgePackets(r,owner);
 return {judge:chatPriorityJudgeIdentity,packetHash:digest(packets),packets,rows:packets.map(({input,order,requestHash},index)=>({
  index,requestHash,providerRequests:input.replies.every(Boolean)?1:0,
  status:input.replies.every(Boolean)?'OK':'MISSING_OWNER_REPLY',modelVersion:'gpt-6.1-sol',
  grade:{preferred:['A','B'][order.indexOf(1)],replies:[passing,passing]}
 }))};
}

test('scores all eight paired answers blind, preserves material candidate errors and counts failed owners',()=>{
 const {r,owner}=sample();
 const judged=mockJudge(r,owner);
 assert.equal(scorePriorityReplay(r,owner,judged).status,'PASS');
 const candidatePosition=judged.packets[0].order.indexOf(1);
 judged.rows[0].grade.replies[candidatePosition]={...passing,materialFailure:true};
 assert.equal(scorePriorityReplay(r,owner,judged).status,'STOP');
 const failed=owner.rows.find(x=>x.index===1&&x.arm===1);
 failed.status='TOOL_CALL_NOT_EXECUTED';
 failed.text=null;
 const incomplete=scorePriorityReplay(r,owner,mockJudge(r,owner));
 assert.equal(incomplete.status,'STOP');
 assert.equal(incomplete.rows.length,8);
 assert.equal(incomplete.ownerRequests,16);
 assert.equal(incomplete.judgeRequests,7);
 assert.throws(()=>scorePriorityReplay(r,{...owner,rows:owner.rows.slice(0,15)},judged),/CHAT_PRIORITY_OWNER_DENOMINATOR/);
});

test('binds grade and provider identity even on favourable looking answers',()=>{
 const {r,owner}=sample();
 const judged=mockJudge(r,owner);
 judged.rows[0].modelVersion='other';
 assert.equal(scorePriorityReplay(r,owner,judged).status,'STOP');
 judged.rows[0].requestHash='other';
 assert.throws(()=>scorePriorityReplay(r,owner,judged));
});
