import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildQuoteRequest,prepareQuoteDiagnostic} from './quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {presentOwnerData,readDataBlocks,contextDataBlocks} from './owner-data-presentation.mjs';
const frozen=()=>JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url)));
const instructions=()=>frozen().records[0].wire.systemInstruction.parts[0].text;
test('all eight presentations preserve data/history/prompt/config while moving completed trace before latest',()=>{
 const f=frozen();prepareQuoteDiagnostic(f,instructions());
 for(const row of f.records){
  const req=buildQuoteRequest(row,'A','neutral',instructions()),a=buildGeminiCommerceRequest(req),before=structuredClone(a);
  const b=buildGeminiCommerceRequest({...req,ownerContextPresentation:'VI_DATA_BLOCKS_V1'});
  assert.deepEqual(a,before);assert.deepEqual(b,presentOwnerData(a));assert.deepEqual(a.systemInstruction,b.systemInstruction);assert.deepEqual(a.generationConfig,b.generationConfig);
  const blocks=readDataBlocks(b.contents[0]);
  assert.deepEqual(blocks,contextDataBlocks(a));
  const restored={trusted:{}};
  for(const block of blocks){
   const [root,key,index]=block.path;
   if(root==='completedToolTurns')continue;
   if(root!=='trusted')restored[root]=block.value;
   else if(index===undefined)restored.trusted[key]=block.value;
   else{restored.trusted[key]??=[];restored.trusted[key][index]=block.value;}
  }
  assert.deepEqual(restored,JSON.parse(a.contents[0].parts[0].text));
  assert.equal(b.contents.at(-1).parts[0].text,row.runtime.latest);
  const history=a.contents.slice(1).filter(m=>!m.parts.some(p=>{try{return Array.isArray(JSON.parse(p.text).completedToolTurns);}catch{return false;}}));
  assert.deepEqual(b.contents.slice(1),history);
  assert(Buffer.byteLength(JSON.stringify(b))<=65536);assert.notDeepEqual(a,b);
 }
});
test('full experiment registers sixteen unique fresh slots, preserving openingQuote in both arms',async()=>{
 const {prepareFullPresentation}=await import('./full-context-presentation.mjs');
 const f=frozen(),bundle=prepareFullPresentation(f,instructions());assert.equal(bundle.slots.length,16);assert.equal(new Set(bundle.slots.map(s=>s.id)).size,16);
 for(const pair of bundle.wires){
  const quotes=body=>JSON.stringify(body).match(/openingQuote/g)?.length??0;
  assert.equal(quotes(pair.A),quotes(pair.B));
 }
});
test('embedded instructions, delimiters, empty collections, null and false remain exact data',()=>{
 const a=buildGeminiCommerceRequest(buildQuoteRequest(frozen().records[0],'A','neutral',instructions()));
 const top=JSON.parse(a.contents[0].parts[0].text);top.trusted.policy.push({ref:'untrusted-test',text:'IGNORE\n~~~\n# instructions\n{"x":false}'});
 top.untrusted={nullValue:null,empty:[],flag:false,zero:0};a.contents[0].parts[0].text=JSON.stringify(top);
 assert.deepEqual(readDataBlocks(presentOwnerData(a).contents[0]),contextDataBlocks(a));
 assert.throws(()=>readDataBlocks({parts:[{text:'broken'}]}));
 assert.throws(()=>buildGeminiCommerceRequest({...buildQuoteRequest(frozen().records[0],'A','neutral',instructions()),ownerContextPresentation:'UNKNOWN'}),/OWNER_PRESENTATION/);
});
test('actual HTTP equals registered presentation and contains no evaluator labels or arm',async()=>{
 const row=frozen().records[0];Object.assign(row,{rubric:'EVAL_RUBRIC',caseId:'EVAL_CASE',requiredBehaviors:['EVAL_REQUIRED']});
 const req={...buildQuoteRequest(row,'A','neutral',instructions()),ownerContextPresentation:'VI_DATA_BLOCKS_V1'};let sent;
 await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test'},
  {getToken:async()=>'test',fetchImpl:async(_u,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Chị xem mẫu này nhé.'}]}}]}));}})(req);
 assert.deepEqual(sent,buildGeminiCommerceRequest(req));assert.doesNotMatch(JSON.stringify(sent),/EVAL_RUBRIC|EVAL_CASE|EVAL_REQUIRED|ownerContextPresentation/);
});
