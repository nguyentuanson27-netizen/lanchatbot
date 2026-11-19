import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evidence} from './fixtures.test-support.mjs';
import {digest,qualificationIdentity,absoluteReviewPack,blindComparisonPack,evaluateQualification} from './qualification.mjs';
import {importGrades} from './grade-import.mjs';
const model={provider:'OPENAI',model:'gpt-6.1-sol',version:'gpt-6.1-sol',effort:'high'};
function fixture(stage){
 const e=evidence();e.config.judge={...e.config.judge,kind:'OFFLINE_MODEL',model:structuredClone(model),promptHash:'a'.repeat(64)};
 e.identity=qualificationIdentity(e.config);for(const a of e.attempts){a.identity=e.identity;a.startedAt='2026-10-28T00:00:00.000Z';}
 e.blindGrades=[];
 const registration={config:e.config,corpus:e.corpus,corpusHash:digest(e.corpus),runSourceSha:e.source.sourceSha},seed=e.blindSeed,
  packet=stage==='ABSOLUTE'?absoluteReviewPack(e.config,e.corpus,e.attempts,seed):blindComparisonPack(e.config,e.corpus,e.attempts,seed);
 const grade={packetHash:packet.packetHash,judge:{identity:e.config.judge.identity,model:structuredClone(model),promptHash:e.config.judge.promptHash,rubricHash:e.config.judge.rubricHash,
  agentId:'synthetic-independent-unit-reviewer',independent:true,blind:true,completedAt:'2026-10-28T01:00:00.000Z'},
  grades:packet.assignments.map(p=>({reviewId:p.reviewId,status:'RESOLVED',reason:'Synthetic test grade, never model evidence.',
   ...(stage==='ABSOLUTE'?{wholeTurnPass:true,allExplicitNeedsResolved:true,hardSafetyPass:true}:{vote:'TIE'})}))};
 return {registration,evidence:e,seed,grade,stage};
}
test('imports only complete independent registered-judge packet grades and preserves provenance',()=>{
 const f=fixture('ABSOLUTE'),result=importGrades(f);
 assert.equal(result.judgeEvidence.length,1);assert.equal(result.judgeEvidence[0].artifactHash,digest(f.grade));
 const rows=result.attempts.filter(a=>a.arm==='CANDIDATE'&&a.mode!=='SAFETY');assert(rows.every(a=>a.quality.gradeArtifactHash===digest(f.grade)));
 for(const mutate of [g=>{g.judge.model.effort='low';},g=>{g.packetHash='f'.repeat(64);},g=>{g.grades.pop();},g=>{g.judge.blind=false;}]){
  const changed=fixture('ABSOLUTE');mutate(changed.grade);assert.throws(()=>importGrades(changed));
 }
});
test('unresolved or invalid statuses cannot reuse previously resolved absolute or comparison results',()=>{
 for(const stage of ['ABSOLUTE','COMPARISON']){
  const f=fixture(stage),resolved=importGrades(f),unresolved=structuredClone(f.grade);
  unresolved.grades[0].status='UNRESOLVED';
  assert.throws(()=>importGrades({...f,evidence:resolved,grade:unresolved}),/ALREADY_APPLIED/);
  const first=importGrades({...f,grade:unresolved});assert.equal(evaluateQualification(first).candidateMeetsTarget,'BLOCKED');
  assert(evaluateQualification(first).reasons.includes('UNRESOLVED_INDEPENDENT_JUDGEMENT'));
  const invalid=structuredClone(f.grade);invalid.grades[0].status='UNKNOWN';assert.throws(()=>importGrades({...f,grade:invalid}),/GRADE_STATUS/);
 }
});
