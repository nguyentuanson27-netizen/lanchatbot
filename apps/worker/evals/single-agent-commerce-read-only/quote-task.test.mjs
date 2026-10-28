import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from '../../dist/single-agent-commerce.test-support.js';
import {EXPLICIT_QUOTE_TASK} from '../../dist/single-agent-commerce-quote.js';
import {buildGeminiCommerceRequest,parseGeminiGeneration,createGeminiCommerceInference} from './gemini-inference.mjs';
import {validateProtocol,validateToolWorkAccounting} from './protocol.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';
import {statefulToolSchemaHash} from './stateful-provider.mjs';
import {quoteDeclarations} from './gemini-inference.mjs';

async function request(){
 const f=fixtureProduct(),t=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,entry:{firstContact:true,fromAd:false},initialProducts:[f.product],policy:fixturePolicy,catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const r=await t.invoke({name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}});
 r.data.quoteTaskStatus='PREPARED_PENDING_FINAL_GATE';r.data.media={subjectRef:'SM613',assets:[{assetRef:'asset:INTERNAL',imageType:'MODEL',angle:'FRONT'}],descriptionEvidence:{color:null,assets:[]},delivery:'PENDING_FINAL_GATE'};
 return {generationId:'q:owner:2',instructions:'Tư vấn',context:t.snapshot(),toolWorkAccounting:'PRIMITIVE_WORK_V2',toolBudget:{roundsRemaining:1,callsRemaining:3},toolsAllowed:true,availableTools:['read_product','quote_product'],caseId:'EVAL_ONLY_Q',evaluator:{expected:'EVAL_ONLY_LABEL'},contents:[{role:'user',parts:[{text:'Áo này bao nhiêu em?'}]},{role:'model',parts:[{functionCall:{name:'quote_product',args:{subjectRef:'SM613',offerTypes:['DIRECT']}},thoughtSignature:'signature'}]},{role:'user',parts:[{functionResponse:{name:'quote_product',response:r}}]}],signal:new AbortController().signal};
}
test('quote strict declaration, native result projection and actual HTTP request match',async()=>{
 const r=await request(),before=structuredClone({...r,signal:undefined});let wire;
 await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',projectId:'test-project',location:'global'},{getToken:async()=>'mock-token',fetchImpl:async(_url,init)=>{
  wire=JSON.parse(init.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Áo 499.000đ chị nhé.'}]}}]}));
 }})(r);
 const d=wire.tools[0].functionDeclarations.find(d=>d.name==='quote_product');
 assert.equal(d.parametersJsonSchema.additionalProperties,false);assert.deepEqual(d.parametersJsonSchema.properties.subjectRef.enum,['SM613']);
 assert.equal(d.parametersJsonSchema.properties.offerTypes.maxItems,2);assert(!d.parameters);
 const result=wire.contents.at(-1).parts[0].functionResponse.response.data;
 assert.equal(result.sellingOptions[0].offerType,'DIRECT');assert.equal(result.media.assets[0].assetRef,undefined);assert.equal(result.media.descriptionEvidence.color,null);
 assert(!Object.hasOwn(result,'content'));assert(!JSON.stringify(wire).includes('EVAL_ONLY'));assert.deepEqual({...r,signal:undefined},before);
 assert.equal(JSON.parse(wire.contents[0].parts[0].text).trusted.execution.toolBudget.accounting,'PRIMITIVE_WORK_V2');
});
test('final-only CompactV2 keeps projected quote trace but grants no new call',async()=>{
 const r=await request();r.toolsAllowed=false;r.ownerContextPresentation='VI_DATA_BLOCKS_COMPACT_V2';
 const w=buildGeminiCommerceRequest(r);assert.deepEqual(w.tools,[]);
 const sections=readCompactSections(w.contents[0]),trace=sections.find(s=>s.label==='Lịch sử công cụ đã hoàn tất').value;
 assert.equal(trace[0].completedToolTurns[1].parts[0].functionResponse.response.data.media.assets[0].assetRef,undefined);
 assert(!JSON.stringify(w).includes('asset:INTERNAL'));
});
test('quote parse rejects extra fields/duplicate offers and preserves signed content',()=>{
 const body=args=>({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{functionCall:{name:'quote_product',args},thoughtSignature:'signed'}]}}]});
 assert.equal(parseGeminiGeneration(body({subjectRef:'SM613',offerTypes:['DIRECT']})).content.parts[0].thoughtSignature,'signed');
 for(const args of [{subjectRef:'SM613',offerTypes:['DIRECT','DIRECT']},{subjectRef:'SM613',offerTypes:['DIRECT'],skipMedia:true},{subjectRef:'SM613',offerTypes:['DIRECT'],color:null}])assert.throws(()=>parseGeminiGeneration(body(args)),/OWNER_TOOL_OUTPUT/);
});
test('phase/budget and primitive accounting are bound; legacy configuration remains valid',async()=>{
 const r=await request();r.toolBudget.callsRemaining=1;assert(!buildGeminiCommerceRequest(r).tools[0].functionDeclarations.some(d=>d.name==='quote_product'));
 const m=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));validateProtocol(m);delete m.quoteTask;validateProtocol(m);
 m.quoteTask={...EXPLICIT_QUOTE_TASK,normalUnits:1};assert.throws(()=>validateProtocol(m),/QUOTE_TASK_CONFIG/);
 const result={toolWorkAccounting:'PRIMITIVE_WORK_V2',normalToolCalls:3,terminalHandoffCalls:1,toolCalls:4,executedNormalToolInvocations:2,executedToolInvocations:3,quoteTaskWork:[{reservedUnits:2,readInvocations:1,selectionInvocations:0}]};validateToolWorkAccounting(result);
 for(const x of [{...result,executedToolInvocations:4},{...result,normalToolCalls:7},{...result,quoteTaskWork:[{reservedUnits:1,readInvocations:1,selectionInvocations:0}]}])assert.throws(()=>validateToolWorkAccounting(x));
 validateToolWorkAccounting({normalToolCalls:2});
 validateToolWorkAccounting({...result,executedNormalToolInvocations:1,executedToolInvocations:2,quoteTaskWork:[{reservedUnits:2,readInvocations:0,selectionInvocations:0}]});
});
test('registered tool schema includes quote only when enabled, and binds its exact schema',()=>{
 const changed=structuredClone(quoteDeclarations);changed[0].parametersJsonSchema.properties.offerTypes.maxItems=1;
 assert.notEqual(statefulToolSchemaHash({quoteTask:EXPLICIT_QUOTE_TASK}),statefulToolSchemaHash({quoteTask:EXPLICIT_QUOTE_TASK},changed));
 assert.equal(statefulToolSchemaHash({}),statefulToolSchemaHash({},changed));
 assert.notEqual(statefulToolSchemaHash({}),statefulToolSchemaHash({quoteTask:EXPLICIT_QUOTE_TASK}));
});
