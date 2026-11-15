import test from 'node:test';
import assert from 'node:assert/strict';
import {presentSalesContext} from './owner-sales-context.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';

const description='Vải mềm. Chưa xác nhận độ kín dưới đèn. Không bảo đảm không nhăn.\nGiữ đúng dòng nguồn.';
const product={subjectRef:'P1',content:{productName:'Áo một',description},attributes:{materials:['lụa'],wearProperties:null},availableOffers:['AO'],offerLabels:{AO:'áo lẻ'}};
const source={...product,content:{...product.content,metadata:{sourceVersion:'content-1',observedAt:'2026-11-15T00:00:00.000Z'}}};
function wire(p=product){
 return {contents:[{role:'user',parts:[{text:[['Thời điểm xử lý',{processingAt:'2026-11-15T00:01:00.000Z'}],['Sản phẩm',[p]]].map(([k,v])=>k+'\n'+JSON.stringify(v)).join('\n\n')}]},
 {role:'user',parts:[{text:'Chị xem áo này nhé.'}]},
 {role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'P1',offerTypes:[]}},thoughtSignature:'signed-byte-sequence'}]},
 {role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:structuredClone(p)}}}]}],tools:[{x:1}],systemInstruction:{parts:[{text:'owner'}]}};
}
const sections=b=>readCompactSections(b.contents[0],{expandProducts:false});
test('source projection keeps exact raw and caveats in same request with no callable tools',()=>{
 const original=wire();original.tools=[];
 const out=presentSalesContext(original,[source],[]);
 const raw=sections(out).find(s=>s.label==='Mô tả nguồn nguyên văn').value;
 assert.equal(raw.length,1);assert.equal(raw[0].description,description);
 assert.equal(raw[0].sourceVersion,'content-1');
 const p=sections(out).find(s=>s.label==='Sản phẩm').value[0];
 assert(!Object.hasOwn(p.content,'description'));
 assert.equal(p.content.sourceDescriptionRef,raw[0].ref);
 assert.equal(out.contents.at(-1).parts[0].functionResponse.response.data.content.sourceDescriptionRef,raw[0].ref);
 assert.equal(original.contents.at(-1).parts[0].functionResponse.response.data.content.description,description);
 assert.deepEqual(out.contents[2],original.contents[2]);
 assert.deepEqual(out.contents[1],original.contents[1]);
 assert.deepEqual(out.tools,original.tools);
});
test('missing identity or a different source never removes description',()=>{
 for(const sources of [[],[{...source,subjectRef:'P2'}],[{...source,content:{...source.content,description:'different'}}]]){
  const out=presentSalesContext(wire(),sources,[]);
  const p=sections(out).find(s=>s.label==='Sản phẩm').value[0];
  assert.equal(p.content.description,description);
 }
});
test('same text under different product scope retains distinct references and raw data',()=>{
 const other={...source,subjectRef:'P2'};
 const w=wire();const s=sections(w);s.find(s=>s.label==='Sản phẩm').value.push({...product,subjectRef:'P2'});
 w.contents[0].parts[0].text=s.map(s=>s.label+'\n'+JSON.stringify(s.value)).join('\n\n');
 const out=presentSalesContext(w,[source,other],[]);
 const raw=sections(out).find(s=>s.label==='Mô tả nguồn nguyên văn').value;
 assert.equal(raw.length,2);assert.notEqual(raw[0].ref,raw[1].ref);
});
test('structured traits use allowlist and remain unknown when source is absent',()=>{
 const p={...product,attributes:{...product.attributes,marketing:'makes anything perfect'}};
 const out=presentSalesContext(wire(p),[source],[]);
 const traits=sections(out).find(s=>s.label==='Đặc điểm ghi trong nguồn').value;
 assert.deepEqual(traits[0].attributes,{materials:['lụa'],wearProperties:null});
 assert(!JSON.stringify(traits).includes('marketing'));
});
test('projection is idempotent and does not modify raw source',()=>{
 const before=structuredClone(source);
 const first=presentSalesContext(wire(),[source],[]);
 assert.deepEqual(presentSalesContext(first,[source],[]),first);
 assert.deepEqual(source,before);
});

test('normal adapter entry keeps source and protected evidence in a compact candidate request',async()=>{
 const {readFileSync}=await import('node:fs');
 const {buildQuoteRequest}=await import('./quote-presentation-diagnostic.mjs');
 const {buildGeminiCommerceRequest}=await import('./gemini-inference.mjs');
 const row=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))).records[0];
 const req={...buildQuoteRequest(row,'A','neutral',row.wire.systemInstruction.parts[0].text),ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'};
 const before=structuredClone(req.context),original=buildGeminiCommerceRequest(req);
 const candidate=buildGeminiCommerceRequest({...req,salesContextPresentation:true});
 const raw=sections(candidate).find(s=>s.label==='Mô tả nguồn nguyên văn').value;
 assert(raw.some(s=>s.description===req.context.runtimeProducts[0].content.description));
 assert.deepEqual(sections(candidate).find(s=>s.label==='Giá, tồn và kết quả đã xác minh'),
  sections(original).find(s=>s.label==='Giá, tồn và kết quả đã xác minh'));
 assert.deepEqual(req.context,before);
 assert.deepEqual(candidate.systemInstruction,original.systemInstruction);
 assert.deepEqual(candidate.tools,original.tools);
 assert.deepEqual(candidate.generationConfig,original.generationConfig);
 assert.doesNotMatch(JSON.stringify(candidate),/salesContextPresentation|caseId|rubric|expectedSafe/);
});
