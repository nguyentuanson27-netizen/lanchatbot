import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {assertWire,byteHash,digest,read,write} from './bc-control.mjs';
import {createCapturedOwnerSender} from './bc-owner-replay.mjs';
import {assertNativeRuntime,NATIVE_CODECS} from './native-wire.mjs';
import {assertRuntimeFirewall} from './qualification.mjs';
import {OWNER_IMAGE_BOUNDS,OWNER_REQUEST_MAX_BYTES,OWNER_SIGNATURE_MAX_BYTES,ownerSignatureBytes,ownerTextBytes} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {presentVerifiedOfferTerms} from '../single-agent-commerce-read-only/owner-offer-terms.mjs';

const targets=[
 ['c-20261028-s15',0],['c-20261028-j2',1],['c-20261028-j2',2],
 ['c-20261028-j4',1],['c-20261028-j4',2],['c-20261028-s08',0],
];
const voiceControls=['THANKS_ONLY','PRE_ORDER_ALREADY_DISCLOSED','TWO_UNITS_PROMOTION','OPENING_AD_QUOTE'];
const offerControls=['MIXED_STOCK','PRE_ORDER_ALREADY_DISCLOSED','STOCK_CHANGED','STOCK_PROOF_UNAVAILABLE'];
const origin='5dfde94b11a2b55ca7a52846b241bb440ee68994';
const promptPath='apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt';
const oldPrompt=()=>execFileSync('git',['show',origin+':'+promptPath],{encoding:'utf8'});
const newPrompt=()=>readFileSync(promptPath,'utf8');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const cleanHead=()=>{
 assert.equal(git('status','--porcelain'),'','VOICE_REPLAY_DIRTY_SOURCE');
 return git('rev-parse','HEAD');
};
const byteDigest=body=>byteHash(JSON.stringify(body));
const modelConfig={model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{retry:0}};
const bodyWithoutInstruction=({systemInstruction,...rest})=>rest;

export function assertReplayWire(body,caseIds=targets.map(([id])=>id)){
 const config={...body.generationConfig};
 delete config.mediaResolution;
 assertWire({...body,generationConfig:config},caseIds);
 assertRuntimeFirewall(body,caseIds);
 const images=body.contents.flatMap(m=>m.parts).filter(p=>p.inlineData);
 assert(images.length<=OWNER_IMAGE_BOUNDS.count&&images.every(p=>Buffer.from(p.inlineData.data,'base64').length<=OWNER_IMAGE_BOUNDS.maxBytes),'VOICE_REPLAY_IMAGE_BOUND');
 assert(ownerSignatureBytes(body)<=OWNER_SIGNATURE_MAX_BYTES,'VOICE_REPLAY_SIGNATURE_BOUND');
 const text=structuredClone(body);
 if(!images.length)assert(!Object.hasOwn(body.generationConfig,'mediaResolution'));
 if(images.length){
  assert(body.contents[1]?.parts.filter(p=>p.inlineData).length===images.length,'VOICE_REPLAY_IMAGE_FRAME');
  assert.equal(text.generationConfig.mediaResolution,'MEDIA_RESOLUTION_MEDIUM');
  text.contents.splice(1,1);delete text.generationConfig.mediaResolution;
 }
 assert(ownerTextBytes(text)<=OWNER_REQUEST_MAX_BYTES&&Buffer.byteLength(JSON.stringify(body))<=OWNER_IMAGE_BOUNDS.maxRequestBytes,'VOICE_REPLAY_FRAME_BOUND');
}

export function voicePair(wire,baseline,treatment){
 assert.equal(wire.systemInstruction.parts.length,1);
 assert.notEqual(baseline,treatment);
 const withPrompt=text=>({...wire,systemInstruction:{parts:[{text}]}});
 const arms=[withPrompt(baseline),withPrompt(treatment)];
 assert.equal(byteDigest(bodyWithoutInstruction(arms[0])),byteDigest(bodyWithoutInstruction(arms[1])));
 for(const arm of arms)assertReplayWire(arm);
 return arms;
}

