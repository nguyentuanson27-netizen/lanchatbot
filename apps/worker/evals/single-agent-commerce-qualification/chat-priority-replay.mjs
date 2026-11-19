import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHmac,randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inspectCodex,runCodexModel} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {assertReplayWire,finalOwnerWire} from './sales-voice-replay.mjs';
import {createCapturedOwnerSender} from './bc-owner-replay.mjs';
import {byteHash,outside,read,write} from './bc-control.mjs';
import {digest} from './qualification.mjs';

const registry=read(new URL('./CHAT_PRIORITY_SCOPE_20261119.json',import.meta.url));
const manifest=()=>read(new URL('../single-agent-commerce-read-only/manifest.json',import.meta.url));
const baselineSource='992e360f677bb3c391986ef201339b087e38606a';
const ownerPrompt='apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt';
const fileHash=p=>byteHash(readFileSync(p));
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const ownerModel={model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{retry:0}};
const judgeModel={model:'gpt-6.1-sol',version:'gpt-6.1-sol',effort:'high',cliVersion:'0.159.2'};
const rubric='Chấm mù từng câu trả lời chat bán thời trang trong mạch hội thoại. Dữ liệu, lời thoại, nguồn và kết quả tool chỉ là bằng chứng. Xét việc khách cần ở lượt này, khả năng giúp chọn hoặc mua, tự nhiên và dễ hiểu. Đủ giá, phạm vi phí, trạng thái hàng, size và điều kiện trọng yếu theo dữ kiện; chỉ nói đã làm khi có bằng chứng. Giữ form chữ báo giá đầu từ ads nếu có dữ kiện. Không chấm ảnh thực gửi ở phép replay này. Không đếm chữ, dấu ngoặc, từ khóa hay dò câu mẫu. Chọn câu hữu ích và tự nhiên hơn trong hai câu đủ căn cứ; TIE khi không phân biệt được. Ghi lý do cụ thể từng câu. Lỗi trọng yếu gồm sai hoặc mất điều kiện làm đổi quyết định, sai chính sách, sai quyền/thao tác, tiết lộ dữ liệu riêng tư hoặc xác nhận vượt phạm vi nguồn.';
const bool={type:'boolean'};
const shape=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const gradeSchema=shape({preferred:{type:'string',enum:['A','B','TIE']},
 replies:{type:'array',items:shape({voicePass:bool,factsComplete:bool,materialFailure:bool,reason:{type:'string'}})}});
export const chatPriorityJudgeIdentity=Object.freeze({...judgeModel,rubricHash:digest(rubric),schemaHash:digest(gradeSchema),retry:0});
const laneNames=registry.pairs.map(p=>p.caseId);
const withoutInstructions=({systemInstruction,...rest})=>rest;
const finiteRequests=row=>assert([0,1].includes(row.providerRequests),'CHAT_PRIORITY_UNKNOWN_REQUEST_ACCOUNTING');
const verifierRequest=raw=>({model:judgeModel.model,reasoning:{effort:judgeModel.effort},instructions:rubric,
 input:[{type:'message',role:'user',content:[{type:'input_text',text:JSON.stringify(raw)}]}],
 tools:[],tool_choice:'none',parallel_tool_calls:false,store:false,stream:true,
 text:{format:{type:'json_schema',name:'chat_priority_review',strict:true,schema:gradeSchema}}});
const takeBit=(seed,name)=>createHmac('sha256',seed).update(name).digest()[0]%2;
const reviewGoal={
 TOTAL:'Trả tổng đã xác nhận đúng phạm vi, hỏi tiếp khi làm được việc khách đang muốn.',
 INTEREST:'Tiếp nối món khách thích và giữ trạng thái mua ảnh hưởng đến khách.',
 CHOICE:'Chọn lựa cụ thể và giúp khách hình dung hoặc quyết định.',
 SIZE_CORRECTION:'Dùng kết quả fit đã tính từ số đo đã sửa.',
 STOCK_CONTROL:'Trả rõ lựa chọn và tình trạng hàng đúng phạm vi.',
 ADS_CONTROL:'Giữ tên/phần bán, giá, chất liệu/phom và size đã xác minh khi có nguồn.'
};

