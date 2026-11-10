// Only the J2/J1 evaluation: persisted collection, offline score and one-use
// native continuation. No provider dispatch or runtime semantics in this file.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync,appendFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest,byteHash,write,outside} from './bc-control.mjs';
import {validateJ1Registration,scoreJ1Primary} from './j1-operation-control.mjs';

const read=p=>JSON.parse(readFileSync(p,'utf8'));
const ref=path=>({path:resolve(path),sha256:byteHash(readFileSync(path))});
const bound=r=>{assert(r&&byteHash(readFileSync(r.path))===r.sha256,'CAMPAIGN_ARTIFACT_CHANGED');return read(r.path);};
function validatePrimary(reg,primary){
 validateJ1Registration(reg);assert.equal(primary.sealHash,digest(reg),'CAMPAIGN_REGISTRATION_CHANGED');
 assert.equal(primary.rows.length,reg.slots.length,'CAMPAIGN_PRIMARY_DENOMINATOR');
 assert.equal(primary.planned,10,'CAMPAIGN_PRIMARY_DENOMINATOR');assert.equal(primary.toolsExecuted,0,'CAMPAIGN_PRIMARY_EFFECTS');
 assert.deepEqual(primary.rows.map(r=>Object.fromEntries(Object.keys(reg.slots[0]).map(k=>[k,r[k]]))),reg.slots,'CAMPAIGN_PRIMARY_DENOMINATOR');
 assert(primary.rows.every(r=>r.status!=='PENDING'&&Number.isInteger(r.providerRequests)&&r.providerRequests>=0&&r.providerRequests<=1),'CAMPAIGN_PRIMARY_ACCOUNTING');
 const attempted=primary.rows.filter(r=>r.status!=='NOT_RUN').length;
 assert.equal(primary.attempted,attempted,'CAMPAIGN_PRIMARY_ACCOUNTING');assert.equal(primary.notRun,10-attempted,'CAMPAIGN_PRIMARY_ACCOUNTING');
 assert.equal(primary.completed,primary.rows.filter(r=>r.status==='OK').length,'CAMPAIGN_PRIMARY_ACCOUNTING');
 assert.equal(primary.errors,primary.rows.filter(r=>!['OK','NOT_RUN'].includes(r.status)).length,'CAMPAIGN_PRIMARY_ACCOUNTING');
 assert.equal(primary.providerRequests,primary.rows.reduce((n,r)=>n+r.providerRequests,0),'CAMPAIGN_PRIMARY_ACCOUNTING');
 assert(primary.rows.filter(r=>r.status==='NOT_RUN').every(r=>r.providerRequests===0),'CAMPAIGN_PRIMARY_ACCOUNTING');
}
export function collectJ1ForScoring({out,input,inputFile,primaryFile,accountingFile}){
 assert.equal(digest(read(inputFile)),digest(input),'CAMPAIGN_INPUT_CHANGED');
 const reg=read(input.j1Registration),primary=read(primaryFile);
 assert.equal(reg.runSourceSha,input.runSourceSha,'CAMPAIGN_SOURCE_CHANGED');
 assert.equal(digest(reg),input.j1RegistrationHash,'CAMPAIGN_REGISTRATION_CHANGED');validatePrimary(reg,primary);
 const accounting=accountingFile?read(accountingFile):null;
 if(accounting){assert.equal(accounting.unknownAttempts,0,'CAMPAIGN_UNKNOWN_COMPLETION');
  assert.equal(accounting.providerRequests,accounting.generations.reduce((n,g)=>n+g.providerRequests,0),'CAMPAIGN_PRIMARY_ACCOUNTING');
  assert.equal(accounting.generations.filter(g=>g.phase==='J1_PRIMARY').reduce((n,g)=>n+g.providerRequests,0),primary.providerRequests,'CAMPAIGN_PRIMARY_ACCOUNTING');}
 const collected={kind:'J2_J1_COLLECTION_V1',status:'AWAITING_OFFLINE_SCORE',sourceSha:input.runSourceSha,worldHash:input.worldHash,
  input:ref(inputFile),registration:ref(input.j1Registration),primary:ref(primaryFile),providerRequests:primary.providerRequests,
  ...(accountingFile?{accounting:ref(accountingFile)}:{}),
  planned:10,attempted:primary.attempted,notRun:primary.notRun,conditional:{attempted:0,notRun:2,reason:'AWAITING_OFFLINE_SCORE'},qualification:'NOT_QUALIFICATION_NO_GO'};
 write(resolve(out,'COLLECTED.json'),collected);return collected;
}
function loadCollection(file){
 const collected=read(file);assert.equal(collected.kind,'J2_J1_COLLECTION_V1');
 const input=bound(collected.input),reg=bound(collected.registration),primary=bound(collected.primary);
 assert.equal(input.runSourceSha,collected.sourceSha,'CAMPAIGN_SOURCE_CHANGED');
 assert.equal(reg.runSourceSha,collected.sourceSha,'CAMPAIGN_SOURCE_CHANGED');
 assert.equal(input.worldHash,collected.worldHash,'CAMPAIGN_WORLD_CHANGED');
 assert.equal(digest(reg),input.j1RegistrationHash,'CAMPAIGN_REGISTRATION_CHANGED');
 validatePrimary(reg,primary);
 if(collected.accounting)bound(collected.accounting);
 return {collected,input,reg,primary};
}
export function scoreCollectedJ1({collectionFile,assessmentFile,out}){
 const {collected,reg,primary}=loadCollection(collectionFile);
 const gate=scoreJ1Primary(reg,primary,read(assessmentFile));
 const result={kind:'J2_J1_OFFLINE_SCORE_V1',collection:ref(collectionFile),assessment:ref(assessmentFile),gate,
  sourceSha:collected.sourceSha,worldHash:collected.worldHash,providerRequestsAdded:0,qualification:'NOT_QUALIFICATION_NO_GO'};
 write(resolve(out,'SCORE.json'),result);return result;
}
export function openJ1Resume({input,out,now=Date.now(),verifySource}){
 const score=bound(input.scored);assert.equal(score.kind,'J2_J1_OFFLINE_SCORE_V1');
 const {collected,input:original,reg,primary}=loadCollection(score.collection.path);
 bound(score.collection);const assessments=bound(score.assessment);
 assert.deepEqual(score.gate,scoreJ1Primary(reg,primary,assessments),'CAMPAIGN_GATE_CHANGED');
 assert.equal(input.runSourceSha,collected.sourceSha,'CAMPAIGN_SOURCE_CHANGED');
 assert.equal(score.sourceSha,collected.sourceSha,'CAMPAIGN_SOURCE_CHANGED');
 for(const k of ['worldFile','worldHash','toolchainHash','scriptHash','minimumProofExpiresAt','safetyMarginMs'])
  assert.equal(input[k],original[k],'CAMPAIGN_RESUME_INPUT_CHANGED_'+k);
 assert.equal(score.worldHash,collected.worldHash,'CAMPAIGN_WORLD_CHANGED');
 assert.equal(digest(read(input.worldFile)),input.worldHash,'CAMPAIGN_WORLD_CHANGED');
 verifySource();
 if(score.gate.status!=='CONDITIONAL_NATIVE_ALLOWED')return {gate:score.gate,reg,conditional:{attempted:0,notRun:2,reason:score.gate.status}};
 const expires=Math.min(Date.parse(input.minimumProofExpiresAt),Date.parse(reg.minimumProofExpiresAt));
 assert(expires-now>=reg.schedule.nativeBudgetMs+input.safetyMarginMs,'CAMPAIGN_NATIVE_HEADROOM');
 const current=collected.accounting?bound(collected.accounting).providerRequests:primary.providerRequests;
 let prior=0;
 if(original.skipJ2){assert(original.priorJ2&&byteHash(readFileSync(original.priorJ2.file))===original.priorJ2.sha256,'CAMPAIGN_PRIOR_J2_BINDING');
  prior=read(original.priorJ2.file).providerRequests;assert(Number.isInteger(prior)&&prior>=0&&prior<=12,'CAMPAIGN_PRIOR_J2_BUDGET');}
 assert(Number.isInteger(current)&&current+prior+8<=30,'CAMPAIGN_COMBINED_CAP');
 // This claim lives beside the original collection, not beside a new out dir:
 // changing output directories must never rerun a consumed native registration.
 write(resolve(dirname(score.collection.path),'J1_NATIVE.claim.json'),{score:input.scored,out:resolve(out),claimedAt:new Date(now).toISOString()});
 return {gate:score.gate,reg,priorProviderRequests:current+prior,collection:collected};
}

