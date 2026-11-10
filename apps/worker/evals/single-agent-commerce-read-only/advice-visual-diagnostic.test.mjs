import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildVisualOwnerRequest} from './advice-visual-diagnostic.mjs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
const data=Buffer.from('public-image').toString('base64'),sha256=createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');
const image={subjectRef:'P1',assetRef:'asset:one',sha256,mimeType:'image/png',data};
const row={runtime:{latest:'Gửi chị xem mẫu nhé',history:[]}};
const context={boundSubjects:[{ref:'P1',kind:'PRODUCT',label:'Mẫu'}],protectedClaims:[],runtimeProducts:[],effectReceipts:[],state:{revision:1},policyLiterals:[{ref:'vision:one',text:JSON.stringify({subjectRef:'P1',assets:[{assetRef:image.assetRef,sha256,mimeType:image.mimeType}]})}]};
test('visual wrapper actually emits bound inlineData and baseline emits none',()=>{
 const c={context,capturedAt:'2026-10-23T00:00:00.000Z'};
 const visual=buildGeminiCommerceRequest(buildVisualOwnerRequest(row,c,'Tư vấn','v',[image]));
 const baseline=buildGeminiCommerceRequest(buildVisualOwnerRequest(row,{...c,context:{...context,policyLiterals:[]}},'Tư vấn','b'));
 assert.equal(visual.contents.flatMap(x=>x.parts).filter(p=>p.inlineData).length,1);
 assert.equal(baseline.contents.flatMap(x=>x.parts).filter(p=>p.inlineData).length,0);
 assert(!JSON.stringify(visual).includes('caseId'));
});
test('visual wrapper refuses wrong bytes or absent vision binding',()=>{
 assert.throws(()=>buildVisualOwnerRequest(row,{context},'Tư vấn','v',[{...image,data:Buffer.from('changed').toString('base64')}]));
 assert.throws(()=>buildVisualOwnerRequest(row,{context:{...context,policyLiterals:[]}},'Tư vấn','v',[image]));
});
