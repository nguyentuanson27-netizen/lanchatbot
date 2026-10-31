// Evaluation codecs for the existing native wire formats. No new prompt block.
import assert from 'node:assert/strict';
import {readCompactSections} from '../single-agent-commerce-read-only/owner-data-presentation.mjs';
const check=(v,code)=>assert(v,code);
const json=s=>{check(typeof s==='string','C_NATIVE_WIRE_TEXT');return JSON.parse(s);};
const dialogue=rows=>rows.map(m=>{
 check(['customer','shop'].includes(m.role)&&typeof m.text==='string','C_NATIVE_DIALOGUE');
 return {role:m.role,text:m.text};
});
export const NATIVE_CODECS=Object.freeze({OWNER:'NATIVE_B_OWNER_V1',VERIFIER:'NATIVE_B_VERIFIER_V1',STRATEGIST:'MAIN_C3_V1',RESPONDER:'MAIN_C3_V1'});

export function decodeVerifierWire(body){
 check(body.input?.length===1&&body.input[0].role==='user'&&body.input[0].content?.length===1,'C_NATIVE_VERIFIER_FRAME');
 const frame=json(body.input[0].content[0].text),b=frame.requestIdentity,u=frame.untrusted;
 check(b&&frame.trusted&&typeof u?.finalDraft==='string'&&typeof u.latestCustomerMessage==='string','C_NATIVE_VERIFIER_FRAME');
 return {runtime:{latest:u.latestCustomerMessage,history:dialogue(u.recentAcceptedDialogue)},binding:{
  requestId:b.requestId,exactFinalDraft:u.finalDraft,draftHash:b.finalDraftHash,snapshotHash:b.trustedSnapshotId,
  trustedSnapshotJson:JSON.stringify(frame.trusted)}};
}
export function assertNativeRuntime(body,codec,input){
 let actual;
 if(codec===NATIVE_CODECS.OWNER){
  // Native B's first user item is the code-owned trusted view; original public dialogue follows it.
  check(body.contents?.[0]?.role==='user','C_NATIVE_OWNER_FRAME');
  const text=body.contents[0].parts?.[0]?.text;
  if(typeof text==='string'&&text.trim().startsWith('{'))check(json(text).trusted,'C_NATIVE_OWNER_FRAME');
  else{
   const sections=readCompactSections(body.contents[0]);
   check(sections.some(s=>s.label==='Khả năng thực hiện lượt này')&&sections.some(s=>s.label==='Hồ sơ và trạng thái hiện tại'),'C_NATIVE_OWNER_COMPACT_FRAME');
   check(new Set(sections.map(s=>s.label)).size===sections.length,'C_NATIVE_OWNER_COMPACT_FRAME');
  }
  let start=1;
  if(body.contents[1]?.parts?.some(p=>p.inlineData)){
   const parts=body.contents[1].parts;check(body.contents[1].role==='user'&&parts.length>0&&parts.length%2===0,'C_NATIVE_OWNER_MEDIA');
   for(let i=0;i<parts.length;i+=2)check(json(parts[i].text).catalogImage&&parts[i+1].inlineData,'C_NATIVE_OWNER_MEDIA');start++;
  }
  const expected=[...input.history,{role:'customer',text:input.latest}];
  const rows=body.contents.slice(start,start+expected.length).map((m,i)=>{
   check(m.role===(expected[i].role==='shop'?'model':'user')&&m.parts?.length===1&&typeof m.parts[0].text==='string','C_NATIVE_OWNER_DIALOGUE');
   return {role:expected[i].role,text:m.parts[0].text};
  });
  check(rows.length===expected.length,'C_NATIVE_OWNER_DIALOGUE');actual={latest:rows.at(-1).text,history:rows.slice(0,-1)};
 }else if(codec===NATIVE_CODECS.VERIFIER)actual=decodeVerifierWire(body).runtime;
 else if(codec===NATIVE_CODECS.STRATEGIST){
  const frame=json(body.contents?.[0]?.parts?.[0]?.text),rows=frame.evaluationContext;
  check(Array.isArray(rows)&&rows.length>=1&&rows.length<=15,'C_NATIVE_C3_DIALOGUE');
  const publicRows=rows.map(m=>{
   check((m.direction==='INBOUND'&&m.senderType==='CUSTOMER'||m.direction==='OUTBOUND'&&['BOT','HUMAN'].includes(m.senderType))&&
    m.messageType==='TEXT'&&typeof m.text==='string'&&m.attachmentCount===0,'C_NATIVE_C3_DIALOGUE');
   return {role:m.direction==='INBOUND'?'customer':'shop',text:m.text};
  });
  check(publicRows.at(-1).role==='customer','C_NATIVE_C3_LATEST');actual={latest:publicRows.at(-1).text,history:publicRows.slice(0,-1)};
 }else throw new Error('C_NATIVE_CODEC');
 assert.deepEqual(actual,{latest:input.latest,history:input.history},'C_NATIVE_RUNTIME_MISMATCH');
 // Initial source codes bind retrieval. They must also be represented in the actual public wire.
 const serialized=JSON.stringify(body);
 for(const code of input.initialProductCodes)check(serialized.includes(code),'C_NATIVE_SUBJECT_MISMATCH');
 if(Object.hasOwn(input,'finalDraft'))assert.equal(decodeVerifierWire(body).binding.exactFinalDraft,input.finalDraft,'C_NATIVE_FROZEN_DRAFT');
 return true;
}

/** Keep role-output contracts explicit; they are not model/version/effort differences. */
export function commonModelConfig(model){
 check(model&&typeof model==='object','C_COMMON_MODEL');
 const copy=structuredClone(model),generation=copy.generationConfig??copy.generation;
 if(generation){delete generation.responseMimeType;delete generation.responseSchema;}
 return copy;
}
