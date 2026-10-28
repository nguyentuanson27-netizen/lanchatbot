// Narrow gates for the registered 17 controls and 21+25 native population.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sha256} from './protocol.mjs';
import {validateControlBundle} from './feedback-control-inputs.mjs';
import {finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './feedback-run-identity.mjs';
import {registerJourneyOpenings,registerMediaFollowup} from './sales-journeys-registration.mjs';
import {customerOutcome} from './delivery-capture.mjs';
export const NATIVE_FIRST_INDICES=[3,4,5,7,8,9,11,15,17,23];
export function validateControlsEvidence({identity,summary,bundle,attempts,requests,manifest,instructions}){
 assert.deepEqual(summary.identity,identity,'CONTROLS_IDENTITY_CHANGED');
 assert.equal(summary.status,'PASS');assert.equal(summary.controlsPass,true);assert.equal(summary.unsafeFalsePass,false);
 assert.equal(summary.attempts,17);assert.equal(attempts.length,17);assert.equal(requests.length,17);
 validateControlBundle(bundle,{identity,manifest,instructions});assert.equal(summary.bundleHash,bundle.hash);
 for(const [i,a]of attempts.entries()){
  const p=bundle.outcomes[i];
  for(const field of ['definition','toolResult','request','binding','wire','wireHash'])assert.deepEqual(a[field],p[field],'CONTROL_ARTIFACT_CHANGED');
  assert.equal(a.error,null,'CONTROL_PROVIDER_ERROR');assert(a.provider,'CONTROL_PROVIDER_MISSING');
  assert.equal(a.provider.telemetry?.status,'OK','CONTROL_PROVIDER_ERROR');assert.equal(a.provider.telemetry?.providerRequests,1,'CONTROL_REQUEST_COUNT');
  assert.equal(requests[i].id,p.request.generationId);assert.deepEqual(requests[i].wire,p.wire,'ACTUAL_WIRE_CHANGED');
  const terminal=finalGate({expected:p.binding,response:{kind:'VERDICT',binding:p.binding,result:a.provider.result},current:p.request.trusted,
   finalDraft:p.definition.draft,now:new Date(bundle.capture.capturedAt),fallback:manifest.fallback});
  assert.deepEqual(a.terminal,terminal,'CONTROL_TERMINAL_CHANGED');
  if(p.definition.safe!==null)assert.equal(terminal.disposition==='SEND_ELIGIBLE',p.definition.safe,'CONTROLS_NOT_PASS');
 }
}
export function validateNativePrefix({identity,expected,actual,review}){
 assert.deepEqual(review.identity,identity,'PREFIX_REVIEW_IDENTITY');assert.equal(review.allowRest,true,'PREFIX_NOT_APPROVED');
 assert.equal(expected.length,21);assert.equal(new Set(expected).size,21);
 assert.equal(actual.length,21,'PREFIX_INCOMPLETE');assert.equal(new Set(actual.map(a=>a.caseId)).size,21,'PREFIX_DUPLICATE');
 assert.deepEqual(actual.map(a=>a.caseId).sort(),[...expected].sort(),'PREFIX_WRONG_POPULATION');
 assert.equal(review.entries?.length,21,'PREFIX_REVIEW_INCOMPLETE');assert.equal(new Set(review.entries.map(e=>e.caseId)).size,21,'PREFIX_REVIEW_DUPLICATE');
 for(const a of actual){
  assert(a.terminal&&['SEND_ELIGIBLE','FALLBACK','HANDOFF','NO_SEND'].includes(a.terminal.disposition),'PREFIX_TERMINAL');
  assert(!a.errorCode&&!a.result.errorCode&&!a.result.errorType&&a.status!=='BLOCKED','PREFIX_ATTEMPT_ERROR');
  assert(!(a.result.generations??[]).some(g=>g.status!=='OK'),'PREFIX_PROVIDER_ERROR');
  const e=review.entries.find(e=>e.caseId===a.caseId);assert(e,'PREFIX_REVIEW_MISSING');
  assert.equal(e.artifactHash,a.hash,'PREFIX_ARTIFACT_CHANGED');assert.deepEqual(e.terminal,a.terminal,'PREFIX_REVIEW_TERMINAL_CHANGED');
  const actualOutcome=customerOutcome(a,a.evidenceMode);
  assert.equal(e.customerOutcomeHash,sha256(JSON.stringify(actualOutcome)),'PREFIX_CUSTOMER_OUTCOME_CHANGED');
  assert.equal(e.safety,'PASS','PREFIX_UNSAFE');assert.equal(e.regression,false,'PREFIX_REGRESSION');
  assert(typeof e.reason==='string'&&e.reason.trim().length>0,'PREFIX_WHOLE_TURN_REASON_REQUIRED');
 }
}
const json=p=>JSON.parse(readFileSync(p,'utf8'));
export function requirePassingControls(dir,identity){
 const bundle=json(resolve(dir,'prepared.json')),summary=json(resolve(dir,'summary.json'));
 const attempts=Array.from({length:17},(_,i)=>json(resolve(dir,`attempt-${i+1}.json`)));
 const requests=readFileSync(resolve(dir,'requests.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const manifest=json(new URL('./manifest.json',import.meta.url)),instructions=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 validateControlsEvidence({identity,summary,bundle,attempts,requests,manifest,instructions});
 return sha256(JSON.stringify({bundleHash:bundle.hash,summary,attemptHashes:attempts.map(a=>sha256(JSON.stringify(a))),requests}));
}
function collectPrefix(out,identity){
 const b1=json(new URL('./cases.b1.json',import.meta.url));
 const openings=registerJourneyOpenings(json(new URL('./sales-journeys.candidate.json',import.meta.url)),['J02','J03','J05','J08']).samples;
 const media=registerMediaFollowup(json(new URL('./sales-media-followup-cases.json',import.meta.url)));
 const expected=[...NATIVE_FIRST_INDICES.map(i=>b1[i-1].caseId),...openings.map(c=>c.caseId),...media.map(c=>c.caseId)];
 const jobs=[...NATIVE_FIRST_INDICES.map(i=>'b1-'+i+'-'+i),'openings','media'],actual=[];
 for(const job of jobs){
  const dir=resolve(out,job),reg=json(resolve(dir,'registration.json'));
  assert.equal(reg.bRunSourceSha??reg.sourceSha,identity.sourceSha,'PREFIX_SOURCE');
  assert.equal(reg.sourceConfigHash,identity.sourceConfigHash,'PREFIX_CONFIG');assert.deepEqual(reg.promptHashes,identity.promptHashes,'PREFIX_PROMPTS');
  assert.equal(reg.schemaHash,identity.schemaHash,'PREFIX_SCHEMA');
  if(reg.models)assert.deepEqual(reg.models,identity.models,'PREFIX_MODELS');else assert.equal(reg.manifestHash,sha256(JSON.stringify(json(new URL('./manifest.json',import.meta.url)))),'PREFIX_MANIFEST');
  if(job.startsWith('b1-'))assert.equal(reg.inputHash,identity.corpusHashes['cases.b1.json'],'PREFIX_CORPUS');
  else{
   assert.equal(reg.corpusHash,identity.corpusHashes[job==='media'?'sales-media-followup-cases.json':'sales-journeys.candidate.json'],'PREFIX_CORPUS');
   assert.equal(json(resolve(dir,'integration.json')).testDatabaseDropped,true,'PREFIX_DATABASE_CLEANUP');
  }
  for(const name of readdirSync(dir).filter(n=>/^(provider-)?attempt-\d+\.json$/.test(n))){
   const bytes=readFileSync(resolve(dir,name)),a=JSON.parse(bytes);
   actual.push({...a,hash:sha256(bytes),terminal:a.result?.terminal,evidenceMode:job.startsWith('b1-')?'SEND_ELIGIBILITY_ONLY':'CAPTURE_TRANSPORT'});
  }
 }
 return {identity,expected,actual,review:json(resolve(out,'PREFIX_REVIEW.json'))};
}
export function validateCapturedJob(dir){
 const integration=json(resolve(dir,'integration.json')),reg=json(resolve(dir,'registration.json'));
 assert.equal(integration.testDatabaseDropped,true,'JOB_DATABASE_CLEANUP');
 const files=readdirSync(dir).filter(n=>/^provider-attempt-\d+\.json$/.test(n));
 assert.equal(files.length,reg.registeredOutcomes,'JOB_INCOMPLETE');assert.equal(integration.completedOutcomes,files.length,'JOB_INCOMPLETE');
 for(const file of files)customerOutcome(json(resolve(dir,file)),'CAPTURE_TRANSPORT');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv[2]==='--job'){validateCapturedJob(process.argv[3]);console.log('CAPTURE_JOB_PASS');process.exit(0);}
 const [controls,out,phase]=process.argv.slice(2);assert(controls&&out&&['first','rest'].includes(phase),'GATE_ARGUMENTS');
 const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);const controlsHash=requirePassingControls(controls,identity);
 const reg=json(resolve(out,'REGISTRATION.json'));assert.deepEqual(reg.identity,identity,'NATIVE_REGISTRATION_CHANGED');assert.equal(reg.controlsHash,controlsHash,'CONTROLS_READINESS_CHANGED');
 if(phase==='rest')validateNativePrefix(collectPrefix(out,identity));
 console.log(JSON.stringify({status:'PASS',identity,controlsHash}));
}
