import assert from 'node:assert/strict';
import {digest} from './qualification.mjs';
export function selectCheckoutCustomerTurn(scenario,turnIndex,priorTerminal,witness,currentStateHash){
 assert(scenario.id==='c-20261104-checkout-complete'&&scenario.customerPolicy?.selector==='EVALUATOR_CODE_PROOF'&&turnIndex>0,'C_CHECKOUT_BRANCH_SCOPE');
 assert(witness&&witness.hash===digest(Object.fromEntries(Object.entries(witness).filter(([k])=>k!=='hash')))&&
  witness.stateHash===currentStateHash&&witness.priorOutcomeHash===digest(priorTerminal)&&typeof witness.requestId==='string'&&witness.requestId&&
  /^[a-f0-9]{64}$/.test(witness.sourceMessageIdHash??''),'C_CHECKOUT_BRANCH_PROOF');
 const policy=scenario.customerPolicy;assert(policy.hash===digest(policy.branches),'C_CHECKOUT_POLICY_HASH');
 const choices=policy.branches.filter(b=>b.turnIndex===turnIndex&&b.condition?.kind===witness.kind&&
  (witness.kind!=='MISSING_FIELD'||b.condition.field===witness.field));
 assert(choices.length===1,'C_CHECKOUT_BRANCH_NOT_FROZEN');const branch=choices[0];
 return {latest:branch.latest,selection:{kind:'REGISTERED_CODE_PROOF_SELECTED',actor:'EVALUATOR_CODE_PROOF',turnIndex,
  policyHash:policy.hash,priorOutcomeHash:witness.priorOutcomeHash,witnessHash:witness.hash,branchHash:digest(branch)}};
}
export function selectFrozenCustomerTurn(scenario,turnIndex,priorTerminal,choice=null){
 const t=scenario.turns[turnIndex];assert(t,'C_BRANCH_TURN');
 const priorOutcomeHash=digest(priorTerminal??null),policyHash=scenario.customerPolicy?.hash??null;
 if(!choice)return {latest:t.latest,selection:{kind:'REGISTERED_DEFAULT',turnIndex,policyHash,priorOutcomeHash}};
 assert(scenario.mode==='JOURNEY'&&turnIndex>0&&choice.actor==='HUMAN'&&choice.priorOutcomeHash===priorOutcomeHash&&
  choice.policyHash===policyHash&&typeof choice.reason==='string'&&choice.reason.trim(),'C_BRANCH_SELECTION_PROOF');
 const branch=scenario.customerPolicy.branches.find(b=>b.turnIndex===turnIndex&&b.latest===choice.latest);
 assert(branch,'C_BRANCH_NOT_FROZEN');
 return {latest:branch.latest,selection:{kind:'REGISTERED_ALTERNATE_HUMAN_SELECTED',turnIndex,policyHash,priorOutcomeHash,
  actor:'HUMAN',reason:choice.reason,branchHash:digest(branch)}};
}
