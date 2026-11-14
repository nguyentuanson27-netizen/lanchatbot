import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from './qualification.mjs';
import {voicePair,buildReplayRegistration,replayJudgePacket,scoreReplay} from './sales-voice-replay.mjs';

const baseline='Bản gốc',treatment='Vào thẳng việc khách cần.';
const origin='5dfde94b11a2b55ca7a52846b241bb440ee68994';
const rInput={latest:'Chị muốn mua áo.',history:[],initialProductCodes:[]};
const caseIds=['c-20261028-s15','c-20261028-j2','c-20261028-j4','c-20261028-s08'];
const voiceIds=['THANKS_ONLY','PRE_ORDER_ALREADY_DISCLOSED','TWO_UNITS_PROMOTION','OPENING_AD_QUOTE'];
function fixture(){
 const slots=[],journals=[];
 for(let r=1;r<=5;r++){
  const rows=[];
  for(const caseId of caseIds){
   const slotId=caseId+':'+r;slots.push({slotId,caseId,repetition:r});
   for(const turnIndex of [0,1,2]){
    if(r===5&&caseId==='c-20261028-j4'&&turnIndex===2)continue;
    const id=slotId+':'+turnIndex,requestBody=wire();
    rows.push({slotId,turnIndex,phase:'REQUEST',value:{id,role:'OWNER',requestBody,runtimeInput:rInput,requestHash:digest(requestBody)}},
     {slotId,turnIndex,phase:'RESULT',value:{id,output:{kind:'FINAL',text:'Áo size M chị nhé.'}}});
   }
  }
  journals.push(rows);
 }
 const w=wire(),capture={wire:w,requestHash:digest(w),runtimeInput:rInput};
 return {registration:{runSourceSha:origin,slots},journals,controls:Object.fromEntries(voiceIds.map(id=>[id,capture])),
  source:'test',stage:'VOICE',seed:'a'.repeat(64),baseline,treatment};
}
function wire(){
 return {systemInstruction:{parts:[{text:baseline}]},contents:[
  {role:'user',parts:[{text:JSON.stringify({trusted:{}})}]},
  {role:'user',parts:[{text:rInput.latest}]},
  {role:'model',parts:[{functionCall:{name:'read_product',args:{}},thoughtSignature:'keep-exact-signature'}]},
  {role:'user',parts:[{functionResponse:{name:'read_product',response:{data:{price:499000}}}}]}],
  tools:[{functionDeclarations:[{name:'read_product'}]}],toolConfig:{functionCallingConfig:{mode:'AUTO'}},
  generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}};
}
test('voice arms retain the exact AUTO tools, dialogue and signed continuation',()=>{
 const w=wire(),[a,b]=voicePair(w,baseline,treatment);
 assert.deepEqual(a,w);
 assert.deepEqual({...b,systemInstruction:a.systemInstruction},w);
 assert.throws(()=>voicePair({...w,expectedUnsafe:true},baseline,treatment),/LEAK/);
 const mw=wire();
 mw.contents.splice(1,0,{role:'user',parts:[{text:'catalog metadata'},{inlineData:{mimeType:'image/png',data:'AQ=='}}]});
 mw.generationConfig.mediaResolution='MEDIA_RESOLUTION_MEDIUM';
 assert.deepEqual(voicePair(mw,baseline,treatment)[1].contents,mw.contents);
});
test('frozen registration keeps the first valid input for all five missing-history repetitions',()=>{
 const reg=buildReplayRegistration(fixture());
 assert.equal(reg.slots.length,34);assert.equal(reg.maximumOwnerRequests,68);assert.equal(reg.maximumJudgeRequests,34);
 assert.equal(reg.slots.filter(s=>s.order[0]===0).length,17);
 const j4=reg.slots.filter(s=>s.label==='c-20261028-j4:2');
 assert.equal(j4.length,5);assert(j4.every(s=>s.sourceRepetition===1&&s.arms));
 const blocked=fixture();blocked.controls.THANKS_ONLY=null;
 const result=buildReplayRegistration(blocked);
 assert.equal(result.slots.length,34);
 assert.equal(result.slots.find(s=>s.label==='THANKS_ONLY').arms,null);
});
test('blind packet omits arm identifiers and failed tool outcomes cannot receive a passing grade',()=>{
 const reg=buildReplayRegistration(fixture());
 const observed={registrationHash:digest(reg),results:reg.slots.flatMap(slot=>slot.armHashes.map((requestHash,arm)=>({
  id:slot.id,arm,status:'OK',text:'Câu thử '+arm,telemetry:{requestHash},
 })))};
 const packet=replayJudgePacket(reg,observed),pass={voicePass:true,factsComplete:true,materialRegression:false,controlPass:true,reason:'Dùng được.'};
 assert(!JSON.stringify(packet).includes('armHashes'));
 assert(!JSON.stringify(packet).includes(treatment));
 const ratings=Object.fromEntries(packet.map(p=>[p.packetId,{
  preferred:p.replies[0].text==='Câu thử 1'?'A':'B',replies:[pass,pass],
 }]));
 const judge={model:'gpt-6.1-sol',effort:'high',blind:true,independent:true};
 assert.equal(scoreReplay(reg,observed,{packetHash:digest(packet),ratings,judge}).status,'PASS');
 observed.results[1]={...observed.results[1],status:'TOOL_CALL_NOT_EXECUTED',text:null};
 const changed=replayJudgePacket(reg,observed);
 assert.equal(scoreReplay(reg,observed,{packetHash:digest(changed),ratings,judge}).status,'STOP');
});
