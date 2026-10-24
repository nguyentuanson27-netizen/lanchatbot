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
const expected={
 EXCHANGE:'Em đã chuyển nhân viên hỗ trợ đổi hàng cho chị. Nhân viên sẽ xác nhận món cần đổi và hẹn giao đổi với chị nhé.',
 DEFECT:'Em đã chuyển nhân viên hỗ trợ lỗi sản phẩm cho chị. Nhân viên sẽ kiểm tra và hướng dẫn chị đổi/trả nhé.',
 CUSTOMER_REQUESTED_HUMAN:'Em chuyển nhân viên hỗ trợ chị nhé.',
 SIZE_RULE_UNAVAILABLE:'Em chuyển nhân viên chọn size cho chị nhé.',
};
for(const reason of Object.keys(expected))test('candidate '+reason+' uses its configured procedure only after committed handoff',async()=>{
 const scope=commerceScope(),policy=(await fixturePolicy()).bundle;
 policy.artifacts.handoffMatrix=structuredClone(matrix);
 let current={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:commerceNow}),revision:scope.revision}};
 let accepted=false,commits=0;
 const base=createReadOnlyTools({scope,clock,policy:async()=>({...await fixturePolicy(),bundle:policy}),catalog:{readProduct:async()=>{throw new Error('UNUSED');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const tools=createCommerceHandoffTools({base,scope,clock,policy:async()=>policy,read:async()=>structuredClone(current),commit:async({next})=>{commits++;if(!accepted)return false;current=next;return true;}});
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason}})).status,'REJECTED');
 assert.equal(await tools.terminalOutcome(),null);
 assert.equal(current.state.conversationOwner,'BOT');
 accepted=true;
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason}})).status,'OK');
 assert.equal(current.state.conversationOwner,'HUMAN');
 assert.deepEqual((await tools.terminalOutcome()).text,expected[reason]);
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason}})).status,'REJECTED');
 assert.equal(commits,2);
});
test('candidate changes only approved first-handoff messages and keeps other policies and every tag',async()=>{
 assert.deepEqual(matrix.rules.map(r=>r.reason),[...HANDOFF_REASONS_V2]);
 const policy=(await fixturePolicy()).bundle,scope=commerceScope();
 for(const reason of HANDOFF_REASONS_V2.filter(r=>r!=='ADMIN_REQUEST')){
  const original=selectCommerceHandoff(policy,scope,reason,clock());
  const configured=selectCommerceHandoff({...policy,artifacts:{...policy.artifacts,handoffMatrix:matrix}},scope,reason,clock());
  assert.equal(configured.tag,original.tag);
  assert.equal(configured.customerMessagePolicy,['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE'].includes(reason)?'HOLDING_REPLY_THEN_HANDOFF':original.customerMessagePolicy);
  if(!expected[reason])assert.deepEqual(configured.customerMessages,original.customerMessages);
 }
});
