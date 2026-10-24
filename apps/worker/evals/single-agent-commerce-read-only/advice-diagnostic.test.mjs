import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAdviceCapture} from './advice-diagnostic.mjs';
import * as advice from './advice-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {sha256} from './protocol.mjs';

test('capture selection is fixed by dispatch order, never by output or verdict',()=>{
 const rows=[{generationId:'a',toolsAllowed:true,providerRequests:1},{generationId:'b',toolsAllowed:false,providerRequests:1},{generationId:'c',toolsAllowed:false,providerRequests:1}];
 assert.equal(selectAdviceCapture(rows).generationId,'b');
 assert.equal(selectAdviceCapture(rows.slice(0,1)).generationId,'a');
 assert.equal(selectAdviceCapture([]),null);
});

test('pre-dispatch failures cannot become advice captures',()=>{
 const earlier={generationId:'a',toolsAllowed:true,providerRequests:1};
 const failed={generationId:'b',toolsAllowed:false,providerRequests:0};
 assert.equal(selectAdviceCapture([earlier,failed]),earlier);
 assert.equal(selectAdviceCapture([failed]),null);
});

test('diagnostic replays the captured processing time, not today or a source fact timestamp',()=>{
 const capturedAt='2026-10-22T16:59:59.000Z',c=publicContext();
 const req=advice.buildAdviceOwnerRequest({runtime:{history:[],latest:'Thứ Sáu có kịp không em?'}},{context:c,capturedAt},'Prompt chung','r',new AbortController().signal);
 assert.deepEqual(req.turnTime,{processingAt:capturedAt,timeZone:'Asia/Ho_Chi_Minh'});
 assert.equal(Object.hasOwn(req.context,'turnTime'),false);
 assert.deepEqual(req.context,c);
});

const publicContext=()=>({boundSubjects:[{ref:'P1',kind:'PRODUCT',label:'Áo An'}],protectedClaims:[],policyLiterals:[],effectReceipts:[],
 runtimeProducts:[{ref:'product:P1',subjectRef:'P1',content:{productName:'Áo An',description:'Áo cotton tay dài. Nét thanh lịch tạo nên tổng thể thanh lịch.',metadata:{sourceVersion:'v1'}},
  presentation:{displayName:'Áo An',variants:[{variantId:'P1-M',size:'M',color:'BE'}]}},{ref:'product:P2',subjectRef:'P2',content:{description:'Váy hai lớp.'}}],
 state:{revision:4,cartQuote:null}});
const edits=c=>({P1:{originalSha256:sha256(c.runtimeProducts[0].content.description),description:'Áo cotton tay dài. Phong cách thanh lịch.'}});

test('advice presentation changes only matching descriptions and leaves canonical evidence untouched',()=>{
 const canonical=publicContext(),before=structuredClone(canonical);
 const frozen=x=>{Object.freeze(x);for(const v of Object.values(x))if(v&&typeof v==='object')frozen(v);return x;};
 frozen(canonical);
 const view=advice.adviceOwnerContext(canonical,edits(canonical));
 assert.deepEqual(canonical,before);assert.notEqual(view,canonical);
 const expected=structuredClone(before);expected.runtimeProducts[0].content.description=edits(canonical).P1.description;
 assert.deepEqual(view,expected);assert.deepEqual(advice.adviceOwnerContext(canonical),before);
});

test('advice presentation refuses changed source or extra instruction fields, not an unchecked semantic rewrite',()=>{
 const c=publicContext(),change=edits(c);
 assert.throws(()=>advice.adviceOwnerContext(c,{P1:{...change.P1,originalSha256:'wrong'}}),/ADVICE_DESCRIPTION_SOURCE_CHANGED/);
 assert.throws(()=>advice.adviceOwnerContext(c,{P1:{...change.P1,requiredBehaviors:['EVAL_REQUIRED']}}),/ADVICE_DESCRIPTION_FIELDS/);
 assert.throws(()=>advice.adviceOwnerContext(c,{P1:{...change.P1,description:''}}),/ADVICE_DESCRIPTION_BOUND/);
 assert.deepEqual(advice.adviceOwnerContext(c,{OTHER:change.P1}),c);
});

test('real advice request and inference use the same projected body without evaluator-only labels',async()=>{
 for(const candidate of [false,true]){
  const c=publicContext(),before=structuredClone(c),row={caseId:'EVAL_CASE',split:'EVAL_SPLIT',expectedSafe:'EVAL_SAFE',
   attackFamily:'EVAL_ATTACK',requiredBehaviors:['EVAL_REQUIRED'],forbiddenBehaviors:['EVAL_FORBIDDEN'],rubric:'EVAL_RUBRIC',arm:'EVAL_ARM',
   runtime:{history:[{role:'shop',text:'Chị xem áo này nhé.'}],latest:'Áo này tay dài hả em?'},...(candidate?{ownerInstructions:'Tư vấn theo hướng dẫn đã đăng ký.',ownerDescriptions:edits(c)}:{})};
  const req=advice.buildAdviceOwnerRequest(row,{context:c},'Tư vấn cho khách.','request-1',new AbortController().signal);
  const expected=buildGeminiCommerceRequest(req);let sent;
  await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test-project'},
   {getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
    sent=JSON.parse(init.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Tay dài chị nhé.'}]}}]}));
   }})(req);
  assert.deepEqual(sent,expected);assert.deepEqual(c,before);
  assert.deepEqual(sent.systemInstruction,{parts:[{text:candidate?row.ownerInstructions:'Tư vấn cho khách.'}]});
  const products=JSON.parse(sent.contents[0].parts[0].text).trusted.products;
  assert.equal(products[0].content.description,candidate?edits(c).P1.description:c.runtimeProducts[0].content.description);
  assert.doesNotMatch(JSON.stringify(sent),/EVAL_CASE|EVAL_SPLIT|EVAL_SAFE|EVAL_ATTACK|EVAL_REQUIRED|EVAL_FORBIDDEN|EVAL_RUBRIC|EVAL_ARM/);
 }
});

test('advice prompt override rejects empty or oversized instructions before dispatch',()=>{
 const row={runtime:{history:[],latest:'Áo này còn không?'}};
 for(const ownerInstructions of ['',null,42,'x'.repeat(20001)])
  assert.throws(()=>advice.buildAdviceOwnerRequest({...row,ownerInstructions},{context:publicContext()},'Default','r',new AbortController().signal),/ADVICE_PROMPT_BOUND/);
});
