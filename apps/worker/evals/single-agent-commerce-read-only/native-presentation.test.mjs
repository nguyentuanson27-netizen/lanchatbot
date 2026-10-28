import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativePresentation,withNativePresentation} from './native-presentation.mjs';
import {buildQuoteRequest} from './quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';
const V2='VI_DATA_BLOCKS_COMPACT_V2';
test('native selection requires explicit valid flag, preserves defaults and rejects duplicates',()=>{
 assert.equal(nativePresentation([]),undefined);assert.equal(nativePresentation(['--owner-presentation',V2]),V2);
 for(const a of [['--owner-presentation'],['--owner-presentation','V1'],['--owner-presentation',V2,'--owner-presentation',V2]])assert.throws(()=>nativePresentation(a));
 const r={signal:new AbortController().signal,context:{}};assert.equal(withNativePresentation(r,undefined),r);
 assert.equal(withNativePresentation(r,V2).context,r.context);assert(!Object.hasOwn(r,'ownerContextPresentation'));
 assert.throws(()=>withNativePresentation({...r,ownerContextPresentation:'WRONG'},V2));
});
test('compact native wire keeps tool declarations, function pairs/signatures, images and history exact; HTTP matches',async()=>{
 const row=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))).records[0];
 const prompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
 const req=buildQuoteRequest(row,'A','neutral',prompt);
 req.toolsAllowed=true;req.availableTools=['read_product'];
 req.contents=[{role:'user',parts:[{text:'Khách hỏi mẫu này'}]},
  {role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'SV2447',selection:'SINGLE',offerType:'SET_VAY'}},thoughtSignature:'signature'}]},
  {role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{price:799000}}}}]},
  {role:'user',parts:[{text:'Giá bao nhiêu em?'}]}];
 const data='aGVsbG8=',sha256=createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');
 req.catalogImages=[{subjectRef:'SV2447',assetRef:'image:1',sha256,mimeType:'image/jpeg',data}];
 req.context.policyLiterals.push({ref:'vision:1',text:JSON.stringify({subjectRef:'SV2447',assets:[{assetRef:'image:1',sha256,mimeType:'image/jpeg'}]})});
 const before=structuredClone(req.context),a=buildGeminiCommerceRequest(req),selected=withNativePresentation(req,V2),b=buildGeminiCommerceRequest(selected);
 assert.deepEqual(b.contents.slice(1),a.contents.slice(1));assert.deepEqual(b.tools,a.tools);assert.deepEqual(b.toolConfig,a.toolConfig);
 assert.deepEqual(b.systemInstruction,a.systemInstruction);assert.deepEqual(b.generationConfig,a.generationConfig);
 const groups=readCompactSections(b.contents[0]);const top={trusted:{}};
 const original=JSON.parse(a.contents[0].parts[0].text);
 for(const g of groups){const keys=Object.keys(original.trusted);const values=keys.filter(k=>JSON.stringify(original.trusted[k])===JSON.stringify(g.value));
  if(g.label==='Thời điểm xử lý')top.turnTime=g.value;else if(g.label==='Dữ liệu hội thoại kèm theo')top.untrusted=g.value;else {assert.equal(values.length,1);top.trusted[values[0]]=g.value;}}
 assert.deepEqual(top,original);assert.deepEqual(req.context,before);
 let sent;await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test'},
 {getToken:async()=>'test',fetchImpl:async(_u,i)=>{sent=JSON.parse(i.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'799k chị nhé.'}]}}]}));}})(selected);
 assert.deepEqual(sent,b);assert(!JSON.stringify(sent).includes('ownerContextPresentation'));
});