function identity(root,requireClean=true){
 if(requireClean)assert.equal(git(root,'status','--porcelain'),'','CHAT_PRIORITY_DIRTY_SOURCE');
 const source=git(root,'rev-parse','HEAD');
 const decisions=read(new URL('./owner-decisions.json',import.meta.url));
 const d=decisions.chatPriorityDiagnostic;
 const baseline=execFileSync('git',['show',baselineSource+':'+ownerPrompt],{cwd:root,encoding:'utf8'});
 const candidate=readFileSync(resolve(root,ownerPrompt),'utf8');
 const candidateHash=byteHash(candidate);
 const m=manifest();
 assert.equal(d.baselineSourceSha,baselineSource);
 assert.equal(fileHash(resolve(root,d.plan)),d.planSha256,'CHAT_PRIORITY_PLAN_HASH');
 assert.equal(byteHash(baseline),d.baselineOwnerPromptHash);
 assert.equal(candidateHash,d.candidateOwnerPromptHash);
 assert.equal(candidateHash,m.promptHashes.owner);
 assert.equal(decisions.judge.model.model,judgeModel.model);
 assert.equal(decisions.judge.model.effort,judgeModel.effort);
 for(const [field,expected] of Object.entries({replayPairs:8,maximumReplayGenerations:24,nativeCases:4,nativeTurns:9,maximumNativeGenerations:36}))
  assert.equal(d[field],expected,'CHAT_PRIORITY_APPROVED_BOUND');
 for(const field of ['model','version','effort'])assert.equal(m.models.conversation[field],ownerModel[field]);
 assert.equal(m.models.verifier.generationConfig.cliVersion,judgeModel.cliVersion);
 return {source,baseline,candidate,decisionHash:digest(d),scopeHash:digest(registry),prompts:[byteHash(baseline),candidateHash]};
}

function bindPair(pair,{fullRoot,adsRoot},id){
 const ads=pair.group==='ads';
 const directory=ads?adsRoot:resolve(fullRoot,pair.group+'-sealed');
 const native=ads?resolve(adsRoot,'native'):resolve(fullRoot,pair.group+'-run');
 const reg=read(resolve(directory,'REGISTRATION.json'));
 assert.equal(reg.runSourceSha,pair.source);
 assert(reg.slots.some(s=>s.slotId===pair.slotId&&s.caseId===pair.caseId&&s.repetition===1),'CHAT_PRIORITY_INPUT_SLOT');
 const rows=readFileSync(resolve(native,'NATIVE_REQUESTS.jsonl'),'utf8').trim().split(/\r?\n/u).map(JSON.parse);
 const original=finalOwnerWire(rows,pair.slotId,pair.turnIndex);
 assert(original&&original.id===pair.requestId&&original.requestHash===pair.requestHash,'CHAT_PRIORITY_CAPTURE_BINDING');
 if(!ads)assert.equal(original.wire.systemInstruction.parts[0].text,id.baseline);
 const verifier=rows.find(row=>row.phase==='REQUEST'&&row.slotId===pair.slotId&&row.turnIndex===pair.turnIndex&&row.value.role==='VERIFIER');
 assert(verifier&&verifier.value.requestHash===pair.verifierHash&&digest(verifier.value.requestBody)===pair.verifierHash,'CHAT_PRIORITY_FACT_BINDING');
 const {trusted}=JSON.parse(verifier.value.requestBody.input[0].content[0].text);
 const evidence={dialogue:original.runtimeInput,verifiedFacts:trusted.protectedClaims,policy:trusted.policyLiterals,
  products:trusted.runtimeProducts??[],receipts:trusted.effectReceipts,goal:reviewGoal[pair.kind]};
 if(ads){
  const entry=trusted.policyLiterals.find(l=>l.ref==='conversation-entry');
  assert.deepEqual(JSON.parse(entry.text),{firstContact:true,fromAd:true},'CHAT_PRIORITY_ADS_CAPTURE');
 }
 const arms=[id.baseline,id.candidate].map(text=>({...original.wire,systemInstruction:{parts:[{text}]}}));
 return {pair,arms,armHashes:arms.map(x=>byteHash(JSON.stringify(x))),evidence};
}

