import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGeminiGeneration,createGeminiCommerceInference} from './gemini-inference.mjs';
import {commerceScope,commerceNow,fixtureProduct,fixturePolicy} from '../../dist/single-agent-commerce.test-support.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';

test('tool parse diagnostic uses code-defined identifiers, never model values or unknown field names',()=>{
 const body={candidates:[{finishReason:'STOP',content:{role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'SM613',selection:'PRIVATE_VALUE',PRIVATE_FIELD:'secret'}}}]}}]};
 assert.throws(()=>parseGeminiGeneration(body),e=>{
  assert.deepEqual(e.toolOutputDiagnostic,{schemaCode:'OWNER_TOOL_OUTPUT',tool:'read_product',field:'UNKNOWN_FIELD',valueType:'OBJECT'});
  assert(!JSON.stringify(e.toolOutputDiagnostic).includes('PRIVATE'));return true;
 });
});

test('HTTP200 output-contract error retains one request, tokens, completion stage and sanitized diagnostic',async()=>{
 const product=fixtureProduct(),tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,initialProducts:[product.product],policy:fixturePolicy,
  catalog:{readProduct:async()=>product,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const infer=createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test-project'},{getToken:async()=>'mock-token',fetchImpl:async()=>new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',
  usageMetadata:{promptTokenCount:100,candidatesTokenCount:5,thoughtsTokenCount:20},candidates:[{finishReason:'STOP',content:{role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'SM613',selection:'UNKNOWN_PRIVATE'}}}]}}]}))});
 await assert.rejects(infer({generationId:'synthetic-generation',instructions:'Tư vấn',context:tools.snapshot(),contents:[{role:'user',parts:[{text:'Áo bao nhiêu?'}]}],toolsAllowed:true,
  toolBudget:{roundsRemaining:2,callsRemaining:6},signal:new AbortController().signal}),e=>{
   assert.equal(e.telemetry.httpStatus,200);assert.equal(e.telemetry.providerRequests,1);assert.equal(e.telemetry.inputTokens,100);assert.equal(e.telemetry.outputTokens,25);
   assert.equal(e.telemetry.failureStage,'COMPLETION');assert.equal(e.telemetry.failureCode,'OWNER_TOOL_OUTPUT');
   assert.equal(e.telemetry.toolOutputDiagnostic.field,'selection');assert(!JSON.stringify(e.telemetry).includes('UNKNOWN_PRIVATE'));return true;
  });
});
