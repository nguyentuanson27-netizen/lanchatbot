// Approved W4 development screen. Existing transport, native runner and offline judge remain the executors.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {digest,byteHash,read,write} from './bc-control.mjs';
import {finalOwnerWire,assertReplayWire,replayJudgePacket,scoreReplay,dispatchReplay} from './sales-voice-replay.mjs';
import {contextJudgeIdentity} from './sales-context-judge.mjs';
import {presentSalesContext} from '../single-agent-commerce-read-only/owner-sales-context.mjs';

export const CONTEXT_BASELINE_SHA='7cdd2e80b0ebda08f0176082ea09885a63a76fe2';
export const W1_SOURCE_SHA='b02e2d3c';
export const CONTEXT_BUDGET=Object.freeze({replayOwner:24,replayJudge:12,nativeOwner:198,nativeVerifier:66,nativeJudge:24,total:324});
const origin='5dfde94b11a2b55ca7a52846b241bb440ee68994';
const promptPath='apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const model={model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{retry:0}};
const groups=[['c-20261028-j2',1],['c-20261028-s15',0],['c-20261028-s08',0]];
const controlsScript=read(new URL('./SALES_CONTEXT_CONTROL_CASES_20261115.json',import.meta.url)).scenarios;
const nativeScopes=Object.fromEntries(['PRIMARY','CONTROLS'].map(k=>[k,read(new URL(`./SALES_CONTEXT_${k}_SCOPE_20261115.json`,import.meta.url))]));
const requestHash=body=>byteHash(JSON.stringify(body));
export function bindOpeningControl(control,journal){
 const rows=journal.filter(row=>row.caseId==='opening-ad');
 const owner=rows.filter(row=>row.phase==='OWNER_REQUEST').at(-1)?.value;
 const draft=rows.filter(row=>row.phase==='OWNER_RESULT').at(-1)?.value;
 const verifier=rows.filter(row=>row.phase==='VERIFIER_REQUEST').at(-1)?.value;
 assert(owner&&draft?.kind==='FINAL'&&verifier,'CONTEXT_AD_CAPTURE_MISSING');
 assert.equal(digest(owner),control.requestHash,'CONTEXT_AD_REQUEST_MISMATCH');
 const frame=JSON.parse(verifier.input[0].content[0].text);
 assert.equal(frame.untrusted.finalDraft,draft.text,'CONTEXT_AD_DRAFT_MISMATCH');
 return {...control,sourceProducts:frame.trusted.runtimeProducts,claims:frame.trusted.protectedClaims};
}

