import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {countInputTokens,prepareCompactMeasurement} from './compact-context-measure.mjs';
test('whole frozen measurement prepares all24 counts without generation or changing prompts',()=>{
 const f=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))),prompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
 const rows=prepareCompactMeasurement(f,prompt);assert.equal(rows.length,24);
 assert.equal(new Set(rows.map(r=>r.caseId+':'+r.variant)).size,24);
 for(const row of rows){assert.equal(row.body.systemInstruction.parts[0].text,prompt);assert.deepEqual(Object.keys(row.body),['contents','systemInstruction','tools','generationConfig']);}
});
test('counting sends exact documented input fields and never a generation endpoint or retry',async()=>{
 const body={contents:[{role:'user',parts:[{text:'Xin giá bộ này.'}]}],systemInstruction:{parts:[{text:'Tư vấn bán hàng.'}]},tools:[],generationConfig:{candidateCount:1}};
 let calls=0;
 const result=await countInputTokens({url:'https://example.test/model:countTokens',token:'test',body,fetchImpl:async(url,init)=>{
  calls++;assert(url.endsWith(':countTokens'));assert.deepEqual(JSON.parse(init.body),body);return new Response(JSON.stringify({totalTokens:11}));}});
 assert.equal(calls,1);assert.equal(result.value.totalTokens,11);
 await assert.rejects(()=>countInputTokens({url:'https://example.test/model:generateContent',token:'test',body}),/COUNT_ENDPOINT_ONLY/);
 calls=0;await assert.rejects(()=>countInputTokens({url:'https://example.test/model:countTokens',token:'test',body,fetchImpl:async()=>{calls++;return new Response('{}',{status:429});}}),/COUNT_HTTP/);assert.equal(calls,1);
});
