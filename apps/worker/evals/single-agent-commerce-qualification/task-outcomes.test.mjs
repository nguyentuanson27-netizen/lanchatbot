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
