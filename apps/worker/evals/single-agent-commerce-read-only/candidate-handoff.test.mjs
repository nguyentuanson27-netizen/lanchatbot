import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConversationState} from '@lana/conversation-engine';
import {isolatedHandoffRecords} from './candidate-handoff.mjs';
import {createCommerceHandoffTools} from '../../dist/single-agent-commerce-handoff.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {runCommerceTurn} from '../../dist/single-agent-commerce-read-only.js';
import {commerceNow,commerceScope,fixturePolicy,fixtureProduct} from '../../dist/single-agent-commerce.test-support.js';
const candidate=JSON.parse(readFileSync(new URL('./handoff-matrix.candidate.json',import.meta.url)));
const config={pageId:'1198992073286645',candidate};

test('silent candidate commits handoff without generating a partial reply, holding or media',async()=>{
 const scope=commerceScope(),policy=(await fixturePolicy()).bundle,clock=()=>new Date(candidate.sourceMetadata.observedAt);
 policy.artifacts.handoffMatrix=isolatedHandoffRecords([],config).records[0].version.content;
 let current={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:commerceNow}),revision:scope.revision}};
 const product=fixtureProduct();
 const base=createReadOnlyTools({scope,clock,policy:async()=>({...await fixturePolicy(),bundle:policy}),initialProducts:[product.product],
  catalog:{readProduct:async()=>product,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 await base.prepare();
 await base.invoke({name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}});
 let commits=0,owners=0,verifiers=0;
 const tools=createCommerceHandoffTools({base,scope,clock,policy:async()=>policy,read:async()=>structuredClone(current),
  deferredReply:{approvedHoldingHashes:[]},
  prepareSizeHandoffMedia:async()=>{throw Error('SILENT_HANDOFF_MUST_NOT_PREPARE_MEDIA');},
  commit:async change=>{commits++;assert.equal(change.reply,undefined);assert.equal(change.media,undefined);
   assert.deepEqual(change.decision.customerMessages,[]);current=change.next;return true;}});
 const result=await runCommerceTurn({scope,tools:{...tools,availableTools:['request_handoff']},clock,latest:'Em gửi chị ảnh khách mặc với, áo bao nhiêu?',history:[],
  ownerPrompt:'Tư vấn.',verifierPrompt:'Kiểm tra.',
  owner:async()=>{owners++;assert.equal(owners,1);return {kind:'TOOLS',calls:[{name:'request_handoff',args:{reason:'DEPENDENCY_FAILURE'}}],content:{role:'model',parts:[]}};},
  verifier:async()=>{verifiers++;throw Error('NO_CUSTOMER_DRAFT_TO_VERIFY');}});
 assert.equal(result.terminal.disposition,'HANDOFF');assert.equal(result.terminal.text,null);
 assert.equal(current.state.conversationOwner,'HUMAN');assert.equal(commits,1);assert.equal(owners,1);assert.equal(verifiers,0);
 assert.equal(result.terminalHandoffCalls,1);
});

test('isolated candidate creates a versioned, hashed matrix without modifying upstream pointers',()=>{
 const records=[],result=isolatedHandoffRecords(records,config);
 assert.deepEqual(records,[]);assert.equal(result.records.length,1);
 const {version,pointer}=result.records[0];
 assert.equal(version.content.kind,'HANDOFF_MATRIX');assert.equal(pointer.versionId,version.versionId);
 assert.match(version.contentHash,/^sha256:[a-f0-9]{64}$/);
 assert.equal(pointer.pageId,config.pageId);assert.equal(pointer.channel,'PUBLISHED');
 for(const reason of ['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE']){
  const rule=version.content.rules.find(r=>r.reason===reason);
  assert.equal(rule.customerMessagePolicy,'SILENT_HANDOFF');assert.equal(rule.holdingReply,null);
 }
});

