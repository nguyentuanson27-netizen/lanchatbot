import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureNativeTerminal,capturedOutputViolations,clarificationCapture} from './native-terminal.mjs';
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
