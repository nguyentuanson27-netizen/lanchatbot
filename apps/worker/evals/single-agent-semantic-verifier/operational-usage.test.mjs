import test from 'node:test';
import assert from 'node:assert/strict';
import {operational} from './run-a2.mjs';
import {a3Operational} from './run-a3.mjs';

test('operational totals retain both adapters usage without losing failed attempts or double counting',()=>{
  const attempts=[
    {provider:{status:'OK',providerRequests:1,usage:{input_tokens:12,output_tokens:8,inputTokens:999,outputTokens:999}}},
    {provider:{status:'OK',providerRequests:1,usage:{inputTokens:10,outputTokens:8,thinkingTokens:5}}},
    {provider:{status:'TIMEOUT',providerRequests:1,usage:null}},
    {provider:null},
  ];
  const result=operational(attempts);
  assert.equal(result.inputTokens,22);
  assert.equal(result.outputTokens,16); // Gemini output already includes thinking tokens.
  assert.equal(result.providerAttemptDenominator,3);
  assert.equal(result.providerRequests,3);
  assert.equal(result.timeoutCount,1);
  assert.equal(result.usageUnavailableCount,1);
  assert.equal(result.cost,null);
});

test('whole-reply operational report keeps owner and verifier token totals separate, including actual zero usage',()=>{
  const result=a3Operational([
    {conversation:{status:'OK',usage:{inputTokens:10,outputTokens:8,thinkingTokens:5}},
      verification:{provider:{status:'OK',usage:{input_tokens:12,output_tokens:8}}}},
    {conversation:{status:'OK',usage:{input_tokens:0,output_tokens:0,inputTokens:999,outputTokens:999}}},
  ]);
  assert.equal(result.conversation.inputTokens,10);
  assert.equal(result.conversation.outputTokens,8);
  assert.equal(result.verifier.inputTokens,12);
  assert.equal(result.verifier.outputTokens,8);
});
