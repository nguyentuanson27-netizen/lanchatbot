import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureNativeTerminal,capturedOutputViolations,clarificationCapture,previewMediaCapture} from './native-terminal.mjs';
import {digest,textDigest,validCodeOwned} from './qualification.mjs';

test('committed code clarification may follow owner calls but never an unverified model reply',()=>{
 const messages=['Chị cho em tên người nhận nhé.'],w={kind:'NATIVE_CHECKOUT_CLARIFICATION',requestId:'r',recipient:'recipient',
  conversationRevision:3,salesRevision:5,sourceMessageIdHash:'a'.repeat(64),operationIds:['operation'],payloadHash:digest(messages),messageHashes:messages.map(textDigest),missingFields:['FULL_NAME']};
 const input={result:{terminal:{disposition:'NO_SEND',reason:'CHECKOUT_DETAILS_MISSING'},enqueued:1,codeOwnedOutput:w},
  generations:[{role:'OWNER',status:'OK'}],messages,images:[],authority:{recipientHash:'recipient',owner:'BOT'},state:{revision:3,salesRevision:5},
  receipts:[{operation_id:'operation',commandKind:'CLARIFICATION_REQUESTED',stateRevisionAfter:5}]};
 assert.deepEqual(clarificationCapture(input),w);
 const sourceSha='a'.repeat(40),nativeResult=input.result;
 const output={terminal:{disposition:'CODE_OWNED_SEND',messages,images:[]},codeOwned:{kind:w.kind,sourceSha,
  nativeResult,nativeResultHash:digest(nativeResult),runtimeInputHash:'a'.repeat(64),committedReceipts:input.receipts,
  authority:input.authority,state:input.state,acceptedOutbox:[{id:'accepted',status:'SENT_ACCEPTED',textHash:textDigest(messages[0])}]}};
 assert.equal(validCodeOwned(output,[{id:'r:owner:1',role:'OWNER',status:'OK'}],sourceSha),true);
 const forged=structuredClone(output);forged.codeOwned.acceptedOutbox[0].textHash='b'.repeat(64);
 assert.equal(validCodeOwned(forged,[{id:'r:owner:1',role:'OWNER',status:'OK'}],sourceSha),false);
 for(const mutate of [x=>x.messages=['Other text'],x=>x.receipts=[],x=>x.authority.recipientHash='other',x=>x.authority.owner='HUMAN',
  x=>x.state.revision++,x=>x.generations.push({role:'VERIFIER',status:'OK',verdict:{verdict:'FAIL'}}),
  x=>x.result.terminal.disposition='HANDOFF']){const x=structuredClone(input);mutate(x);assert.equal(clarificationCapture(x),null);}
});
test('actual holding text and image cannot disappear behind a HANDOFF label',()=>{
 const actual=captureNativeTerminal({native:{disposition:'HANDOFF',reason:'AFTER_SALES'},codeOnly:false,
  messages:['Chị chờ shop kiểm tra nhé.'],images:[{url:'https://public.invalid/unit.jpg'}]});
 assert.deepEqual(actual,{disposition:'HANDOFF',reason:'AFTER_SALES',messages:['Chị chờ shop kiểm tra nhé.'],images:[{url:'https://public.invalid/unit.jpg'}]});
 assert.deepEqual(capturedOutputViolations(actual),[{kind:'SILENT_HANDOFF_CUSTOMER_OUTPUT'}]);
});
test('NO_SEND cannot conceal an observed accepted transport payload',()=>{
 const actual=captureNativeTerminal({native:{disposition:'NO_SEND',reason:'SOURCE_CHANGED'},codeOnly:false,messages:['Actual capture'],images:[]});
 assert.deepEqual(actual.messages,['Actual capture']);
 assert.deepEqual(capturedOutputViolations(actual),[{kind:'NO_SEND_CUSTOMER_OUTPUT'}]);
});
test('empty silent handoff, exact eligible output and code-owned output retain their dispositions',()=>{
 for(const [native,codeOnly,messages,expected] of [[{disposition:'HANDOFF'},false,[],'HANDOFF'],
  [{disposition:'SEND_ELIGIBLE'},false,['Exact reply'],'SEND_ELIGIBLE'],[null,true,['Native preview'],'CODE_OWNED_SEND']]){
  const actual=captureNativeTerminal({native,codeOnly,messages,images:[]});assert.equal(actual.disposition,expected);assert.deepEqual(actual.messages,messages);
  assert.deepEqual(capturedOutputViolations(actual),[]);
 }
});

