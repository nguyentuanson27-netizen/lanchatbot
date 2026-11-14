import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from './fixtures.test-support.mjs';
import {digest} from './qualification.mjs';
import {selectFrozenCustomerTurn,selectCheckoutCustomerTurn} from './customer-branches.mjs';

test('checkout branches require code proof for the exact frozen state and prior output',()=>{
 const terminal={disposition:'CODE_OWNED_SEND',messages:['Chị cho em tên người nhận nhé.'],images:[]},stateHash='a'.repeat(64);
 const branch={turnIndex:1,latest:'Mai Anh nhé em.',condition:{kind:'MISSING_FIELD',field:'FULL_NAME'}},
  scenario={id:'c-20261104-checkout-complete',mode:'JOURNEY',turns:[{}, {latest:'Em lên đơn cho chị nhé.'}],customerPolicy:{selector:'EVALUATOR_CODE_PROOF',branches:[branch],hash:digest([branch])}},
  value={kind:'MISSING_FIELD',field:'FULL_NAME',stateHash,priorOutcomeHash:digest(terminal),requestId:'r',sourceMessageIdHash:'b'.repeat(64)},w={...value,hash:digest(value)};
 const chosen=selectCheckoutCustomerTurn(scenario,1,terminal,w,stateHash);
 assert.equal(chosen.latest,branch.latest);assert.equal(chosen.selection.actor,'EVALUATOR_CODE_PROOF');
 assert.throws(()=>selectCheckoutCustomerTurn(scenario,1,terminal,w,'c'.repeat(64)),/PROOF/);
 assert.throws(()=>selectCheckoutCustomerTurn(scenario,1,terminal,{...w,field:'PHONE'},stateHash),/PROOF/);
 assert.throws(()=>selectCheckoutCustomerTurn(scenario,1,terminal,null,stateHash),/PROOF/);
});
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