/** Captured public dialogue is preserved. W1 is fixed before the W3 tool-contract prompt change. */
export function buildContextReplay({registration,journals,openingControl,baselinePrompt,stylePrompt,source,seed}){
 assert.equal(registration.runSourceSha,origin);assert.equal(journals.length,5);assert.match(seed,/^[a-f0-9]{64}$/);
 const captures=groups.flatMap(([caseId,turnIndex])=>[1,2,3].map(repetition=>{
  const slot=registration.slots.find(s=>s.caseId===caseId&&s.repetition===repetition);
  let capture=null;
  try{if(slot)capture=finalOwnerWire(journals[repetition-1],slot.slotId,turnIndex);}catch{}
  return {label:caseId+':'+turnIndex,repetition,capture};
 }));
 captures.push(...[1,2,3].map(repetition=>({label:'OPENING_AD_QUOTE',repetition,capture:openingControl})));
 const slots=captures.map((entry,index)=>{
  const id=digest({source,label:entry.label,repetition:entry.repetition});
  const order=(index+createHmac('sha256',seed).update('context-order').digest()[0])%2?[1,0]:[0,1];
   const c=entry.capture;
  try{
   assert(c?.wire&&digest(c.wire)===c.requestHash,'CONTEXT_CAPTURE_MISSING');
   const isStyle=entry.label.startsWith('c-20261028-j2:');
   if(!isStyle)assert(Array.isArray(c.sourceProducts)&&c.sourceProducts.length,'CONTEXT_SOURCE_METADATA_MISSING');
   const body=structuredClone(c.wire);body.systemInstruction={parts:[{text:isStyle?baselinePrompt:stylePrompt}]};
   const arms=isStyle?[body,{...structuredClone(body),systemInstruction:{parts:[{text:stylePrompt}]}}]:
    [body,presentSalesContext(body,c.sourceProducts??[],c.claims??[])];
   if(!isStyle)assert.notEqual(digest(arms[0]),digest(arms[1]),'CONTEXT_PROJECTION_UNEXERCISED');
   for(const arm of arms)assertReplayWire(arm);
   assert.deepEqual(arms[0].contents.slice(1).filter(m=>m.role==='model'),arms[1].contents.slice(1).filter(m=>m.role==='model'));
   return {id,label:entry.label,repetition:entry.repetition,order,arms,armHashes:arms.map(requestHash),
    originalRequestHash:c.requestHash,judgeInput:{latest:c.runtimeInput.latest,history:c.runtimeInput.history},
    scoringInstruction:isStyle?'Giải quyết việc sửa số đo, dẫn dữ kiện khi giúp giải thích, không đọc lại hồ sơ.':
     entry.label==='OPENING_AD_QUOTE'?'Giữ form báo giá mở đầu và dữ kiện/ảnh của đúng món.':'Tư vấn giúp chọn mua, giữ dữ kiện ảnh hưởng quyết định theo đúng nguồn.'};
  }catch(error){return {id,label:entry.label,repetition:entry.repetition,order,arms:null,
   preparationFailure:/^CONTEXT_[A-Z_]+$/u.test(error.message)?error.message:'CONTEXT_PREPARATION_FAILED'};}
 });
 return {stage:'CONTEXT',source,origin,seed,model,maximumOwnerRequests:24,maximumJudgeRequests:12,retry:0,
  promptHashes:{baseline:byteHash(baselinePrompt),style:byteHash(stylePrompt)},slots};
}
export function scoreContextReplay(reg,results,grades){
 assert.deepEqual(grades.judge,contextJudgeIdentity('REPLAY'),'CONTEXT_REPLAY_JUDGE');
 const {rows}=scoreReplay(reg,results,grades);
 const sets=[...groups.map(([id,t])=>id+':'+t),'OPENING_AD_QUOTE'].map(label=>{
  const selected=rows.filter(r=>r.label===label);
  assert.equal(selected.length,3,'CONTEXT_DENOMINATOR');
  return {label,voice:selected.filter(r=>r.treatment?.voicePass).length,facts:selected.filter(r=>r.treatment?.factsComplete).length,
   controls:selected.filter(r=>r.treatment?.controlPass).length,material:selected.filter(r=>r.treatment?.materialRegression).length,
   net:selected.reduce((n,r)=>n+(r.beat??0),0),complete:selected.every(r=>r.treatment&&r.baseline)};
 });
 const style=sets[0],sources=sets.slice(1);
 const pass=style.complete&&style.voice>=2&&style.net>0&&style.facts===3&&sets.every(s=>s.material===0&&s.complete)&&
  sources.every(s=>s.facts===3&&s.net>=0)&&sources.at(-1).controls===3;
 return {stage:'CONTEXT',status:pass?'PASS':'STOP',sourceSha:reg.source,registrationHash:digest(reg),sets,rows,resultsHash:digest(results),gradesHash:digest(grades)};
}

