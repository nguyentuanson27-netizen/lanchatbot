import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertNativeRuntime,decodeVerifierWire,NATIVE_CODECS,commonModelConfig} from './native-wire.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildQuoteRequest} from '../single-agent-commerce-read-only/quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {withNativePresentation} from '../single-agent-commerce-read-only/native-presentation.mjs';
const input={latest:'Chị lấy màu be nhé.',history:[{role:'shop',text:'Áo này có be và navy.'}],initialProductCodes:['SV2447']};
test('native codecs read existing B/C3 dialogue without adding a prompt envelope',()=>{
 const owner={contents:[{role:'user',parts:[{text:JSON.stringify({trusted:{product:'SV2447'}})}]},
  {role:'model',parts:[{text:input.history[0].text}]},{role:'user',parts:[{text:input.latest}]}]};
 const before=JSON.stringify(owner);assertNativeRuntime(owner,NATIVE_CODECS.OWNER,input);assert.equal(JSON.stringify(owner),before);
 const c3={contents:[{role:'user',parts:[{text:JSON.stringify({context:{productId:'SV2447'},evaluationContext:[
  {direction:'OUTBOUND',senderType:'BOT',messageType:'TEXT',text:input.history[0].text,attachmentCount:0},
  {direction:'INBOUND',senderType:'CUSTOMER',messageType:'TEXT',text:input.latest,attachmentCount:0}]})}]}]};
 assertNativeRuntime(c3,NATIVE_CODECS.STRATEGIST,input);
 owner.contents.at(-1).parts[0].text='Một câu khác';assert.throws(()=>assertNativeRuntime(owner,NATIVE_CODECS.OWNER,input),/RUNTIME_MISMATCH/);
});
test('native verifier binding is extracted from the actual sent trusted/untrusted frame',()=>{
 const frame={requestIdentity:{requestId:'r',finalDraftHash:'draft-hash',trustedSnapshotId:'snapshot-hash'},trusted:{subject:'SV2447'},
  untrusted:{latestCustomerMessage:input.latest,recentAcceptedDialogue:input.history,finalDraft:'Màu be chị nhé.'}};
 const wire={input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(frame)}]}]};
 assertNativeRuntime(wire,NATIVE_CODECS.VERIFIER,{...input,finalDraft:frame.untrusted.finalDraft});
 assert.equal(decodeVerifierWire(wire).binding.trustedSnapshotJson,JSON.stringify(frame.trusted));
 assert.throws(()=>assertNativeRuntime(wire,NATIVE_CODECS.VERIFIER,{...input,finalDraft:'Another draft'}),/FROZEN_DRAFT/);
});
test('model parity permits registered output format differences but never effort/token changes',()=>{
 const a={provider:'VERTEX_AI',model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{maxOutputTokens:8192,responseMimeType:'text/plain'}},
  b=structuredClone(a);b.generationConfig.responseMimeType='application/json';b.generationConfig.responseSchema={type:'OBJECT'};
 assert.deepEqual(commonModelConfig(a),commonModelConfig(b));b.generationConfig.maxOutputTokens=1024;
 assert.notDeepEqual(commonModelConfig(a),commonModelConfig(b));b.effort='low';assert.notDeepEqual(commonModelConfig(a),commonModelConfig(b));
});
test('actual CompactV2 builder, tool continuations and inserted image item preserve runtime decoding',()=>{
 const row=JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))).records[0];
 const prompt=readFileSync(new URL('../single-agent-commerce-read-only/prompts/owner.vi.txt',import.meta.url),'utf8');
 const request=buildQuoteRequest(row,'A','unit-native',prompt),runtime={latest:'Áo này bao nhiêu em?',history:[{role:'shop',text:'Chị xem mẫu này nhé.'}],initialProductCodes:['SV2447']};
 const initial=[{role:'model',parts:[{text:runtime.history[0].text}]},{role:'user',parts:[{text:runtime.latest}]}];
 for(const toolRound of [false,true])for(const media of [false,true]){
  request.contents=structuredClone(initial);request.toolsAllowed=toolRound;request.availableTools=toolRound?['read_product']:[];
  if(toolRound)request.contents.push({role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'SV2447',selection:'SINGLE',offerType:'SET_VAY'}},thoughtSignature:'unit-signature'}]},
   {role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{price:799000}}}}]});
  const data='aGVsbG8=',sha256=createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');
  request.catalogImages=media?[{subjectRef:'SV2447',assetRef:'unit-image',sha256,mimeType:'image/jpeg',data}]:[];
  if(!request.context.policyLiterals.some(p=>p.ref==='vision:unit'))request.context.policyLiterals.push({ref:'vision:unit',text:JSON.stringify({subjectRef:'SV2447',assets:[{assetRef:'unit-image',sha256,mimeType:'image/jpeg'}]})});
  const wire=buildGeminiCommerceRequest(withNativePresentation(request,'VI_DATA_BLOCKS_COMPACT_V2')),before=JSON.stringify(wire);
  assertNativeRuntime(wire,NATIVE_CODECS.OWNER,runtime);assert.equal(JSON.stringify(wire),before);
  wire.contents[media?2:1].parts[0].text='Chị không hỏi câu này.';
  assert.throws(()=>assertNativeRuntime(wire,NATIVE_CODECS.OWNER,runtime),/RUNTIME_MISMATCH/);
 }
});
