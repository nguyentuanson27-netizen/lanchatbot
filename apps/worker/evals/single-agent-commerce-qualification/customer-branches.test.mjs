import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from './fixtures.test-support.mjs';
import {digest} from './qualification.mjs';
import {selectFrozenCustomerTurn} from './customer-branches.mjs';
test('default turns are recorded as defaults, never claimed as adaptive simulated customers',()=>{
 const s=corpus().scenarios.find(s=>s.mode==='JOURNEY'),terminal={disposition:'SEND_ELIGIBLE',messages:['Chị lấy cỡ nào?'],images:[]},
  selected=selectFrozenCustomerTurn(s,1,terminal);
 assert.equal(selected.latest,s.turns[1].latest);assert.equal(selected.selection.kind,'REGISTERED_DEFAULT');
 assert.equal(selected.selection.priorOutcomeHash,digest(terminal));
});
test('a human can select only a frozen alternate tied to the exact prior customer outcome',()=>{
 const s=corpus().scenarios.find(s=>s.mode==='JOURNEY'),terminal={disposition:'SEND_ELIGIBLE',messages:['Chị muốn cỡ nào?'],images:[]},
  choice={actor:'HUMAN',latest:s.customerPolicy.branches[0].latest,priorOutcomeHash:digest(terminal),policyHash:s.customerPolicy.hash,reason:'Shop asks which size.'};
 const selected=selectFrozenCustomerTurn(s,1,terminal,choice);assert.equal(selected.selection.kind,'REGISTERED_ALTERNATE_HUMAN_SELECTED');
 assert.throws(()=>selectFrozenCustomerTurn(s,1,{...terminal,messages:['A different reply']},choice),/PROOF/);
 assert.throws(()=>selectFrozenCustomerTurn(s,1,terminal,{...choice,latest:'A new unregistered question'}),/NOT_FROZEN/);
});
