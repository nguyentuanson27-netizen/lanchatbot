import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {digest} from './qualification.mjs';
import {contextJudgeIdentity} from './sales-context-judge.mjs';

const j2='c-20261028-j2', j4='c-20261028-j4', s15='c-20261028-s15', s08='c-20261028-s08', s16='c-20261028-s16';
const controls=['c-context-thanks','c-context-preorder','c-context-two-units','c-context-opening'];
const requiredTurns={[j2]:[1,2],[j4]:[1,2],[s15]:[0],[s08]:[0]};
const saleCases=[j2,j4,s15,s08];
const jobKinds=['BASELINE_J2','CANDIDATE','CONTROLS'];

/** Consume committed, no-send campaign evidence. Missing attempts retain their place in the denominator. */
export function nativeContextJudgePackets({campaign,registrations,evidence,seed}){
 assert.match(seed,/^[a-f0-9]{64}$/u);
 const byId=new Map();
 for(const [i,job] of campaign.jobs.entries()){
  assert.equal(job.kind,jobKinds[i]);
  const reg=registrations[job.kind],run=evidence[job.kind];
  assert.equal(digest(reg),job.registrationHash,'CONTEXT_JUDGE_REGISTRATION');
  assert.equal(run.source.sourceSha,job.source,'CONTEXT_JUDGE_SOURCE');
  assert.equal(digest(run.corpus),reg.corpusHash,'CONTEXT_JUDGE_CORPUS');
  assert.deepEqual(run.identity,reg.identity,'CONTEXT_JUDGE_IDENTITY');
  assert.deepEqual(run.config,reg.config,'CONTEXT_JUDGE_CONFIG');
  assert.equal(reg.config.blinding.seedCommitment,digest(seed),'CONTEXT_NATIVE_JUDGE_SEED');
  assert.equal(run.blindSeed,seed,'CONTEXT_NATIVE_EVIDENCE_SEED');
  assert.equal(new Set(run.attempts.map(a=>a.slotId)).size,run.attempts.length);
  assert(run.attempts.every(a=>a.status==='NOT_RUN'||job.slotIds.includes(a.slotId)),'CONTEXT_UNREGISTERED_ATTEMPT');
  for(const sid of job.slotIds){
   const slot=reg.slots.find(s=>s.slotId===sid);
   const scenario=reg.corpus.scenarios.find(s=>s.id===slot.caseId);
   const attempt=run.attempts.find(a=>a.slotId===sid)??{status:'NOT_RUN'};
   if(attempt.status!=='NOT_RUN')assert.equal(attempt.caseId,slot.caseId);
   byId.set([job.kind,slot.caseId,slot.repetition].join('|'),{scenario,attempt});
  }
 }
 const get=(job,id,n)=>{const row=byId.get([job,id,n].join('|'));assert(row,'CONTEXT_JUDGE_SLOT');return row;};
 const summary=({scenario,attempt})=>({
  status:attempt.status,
  turns:scenario.turns.map((turn,index)=>{
   const observed=attempt.turns?.[index];
   const terminal=observed?.terminal??(scenario.turns.length===1?attempt.terminal:undefined);
   return {customer:observed?.customer??turn.latest,terminal:terminal??{disposition:'NOT_RUN',messages:[],images:[]}};
  }),
 });
 const entries=[];
 function add(caseId,repetition,arms){
  const packetId=createHmac('sha256',seed).update(caseId+'|'+repetition).digest('hex');
  const order=arms.length===2&&parseInt(packetId.slice(0,2),16)%2?[1,0]:arms.map((_,i)=>i);
  const scenario=arms.at(-1).scenario;
  entries.push({caseId,repetition,order,arms,packet:{packetId,targetTurns:requiredTurns[caseId]??[0],
   criterion:scenario.evaluator.requiredCustomerOutcomes,source:scenario.judgeContext,
   conversations:order.map(i=>summary(arms[i]))}});
 }
 for(const id of saleCases)for(let n=1;n<=5;n++)
  add(id,n,[...(id===j2?[get('BASELINE_J2',id,n)]:[]),get('CANDIDATE',id,n)]);
 for(const id of controls)add(id,1,[get('CONTROLS',id,1)]);
 assert.equal(entries.length,24);
 return {entries,packets:entries.map(e=>e.packet),handoffs:[1,2,3,4,5].map(n=>get('CANDIDATE',s16,n).attempt)};
}

