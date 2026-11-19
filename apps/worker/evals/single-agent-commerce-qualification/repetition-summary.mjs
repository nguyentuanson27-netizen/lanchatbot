// Development measurement only (owner decision D3, 2026-11-10). Turns repeated attempts of the same cases
// on one frozen world into a pass count per case, so a change is accepted or reverted on evidence that
// exceeds run-to-run variation. It grades nothing itself: the caller supplies what "passed" means.
import assert from 'node:assert/strict';

export const REPETITION_POLICY=Object.freeze({minimumRepetitions:5,passAtLeast:4,stableFailAtMost:1,regressionDrop:2});
const classify=(passed,graded,policy)=>graded<policy.minimumRepetitions?'UNDER_SAMPLED':
 passed>=graded-(policy.minimumRepetitions-policy.passAtLeast)?'STABLE_PASS':passed<=policy.stableFailAtMost?'STABLE_FAIL':'FLAKY';

/** attempts: [{caseId,repetition,status,terminal?}]. passed(attempt) → true | false | null (not gradable). */
export function summarizeRepetitions(attempts,passed,policy=REPETITION_POLICY){
 assert(Array.isArray(attempts)&&typeof passed==='function','REPETITION_INPUT');
 const cases=new Map();
 for(const a of attempts){
  assert(typeof a.caseId==='string'&&Number.isInteger(a.repetition)&&a.repetition>=1,'REPETITION_ATTEMPT');
  if(!cases.has(a.caseId))cases.set(a.caseId,{caseId:a.caseId,registered:0,passed:0,failed:0,ungraded:0,notRun:0,repetitions:[],terminals:{}});
  const c=cases.get(a.caseId);assert(!c.repetitions.includes(a.repetition),'REPETITION_DUPLICATE');
  c.repetitions.push(a.repetition);c.registered++;
  // Every registered repetition stays in the denominator: one that did not run is not a pass.
  if(a.status!=='EXECUTED'){c.notRun++;c.failed++;continue;}
  const key=`${a.terminal?.disposition??'NONE'}/${a.terminal?.reason??'NONE'}`;c.terminals[key]=(c.terminals[key]??0)+1;
  const verdict=passed(a);
  if(verdict===true)c.passed++;else if(verdict===false)c.failed++;else c.ungraded++;
 }
 const rows=[...cases.values()].map(c=>{const graded=c.passed+c.failed;
  return {...c,repetitions:c.repetitions.sort((x,y)=>x-y),graded,classification:c.ungraded?'UNGRADED':classify(c.passed,graded,policy)};});
 const count=k=>rows.filter(r=>r.classification===k).length;
 return {kind:'DEVELOPMENT_REPETITION_SUMMARY_V1',policy,cases:rows,
  totals:{cases:rows.length,stablePass:count('STABLE_PASS'),flaky:count('FLAKY'),stableFail:count('STABLE_FAIL'),underSampled:count('UNDER_SAMPLED'),ungraded:count('UNGRADED')}};
}

/** Accept a change only when its target cases reach the pass bar and no other case loses more than run-to-run variation. */
export function compareRuns(before,after,targetCaseIds,policy=REPETITION_POLICY){
 assert(before?.kind==='DEVELOPMENT_REPETITION_SUMMARY_V1'&&after?.kind===before.kind&&Array.isArray(targetCaseIds),'COMPARISON_INPUT');
 const b=new Map(before.cases.map(c=>[c.caseId,c])),a=new Map(after.cases.map(c=>[c.caseId,c]));
 assert(b.size===a.size&&[...b.keys()].every(k=>a.has(k)),'COMPARISON_POPULATION_CHANGED');
 assert(targetCaseIds.every(k=>a.has(k)),'COMPARISON_TARGET_UNKNOWN');
 const incomparable=[...a.values()].filter(c=>['UNDER_SAMPLED','UNGRADED'].includes(c.classification)||['UNDER_SAMPLED','UNGRADED'].includes(b.get(c.caseId).classification)).map(c=>c.caseId);
 const targetsMissed=targetCaseIds.filter(k=>a.get(k).classification!=='STABLE_PASS');
 const regressions=[...a.values()].filter(c=>b.get(c.caseId).passed-c.passed>=policy.regressionDrop).map(c=>({caseId:c.caseId,before:b.get(c.caseId).passed,after:c.passed}));
 return {decision:incomparable.length?'NOT_COMPARABLE':targetsMissed.length||regressions.length?'REVERT':'ACCEPT',targetsMissed,regressions,incomparable};
}