test('upstream tags survive while all candidate reasons become silent without modifying the source',()=>{
 const content=structuredClone(candidate);content.rules.find(r=>r.reason==='EXCHANGE').holdingReply='Custom reply';
 content.rules.find(r=>r.reason==='CUSTOMER_REQUESTED_HUMAN').tag='VAN_DON';
 const original={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,revision:3,content},
  pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',revision:8}};
 const before=structuredClone(original),r=isolatedHandoffRecords([original],config).records[0];
 assert.deepEqual(original,before);assert.notEqual(r.version.versionId,'old');
 assert.equal(r.version.versionNumber,8);assert.equal(r.pointer.revision,9);
 assert.equal(r.version.content.rules.find(r=>r.reason==='EXCHANGE').holdingReply,candidate.rules.find(r=>r.reason==='EXCHANGE').holdingReply);
 assert.equal(r.version.content.rules.find(r=>r.reason==='CUSTOMER_REQUESTED_HUMAN').tag,'VAN_DON');
 assert.equal(r.version.content.rules.find(r=>r.reason==='DEPENDENCY_FAILURE').customerMessagePolicy,'SILENT_HANDOFF');
 for(const rule of content.rules.filter(r=>!['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE'].includes(r.reason))){
  const merged=r.version.content.rules.find(r=>r.reason===rule.reason);
  assert.equal(merged.customerMessagePolicy,rule.customerMessagePolicy);
  assert.equal(merged.tag,rule.tag);
  assert.equal(merged.holdingReply,null);
 }
});

test('upstream holding messages for missing price, stock, ETA and policy cannot reappear in candidate outcomes',()=>{
 const content=structuredClone(candidate),reasons=['PRICE_UNAVAILABLE','STOCK_UNAVAILABLE','ETA_UNAVAILABLE','POLICY_UNAVAILABLE'];
 for(const rule of content.rules.filter(r=>reasons.includes(r.reason))){rule.customerMessagePolicy='HOLDING_REPLY_THEN_HANDOFF';rule.holdingReply='Bên em kiểm tra rồi báo chị nhé.';}
 const upstream={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,content},pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',revision:8}};
 const merged=isolatedHandoffRecords([upstream],config).records[0].version.content;
 for(const reason of reasons){
  const rule=merged.rules.find(r=>r.reason===reason);assert.equal(rule.customerMessagePolicy,'SILENT_HANDOFF');
  assert.equal(rule.holdingReply,candidate.rules.find(r=>r.reason===reason).holdingReply);assert.equal(rule.tag,'NHAN_VIEN');
  assert.equal(rule.holdingReply,null);
 }
});

test('merged upstream holding cannot produce text on either failed or committed handoff',async()=>{
 const content=structuredClone(candidate);content.rules.find(r=>r.reason==='EXCHANGE').holdingReply='Old upstream staff wording';
 const original={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,revision:3,content},
  pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',revision:8}};
 const merged=isolatedHandoffRecords([original],config).records[0].version.content;
 for(const accepted of [false,true]){
 const scope={...commerceScope(),requestId:`merged-${accepted}`,sourceMessageId:`merged-source-${accepted}`},policy=(await fixturePolicy()).bundle,clock=()=>new Date(candidate.sourceMetadata.observedAt);
 policy.artifacts.handoffMatrix=merged;
 let current={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:commerceNow}),revision:scope.revision}};
 const base=createReadOnlyTools({scope,clock,policy:async()=>({...await fixturePolicy(),bundle:policy}),
  catalog:{readProduct:async()=>{throw new Error('UNUSED');},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const tools=createCommerceHandoffTools({base,scope,clock,policy:async()=>policy,read:async()=>structuredClone(current),
  commit:async({next})=>{if(!accepted)return false;current=next;return true;}});
 assert.equal((await tools.invoke({name:'request_handoff',args:{reason:'EXCHANGE'}})).status,accepted?'OK':'REJECTED');
 if(!accepted){assert.equal((await tools.terminalOutcome()).disposition,'NO_SEND');assert.equal((await tools.invoke({name:'request_handoff',args:{reason:'EXCHANGE'}})).status,'REJECTED');continue;}
 const terminal=await tools.terminalOutcome();
 assert.equal(terminal.disposition,'HANDOFF');
 assert.equal(terminal.text,candidate.rules.find(r=>r.reason==='EXCHANGE').holdingReply);
 assert.equal(terminal.text,null);
 assert.equal(original.version.content.rules.find(r=>r.reason==='EXCHANGE').holdingReply,'Old upstream staff wording');
 }
});