function activationObserved(attempt){
 const transitions=attempt.audit?.stateTransitions??[],effects=attempt.audit?.effects??[],receipts=attempt.audit?.receipts??[];
 const first=transitions[0]?.after,second=transitions[1]?.after,last=transitions[2]?.after;
 const pending=first?.pendingSupportProof,applied=second?.pendingSupportProof;
 const commandKinds=effects.map(e=>e.command_kind);
 const order=['PENDING_NEGOTIATION_RECORDED','CART_OPENED','NEGOTIATION_EVENT'].map(k=>commandKinds.indexOf(k));
 return !!pending&&pending.status==='PENDING'&&first.cart===null&&
  applied?.status==='ACTIVATED'&&applied.id===pending.id&&applied.sourceObservedAt===pending.sourceObservedAt&&
  applied.cartId===second.cart?.cartId&&second.cart?.lines?.length===1&&second.cart.lines[0].quantity===2&&
  last?.cart?.cartId===second.cart?.cartId&&last.cart?.revision===second.cart?.revision&&
  order[0]>=0&&order[0]<order[1]&&order[1]<order[2]&&
  ['PENDING_NEGOTIATION_RECORDED','CART_OPENED','NEGOTIATION_EVENT'].every(k=>commandKinds.filter(x=>x===k).length===1&&
   receipts.filter(r=>r.commandKind===k).length===1);
}

export function scoreNativeContext(input,grades){
 const {entries,packets,handoffs}=nativeContextJudgePackets(input);
 assert.equal(grades.packetHash,digest(packets),'CONTEXT_NATIVE_GRADE_BINDING');
 assert.deepEqual(grades.judge,contextJudgeIdentity('NATIVE'),'CONTEXT_NATIVE_JUDGE');
 assert(Object.keys(grades.ratings).every(key=>packets.some(p=>p.packetId===key)),'CONTEXT_UNKNOWN_GRADE');
 const scored=entries.map(e=>{
  const grade=grades.ratings[e.packet.packetId];
  if(grade)assert(grade.arms?.length===e.arms.length,'CONTEXT_NATIVE_GRADE_ARMS');
  const arms=e.arms.map(({attempt},i)=>{
   const g=grade?.arms[e.order.indexOf(i)];
   if(g)assert(typeof g.wholePass==='boolean'&&typeof g.materialFailure==='boolean'&&
    g.turns?.length===e.packet.targetTurns.length&&g.turns.every(t=>typeof t.voicePass==='boolean'&&typeof t.factsComplete==='boolean')&&
    typeof g.reason==='string'&&g.reason.trim(),'CONTEXT_NATIVE_GRADE_SHAPE');
   const course=e.packet.conversations[e.order.indexOf(i)];
   const visible=turn=>['SEND_ELIGIBLE','CODE_OWNED_SEND'].includes(turn?.terminal.disposition)&&turn.terminal.messages.length>0;
   return {complete:attempt.status==='EXECUTED'&&course.turns.every(visible)&&g?.wholePass===true,
    material:!!g?.materialFailure||(attempt.safetyFindings?.length??0)>0,
    turns:e.packet.targetTurns.map((n,k)=>({voice:attempt.status==='EXECUTED'&&visible(course.turns[n])&&g?.turns[k].voicePass===true,
     facts:attempt.status==='EXECUTED'&&visible(course.turns[n])&&g?.turns[k].factsComplete===true})),reason:g?.reason??null};
  });
  return {caseId:e.caseId,repetition:e.repetition,arms};
 });
 const summary=Object.fromEntries(saleCases.map(id=>{
  const rows=scored.filter(r=>r.caseId===id);
  return [id,{complete:rows.filter(r=>r.arms.at(-1).complete).length,
   voice:requiredTurns[id].map((_,k)=>rows.filter(r=>r.arms.at(-1).turns[k].voice).length),
   facts:requiredTurns[id].map((_,k)=>rows.filter(r=>r.arms.at(-1).turns[k].facts).length)}];
 }));
 const j2rows=scored.filter(r=>r.caseId===j2);
 const j2net=requiredTurns[j2].map((_,k)=>j2rows.reduce((n,r)=>n+Number(r.arms[1].turns[k].voice)-Number(r.arms[0].turns[k].voice),0));
 const baselineComplete=j2rows.filter(r=>r.arms[0].complete).length;
 const silent=handoffs.filter(a=>a.status==='EXECUTED'&&a.terminal?.disposition==='HANDOFF'&&
  !a.terminal.messages.length&&!a.terminal.images.length&&!(a.safetyFindings?.length)).length;
 const controlRows=scored.filter(r=>controls.includes(r.caseId));
 const opening=entries.find(e=>e.caseId==='c-context-opening').arms[0].attempt;
 const controlPass=controlRows.filter(r=>r.arms[0].complete&&r.arms[0].turns.every(t=>t.facts)&&
  (r.caseId!=='c-context-opening'||opening.terminal?.images.length>0)).length;
 const support=activationObserved(entries.find(e=>e.caseId==='c-context-two-units').arms[0].attempt);
 const material=scored.some(s=>s.arms.some(a=>a.material))||handoffs.some(a=>a.safetyFindings?.length);
 const pass=!material&&silent===5&&controlPass===4&&support&&j2net.every(n=>n>=0)&&j2net.some(n=>n>0)&&
  summary[j2].complete>=baselineComplete&&Object.values(summary).every(s=>s.complete>=4&&s.voice.every(n=>n>=4)&&s.facts.every(n=>n===5));
 return {status:pass?'PASS':'STOP',summary,j2net,baselineComplete,controlPass,silent,material,
  support:support?'OBSERVED':'NOT_EXERCISED',scored};
}