/** Select by request/result ID and execution order, never by the prior wording or judge outcome. */
export function finalOwnerWire(rows,slotId,turnIndex){
 const turn=rows.filter(row=>row.slotId===slotId&&row.turnIndex===turnIndex);
 const results=turn.filter(row=>row.phase==='RESULT'&&row.value.output?.kind==='FINAL');
 const requests=turn.filter(row=>row.phase==='REQUEST'&&row.value.role==='OWNER');
 const request=requests.find(row=>row.value.id===results.at(-1)?.value.id)?.value;
 if(!request)return null;
 const {requestBody:wire,requestHash,runtimeInput,id}=request;
 assert.equal(digest(wire),requestHash,'VOICE_REPLAY_CAPTURE_HASH');
 assertNativeRuntime(wire,NATIVE_CODECS.OWNER,runtimeInput);
 const verifier=turn.filter(row=>row.phase==='REQUEST'&&row.value.role==='VERIFIER').at(-1)?.value;
 if(!verifier)return {wire,runtimeInput,id,requestHash,claims:[]};
 assert.equal(digest(verifier.requestBody),verifier.requestHash,'VOICE_REPLAY_VERIFIER_CAPTURE_HASH');
 const frame=JSON.parse(verifier.requestBody.input[0].content[0].text);
 assert.equal(frame.untrusted.finalDraft,results.at(-1).value.output.text,'VOICE_REPLAY_DRAFT_BINDING');
 return {wire,runtimeInput,id,requestHash,claims:frame.trusted.protectedClaims};
}

const loadRows=path=>readFileSync(path,'utf8').trim().split(/\r?\n/u).map(JSON.parse);
function measuredCases(stage,registration,journals){
 const list=stage==='VOICE'?targets:[targets.at(-1)];
 return list.flatMap(([id,turnIndex])=>{
  const captures=journals.map((rows,i)=>{
   const slot=registration.slots.find(s=>s.caseId===id&&s.repetition===i+1);
   assert(slot,'VOICE_REPLAY_SLOT_MISSING');
   return finalOwnerWire(rows,slot.slotId,turnIndex);
  });
  const first=captures.findIndex(Boolean),every=captures.every(Boolean);
  return captures.map((capture,i)=>({label:id+':'+turnIndex,repetition:i+1,
   capture:every?capture:captures[first]??null,sourceRepetition:every?i+1:first+1}));
 });
}
const stages={VOICE:voiceControls,OFFERS:offerControls};

// Judge sees only the public dialogue and code data needed to check the reply, without the treatment labels.
function judgeOrder(reg,slot){
 return createHmac('sha256',reg.seed).update('judge:'+slot.id).digest()[0]%2?[1,0]:[0,1];
}
export function replayJudgePacket(reg,observed){
 assert.equal(observed.registrationHash,digest(reg),'VOICE_REPLAY_RESULT_BINDING');
 const results=new Map(observed.results.map(r=>[r.id+':'+r.arm,r]));
 assert.equal(results.size,observed.results.length,'VOICE_REPLAY_RESULT_DUPLICATE');
 assert(results.size===reg.slots.filter(s=>s.arms).length*2,'VOICE_REPLAY_RESULT_COUNT');
 return reg.slots.map(slot=>{
  if(!slot.arms)return {packetId:slot.id,preparationBlocked:true};
  const b=slot.arms[0],capture=slot.judgeInput;
  const order=judgeOrder(reg,slot);
  return {packetId:slot.id,dialogue:capture,criterion:slot.scoringInstruction,
   trustedContext:b.contents[0].parts[0].text,
   toolResults:b.contents.slice(1).flatMap(m=>m.parts.flatMap(p=>p.functionResponse?[p.functionResponse]:[])),
   replies:order.map(arm=>{
    const r=results.get(slot.id+':'+arm);
    assert(r&&r.telemetry.requestHash===slot.armHashes[arm],'VOICE_REPLAY_RESULT_WIRE');
    return {text:r.status==='OK'?r.text:null,status:r.status};
   })};
 });
}

