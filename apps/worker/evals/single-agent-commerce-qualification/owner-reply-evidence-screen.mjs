import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,createHmac} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {readCompactSections} from '../single-agent-commerce-read-only/owner-data-presentation.mjs';
import {projectOwnerReplyEvidence} from '../single-agent-commerce-read-only/owner-reply-evidence.mjs';
import {ownerTextBytes,ownerSignatureBytes} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {assertReplayWire,finalOwnerWire} from './sales-voice-replay.mjs';
import {assertRuntimeFirewall,digest} from './qualification.mjs';
import {byteHash,outside,read,write} from './bc-control.mjs';

const root=process.cwd(),p=process.argv.slice(2);
assert(p.length===3,'USAGE: owner-reply-evidence-screen.mjs OUT FULL_19_11_ROOT ADS_CONTROLS_15_11_ROOT');
const [out,full,ads]=p.map(x=>resolve(x));
outside(root,out);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git('status','--porcelain'),'','REPLY_EVIDENCE_DIRTY_SOURCE');
const source=git('rev-parse','HEAD');
const plan='docs/specs/c3-phase-c-owner-reply-evidence-plan-20261119.md';
const planHash=byteHash(readFileSync(resolve(root,plan)));
assert.equal(planHash,'46c16cf5639d1c6d2eb41dd69df2070a84fe68213da54fe0347baa8e2cc8d296');
const basePath='../single-agent-commerce-read-only/';
const manifest=read(new URL(basePath+'manifest.json',import.meta.url));
const instructions=readFileSync(new URL(basePath+'prompts/owner.vi.txt',import.meta.url),'utf8');
assert.equal(byteHash(instructions),manifest.promptHashes.owner);
const baselineSource='f82d308b2ea0ebe4ae6fe69713c04157405bce52';
const promptPath='apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt';
assert.equal(instructions,execFileSync('git',['show',baselineSource+':'+promptPath],{cwd:root,encoding:'utf8'}));
const cases=[
 ['r1','c-po-20261031-p06',0,'TOOL_OR_REPLY','TOTAL',1019000],
 ['remainder','c-20261028-s04',0,'TERMINAL_HANDOFF_OR_REPLY','COLOUR'],
 ['r2','c-20261028-s15',0,'TOOL_OR_REPLY','COLOUR'],
 ['r2','c-20261028-j2',1,'TOOL_OR_REPLY','CONTROL'],
 ['r2','c-20261028-j4',2,'TOOL_OR_REPLY','TOTAL',499000],
 ['ads','c-context-opening',0,'TOOL_OR_REPLY','CONTROL'],
];
const caseIds=cases.map(([,id])=>id);

function loadCapture(group,caseId,turn){
 const old=group==='ads';
 const directory=old?ads:resolve(full,group+'-sealed'),native=old?resolve(ads,'native'):resolve(full,group+'-run');
 const reg=read(resolve(directory,'REGISTRATION.json'));
 const expected=old?'9a65450fdf29b1c5c544465bf61c450d3c22f133':'992e360f677bb3c391986ef201339b087e38606a';
 assert.equal(reg.runSourceSha,expected,'REPLY_EVIDENCE_CAPTURE_SOURCE');
 const slot=reg.slots.find(s=>s.caseId===caseId&&s.repetition===1);
 assert(slot,'REPLY_EVIDENCE_CAPTURE_SLOT');
 const rows=readFileSync(resolve(native,'NATIVE_REQUESTS.jsonl'),'utf8').trim().split(/\r?\n/u).map(JSON.parse);
 const frozen=finalOwnerWire(rows,slot.slotId,turn);
 assert(frozen,'REPLY_EVIDENCE_CAPTURE_MISSING');
 const captured=read(resolve(native,'CANDIDATE_EVIDENCE.partial.json')).attempts.find(s=>s.slotId===slot.slotId);
 const artifact=captured.audit.nativeResults.find(t=>t.turnIndex===turn);
 const raw=read(resolve(native,artifact.artifact));
 assert.equal(digest(raw),artifact.artifactHash,'REPLY_EVIDENCE_CAPTURE_ARTIFACT');
 const owner=raw.generations.find(r=>r.role==='OWNER'&&r.id===frozen.id);
 const verifier=raw.generations.find(r=>r.role==='VERIFIER');
 assert(owner&&verifier&&digest(owner.requestBody)===frozen.requestHash&&digest(verifier.requestBody)===verifier.requestHash);
 assert.equal(owner.observedModelVersion,manifest.models.conversation.version);
 return {frozen,source:expected,artifactHash:artifact.artifactHash,verifier,at:owner.startedAt};
}

