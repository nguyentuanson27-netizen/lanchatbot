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
 EXCHANGE:'Shop đã nhận yêu cầu đổi hàng của chị. Bên em sẽ kiểm tra và báo cách xử lý tiếp nhé.',
 DEFECT:'Shop đã nhận thông tin chị báo lỗi sản phẩm. Bên em sẽ kiểm tra và hướng dẫn cách xử lý nhé.',
 CUSTOMER_REQUESTED_HUMAN:'Dạ, em đã chuyển lời nhắn của chị rồi ạ.',
 SIZE_RULE_UNAVAILABLE:'Bên em sẽ kiểm tra lại size mẫu này rồi tư vấn chị nhé.',
 DEPENDENCY_FAILURE:'Em chưa tra được thông tin này ngay. Shop sẽ kiểm tra lại rồi trả lời chị nhé.',
 RESPONSE_UNAVAILABLE:'Shop đã nhận yêu cầu của chị. Bên em sẽ kiểm tra rồi báo lại chị nhé.',
};
for(const reason of Object.keys(expected))test('candidate '+reason+' uses its configured procedure only after committed handoff',async()=>{
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
 assert.deepEqual(terminal.text,expected[reason]);
 assert.doesNotMatch(terminal.text,/nhân viên|bot/i);
 }
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason}})).status,'REJECTED');
 assert.equal(commits,1);
 }
});
test('candidate changes customer copy while keeping handoff policies and every tag',async()=>{
 assert.deepEqual(matrix.rules.map(r=>r.reason),[...HANDOFF_REASONS_V2]);
 const policy=(await fixturePolicy()).bundle,scope=commerceScope();
 for(const reason of HANDOFF_REASONS_V2.filter(r=>r!=='ADMIN_REQUEST')){
  const original=selectCommerceHandoff(policy,scope,reason,clock());
  const configured=selectCommerceHandoff({...policy,artifacts:{...policy.artifacts,handoffMatrix:matrix}},scope,reason,clock());
  const rule=matrix.rules.find(r=>r.reason===reason);
  assert.equal(configured.tag,original.tag);
  assert.equal(configured.customerMessagePolicy,rule.customerMessagePolicy);
  for(const message of configured.customerMessages)assert.doesNotMatch(message,/nhân viên|bot/i);
  assert.deepEqual(configured.customerMessages,rule.holdingReply===null?[]:[rule.holdingReply]);
 }
});