export function preparePriorityReplay(root,paths,{requireClean=true,seed=randomBytes(32).toString('hex')}={}){
 const id=identity(root,requireClean);
 const slots=registry.pairs.map(pair=>bindPair(pair,paths,id));
 const r={kind:'CHAT_PRIORITY_REPLAY_V1',source:id.source,baselineSource,decisionHash:id.decisionHash,scopeHash:id.scopeHash,
  prompts:id.prompts,judge:chatPriorityJudgeIdentity,ownerModel,seed,slots,maximumOwnerRequests:16,maximumJudgeRequests:8,retry:0,
  projectId:read(new URL('../single-agent-commerce-read-only/source-config.b1.json',import.meta.url)).vertex.projectId};
 validatePriorityReplay(r,root,{requireClean});
 return r;
}

export function validatePriorityReplay(r,root,{requireClean=true}={}){
 const id=identity(root,requireClean);
 assert.equal(r.kind,'CHAT_PRIORITY_REPLAY_V1');
 assert.equal(r.source,id.source,'CHAT_PRIORITY_SOURCE_CHANGED');
 assert.equal(r.baselineSource,baselineSource);
 assert.equal(r.decisionHash,id.decisionHash);
 assert.equal(r.scopeHash,id.scopeHash);
 assert.deepEqual(r.prompts,id.prompts);
 assert.deepEqual(r.judge,chatPriorityJudgeIdentity);
 assert.deepEqual(r.ownerModel,ownerModel);
 assert.equal(r.projectId,read(new URL('../single-agent-commerce-read-only/source-config.b1.json',import.meta.url)).vertex.projectId);
 assert.equal(r.retry,0);
 assert.equal(r.maximumOwnerRequests,16);
 assert.equal(r.maximumJudgeRequests,8);
 assert.match(r.seed,/^[a-f0-9]{64}$/u);
 assert.deepEqual(r.slots.map(s=>s.pair),registry.pairs,'CHAT_PRIORITY_PAIR_SET');
 const adsPrompt=execFileSync('git',['show',registry.pairs.at(-1).source+':'+ownerPrompt],{cwd:root,encoding:'utf8'});
 for(const {pair,arms,armHashes,evidence} of r.slots){
  assert.equal(arms.length,2);
  for(const [index,body] of arms.entries()){
   assertReplayWire(body,laneNames);
   assert.deepEqual(body.systemInstruction.parts,[{text:[id.baseline,id.candidate][index]}]);
  }
  assert.deepEqual(withoutInstructions(arms[0]),withoutInstructions(arms[1]),'CHAT_PRIORITY_NON_PROMPT_CHANGED');
  const capturePrompt=pair.group==='ads'?adsPrompt:id.baseline;
  assert.equal(digest({...arms[0],systemInstruction:{parts:[{text:capturePrompt}]}}),pair.requestHash,'CHAT_PRIORITY_ORIGINAL_WIRE');
  assert.equal(digest(evidence),pair.judgeEvidenceHash,'CHAT_PRIORITY_JUDGE_EVIDENCE');
  assert.deepEqual(armHashes,arms.map(body=>byteHash(JSON.stringify(body))));
 }
}

function requireOwnerResults(r,result){
 assert.equal(result.registrationHash,digest(r),'CHAT_PRIORITY_OWNER_SEAL');
 assert.deepEqual(result.rows.map(({index,arm})=>[index,arm]),r.slots.flatMap((_,i)=>{
  const first=(i+takeBit(r.seed,'dispatch'))%2;return [[i,first],[i,1-first]];
 }),'CHAT_PRIORITY_OWNER_DENOMINATOR');
 for(const row of result.rows){
  finiteRequests(row);
  assert.equal(row.requestHash,r.slots[row.index].armHashes[row.arm]);
  assert(row.status==='OK'?row.providerRequests===1&&row.modelVersion===ownerModel.version&&typeof row.text==='string'&&row.text.trim():row.text===null,'CHAT_PRIORITY_OWNER_OUTCOME');
 }
}

function rubricShape(g){
 return ['A','B','TIE'].includes(g?.preferred)&&Array.isArray(g.replies)&&g.replies.length===2&&
  g.replies.every(x=>['voicePass','factsComplete','materialFailure'].every(k=>typeof x[k]==='boolean')&&typeof x.reason==='string'&&x.reason.trim());
}

