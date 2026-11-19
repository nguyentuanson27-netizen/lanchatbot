import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCapturedSupport,readCompletedAttempts} from './support-source-screen.mjs';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readCompactSections} from '../single-agent-commerce-read-only/owner-data-presentation.mjs';

for(const final of [false,true])test('replay uses only approved support fields and retains all other wire bytes '+final,()=>{
 const pending={status:'NOT_EVALUATED',pendingRef:'pending',evaluation:{by:'CODE',when:'MATCHING_CART_OPENS',waitingFor:['CUSTOMER_PURCHASE_CHOICE'],meaning:'process'}};
 const trace=[{role:'model',parts:[{functionCall:{name:'record_negotiation',args:{sourceQuote:'Bớt cho chị nhé'}},thoughtSignature:'signed'}]},
  {role:'user',parts:[{functionResponse:{name:'record_negotiation',id:'call',response:{status:'OK',data:{operationId:'op',pendingSupport:pending,supportEvaluation:{status:'NOT_EVALUATED',meaning:'process'}}}}}]},
  {role:'user',parts:[{functionResponse:{name:'quote_product',id:'quote',response:{status:'OK',data:{preCartQuote:{grandTotalVnd:529000},supportEvaluation:{status:'NOT_EVALUATED',missing:['CART'],meaning:'process'}}}}}]}];
 const sections=[{label:'Hồ sơ và trạng thái hiện tại',value:{pendingSupport:pending}},
  {label:'Giá, tồn và kết quả đã xác minh',value:[{type:'PRICE',value:{amountVnd:499000}}]}];
 if(final)sections.push({label:'Lịch sử công cụ đã hoàn tất',value:[{completedToolTurns:trace}]});
 const baseline={systemInstruction:{parts:[{text:'prompt'}]},contents:[{role:'user',parts:[{text:sections.map(s=>s.label+'\n'+JSON.stringify(s.value)).join('\n\n')}]},
  {role:'user',parts:[{text:'Chị lấy hai áo.'}]},...(final?[]:trace)],tools:[],generationConfig:{maxOutputTokens:8192}};
 const original=structuredClone(baseline),t=projectCapturedSupport(baseline),parsed=readCompactSections(t.contents[0]);
 assert.deepEqual(baseline,original);assert.deepEqual(t.systemInstruction,baseline.systemInstruction);
 assert.deepEqual(t.generationConfig,baseline.generationConfig);assert.deepEqual(t.contents[1],baseline.contents[1]);
 assert.deepEqual(parsed[1],sections[1]);assert.deepEqual(parsed[0].value.pendingSupport.evaluation,{by:'CODE',when:'MATCHING_CART_OPENS',waitingFor:[],waitingForStatus:'UNKNOWN'});
 const projected=final?parsed[2].value[0].completedToolTurns:t.contents.slice(2);
 assert.deepEqual(projected[0],trace[0]);assert.equal(projected[1].parts[0].functionResponse.id,'call');
 assert.equal(projected[1].parts[0].functionResponse.response.data.operationId,'op');
 assert.deepEqual(projected[2].parts[0].functionResponse.response.data.preCartQuote,{grandTotalVnd:529000});
 assert.deepEqual(projected[2].parts[0].functionResponse.response.data.supportEvaluation,{status:'NOT_EVALUATED',missing:['CART']});
});
test('resume preserves completed errors and refuses unknown completion without replay',()=>{
 const directory=mkdtempSync(join(tmpdir(),'support-source-resume-'));
 const reg={source:'old',slots:[{id:'id',order:[0,1],armHashes:['hash0','hash1']}]};
 const file=(suffix,value)=>writeFileSync(join(directory,'id-0.'+suffix+'.json'),JSON.stringify(value));
 file('started',{});assert.throws(()=>readCompletedAttempts(reg,directory),/UNKNOWN_COMPLETION/u);
 file('result',{id:'id',arm:0,status:'PROVIDER_ERROR',text:null,telemetry:{requestHash:'hash0',providerRequests:1}});
 const rows=readCompletedAttempts(reg,directory);assert.equal(rows.length,1);assert.equal(rows[0].status,'PROVIDER_ERROR');assert.equal(rows[0].originalSource,'old');
 file('result',{id:'id',arm:0,telemetry:{requestHash:'changed',providerRequests:1}});
 assert.throws(()=>readCompletedAttempts(reg,directory),/RESUME_BINDING/u);
});
