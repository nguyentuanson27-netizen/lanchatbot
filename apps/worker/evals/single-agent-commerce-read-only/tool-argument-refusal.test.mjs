import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGeminiGeneration} from './gemini-inference.mjs';

const body=parts=>({candidates:[{finishReason:'STOP',content:{role:'model',parts}}]});
const call=(name,args)=>({functionCall:{name,args},thoughtSignature:'signed'});
test('a known tool called outside its schema becomes a refused call naming a public field',()=>{
 const secret='private-raw-value';
 const out=parseGeminiGeneration(body([call('recommend_size',{subjectRef:'P1',fitScope:'COMPONENT',componentRole:'TOP',[secret]:secret}),call('read_policy',{})]));
 assert.equal(out.kind,'TOOLS');assert.equal(out.calls.length,2);
 assert.deepEqual(out.calls[0].invalidArguments,{field:'fitScope'});assert(!Object.hasOwn(out.calls[1],'invalidArguments'));
 // The model's own content is returned unchanged for the next request; the refusal carries no supplied value.
 assert.equal(out.content.parts[0].thoughtSignature,'signed');assert(!JSON.stringify(out.calls[0].invalidArguments).includes(secret));
 const ops=parseGeminiGeneration(body([call('apply_customer_state',{ops:[{field:'NOT_A_FIELD',op:'SET',value:1}]})]));
 assert.deepEqual(ops.calls[0].invalidArguments,{field:'ops'});
 const quote=parseGeminiGeneration(body([call('quote_product',{subjectRef:'P1',offerTypes:[],extra:1})]));
 assert.deepEqual(quote.calls[0].invalidArguments,{field:'ARGS'});
});
test('an unknown tool, a non-object argument or an oversized batch is still a failed generation',()=>{
 for(const parts of [[call('recommend_size','text')],[call('recommend_size',['x'])],Array.from({length:7},()=>call('read_policy',{}))])
  assert.throws(()=>parseGeminiGeneration(body(parts)),/OWNER_TOOL_OUTPUT/);
 const unknown=parseGeminiGeneration(body([call('invented_tool',{a:1})]));
 // An undeclared name is not refused here: the turn loop rejects any call outside the callable set.
 assert.equal(unknown.calls[0].name,'invented_tool');assert(!Object.hasOwn(unknown.calls[0],'invalidArguments'));
});
test('valid calls are decoded exactly as before',()=>{
 const out=parseGeminiGeneration(body([call('recommend_size',{subjectRef:'P1',fitScope:'COMPONENT',componentRole:'TOP'})]));
 assert.equal(out.kind,'TOOLS');assert(!Object.hasOwn(out.calls[0],'invalidArguments'));
});
