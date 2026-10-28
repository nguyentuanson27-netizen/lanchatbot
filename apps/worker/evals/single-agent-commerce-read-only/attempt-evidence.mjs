// Evaluation-only evidence retention and one latch per disposable delivery queue.
// This module neither sends nor rewrites committed outcomes or runtime counters.
const codes=new Set(['TOOL_WORK_ACCOUNTING','TOOL_WORK_COUNTER','QUOTE_WORK_TRACE','ATTEMPT_UNAVAILABLE']);
const safeCode=error=>codes.has(error?.message)?error.message:'ATTEMPT_UNAVAILABLE';
export function createAttemptQueue(){
 let blocked=null;
 const latch=(slot,code)=>{blocked??={slot,code};};
 return {blocked:()=>blocked?{...blocked}:null,latch,
  async dispatch(work){if(blocked)return false;return work();},
  async run(slot,work){
   if(blocked)return {status:'BLOCKED',executionStatus:'NOT_RUN_BY_QUALIFICATION',qualification:{status:'BLOCKED',origin:{...blocked}}};
   try{return await work();}catch(error){return unobservedAttempt(error,{queue:this,slot});}
  }};
}
export function retainObservedAttempt(envelope,{queue,slot,validate,stage='FIXTURE_RETURN'}){
 if(envelope.qualification?.status==='INVALID'){queue.latch(slot,envelope.errorCode??'ATTEMPT_UNAVAILABLE');return envelope;}
 try{validate(envelope.result);return {...envelope,qualification:{status:'VALID'}};}
 catch(error){const code=safeCode(error);queue.latch(slot,code);
  return {...envelope,errorCode:code,qualification:{status:'INVALID',stage:stage==='CONSUMER'?'CONSUMER':'FIXTURE_RETURN',code}};}
}
export function unobservedAttempt(error,{queue,slot}){
 const code=safeCode(error);queue.latch(slot,code);
 return {errorCode:code,qualification:{status:'INVALID',stage:'BEFORE_RESULT',code},observedTerminal:'UNKNOWN'};
}
export function summarizeAttemptQualification(attempts){
 const summary={registered:attempts.length,executed:0,notRun:0,observedTerminals:{},unknownTerminals:0,qualificationErrors:0};
 for(const attempt of attempts){
  if(attempt.executionStatus==='NOT_RUN_BY_QUALIFICATION'){summary.notRun++;continue;}
  summary.executed++;
  const terminal=attempt.result?.terminal?.disposition;
  if(terminal)summary.observedTerminals[terminal]=(summary.observedTerminals[terminal]??0)+1;else summary.unknownTerminals++;
  if(attempt.qualification?.status==='INVALID')summary.qualificationErrors++;
 }
 return summary;
}