/** Validate blind ratings and return the evidence gate without selecting a preferred sample. */
export function scoreReplay(reg,observed,graded){
 const packet=replayJudgePacket(reg,observed);
 assert.equal(graded.packetHash,digest(packet),'VOICE_REPLAY_GRADE_BINDING');
 assert.equal(graded.judge?.model,'gpt-6.1-sol');
 assert.equal(graded.judge?.effort,'high');
 assert.equal(graded.judge?.blind,true);
 assert.equal(graded.judge?.independent,true);
 for(const key of Object.keys(graded.ratings))assert(packet.some(p=>p.packetId===key&&!p.preparationBlocked),'VOICE_REPLAY_UNKNOWN_GRADE');
 const rows=reg.slots.map((slot,i)=>{
  const rating=graded.ratings[slot.id];
  if(!rating||packet[i].preparationBlocked)return {label:slot.label,preparationBlocked:!slot.arms};
  assert(Array.isArray(rating.replies)&&rating.replies.length===2);
  assert(['A','B','TIE'].includes(rating.preferred));
  const order=judgeOrder(reg,slot),mapped=[];
  for(const [j,grade] of rating.replies.entries()){
   assert(grade&&typeof grade.voicePass==='boolean'&&typeof grade.factsComplete==='boolean'&&
    typeof grade.materialRegression==='boolean'&&typeof grade.controlPass==='boolean'&&typeof grade.reason==='string'&&grade.reason.trim(),'VOICE_REPLAY_GRADE_SHAPE');
   const ok=packet[i].replies[j].status==='OK';
   mapped[order[j]]=ok?grade:{voicePass:false,factsComplete:false,materialRegression:false,controlPass:false};
  }
  const [baseline,treatment]=mapped;
  const winner=rating.preferred==='TIE'?null:order[rating.preferred==='A'?0:1];
  const failures=packet[i].replies.map(r=>r.status!=='OK');
  const validPair=!failures.includes(true);
  const beat=validPair?(winner===null?0:winner===1?1:-1):failures[order.indexOf(1)]?-1:0;
  return {label:slot.label,baseline,treatment,beat};
 });
 const isControl=row=>stages[reg.stage].includes(row.label);
 const controls=rows.filter(isControl),main=rows.filter(row=>!isControl(row));
 const targets=[...new Set(main.map(r=>r.label))].map(label=>{
  const group=main.filter(r=>r.label===label);
  return {label,voicePass:group.filter(r=>r.treatment?.voicePass).length,
   factsComplete:group.filter(r=>r.treatment?.factsComplete).length,
   netWins:group.reduce((n,r)=>n+(r.beat??0),0)};
 });
 const controlsOk=controls.every(r=>r.treatment?.controlPass&&r.treatment.factsComplete);
 const materialOk=rows.every(r=>r.treatment&&!r.treatment.materialRegression&&
  (r.treatment.factsComplete||reg.stage==='VOICE'&&r.label==='c-20261028-s08:0'&&r.baseline?.factsComplete===false));
 const gate=reg.stage==='VOICE'?targets.every(t=>t.voicePass>=4&&t.netWins>=0)&&
  new Set(targets.filter(t=>t.netWins>0).map(t=>t.label.split(':')[0])).size>=2:
  targets.every(t=>t.factsComplete===5&&t.voicePass>=4);
 return {stage:reg.stage,status:controlsOk&&materialOk&&gate?'PASS':'STOP',controlsOk,materialOk,targets,rows,
  registrationHash:digest(reg),observedHash:digest(observed),gradeHash:digest(graded)};
}

