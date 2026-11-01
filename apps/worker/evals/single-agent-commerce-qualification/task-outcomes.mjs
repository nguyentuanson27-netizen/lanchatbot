// Development attribution only. Does not change qualification grades or thresholds.
import {registerSlots} from './qualification.mjs';
export function taskOutcomeSummary(config,corpus,attempts){
 const slots=registerSlots(config,corpus).filter(s=>s.arm==='CANDIDATE'&&s.mode!=='SAFETY'),groups=new Map();
 let duplicates=0,missing=0;
 for(const slot of slots){
  const scenario=corpus.scenarios.find(s=>s.id===slot.caseId),spec=scenario.judgeContext?.sourceReadiness?.spec;
  const cohort=['SALES_READY','SOURCE_UNAVAILABLE'].includes(spec?.cohort)?spec.cohort:'UNCLASSIFIED';
  const purpose=['SALE','CUSTOMER_INPUT','SHOP_GAP'].includes(spec?.task?.purpose)?spec.task.purpose:'UNCLASSIFIED';
  const key=JSON.stringify([slot.mode,cohort,purpose]);
  if(!groups.has(key))groups.set(key,{mode:slot.mode,cohort,purpose,registered:0,executed:0,notRun:0,blocked:0,missing:0,duplicate:0,
   qualityUnknown:0,providerErrorAttempts:0,sendEligible:0,handoff:0,noSend:0,salesCompleted:0,properHandoff:0,properClarification:0});
  const g=groups.get(key);g.registered++;
  const rows=attempts.filter(a=>a.slotId===slot.slotId);
  if(rows.length!==1){if(!rows.length){g.missing++;missing++;}else{g.duplicate++;duplicates+=rows.length-1;}continue;}
  const a=rows[0];if(a.status==='NOT_RUN'){g.notRun++;continue;}if(a.status!=='EXECUTED'){g.blocked++;continue;}g.executed++;
  const d=a.terminal?.disposition,q=a.quality;
  if(d==='SEND_ELIGIBLE')g.sendEligible++;if(d==='HANDOFF')g.handoff++;if(d==='NO_SEND')g.noSend++;
  if((a.generations??[]).some(r=>r.status!=='OK'))g.providerErrorAttempts++;
  if(!q||![q.wholeTurnPass,q.allExplicitNeedsResolved,q.hardSafetyPass].every(v=>typeof v==='boolean'))g.qualityUnknown++;
  if(purpose==='SALE'&&cohort==='SALES_READY'&&q?.wholeTurnPass&&q.allExplicitNeedsResolved&&q.hardSafetyPass)g.salesCompleted++;
  if(purpose==='SHOP_GAP'&&d==='HANDOFF'&&q?.wholeTurnPass&&q.hardSafetyPass)g.properHandoff++;
  if(purpose==='CUSTOMER_INPUT'&&d==='SEND_ELIGIBLE'&&q?.wholeTurnPass&&q.hardSafetyPass)g.properClarification++;
 }
 return {kind:'DEVELOPMENT_TASK_OUTCOME_ATTRIBUTION_V1',registered:slots.length,missing,duplicates,groups:[...groups.values()],
  officialQualificationUnchanged:true,unit:'REGISTERED_CASE_REPETITION_NOT_CUSTOMER_TURN'};
}
