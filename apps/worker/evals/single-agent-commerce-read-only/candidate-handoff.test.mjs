import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isolatedHandoffRecords} from './candidate-handoff.mjs';
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

test('custom upstream rules and tags survive; only three message policies change, under new identity',()=>{
 const content=structuredClone(candidate);content.rules.find(r=>r.reason==='EXCHANGE').holdingReply='Custom reply';
 content.rules.find(r=>r.reason==='CUSTOMER_REQUESTED_HUMAN').tag='VAN_DON';
 const original={version:{versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',versionNumber:7,revision:3,content},
  pointer:{pointerId:'pointer',versionId:'old',artifactKey:'matrix:custom',artifactKind:'HANDOFF_MATRIX',revision:8}};
 const before=structuredClone(original),r=isolatedHandoffRecords([original],config).records[0];
 assert.deepEqual(original,before);assert.notEqual(r.version.versionId,'old');
 assert.equal(r.version.versionNumber,8);assert.equal(r.pointer.revision,9);
 assert.equal(r.version.content.rules.find(r=>r.reason==='EXCHANGE').holdingReply,'Custom reply');
 assert.equal(r.version.content.rules.find(r=>r.reason==='CUSTOMER_REQUESTED_HUMAN').tag,'VAN_DON');
 assert.equal(r.version.content.rules.find(r=>r.reason==='DEPENDENCY_FAILURE').customerMessagePolicy,'HOLDING_REPLY_THEN_HANDOFF');
 for(const rule of content.rules.filter(r=>!['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE'].includes(r.reason)))
  assert.deepEqual(r.version.content.rules.find(r=>r.reason===rule.reason),rule);
});
