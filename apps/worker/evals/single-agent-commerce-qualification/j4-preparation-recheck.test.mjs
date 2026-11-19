import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {digest} from './bc-control.mjs';
import {runJ4PreparationRecheck,assertJ4OwnerWire} from './j4-preparation-recheck.mjs';
import {ownerTextBytes} from '../single-agent-commerce-read-only/gemini-inference.mjs';
test('native signature bytes are bounded independently without modifying the provider body',()=>{
 const body={contents:[{role:'user',parts:[{text:'Tư vấn'}]},{role:'model',parts:[{functionCall:{name:'quote_product',args:{}},thoughtSignature:'s'.repeat(65536)}]}],tools:[],
  generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}};
 const before=structuredClone(body);assert.doesNotThrow(()=>assertJ4OwnerWire(body));assert.deepEqual(body,before);
 body.contents[1].parts[0].thoughtSignature+='s';assert.throws(()=>assertJ4OwnerWire(body),/J4_SIGNATURE_BOUND/);
 body.contents[1].parts[0].thoughtSignature='s'.repeat(12692);
 body.contents[0].parts[0].text+='x'.repeat(70000-ownerTextBytes(body));assert.doesNotThrow(()=>assertJ4OwnerWire(body));
 body.contents[0].parts[0].text+='x';assert.throws(()=>assertJ4OwnerWire(body),/J1_TEXT_BOUND/);
});
function fixture(){
 const out=mkdtempSync(join(tmpdir(),'j4-recheck-test-'));
 const conversations=Array.from({length:5},(_,i)=>({repetition:i+1,turns:[
  {customer:'Chị lấy áo size M.',terminal:{disposition:'SEND_ELIGIBLE',messages:['Chị chọn trắng hay be ạ?']}},
  {customer:'Bớt cho chị được không?',terminal:{disposition:'SEND_ELIGIBLE',messages:['Cả ship 499k chị nhé.']}},
  {customer:'Gửi Cần Thơ hết bao nhiêu em?',terminal:{disposition:'HANDOFF',messages:[]}}
 ]}));
 const prefix={conversations},prefixFile=join(out,'prefix.json');writeFileSync(prefixFile,JSON.stringify(prefix));
 const slots=conversations.map(c=>({repetition:c.repetition,latest:c.turns[2].customer}));
 const input={mode:'J4_RECHECK',slots,slotsHash:digest(slots),prefixFile,prefixHash:digest(prefix),maximumGenerationRequests:20,
  minimumProofExpiresAt:new Date(Date.now()+3600000).toISOString(),safetyMarginMs:1000,runSourceSha:'unit',worldHash:'unit'};
 return {out,input};
}
function cleanup(out){const target=resolve(out);assert.equal(dirname(target),resolve(tmpdir()));assert(basename(target).startsWith('j4-recheck-test-'));rmSync(target,{recursive:true,force:true});}
test('only final turns consume model generations; prefix histories are explicit scripted setup',async()=>{
 const f=fixture();let owner,stage='PREPARATION',requests=0,setups=0,measured=0;
 const ports={source(){},preparation(options={}){stage='PREPARATION';owner=options.owner;},
  setStage(p){stage=p;},checkOutcome(){},accounting:()=>({providerRequests:requests})};
 const sessionFactory=async()=>({capturePayloads:[],async drain(){},async turn(){
  if(stage==='PREPARATION'){
   setups++;assert.equal(owner().kind,'TOOLS');assert.equal(owner().kind,'FINAL');
   return {result:{terminal:{disposition:'SEND_ELIGIBLE'}},toolResponses:[{name:'quote_product',response:{data:{preCartQuote:{grandTotalVnd:499000,supportEvaluation:{status:'QUOTED'}}}}}]};
  }
  measured++;requests+=2;return {qualification:{status:'VALID'},result:{terminal:{disposition:'SEND_ELIGIBLE'}}};
 }});
 try{
  const r=await runJ4PreparationRecheck({...f,ports,sessionFactory,snapshot:async()=>({publicState:{}})});
  assert.equal(setups,10);assert.equal(measured,5);assert.equal(r.providerRequests,10);
  const seed=JSON.parse(readFileSync(join(f.out,'J4_1_PREFIX.json'),'utf8'));assert.equal(seed.providerRequests,0);assert.equal(seed.scriptedVerifierForPrefixOnly,true);
 }finally{cleanup(f.out);}
});
test('changed prefix identity is rejected before session setup or generation',async()=>{
 const f=fixture();writeFileSync(f.input.prefixFile,'{}');let touched=false;
 try{await assert.rejects(runJ4PreparationRecheck({...f,ports:{},sessionFactory:async()=>{touched=true;},snapshot:async()=>({})}));assert.equal(touched,false);}
 finally{cleanup(f.out);}
});
