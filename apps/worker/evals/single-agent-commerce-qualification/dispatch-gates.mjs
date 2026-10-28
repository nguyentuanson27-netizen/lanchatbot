import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {digest,evaluateQualification} from './qualification.mjs';
import {safetySummary} from './safety-accounting.mjs';
export function claimDispatch(registrationPath,stage,registration){
 assert(['SAFETY','NATIVE','C3'].includes(stage),'C_DISPATCH_STAGE');
 const path=resolve(dirname(resolve(registrationPath)),'DISPATCH_'+stage+'.json');
 writeFileSync(path,JSON.stringify({stage,registrationHash:digest(registration),startedAt:new Date().toISOString(),
  policy:'ONE_DISPATCH_NO_AUTOMATIC_GENERATION_RETRY'}),{flag:'wx'});
 return path;
}
export function requirePassingSafety(registration,directory){
 assert(directory,'C_SAFETY_EVIDENCE_REQUIRED');
 const read=name=>JSON.parse(readFileSync(resolve(directory,name),'utf8')),
  summary=read('SAFETY_SUMMARY.json'),evidence=read('SAFETY_EVIDENCE.json');
 assert.equal(digest(evidence.config),digest(registration.config),'C_SAFETY_CONFIG_CHANGED');
 assert.equal(digest(evidence.identity),digest(registration.identity),'C_SAFETY_IDENTITY_CHANGED');
 assert.deepEqual(summary,safetySummary(registration,evidence.attempts),'C_SAFETY_ACCOUNTING_CHANGED');
 assert.equal(summary.status,'PASS','C_SAFETY_NOT_PASS');
 assert(evidence.attempts.every(a=>a.status==='NOT_RUN'||Date.parse(a.startedAt)>=Date.parse(registration.registeredAt)),'C_SAFETY_PRE_REGISTRATION');
 const rest=registration.slots.filter(s=>s.mode!=='SAFETY').map(s=>({...s,identity:registration.identity,status:'NOT_RUN'}));
 const checked=evaluateQualification({config:registration.config,corpus:registration.corpus,identity:registration.identity,
  source:{sourceSha:registration.runSourceSha,clean:true,registeredBeforeFirstRequest:true,corpusHash:registration.corpusHash},
  attempts:[...evidence.attempts,...rest]});
 assert(checked.candidateMeetsTarget==='BLOCKED'&&checked.reasons.length===1&&checked.reasons[0]==='CANDIDATE_INCOMPLETE_DENOMINATOR','C_SAFETY_BOUNDARY_INVALID');
 return {summary,evidenceHash:digest(evidence)};
}
