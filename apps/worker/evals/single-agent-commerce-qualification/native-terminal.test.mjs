import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureNativeTerminal,capturedOutputViolations} from './native-terminal.mjs';
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