// A claim is durable before dispatch; an unknown completion is neither zero
// HTTP nor retryable. JSONL is append-only; the summary is atomically replaced.
export function createCampaignAccounting(out){
 const generations=[];
 const summary=()=>{const unknown=generations.filter(g=>g.status==='PENDING'||g.status==='UNKNOWN'||g.providerRequests===null).length;
  const known=generations.reduce((n,g)=>n+(Number.isInteger(g.providerRequests)?g.providerRequests:0),0);
  return {attempted:generations.length,knownProviderRequests:known,unknownAttempts:unknown,providerRequests:unknown?null:known,generations};};
 const persist=(event,row)=>{appendFileSync(resolve(out,'GENERATIONS.jsonl'),JSON.stringify({event,at:new Date().toISOString(),row})+'\n');
  const temp=resolve(out,'ACCOUNTING.json.tmp');writeFileSync(temp,JSON.stringify(summary(),null,2)+'\n');renameSync(temp,resolve(out,'ACCOUNTING.json'));};
 write(resolve(out,'ACCOUNTING.json'),summary()); // A zero-attempt run is explicit; an old ledger cannot be reset.
 return {generations,summary,
  claim(binding){assert.equal(summary().unknownAttempts,0,'CAMPAIGN_UNKNOWN_COMPLETION');
   assert(!generations.some(g=>binding.slotId&&g.slotId===binding.slotId),'CAMPAIGN_DUPLICATE_SLOT');
   const row={...binding,id:generations.length+1,status:'PENDING',providerRequests:null};generations.push(row);persist('CLAIM',row);return row;},
  complete(row,result){assert(generations.includes(row)&&row.status==='PENDING','CAMPAIGN_DUPLICATE_COMPLETION');
   assert(result.status&&result.status!=='PENDING'&&(result.providerRequests===null||Number.isInteger(result.providerRequests)&&result.providerRequests>=0&&result.providerRequests<=1),'CAMPAIGN_PROVIDER_RETRY');
   Object.assign(row,result);persist('RESULT',row);},
 };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,collectionFile,assessmentFile,out]=process.argv.slice(2);
 assert.equal(command,'score','CAMPAIGN_COMMAND_score');
 const root=fileURLToPath(new URL('../../../../',import.meta.url));outside(root,out);
 const result=scoreCollectedJ1({collectionFile,assessmentFile,out});
 console.log(JSON.stringify({status:result.gate.status,providerRequestsAdded:0}));
}
