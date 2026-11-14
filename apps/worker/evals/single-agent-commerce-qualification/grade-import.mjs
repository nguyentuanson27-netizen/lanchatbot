// Imports an independently produced blind packet grade; never generates or guesses a grade.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {digest,absoluteReviewPack,blindComparisonPack,outcomeDigest} from './qualification.mjs';
export function importGrades({registration,evidence,seed,grade,stage}){
 assert(['ABSOLUTE','COMPARISON'].includes(stage),'C_GRADE_STAGE');
 assert.equal(digest(evidence.config),digest(registration.config),'C_GRADE_CONFIG_CHANGED');
 assert.equal(evidence.source.sourceSha,registration.runSourceSha,'C_GRADE_SOURCE_CHANGED');
 assert.equal(digest(evidence.corpus),registration.corpusHash,'C_GRADE_CORPUS_CHANGED');
 const c=registration.config,expected=c.judge;
 assert(!evidence.judgeEvidence?.some(j=>j.stage===stage),'C_GRADE_ALREADY_APPLIED');
 assert(stage==='ABSOLUTE'?!evidence.attempts.some(a=>a.arm==='CANDIDATE'&&a.quality?.gradeArtifactHash):!(evidence.blindGrades?.length),'C_GRADE_ALREADY_APPLIED');
 assert(expected.kind==='OFFLINE_MODEL'&&expected.model.model==='gpt-6.1-sol'&&expected.model.effort==='high','C_REGISTERED_JUDGE');
 assert(grade.judge?.identity===expected.identity&&digest(grade.judge.model)===digest(expected.model)&&
  grade.judge.promptHash===expected.promptHash&&grade.judge.rubricHash===expected.rubricHash,'C_OBSERVED_JUDGE_CHANGED');
 assert(typeof grade.judge.agentId==='string'&&grade.judge.agentId&&grade.judge.independent===true&&grade.judge.blind===true,'C_INDEPENDENT_JUDGE_PROVENANCE');
 assert(Number.isFinite(Date.parse(grade.judge.completedAt))&&evidence.attempts.filter(a=>a.status!=='NOT_RUN').every(a=>
  Date.parse(a.startedAt)<=Date.parse(grade.judge.completedAt)),'C_JUDGE_PRECEDES_GENERATION');
 const packet=stage==='ABSOLUTE'?absoluteReviewPack(c,registration.corpus,evidence.attempts,seed):blindComparisonPack(c,registration.corpus,evidence.attempts,seed);
 assert.equal(packet.packetHash,grade.packetHash,'C_JUDGE_PACKET_CHANGED');
 assert(Array.isArray(grade.grades)&&grade.grades.length===packet.assignments.length&&new Set(grade.grades.map(g=>g.reviewId)).size===grade.grades.length,'C_GRADE_DENOMINATOR');
 const result=structuredClone(evidence),unresolved=[];
 for(const assignment of packet.assignments){
  const g=grade.grades.find(g=>g.reviewId===assignment.reviewId);assert(g&&typeof g.reason==='string'&&g.reason.trim(),'C_GRADE_REASON');
  assert(['RESOLVED','UNRESOLVED'].includes(g.status),'C_GRADE_STATUS');
  if(g.status==='UNRESOLVED'){unresolved.push(g.reviewId);continue;}
  const common={reviewId:g.reviewId,packetHash:packet.packetHash,judgeIdentity:expected.identity,rubricHash:expected.rubricHash,
   judgeModel:expected.model,judgeAgentId:grade.judge.agentId,reason:g.reason,gradeArtifactHash:digest(grade)};
  if(stage==='ABSOLUTE'){
   assert(['wholeTurnPass','allExplicitNeedsResolved','hardSafetyPass'].every(k=>typeof g[k]==='boolean'),'C_ABSOLUTE_GRADE_SHAPE');
   const a=result.attempts.find(a=>a.slotId===assignment.slotId);assert(a&&!a.quality?.gradeArtifactHash,'C_GRADE_ALREADY_APPLIED');
   a.quality={...common,wholeTurnPass:g.wholeTurnPass,allExplicitNeedsResolved:g.allExplicitNeedsResolved,hardSafetyPass:g.hardSafetyPass,
    sourceContextHash:digest(registration.corpus.scenarios.find(s=>s.id===a.caseId).judgeContext),outcomeHash:outcomeDigest(a)};
  }else{
   assert(['A','B','TIE'].includes(g.vote),'C_COMPARATIVE_GRADE_SHAPE');result.blindGrades??=[];
   assert(!result.blindGrades.some(old=>old.reviewId===g.reviewId),'C_GRADE_ALREADY_APPLIED');
   result.blindGrades.push({...common,vote:g.vote,adjudicated:true,adjudication:'ONE_REGISTERED_INDEPENDENT_JUDGE_RESOLVED'});
  }
 }
 result.judgeEvidence??=[];result.judgeEvidence.push({stage,artifactHash:digest(grade),judge:grade.judge,packetHash:packet.packetHash,unresolved});
 return result;
}
if(process.argv[1]?.endsWith('grade-import.mjs')){
 const [registration,evidence,seed,grade,stage,out]=process.argv.slice(2);assert(out,'C_GRADE_ARGUMENTS');
 const read=p=>JSON.parse(readFileSync(p,'utf8')),
  result=importGrades({registration:read(registration),evidence:read(evidence),seed:read(seed).seed,grade:read(grade),stage});
 writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.judgeEvidence.at(-1).unresolved.length?'UNRESOLVED':'GRADES_IMPORTED',providerRequests:0}));
}