const scoring={
 'c-20261028-s15:0':'Khách thích đúng áo be. Khi báo giá, giữ đúng giá và trạng thái đặt trước. Chỉ mở bước mua hữu ích, không tự tạo giỏ.',
 'c-20261028-j2:1':'Dùng size đúng theo số đo đã sửa; tránh đọc lại cả hồ sơ.',
 'c-20261028-j2:2':'Chốt size có căn cứ và tránh hứa về cảm giác mặc.',
 'c-20261028-j4:1':'Trả lời phạm vi hỗ trợ cho một áo. Ưu đãi mua nhiều chỉ bổ sung và phải đúng điều kiện.',
 'c-20261028-j4:2':'Trả đúng tổng và chỉ hỏi lựa chọn còn cần.',
 'c-20261028-s08:0':'Chọn váy theo dịp; báo đúng trạng thái đặt trước của váy đề xuất.',
 THANKS_ONLY:'Đáp lời cảm ơn gọn, không mở việc mua mới.',
 PRE_ORDER_ALREADY_DISCLOSED:'Trả lời điều mới và tránh nhắc lại trạng thái đặt trước mà khách đã biết.',
 TWO_UNITS_PROMOTION:'Giữ tổng đã xác nhận và ưu đãi đúng hai đơn vị khi nó giúp giải thích tổng.',
 OPENING_AD_QUOTE:'Giữ form giá mở đầu, chất liệu/phom, size khi có căn cứ và đúng món trong ảnh đã chuẩn bị.',
 MIXED_STOCK:'Giữ hàng sẵn và đặt trước theo đúng từng lựa chọn.',
 STOCK_CHANGED:'Báo trạng thái mới của đúng mẫu, dù trước đó đã nói trạng thái khác.',
 STOCK_PROOF_UNAVAILABLE:'Không khẳng định trạng thái khi thiếu nguồn còn hiệu lực.',
};

export function buildReplayRegistration({stage,registration,journals,controls,baseline,treatment,source,seed}){
 assert(stages[stage]&&journals.length===5&&registration.runSourceSha===origin,'VOICE_REPLAY_ORIGIN');
 assert(/^[a-f0-9]{64}$/u.test(seed),'VOICE_REPLAY_SEED');
 assert.deepEqual(Object.keys(controls).sort(),[...stages[stage]].sort(),'VOICE_REPLAY_CONTROL_SET');
 const rows=[...measuredCases(stage,registration,journals),...stages[stage].map(label=>({label,repetition:1,capture:controls[label]}))];
 const firstArm=createHmac('sha256',seed).update(stage+':dispatch').digest()[0]%2;
 const slots=rows.map((row,sequence)=>{
  const c=row.capture;
  const id=digest({source,stage,label:row.label,repetition:row.repetition,wire:c?.requestHash??null});
  const order=(sequence+firstArm)%2?[1,0]:[0,1];
  try{
   assert(c?.wire&&digest(c.wire)===c.requestHash,'VOICE_REPLAY_CONTROL_HASH');
   if(row.sourceRepetition)assert.equal(c.wire.systemInstruction.parts[0].text,baseline,'VOICE_REPLAY_BASELINE_PROMPT');
   assertNativeRuntime(c.wire,NATIVE_CODECS.OWNER,c.runtimeInput);
   assert.equal(c.wire.systemInstruction.parts.length,1);
   let arms;
   if(stage==='VOICE')arms=voicePair(c.wire,baseline,treatment);
   else{
    const base={...c.wire,systemInstruction:{parts:[{text:treatment}]}};
    arms=[base,presentVerifiedOfferTerms(base,c.claims??[])];
    for(const a of arms)assertReplayWire(a);
   }
   return {...row,capture:undefined,id,order,requestHash:c.requestHash,arms,armHashes:arms.map(byteDigest),
    judgeInput:{latest:c.runtimeInput.latest,history:c.runtimeInput.history},scoringInstruction:scoring[row.label]};
  }catch(error){
   return {...row,capture:undefined,id,order,arms:null,preparationFailure:error.code==='ERR_ASSERTION'?error.message:'VOICE_REPLAY_PREPARATION'};
  }
 });
 return {stage,source,origin,seed,model:modelConfig,maximumOwnerRequests:slots.length*2,maximumJudgeRequests:slots.length,retry:0,slots};
}

function validate(reg){
 assert.equal(reg.source,cleanHead(),'VOICE_REPLAY_SOURCE_CHANGED');
 assert.equal(reg.origin,origin);
 assert.deepEqual(reg.model,modelConfig);
 assert.match(reg.seed,/^[a-f0-9]{64}$/u);
 assert.equal(reg.retry,0);
 const count=reg.stage==='VOICE'?34:reg.stage==='OFFERS'?9:0;
 assert(count&&reg.slots.length===count);
 assert.equal(reg.maximumOwnerRequests,count*2);
 assert.equal(reg.maximumJudgeRequests,count);
 assert.equal(new Set(reg.slots.map(s=>s.id)).size,count);
 for(const slot of reg.slots){
  assert.deepEqual([...slot.order].sort(),[0,1]);
  if(slot.arms===null){assert(slot.preparationFailure);continue;}
  assert.equal(slot.arms.length,2);
  for(const arm of slot.arms)assertReplayWire(arm);
  assert.deepEqual(slot.arms.map(byteDigest),slot.armHashes);
 }
}

