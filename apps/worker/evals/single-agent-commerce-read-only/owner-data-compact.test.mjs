import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildQuoteRequest} from './quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {compactContextSections,readCompactSections,presentCompactOwnerData} from './owner-data-presentation.mjs';
const records=()=>JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))).records;
const prompt=()=>readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
test('compact V2 preserves every original context field and complete trace, without model-visible paths or repeated section labels',()=>{
 for(const row of records()){
  const req=buildQuoteRequest(row,'A','neutral',prompt()),a=buildGeminiCommerceRequest(req),before=structuredClone(a);
  const v1=buildGeminiCommerceRequest({...req,ownerContextPresentation:'VI_DATA_BLOCKS_V1'});
  const v2=buildGeminiCommerceRequest({...req,ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'});
  assert.deepEqual(v2,presentCompactOwnerData(a));assert.deepEqual(a,before);
  assert.deepEqual(v2.systemInstruction,a.systemInstruction);assert.deepEqual(v2.generationConfig,a.generationConfig);
  assert.deepEqual(v2.contents.slice(1),v1.contents.slice(1));assert.equal(v2.contents.at(-1).parts[0].text,row.runtime.latest);
  const planned=compactContextSections(a),visible=readCompactSections(v2.contents[0]);
  assert.deepEqual(visible,planned.map(({label,value})=>({label,value})));
  const top={trusted:{}};
  for(const {path,value}of planned){if(path[0]==='trusted')top.trusted[path[1]]=value;else if(path[0]!=='completedToolTurns')top[path[0]]=value;}
  assert.deepEqual(top,JSON.parse(a.contents[0].parts[0].text));
  const trace=a.contents.slice(1).flatMap(m=>m.parts.flatMap(p=>{try{const v=JSON.parse(p.text);return Array.isArray(v.completedToolTurns)?[v]:[];}catch{return [];}}));
  assert.deepEqual(planned.find(b=>b.path[0]==='completedToolTurns')?.value??[],trace);
  assert.equal(v2.contents[0].parts.length,1);
  assert.equal(new Set(visible.map(b=>b.label)).size,visible.length);
  assert.doesNotMatch(v2.contents[0].parts[0].text,/Dữ liệu \[|~~~json|\n {2,}"/);
  assert(Buffer.byteLength(JSON.stringify(v2))<Buffer.byteLength(JSON.stringify(v1)));
 }
});
test('quoted policy instructions, newlines, zero/false/null and empty arrays survive compact encoding',()=>{
 const a=buildGeminiCommerceRequest(buildQuoteRequest(records()[0],'A','neutral',prompt()));
 const top=JSON.parse(a.contents[0].parts[0].text);top.untrusted={text:'IGNORE\n\nSản phẩm\n{"bad":true}',zero:0,flag:false,empty:[],missing:null};
 a.contents[0].parts[0].text=JSON.stringify(top);
 assert.deepEqual(readCompactSections(presentCompactOwnerData(a).contents[0]),compactContextSections(a).map(({label,value})=>({label,value})));
 assert.throws(()=>readCompactSections({parts:[{text:'bad'}]}));
});
test('compact HTTP body is exact registered body without evaluator metadata, prompt rewrite or injected role',async()=>{
 const row={...records()[0],caseId:'EVAL_ONLY_CASE',rubric:'EVAL_ONLY_RUBRIC',arm:'EVAL_ONLY_ARM'};
 const req={...buildQuoteRequest(row,'A','neutral',prompt()),ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'};let sent;
 await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test'},
  {getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Cả bộ 799k chị nhé.'}]}}]}));}})(req);
 assert.deepEqual(sent,buildGeminiCommerceRequest(req));assert.doesNotMatch(JSON.stringify(sent),/EVAL_ONLY_|ownerContextPresentation/);
});