export function priorityJudgePackets(r,result){
 requireOwnerResults(r,result);
 return r.slots.map((slot,i)=>{
  const first=takeBit(r.seed,'judge:'+i);
  const order=[first,1-first];
  const replies=order.map(arm=>result.rows.find(row=>row.index===i&&row.arm===arm).text);
  const input={...slot.evidence,replies};
  return {order,input,requestHash:digest(verifierRequest(input))};
 });
}

export function scorePriorityReplay(r,owner,judged){
 const inputs=priorityJudgePackets(r,owner);
 assert.equal(judged.packetHash,digest(inputs),'CHAT_PRIORITY_PACKET_CHANGED');
 assert.deepEqual(judged.judge,chatPriorityJudgeIdentity);
 assert.deepEqual(judged.rows.map(x=>x.index),inputs.map((_,i)=>i),'CHAT_PRIORITY_JUDGE_DENOMINATOR');
 const rows=inputs.map((p,index)=>{
  const row=judged.rows[index];
  finiteRequests(row);
  assert.equal(row.requestHash,p.requestHash);
  const complete=p.input.replies.every(Boolean)&&row.providerRequests===1&&row.status==='OK'&&row.modelVersion===judgeModel.version&&rubricShape(row.grade);
  const candidate=complete?row.grade.replies[p.order.indexOf(1)]:null;
  const winningPosition=complete?['A','B'].indexOf(row.grade.preferred):-1;
  const baseline=complete?row.grade.replies[p.order.indexOf(0)]:null;
  return {caseId:r.slots[index].pair.caseId,turnIndex:r.slots[index].pair.turnIndex,complete,baseline,candidate,
   beat:winningPosition<0?0:p.order[winningPosition]===1?1:-1};
 });
 const targets=rows.slice(0,6),voice=targets.filter(x=>x.candidate?.voicePass).length,net=targets.reduce((n,x)=>n+x.beat,0);
 const controls=rows.slice(6).every(x=>x.candidate?.factsComplete&&x.candidate.voicePass);
 const facts=rows.every(x=>x.candidate?.factsComplete&&!x.candidate.materialFailure);
 return {source:r.source,status:rows.every(x=>x.complete)&&voice>=5&&net>0&&controls&&facts?'PASS':'STOP',voice,net,controls,facts,rows,
  registrationHash:digest(r),ownerHash:digest(owner),judgeHash:digest(judged),
  ownerRequests:owner.rows.reduce((n,x)=>n+x.providerRequests,0),judgeRequests:judged.rows.reduce((n,x)=>n+x.providerRequests,0)};
}

function loadRun(dir,root){
 const r=read(resolve(dir,'REGISTRATION.json')),seal=read(resolve(dir,'SEAL.json'));
 assert.equal(seal.registrationHash,digest(r),'CHAT_PRIORITY_SEAL_CHANGED');
 validatePriorityReplay(r,root);
 return r;
}

export function assertPriorityReplayPassed(dir,root){
 const r=loadRun(dir,root);
 const score=scorePriorityReplay(r,read(resolve(dir,'OWNER_RESULTS.json')),read(resolve(dir,'JUDGE_RESULTS.json')));
 assert.deepEqual(score,read(resolve(dir,'SCORE.json')));
 assert.equal(score.status,'PASS','CHAT_PRIORITY_REPLAY_STOP');
 return digest(score);
}

async function dispatchOwners(dir,root,r){
 assert.deepEqual(read(resolve(dir,'PREFLIGHT.json')),{registrationHash:digest(r),source:r.source,providerRequests:0});
 write(resolve(dir,'OWNER_CLAIM.json'),{registrationHash:digest(r),startedAt:new Date().toISOString()});
 const send=createCapturedOwnerSender({projectId:r.projectId,model:r.ownerModel},{assertBody:body=>assertReplayWire(body,laneNames)});
 const rows=[];
 for(const [index,slot] of r.slots.entries()){
  const first=(index+takeBit(r.seed,'dispatch'))%2;
  for(const arm of [first,1-first]){
   assert.equal(git(root,'status','--porcelain'),'','CHAT_PRIORITY_DIRTY_SOURCE');
   assert.equal(git(root,'rev-parse','HEAD'),r.source);
   assert.equal(digest(read(resolve(dir,'REGISTRATION.json'))),digest(r));
   const requestHash=slot.armHashes[arm];
   write(resolve(dir,`owner-${index}-${arm}.started.json`),{requestHash});
   const response=await send(slot.arms[arm],requestHash);
   const {providerRequests,authRequests,modelVersion,inputTokens,outputTokens,latencyMs,httpStatus}=response.telemetry;
   const status=response.status==='OK'&&response.output.kind!=='FINAL'?'TOOL_CALL_NOT_EXECUTED':response.status;
   const row={index,arm,requestHash,status,providerRequests,authRequests,modelVersion,inputTokens,outputTokens,latencyMs,httpStatus,
    errorCode:response.errorCode??null,text:status==='OK'?response.output.text:null};
   finiteRequests(row);
   write(resolve(dir,`owner-${index}-${arm}.result.json`),row);
   rows.push(row);
  }
 }
 write(resolve(dir,'OWNER_RESULTS.json'),{registrationHash:digest(r),rows});
}

