import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HandoffMatrixAdminContentV1Schema} from '@lana/contracts';
import {HANDOFF_REASONS_V2} from '@lana/conversation-engine';
import {selectCommerceHandoff,createCommerceHandoffTools} from '../../dist/single-agent-commerce-handoff.js';
import {commerceNow,commerceScope,fixturePolicy} from '../../dist/single-agent-commerce.test-support.js';
import {createConversationState} from '@lana/conversation-engine';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';

const matrix=HandoffMatrixAdminContentV1Schema.parse(JSON.parse(readFileSync(new URL('./handoff-matrix.candidate.json',import.meta.url))));
const clock=()=>new Date(matrix.sourceMetadata.observedAt);
for(const reason of HANDOFF_REASONS_V2.filter(r=>r!=='ADMIN_REQUEST'))test('candidate '+reason+' hands off without a customer message',async()=>{
 for(const accepted of [false,true]){
 const scope={...commerceScope(),requestId:`${reason}-${accepted}`,sourceMessageId:`source-${reason}-${accepted}`},policy=(await fixturePolicy()).bundle;
 policy.artifacts.handoffMatrix=structuredClone(matrix);
 let current={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:commerceNow}),revision:scope.revision}};
 let commits=0;
 const base=createReadOnlyTools({scope,clock,policy:async()=>({...await fixturePolicy(),bundle:policy}),catalog:{readProduct:async()=>{throw new Error('UNUSED');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const tools=createCommerceHandoffTools({base,scope,clock,policy:async()=>policy,read:async()=>structuredClone(current),commit:async({next})=>{commits++;if(!accepted)return false;current=next;return true;}});
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason}})).status,accepted?'OK':'REJECTED');
 if(!accepted){assert.equal((await tools.terminalOutcome()).disposition,'NO_SEND');assert.equal(current.state.conversationOwner,'BOT');}
 else {
 assert.equal(current.state.conversationOwner,'HUMAN');
 const terminal=await tools.terminalOutcome();
 assert.equal(terminal.disposition,'HANDOFF');
 assert.equal(terminal.text,null);
 }
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason}})).status,'REJECTED');
 assert.equal(commits,1);
 }
});
test('silent candidate covers every reason and keeps existing routing tags',async()=>{
 assert.deepEqual(matrix.rules.map(r=>r.reason),[...HANDOFF_REASONS_V2]);
 const policy=(await fixturePolicy()).bundle,scope=commerceScope();
 for(const reason of HANDOFF_REASONS_V2.filter(r=>r!=='ADMIN_REQUEST')){
  const original=selectCommerceHandoff(policy,scope,reason,clock());
  const configured=selectCommerceHandoff({...policy,artifacts:{...policy.artifacts,handoffMatrix:matrix}},scope,reason,clock());
  const rule=matrix.rules.find(r=>r.reason===reason);
  assert.equal(configured.tag,original.tag);
  assert.equal(configured.customerMessagePolicy,rule.customerMessagePolicy);
  assert.equal(configured.customerMessagePolicy,'SILENT_HANDOFF');
  assert.deepEqual(configured.customerMessages,[]);
  assert.deepEqual(configured.customerMessages,rule.holdingReply===null?[]:[rule.holdingReply]);
 }
});