function copyProjection(body,trusted,at,changes){
 function project(trace){
  const next=projectOwnerReplyEvidence(trace,trusted,at);
  if(trace!==next)for(const [i,m] of next.entries())for(const [j,part] of m.parts.entries()){
   if(part===trace[i].parts[j])continue;
   const previous=trace[i].parts[j].functionResponse.response.data,next=part.functionResponse.response.data;
   assert.deepEqual({...next,preCartQuote:previous.preCartQuote,openingQuote:previous.openingQuote,
    verifiedColorAvailability:previous.verifiedColorAvailability},
   {...previous,preCartQuote:previous.preCartQuote,openingQuote:previous.openingQuote,verifiedColorAvailability:previous.verifiedColorAvailability});
   changes.push({tool:part.functionResponse.name,firstField:Object.keys(next)[0],openingCardRemoved:!!previous.openingQuote&&!next.openingQuote,
    amount:next.preCartQuote?.grandTotalVnd??null,shippingBasis:next.preCartQuote?.shippingBasis??null,
    availability:next.verifiedColorAvailability??null});
  }
  return next;
 }
 const direct=project(body.contents);
 // Only the sealed historical completed trace can be expanded here. Runtime
 // consumes native tool pairs before folding and never parses customer prose.
 const last=direct.at(-1);
 if(last?.role!=='user'||last.parts.length!==1||!last.parts[0].text?.startsWith('{"completedToolTurns":'))return {...body,contents:direct};
 const {completedToolTurns:original}=JSON.parse(last.parts[0].text);
 const next=project(original);
 if(next===original)return {...body,contents:direct};
 return {...body,contents:[...direct.slice(0,-1),{...last,parts:[{text:JSON.stringify({completedToolTurns:next})}]}]};
}

const pairs=cases.map(([group,caseId,turn,phase,kind,amount])=>{
 const c=loadCapture(group,caseId,turn);
 const wire={...c.frozen.wire,systemInstruction:{parts:[{text:instructions}]}};
 const sections=Object.fromEntries(readCompactSections(wire.contents[0]).map(x=>[x.label,x.value]));
 assert.equal(sections['Khả năng thực hiện lượt này'].phase,phase);
 if(group==='ads'){
  const entry=sections['Quy định và dữ liệu nguồn'].find(p=>p.ref==='conversation-entry');
  assert.deepEqual(JSON.parse(entry.text),{firstContact:true,fromAd:true});
 }
 const trusted=JSON.parse(c.verifier.verifierInput.trustedSnapshotJson);
 const ownerPolicy=sections['Quy định và dữ liệu nguồn'];
 const ownerProducts=sections['Sản phẩm'];
 trusted.policyLiterals=trusted.policyLiterals.filter(p=>ownerPolicy.some(x=>x.ref===p.ref&&x.text===p.text));
 trusted.runtimeProducts=trusted.runtimeProducts.map(p=>({...p,selectionEvidence:p.selectionEvidence?.filter(e=>
  ownerProducts.some(w=>w.subjectRef===p.subjectRef&&w.selectionEvidence?.some(x=>digest(x)===digest(e))))}));
 const changes=[],candidate=copyProjection(wire,trusted,new Date(c.at),changes);
 const hashes=[wire,candidate].map(x=>byteHash(JSON.stringify(x)));
 assert.equal(changes.length,kind==='CONTROL'?0:1,'REPLY_EVIDENCE_PROJECTION_COVERAGE');
 assert.equal(hashes[0]===hashes[1],kind==='CONTROL','REPLY_EVIDENCE_PAIR_HASH');
 if(kind==='TOTAL'){
  assert.equal(changes[0].firstField,'preCartQuote');
  assert.equal(changes[0].amount,amount);
  assert.equal(changes[0].shippingBasis,'DEFAULT_SHOP_POLICY');
  assert.equal(changes[0].openingCardRemoved,caseId.endsWith('p06'));
 }
 if(kind==='COLOUR'){
  assert.equal(changes[0].firstField,'verifiedColorAvailability');
  assert.equal(changes[0].openingCardRemoved,false);
  assert.deepEqual(changes[0].availability.query,{color:null,size:null,quantity:1});
  assert.deepEqual(changes[0].availability.colors.map(({color,status})=>[color,status]),[['TRẮNG','IN_STOCK'],['BE','PRE_ORDER']]);
 }
 for(const arm of [wire,candidate]){
  assertReplayWire(arm,caseIds);
  assertRuntimeFirewall(arm,caseIds);
  assert.deepEqual(arm.contents.filter(m=>m.role==='model'),wire.contents.filter(m=>m.role==='model'));
 }
 const verified=JSON.parse(c.verifier.requestBody.input[0].content[0].text).trusted;
 return {caseId,turn,phase,kind,source:c.source,artifactHash:c.artifactHash,observedAt:c.at,
  originalWireHash:c.frozen.requestHash,wireHashes:hashes,changes,wires:[wire,candidate],
  judgeEvidence:{dialogue:c.frozen.runtimeInput,protectedClaims:verified.protectedClaims,policyLiterals:verified.policyLiterals,
   effectReceipts:verified.effectReceipts,runtimeProducts:verified.runtimeProducts??[]},
  budget:{text:[wire,candidate].map(ownerTextBytes),signatures:ownerSignatureBytes(wire)}};
});

