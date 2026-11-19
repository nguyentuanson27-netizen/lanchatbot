import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evidence} from './fixtures.test-support.mjs';
import {registerSlots,evaluateQualification} from './qualification.mjs';
import {taskOutcomeSummary} from './task-outcomes.mjs';
test('proper handoff stays separate from sales completion and missing/error attempts remain counted',()=>{
 const e=evidence();
 for(const s of e.corpus.scenarios){s.judgeContext??={};s.judgeContext.sourceReadiness={spec:{cohort:s.mode==='SINGLE'?'SOURCE_UNAVAILABLE':'SALES_READY',task:{purpose:s.mode==='SINGLE'?'SHOP_GAP':'SALE'}}};}
 for(const slot of registerSlots(e.config,e.corpus)){const a=e.attempts.find(a=>a.caseId===slot.caseId&&a.arm===slot.arm);a.slotId=slot.slotId;}
 const handoff=e.attempts.find(a=>a.mode==='SINGLE'&&a.arm==='CANDIDATE');handoff.terminal.disposition='HANDOFF';handoff.quality.allExplicitNeedsResolved=false;
 const before=evaluateQualification(e),summary=taskOutcomeSummary(e.config,e.corpus,e.attempts);
 assert.equal(summary.registered,2);assert.equal(summary.groups.find(g=>g.purpose==='SHOP_GAP').properHandoff,1);
 assert.equal(summary.groups.find(g=>g.purpose==='SHOP_GAP').salesCompleted,0);assert.deepEqual(evaluateQualification(e),before);
 e.attempts=e.attempts.filter(a=>a!==handoff);const remaining=e.attempts.find(a=>a.arm==='CANDIDATE'&&a.mode==='JOURNEY');remaining.status='NOT_RUN';
 const missing=taskOutcomeSummary(e.config,e.corpus,e.attempts);assert.equal(missing.registered,2);assert.equal(missing.missing,1);
 assert.equal(missing.groups.reduce((n,g)=>n+g.notRun,0),1);
});

for(const [status,generations,expected] of [
 ['ERROR',[{status:'PROVIDER_ERROR'}],{errors:1,blocked:0,notRun:0,providerErrorAttempts:1,qualityUnknown:1}],
 ['ERROR',[{status:'OK'}],{errors:1,blocked:0,notRun:0,providerErrorAttempts:0,qualityUnknown:1}],
 ['NOT_RUN',[],{errors:0,blocked:0,notRun:1,providerErrorAttempts:0,qualityUnknown:1}],
 ['BLOCKED',[],{errors:0,blocked:1,notRun:0,providerErrorAttempts:0,qualityUnknown:1}]
])test(`task accounting preserves ${status} and generation ${generations[0]?.status??'NONE'}`,()=>{
 const e=evidence();
 for(const slot of registerSlots(e.config,e.corpus))e.attempts.find(a=>a.caseId===slot.caseId&&a.arm===slot.arm).slotId=slot.slotId;
 const a=e.attempts.find(a=>a.arm==='CANDIDATE'&&a.mode==='SINGLE');
 a.status=status;a.generations=generations;delete a.quality;
 const before=evaluateQualification(e);
 const summary=taskOutcomeSummary(e.config,e.corpus,e.attempts),g=summary.groups.find(g=>g.mode==='SINGLE');
 for(const [k,v] of Object.entries(expected))assert.equal(g[k],v,k);
 assert.equal(g.executed,0);assert.equal(summary.registered,2);
 assert.deepEqual(evaluateQualification(e),before);
});
