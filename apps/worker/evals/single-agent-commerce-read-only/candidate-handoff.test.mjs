import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConversationState} from '@lana/conversation-engine';
import {isolatedHandoffRecords} from './candidate-handoff.mjs';
import {createCommerceHandoffTools} from '../../dist/single-agent-commerce-handoff.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {commerceNow,commerceScope,fixturePolicy} from '../../dist/single-agent-commerce.test-support.js';
const candidate=JSON.parse(readFileSync(new URL('./handoff-matrix.candidate.json',import.meta.url)));
const config={pageId:'1198992073286645',candidate};

test('isolated candidate creates a versioned, hashed matrix without modifying upstream pointers',()=>{
 const records=[],result=isolatedHandoffRecords(records,config);
 assert.deepEqual(records,[]);assert.equal(result.records.length,1);
 const {version,pointer}=result.records[0];
 assert.equal(version.content.kind,'HANDOFF_MATRIX');assert.equal(pointer.versionId,version.versionId);
 assert.match(version.contentHash,/^sha256:[a-f0-9]{64}$/);
 assert.equal(pointer.pageId,config.pageId);assert.equal(pointer.channel,'PUBLISHED');
 for(const reason of ['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE']){
  const rule=version.content.rules.find(r=>r.reason===reason);
  assert.equal(rule.customerMessagePolicy,'HOLDING_REPLY_THEN_HANDOFF');assert.ok(rule.holdingReply);
 }
});

test('upstream tags survive while owner-approved missing-information rules use candidate holding copy',()=>{
 const content=structuredClone(candidate);content.rules.find(r=>r.reason==='EXCHANGE').holdingReply='Custom reply';
 content.rules.find(r=>r.reason==='CUSTOMER_REQUESTED_HUMAN').tag='VAN_DON';
 const original={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,revision:3,content},
  pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',revision:8}};
 const before=structuredClone(original),r=isolatedHandoffRecords([original],config).records[0];
 assert.deepEqual(original,before);assert.notEqual(r.version.versionId,'old');
 assert.equal(r.version.versionNumber,8);assert.equal(r.pointer.revision,9);
 assert.equal(r.version.content.rules.find(r=>r.reason==='EXCHANGE').holdingReply,candidate.rules.find(r=>r.reason==='EXCHANGE').holdingReply);
 assert.equal(r.version.content.rules.find(r=>r.reason==='CUSTOMER_REQUESTED_HUMAN').tag,'VAN_DON');
 assert.equal(r.version.content.rules.find(r=>r.reason==='DEPENDENCY_FAILURE').customerMessagePolicy,'HOLDING_REPLY_THEN_HANDOFF');
 for(const rule of content.rules.filter(r=>!['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE'].includes(r.reason))){
  const merged=r.version.content.rules.find(r=>r.reason===rule.reason);
  assert.equal(merged.customerMessagePolicy,rule.customerMessagePolicy);
  assert.equal(merged.tag,rule.tag);
  if(merged.customerMessagePolicy==='HOLDING_REPLY_THEN_HANDOFF')
   assert.equal(merged.holdingReply,candidate.rules.find(r=>r.reason===rule.reason).holdingReply);
 }
});

test('missing price, stock, ETA and policy activate holding handoff even when the old candidate was silent',()=>{
 const content=structuredClone(candidate),reasons=['PRICE_UNAVAILABLE','STOCK_UNAVAILABLE','ETA_UNAVAILABLE','POLICY_UNAVAILABLE'];
 for(const rule of content.rules.filter(r=>reasons.includes(r.reason))){rule.customerMessagePolicy='SILENT_HANDOFF';rule.holdingReply=null;}
 const upstream={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,content},pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',revision:8}};
 const merged=isolatedHandoffRecords([upstream],config).records[0].version.content;
 for(const reason of reasons){
  const rule=merged.rules.find(r=>r.reason===reason);assert.equal(rule.customerMessagePolicy,'HOLDING_REPLY_THEN_HANDOFF');
  assert.equal(rule.holdingReply,candidate.rules.find(r=>r.reason===reason).holdingReply);assert.equal(rule.tag,'NHAN_VIEN');
  assert.doesNotMatch(rule.holdingReply,/nhân viên|bot/i);
 }
});

test('candidate fails closed if an upstream holding policy has no approved customer copy',()=>{
 const content=structuredClone(candidate),rule=content.rules.find(r=>r.reason==='UNSUPPORTED_REQUEST');
 rule.customerMessagePolicy='HOLDING_REPLY_THEN_HANDOFF';rule.holdingReply='Custom upstream copy';
 const original={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,revision:3,content},
  pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',revision:8}};
 assert.throws(()=>isolatedHandoffRecords([original],config),/CANDIDATE_COPY_UNAVAILABLE/);
});

test('merged upstream copy is replaced in the actual terminal only after a committed handoff',async()=>{
 const content=structuredClone(candidate);content.rules.find(r=>r.reason==='EXCHANGE').holdingReply='Old upstream staff wording';
 const original={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,revision:3,content},
  pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',revision:8}};
 const merged=isolatedHandoffRecords([original],config).records[0].version.content;
 const scope=commerceScope(),policy=(await fixturePolicy()).bundle,clock=()=>new Date(candidate.sourceMetadata.observedAt);
 policy.artifacts.handoffMatrix=merged;
 let current={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:commerceNow}),revision:scope.revision}};
 const base=createReadOnlyTools({scope,clock,policy:async()=>({...await fixturePolicy(),bundle:policy}),
  catalog:{readProduct:async()=>{throw new Error('UNUSED');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 let accepted=false;
 const tools=createCommerceHandoffTools({base,scope,clock,policy:async()=>policy,read:async()=>structuredClone(current),
  commit:async({next})=>{if(!accepted)return false;current=next;return true;}});
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason:'EXCHANGE'}})).status,'REJECTED');
 assert.equal(await tools.terminalOutcome(),null);
 accepted=true;
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason:'EXCHANGE'}})).status,'OK');
 const terminal=await tools.terminalOutcome();
 assert.equal(terminal.disposition,'HANDOFF');
 assert.equal(terminal.text,candidate.rules.find(r=>r.reason==='EXCHANGE').holdingReply);
 assert.doesNotMatch(terminal.text,/nhân viên|bot/i);
 assert.equal(original.version.content.rules.find(r=>r.reason==='EXCHANGE').holdingReply,'Old upstream staff wording');
});