/** Three existing native executions share one campaign cap and the exact same frozen world. */
export function nativeContextJobs({score,baseline,candidate,controls}){
 assert.equal(score?.stage,'CONTEXT');assert.equal(score.status,'PASS','CONTEXT_REPLAY_NOT_PASSED');
 assert.equal(baseline.runSourceSha,CONTEXT_BASELINE_SHA,'CONTEXT_BASELINE_SOURCE');
 assert([baseline,candidate,controls].every(reg=>reg.slots.every(s=>s.mode!=='SAFETY')),'CONTEXT_NATIVE_NO_PROBES');
 assert.equal(baseline.worldHash,candidate.worldHash);assert.equal(candidate.worldHash,controls.worldHash);
 assert.equal(candidate.runSourceSha,score.sourceSha,'CONTEXT_REPLAY_SOURCE_CHANGED');
 assert.equal(controls.runSourceSha,candidate.runSourceSha);
 assert.equal(score.rows?.length,12,'CONTEXT_REPLAY_DENOMINATOR');
 for(const key of ['registrationHash','resultsHash','gradesHash'])assert.match(score[key],/^[0-9a-f]{64}$/);
 const baselineJ2=baseline.corpus.scenarios.find(s=>s.id==='c-20261028-j2');
 const candidateJ2=candidate.corpus.scenarios.find(s=>s.id==='c-20261028-j2');
 assert.deepEqual(baselineJ2?.turns,candidateJ2?.turns,'CONTEXT_J2_INPUT_CHANGED');
 assert.deepEqual(baselineJ2?.customerPolicy,candidateJ2?.customerPolicy,'CONTEXT_J2_INPUT_CHANGED');
 assert.equal(candidate.config.salesContextPresentation,true);
 assert.equal(candidate.config.salesContextScreen,true);
 assert.equal(controls.config.salesContextPresentation,true);
 assert.deepEqual(controls.corpus.scenarios.map(s=>s.id),controlsScript.map(s=>s.id),'CONTEXT_CONTROL_IDS');
 for(const [kind,reg]of [['PRIMARY',candidate],['CONTROLS',controls]]){
  const scripts=reg.corpus.scenarios.map(s=>({id:s.id,mode:s.mode,turns:s.turns,customerPolicy:s.customerPolicy??null}));
  assert.equal(digest(scripts),nativeScopes[kind].customerScriptsHash,'CONTEXT_CUSTOMER_SCRIPTS');
  assert.equal(reg.corpus.provenance?.diagnosticScope,nativeScopes[kind].name);
 }
 const select=(reg,ids,n)=>reg.slots.filter(s=>s.arm==='CANDIDATE'&&ids.includes(s.caseId)&&s.repetition<=n);
 const primary=['c-20261028-j2','c-20261028-j4','c-20261028-s15','c-20261028-s08','c-20261028-s16'];
 const jobs=[{kind:'BASELINE_J2',reg:baseline,slots:select(baseline,[primary[0]],5),turns:15},
  {kind:'CANDIDATE',reg:candidate,slots:select(candidate,primary,5),turns:45},
  {kind:'CONTROLS',reg:controls,slots:controls.slots.filter(s=>s.arm==='CANDIDATE'),turns:6}];
 assert.deepEqual(jobs.map(j=>j.slots.length),[5,25,4],'CONTEXT_NATIVE_DENOMINATOR');
 assert.equal(controls.config.repetitions,5);
 for(const job of jobs){
  assert.equal(new Set(job.slots.map(s=>s.slotId)).size,job.slots.length);
  assert.equal(job.slots.reduce((n,s)=>n+job.reg.corpus.scenarios.find(c=>c.id===s.caseId).turns.length,0),job.turns);
  const byCase=new Map();for(const s of job.slots){const list=byCase.get(s.caseId)??[];list.push(s.repetition);byCase.set(s.caseId,list);}
  for(const list of byCase.values())assert.deepEqual(list.sort(),job.kind==='CONTROLS'?[1]:[1,2,3,4,5]);
 }
 return {kind:'SALES_CONTEXT_NATIVE_CAMPAIGN',replayScoreHash:digest(score),worldHash:candidate.worldHash,budget:CONTEXT_BUDGET,
  jobs:jobs.map(j=>({kind:j.kind,source:j.reg.runSourceSha,registrationHash:digest(j.reg),slotIds:j.slots.map(s=>s.slotId),
   turns:j.turns,maximumGenerationRequests:j.turns*4}))};
}