export async function dispatchReplay(reg,seal,path,out,projectId,dependencies={}){
 assert.equal(seal,digest(reg),'VOICE_REPLAY_SEAL_CHANGED');
 validate(reg);
 assert(!reg.slots.some(s=>s.preparationFailure),'VOICE_REPLAY_PREPARATION_BLOCKED');
 const send=createCapturedOwnerSender({projectId,model:reg.model},{...dependencies,assertBody:assertReplayWire});
 const results=[];
 // Reuse the same credential transport but validate the original multimodal body here.
 for(const slot of reg.slots)for(const arm of slot.order){
  assert.equal(digest(read(path)),seal,'VOICE_REPLAY_SEAL_CHANGED');
  assert.equal(cleanHead(),reg.source,'VOICE_REPLAY_SOURCE_CHANGED');
  write(resolve(out,slot.id+'-'+arm+'.started.json'),{id:slot.id,arm,requestHash:slot.armHashes[arm]});
  const result=await send(slot.arms[arm],slot.armHashes[arm]);
  assert([0,1].includes(result.telemetry.providerRequests),'VOICE_REPLAY_ACCOUNTING_UNKNOWN');
  const status=result.status==='OK'&&result.output.kind!=='FINAL'?'TOOL_CALL_NOT_EXECUTED':result.status;
  const entry={id:slot.id,arm,status,telemetry:result.telemetry,
   text:status==='OK'?result.output.text:null};
  write(resolve(out,slot.id+'-'+arm+'.result.json'),entry);results.push(entry);
 }
 assert.equal(results.length,reg.maximumOwnerRequests);
 write(resolve(out,'RESULTS.json'),{registrationHash:seal,results});
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const {positionals,values}=parseArgs({allowPositionals:true,options:{
  stage:{type:'string'},registration:{type:'string'},journal:{type:'string',multiple:true},controls:{type:'string'},
  seed:{type:'string'},out:{type:'string'},seal:{type:'string'},results:{type:'string'},grades:{type:'string'},'voice-score':{type:'string'},
 }});
 const [command]=positionals;
 if(command==='prepare'){
  const source=cleanHead(),stage=values.stage,baseline=oldPrompt();
  const voiceScore=values['voice-score']?read(values['voice-score']):null;
  if(stage==='OFFERS')assert(voiceScore?.stage==='VOICE'&&['PASS','STOP'].includes(voiceScore.status),'VOICE_REPLAY_VOICE_RESULT_REQUIRED');
  const treatment=stage==='OFFERS'&&voiceScore.status==='STOP'?baseline:newPrompt();
  const reg=buildReplayRegistration({source,stage,registration:read(values.registration),journals:values.journal.map(loadRows),
   controls:read(values.controls),seed:values.seed,baseline,treatment});
  if(voiceScore)reg.voiceScoreHash=digest(voiceScore);
  write(values.out,reg);
  console.log(JSON.stringify({stage,source,registrationHash:digest(reg),slots:reg.slots.length,
   preparationFailures:reg.slots.filter(s=>s.preparationFailure).map(s=>s.label+':'+s.repetition)}));
 }else if(command==='dispatch'){
  const path=values.registration,reg=read(path);
  const projectId=read(process.env.C3_VERTEX_CREDENTIAL_FILE).project_id;
  await dispatchReplay(reg,values.seal,path,values.out,projectId);
 }else if(command==='judge-packet'){
  write(values.out,replayJudgePacket(read(values.registration),read(values.results)));
 }else if(command==='score'){
  write(values.out,scoreReplay(read(values.registration),read(values.results),read(values.grades)));
 }else throw new Error('VOICE_REPLAY_COMMAND');
}