async function dispatchJudge(dir,root,r){
 assert.equal(read(resolve(dir,'OWNER_CLAIM.json')).registrationHash,digest(r));
 const owner=read(resolve(dir,'OWNER_RESULTS.json'));
 const inputs=priorityJudgePackets(r,owner),packetHash=digest(inputs);
 write(resolve(dir,'JUDGE_CLAIM.json'),{packetHash,startedAt:new Date().toISOString()});
 const config={models:{verifier:manifest().models.verifier},verdictSchema:gradeSchema};
 const rows=[];
 for(const [index,{input}] of inputs.entries()){
  assert.equal(git(root,'status','--porcelain'),'','CHAT_PRIORITY_DIRTY_SOURCE');
  assert.equal(git(root,'rev-parse','HEAD'),r.source);
  assert.equal(digest(read(resolve(dir,'REGISTRATION.json'))),digest(r));
  const request=verifierRequest(input),requestHash=digest(request);
  const row={index,requestHash,status:'MISSING_OWNER_REPLY',providerRequests:0,grade:null};
  if(input.replies.every(Boolean)&&Buffer.byteLength(JSON.stringify(request))<=65536){
   write(resolve(dir,`judge-${index}.started.json`),{requestHash});
   const result=await runCodexModel(config,'verifier',request);
   const {status,providerRequests,providerErrorCode,modelVersion,usage,latencyMs,httpStatus}=result;
   Object.assign(row,{status,providerRequests,providerErrorCode,modelVersion,usage,latencyMs,httpStatus});
   if(status==='OK'&&modelVersion===judgeModel.model){
    try{ const value=JSON.parse(result.answer);if(rubricShape(value))row.grade=value; }catch{}
   }
  }else if(input.replies.every(Boolean))row.status='REQUEST_BOUND';
  finiteRequests(row);
  write(resolve(dir,`judge-${index}.result.json`),row);rows.push(row);
 }
 const judged={judge:chatPriorityJudgeIdentity,packetHash,rows};
 write(resolve(dir,'JUDGE_RESULTS.json'),judged);
 const score=scorePriorityReplay(r,owner,judged);
 write(resolve(dir,'SCORE.json'),score);
 console.log(JSON.stringify({status:score.status,voice:score.voice,net:score.net,ownerRequests:score.ownerRequests,judgeRequests:score.judgeRequests}));
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [command,out,fullRoot,adsRoot]=process.argv.slice(2),root=process.cwd(),dir=resolve(out);
 outside(root,dir);
 if(command==='prepare'){
  assert(!existsSync(dir),'CHAT_PRIORITY_ALREADY_PREPARED');
  const r=preparePriorityReplay(root,{fullRoot,adsRoot});
  mkdirSync(dir);
  write(resolve(dir,'REGISTRATION.json'),r);
  write(resolve(dir,'SEAL.json'),{registrationHash:digest(r),providerRequests:0});
 }else{
  const r=loadRun(dir,root);
  if(command==='preflight'){
   assert.equal(inspectCodex().version,'codex-cli '+judgeModel.cliVersion);
   write(resolve(dir,'PREFLIGHT.json'),{registrationHash:digest(r),source:r.source,providerRequests:0});
  }else if(command==='owner')await dispatchOwners(dir,root,r);
  else if(command==='judge')await dispatchJudge(dir,root,r);
  else throw Error('CHAT_PRIORITY_COMMAND');
 }
}
