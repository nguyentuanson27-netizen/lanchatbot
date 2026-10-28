import assert from 'node:assert/strict';
import {digest} from './qualification.mjs';
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