const seed=randomBytes(32).toString('hex');
const runs=pairs.flatMap(({caseId,kind},index)=>Array.from({length:index<3?2:1},(_,r)=>{
 const slotId=digest({caseId,repetition:r+1,wireHashes:pairs[index].wireHashes});
 const first=createHmac('sha256',seed).update(slotId).digest()[0]%2;
 return {slotId,pairIndex:index,repetition:r+1,kind,order:[first,1-first]};
}));
assert.equal(runs.length,9);
const rubric={
 dimensions:['LATEST_NEED_IN_MAIN_CLAUSE','PRESERVES_DECISION_CONDITIONS','ACTIONABLE_NEXT_STEP','FACT_SCOPE','VOICE_IN_CONTEXT'],
 score:'WHOLE_REPLY_BLIND_PAIR',
 threshold:{complete:9,targetWins:4,targetWinsPerCase:1,allSixTargetFacts:true,allThreeControls:true,materialCandidateFailures:0},
 caseRequirements:{
  [caseIds[0]]:'Tổng 1.019.000đ cả ship ở ý chính; không suy vùng giao.',
  [caseIds[1]]:'Trắng có sẵn, be đặt trước; giữ đúng phạm vi biến thể và lượng đã kiểm.',
  [caseIds[2]]:'Tiếp nối màu be; giữ trạng thái đặt trước và bước mua hữu ích.',
  [caseIds[3]]:'Dùng đúng số đo đã sửa và kết quả size M; chỉ nhắc điều giúp hiểu kết quả.',
  [caseIds[4]]:'Đúng 499.000đ cho một áo gửi Cần Thơ; hỗ trợ đúng proof, câu hỏi kế tiếp có ích.',
  [caseIds[5]]:'Giữ form báo giá chữ theo scope; kiểm ảnh thực nhận ở native.'
 },
};
const model=manifest.models.conversation,judge={model:'gpt-6.1-sol',version:'gpt-6.1-sol',effort:'high',offline:true};
const registration={kind:'C3_OWNER_REPLY_EVIDENCE_OFFLINE_PREFLIGHT_V1',source,baselineSource,planHash,
 promptHash:manifest.promptHashes.owner,model,judge,rubric,rubricHash:digest(rubric),seed,pairs,runs,
 bounds:{owner:18,judge:9,native:40},retry:0,providerRequests:0};
assert.equal(git('rev-parse','HEAD'),source);
assert.equal(git('status','--porcelain'),'');
mkdirSync(out);
write(resolve(out,'REGISTRATION.json'),registration);
const report={source,baselineSource,planHash,registrationHash:digest(registration),rubricHash:registration.rubricHash,providerRequests:0,
 expectedPairs:runs.length,pairs:pairs.map(({wires,judgeEvidence,...evidence})=>evidence)};
write(resolve(out,'PREFLIGHT.json'),report);
console.log(JSON.stringify(report));