/** Select reviewed scripts before bindCorpus supplies fresh source/initial-state evidence. */
export function contextNativeDrafts(preparedCorpus,reviewedControls){
 const select=(list,scope)=>{
  const copy=structuredClone(preparedCorpus);
  copy.scenarios=list;
  copy.provenance={...copy.provenance,developmentOnly:true,diagnosticScope:scope.name};
  assert.equal(digest(list.map(s=>({id:s.id,mode:s.mode,turns:s.turns,customerPolicy:s.customerPolicy??null}))),scope.customerScriptsHash,'CONTEXT_CUSTOMER_SCRIPTS');
  return copy;
 };
 const primary=nativeScopes.PRIMARY.cases.map(c=>{
  const found=preparedCorpus.scenarios.find(s=>s.id===c.sourceCase);
  assert(found,'CONTEXT_PRIMARY_MISSING');return structuredClone(found);
 });
 assert.equal(reviewedControls.scenarios.length,4);
 return {primary:select(primary,nativeScopes.PRIMARY),controls:select(structuredClone(reviewedControls.scenarios),nativeScopes.CONTROLS)};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const {positionals,values:v}=parseArgs({allowPositionals:true,options:{registration:{type:'string'},journal:{type:'string',multiple:true},
  controls:{type:'string'},out:{type:'string'},seed:{type:'string'},seal:{type:'string'},results:{type:'string'},grades:{type:'string'},
  baseline:{type:'string'},candidate:{type:'string'},score:{type:'string'},campaign:{type:'string'},job:{type:'string'},root:{type:'string'},world:{type:'string'},'opening-journal':{type:'string'},'native-input':{type:'string'},'native-seed':{type:'string'}}});
 const [command]=positionals;
 if(command==='prepare'){
  assert.equal(git('status','--porcelain'),'','CONTEXT_DIRTY_SOURCE');
  function readJournal(path){try{return readFileSync(path,'utf8').trim().split(/\r?\n/).map(JSON.parse);}catch{return [];}}
  let openingControl=null;
  try{openingControl=bindOpeningControl(read(v.controls).OPENING_AD_QUOTE,readJournal(v['opening-journal']));}catch{}
  const reg=buildContextReplay({registration:read(v.registration),journals:v.journal.map(readJournal),
   openingControl,baselinePrompt:execFileSync('git',['show',CONTEXT_BASELINE_SHA+':'+promptPath],{encoding:'utf8'}),
   stylePrompt:execFileSync('git',['show',W1_SOURCE_SHA+':'+promptPath],{encoding:'utf8'}),source:git('rev-parse','HEAD'),seed:v.seed});
  write(v.out,reg);console.log(JSON.stringify({seal:digest(reg),slots:reg.slots.length,blocked:reg.slots.filter(s=>!s.arms).length}));
 }else if(command==='dispatch'){
  const reg=read(v.registration),projectId=read(process.env.C3_VERTEX_CREDENTIAL_FILE).project_id;
  await dispatchReplay(reg,v.seal,v.registration,v.out,projectId);
 }else if(command==='judge-packet')write(v.out,replayJudgePacket(read(v.registration),read(v.results)));
 else if(command==='score')write(v.out,scoreContextReplay(read(v.registration),read(v.results),read(v.grades)));
 else if(command==='corpus'){const drafts=contextNativeDrafts(read(v.registration).corpus??read(v.registration),read(v.controls));write(v.out+'-primary.json',drafts.primary);write(v.out+'-controls.json',drafts.controls);}
 else if(command==='native-jobs')write(v.out,nativeContextJobs({score:read(v.score),baseline:read(v.baseline),candidate:read(v.candidate),controls:read(v.controls)}));
 else if(command==='native-dispatch'){
  const {dispatchContextNative}=await import('./sales-context-campaign.mjs');
  dispatchContextNative({proof:{campaignPath:v.campaign,seal:v.seal,kind:v.job,scorePath:v.score},registrationPath:v.registration,
   worldPath:v.world,sourceRoot:v.root,out:v.out,seedPath:v['native-seed']});
 }
 else if(command==='native-judge-packet'||command==='native-score'){
  const {nativeContextJudgePackets,scoreNativeContext}=await import('./sales-context-native-review.mjs');
  const input=read(v['native-input']);
  assert.equal(digest(input.campaign),v.seal,'CONTEXT_CAMPAIGN_SEAL');
  write(v.out,command==='native-judge-packet'?nativeContextJudgePackets(input).packets:scoreNativeContext(input,read(v.grades)));
 }
 else throw Error('CONTEXT_COMMAND');
}