function checkoutMediaFixture(){
 const messages=['Chị cho em tên người nhận nhé.'],images=[{url:'https://content.pancake.vn/checkout.jpg'}],units=[{kind:'TEXT',text:messages[0]},{kind:'IMAGE',imageUrl:images[0].url}],
 w={kind:'NATIVE_CHECKOUT_CLARIFICATION',requestId:'r',recipient:'recipient',conversationRevision:3,salesRevision:5,sourceMessageIdHash:'a'.repeat(64),operationIds:['operation'],payloadHash:digest(messages),messageHashes:messages.map(textDigest),missingFields:['FULL_NAME']},
 media={kind:'NATIVE_CHECKOUT_MEDIA_V1',requestId:'r',recipient:'recipient',conversationRevision:3,salesRevision:5,sourceMessageIdHash:w.sourceMessageIdHash,responseGroupId:'group',payloadHash:digest(units),messageHashes:units.map(digest),imageHashes:images.map(i=>textDigest(i.url)),mediaBindingHash:'b'.repeat(64),operations:[{id:'operation',kind:'CLARIFICATION_REQUESTED'}],preview:null},
 rows=units.map((u,i)=>({id:'out-'+i,status:'SENT_ACCEPTED',group:'group',sequence:i,kind:u.kind,contentHash:textDigest(i?images[0].url:messages[0]),mediaBindingHash:media.mediaBindingHash,messageHash:media.messageHashes[i],bindingRevision:3,bindingRecipient:"recipient"})),
 input={result:{terminal:{disposition:'NO_SEND',reason:'CHECKOUT_DETAILS_MISSING'},enqueued:2,codeOwnedOutput:w,checkoutMediaOutput:media},generations:[{role:'OWNER',status:'OK'}],messages,images,receipts:[{operation_id:'operation',commandKind:'CLARIFICATION_REQUESTED',stateRevisionAfter:5}],authority:{owner:'BOT',recipientHash:'recipient'},state:{revision:3,salesRevision:5},acceptedOutbox:rows,executionIdentity:{requestId:'r',sourceMessageIdHash:w.sourceMessageIdHash}};
 return input;
}
test('native checkout clarification with a photo requires an exact accepted group witness',()=>{
 const input=checkoutMediaFixture();assert(clarificationCapture(input));
 for(const change of [v=>{v.images[0].url+='x';},v=>{v.acceptedOutbox[1].group='other';},v=>{v.acceptedOutbox[1].sequence=0;},v=>{v.acceptedOutbox[1].status='PENDING';},v=>{delete v.result.checkoutMediaOutput;},v=>{v.receipts=[];},v=>{v.result.checkoutMediaOutput.mediaBindingHash='c'.repeat(64);},v=>{v.result.checkoutMediaOutput.requestId='other';},v=>{v.result.checkoutMediaOutput.sourceMessageIdHash='d'.repeat(64);},v=>{v.result.checkoutMediaOutput.operations=[{id:'fake',kind:'CLARIFICATION_REQUESTED'}];}]){const bad=structuredClone(input);change(bad);assert.equal(clarificationCapture(bad),null);}
});


test('native private preview media needs exact preview state, cart, receipt, identity and durable group',()=>{
 const input=checkoutMediaFixture(),w=input.result.checkoutMediaOutput;
 input.result.mode='PRIVATE_CODE_PATH';input.result.terminal.reason='PRIVATE_CHECKOUT_COMMITTED';delete input.result.codeOwnedOutput;input.generations=[];
 w.preview={id:'preview',hash:'sha256:'+('e'.repeat(64)),cartId:'cart',cartVersion:2};w.operations=[{id:'preview-op',kind:'PREVIEW_CREATED'}];input.receipts=[{operation_id:'preview-op',commandKind:'PREVIEW_CREATED',stateRevisionAfter:5}];
 Object.assign(input.state,{stage:'ORDER_PREVIEW',checkoutPreviewProof:structuredClone(w.preview),checkoutCartProof:{id:'cart',version:2}});
 assert(previewMediaCapture(input));
 const sourceSha='a'.repeat(40),outcome={terminal:{disposition:'CODE_OWNED_SEND',messages:input.messages,images:input.images},codeOwned:{kind:'NATIVE_PRIVATE_CODE_PATH',sourceSha,runtimeInputHash:'a'.repeat(64),nativeResult:input.result,nativeResultHash:digest(input.result),committedReceipts:input.receipts,authority:input.authority,state:input.state,executionIdentity:input.executionIdentity,acceptedOutbox:input.acceptedOutbox}};
 assert(validCodeOwned(outcome,[],sourceSha));
 for(const change of [v=>{v.state.checkoutPreviewProof.hash='sha256:'+('f'.repeat(64));},v=>{v.state.checkoutCartProof.version++;},v=>{v.receipts=[];},v=>{v.result.checkoutMediaOutput.mediaBindingHash='c'.repeat(64);},v=>{v.executionIdentity.requestId='other';},v=>{v.generations=[{role:'OWNER',status:'OK'}];}]){const bad=structuredClone(input);change(bad);assert.equal(previewMediaCapture(bad),null);}
 const modeOnly=structuredClone(outcome);delete modeOnly.codeOwned.nativeResult.checkoutMediaOutput;modeOnly.codeOwned.nativeResultHash=digest(modeOnly.codeOwned.nativeResult);assert.equal(validCodeOwned(modeOnly,[],sourceSha),false);
});
