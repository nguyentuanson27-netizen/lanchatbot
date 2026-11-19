// Evaluation-only controls. No runtime wiring, inferred customer intent or effect execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,isAbsolute,relative,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
export const B_SHA='4efbea67356f1e3e4f7fa886dec48d58c4ab1474';
export const C_SHA='ec46829325378e4a2d5fc126a0cd4224e6febbcf';
export const CASES=['b1-price','b1-search-read-v2','b1-current-policy','sales-size-advice:height-weight','media-and-size:ask','stateful-quote'];
export const byteHash=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const digest=v=>byteHash(JSON.stringify(canonical(v)));
export const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export function outside(root,path){const r=relative(resolve(root),resolve(path));assert(r&&(r==='..'||r.startsWith('..'+sep)||isAbsolute(r)),'CONTROL_OUTPUT_OUTSIDE_SOURCE');}
export function assertWire(body,caseIds=CASES){
 assert(body&&Array.isArray(body.contents)&&body.systemInstruction&&Array.isArray(body.tools),'CONTROL_NATIVE_BODY');
 assert(Buffer.byteLength(JSON.stringify(body))<=1507328,'CONTROL_BODY_BOUND');
 assert.deepEqual(body.generationConfig,{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}},'CONTROL_GENERATION_CONFIG');
 const forbidden=new Set(['caseId','purposeId','evaluator','expectedSafe','requiredBehaviors','forbiddenBehaviors','wholeTurnPass','allExplicitNeedsResolved','qualityScore']);
 const walk=v=>{if(typeof v==='string'){try{walk(JSON.parse(v));}catch(e){if(e.code==='ERR_ASSERTION')throw e;}return;}
  if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert(!forbidden.has(k),'CONTROL_EVALUATOR_LABEL');walk(x);}};
 walk(body);const text=JSON.stringify(body);for(const id of caseIds)assert(!text.includes(id),'CONTROL_CASE_ID_LEAK');
}
export function normalizeOutput(output){
 if(output.kind==='FINAL')return {kind:'FINAL',text:output.text};
 assert(output.kind==='TOOLS'&&Array.isArray(output.calls),'CONTROL_OUTPUT_SHAPE');
 return {kind:'TOOLS',calls:output.calls.map(c=>({name:c.name,args:c.args}))};
}
export function registerSlots(cases){
 assert.deepEqual(cases.map(c=>c.caseId),CASES,'CONTROL_CASE_DENOMINATOR');
 return [1,2,3].flatMap(repetition=>cases.map(c=>({slotId:digest({caseId:c.caseId,repetition,bodyHash:c.bodyHash}),caseId:c.caseId,repetition,bodyHash:c.bodyHash})));
}
export function validateInput(input){
 assert(input.kind==='BC_CONTROLLED_INPUTS_V1'&&input.bSourceSha===B_SHA&&input.cSourceSha===C_SHA,'CONTROL_SOURCE_IDENTITY');
 assert(input.model.model==='gemini-3.5-flash-lite'&&input.model.effort==='high'&&input.model.generationConfig.retry===0,'CONTROL_MODEL');
 assert.deepEqual(input.slots,registerSlots(input.cases),'CONTROL_SLOTS');
 for(const c of input.cases){assert(c.historicalTerminal.disposition==='SEND_ELIGIBLE','CONTROL_PRIOR_NOT_ELIGIBLE');assertWire(c.ownerBody);assert(c.bodyHash===byteHash(JSON.stringify(c.ownerBody)),'CONTROL_BODY_CHANGED');}
 assert(input.maximumGenerationRequests===18&&input.retry===0&&input.effectsEnabled===false&&input.sendEnabled===false,'CONTROL_LIMITS');
}
function journalRows(path){return readFileSync(path,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);}
export function prepareInputs({root,bRoot,bRaw,cWorld,out}){
 outside(root,out);assert(!existsSync(out),'CONTROL_OUTPUT_EXISTS');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:bRoot,encoding:'utf8'}).trim(),B_SHA);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:bRoot,encoding:'utf8'}).trim(),'','CONTROL_DIRTY_B');
 // C diagnostic commits may add evals/docs, but the measured runtime must remain exact C_SHA.
 execFileSync('git',['diff','--exit-code',C_SHA,'--','apps/worker/src','packages'],{cwd:root,stdio:'pipe'});
 const terminals=read(resolve(bRaw,'ACTUAL_TERMINALS.json')),registration=read(resolve(bRaw,'REGISTRATION.json'));
 assert.equal(registration.sourceSha,B_SHA,'CONTROL_B_RUN_SOURCE');
 const artifacts=new Map(),record=path=>{const bytes=readFileSync(path);artifacts.set(resolve(path),{path:resolve(path),sha256:byteHash(bytes)});return bytes;};
 record(resolve(bRaw,'ACTUAL_TERMINALS.json'));record(resolve(bRaw,'REGISTRATION.json'));record(cWorld);
 const cases=CASES.map(caseId=>{
  const t=terminals.find(t=>t.caseId===caseId);assert(t,'CONTROL_CASE_MISSING');const rawPath=resolve(bRaw,t.artifact),raw=JSON.parse(record(rawPath));
  assert(byteHash(readFileSync(rawPath))===t.artifactSha256,'CONTROL_RAW_HASH');
  const result=raw.result,first=result.generations.find(g=>g.role==='owner'),verifier=result.generations.find(g=>g.role==='verifier');assert(first&&verifier,'CONTROL_PRIOR_GENERATIONS');
  const log=resolve(dirname(rawPath),t.persistedCapture?'provider-requests.jsonl':'requests.jsonl');record(log);const rows=journalRows(log);
  const ownerBody=rows.find(r=>r.id===first.id&&r.phase==='OWNER_REQUEST')?.value;assert(ownerBody,'CONTROL_PRIOR_REQUEST');assertWire(ownerBody);
  const candidates=rows.filter(r=>r.id===verifier.id).flatMap(r=>[r.value,r.value?.requestBody,r.value?.provider?.requestBody]).filter(Boolean);
  const wire=candidates.find(v=>Array.isArray(v.input)&&v.input[0]?.content?.[0]?.text);assert(wire,'CONTROL_VERIFIER_FRAME');const frame=JSON.parse(wire.input[0].content[0].text);
  assert(frame.trusted&&frame.untrusted?.finalDraft,'CONTROL_PRIOR_SNAPSHOT');
  const time=frame.turnTime?.processingAt;assert(Number.isFinite(Date.parse(time)),'CONTROL_PRIOR_CLOCK');
  return {caseId,rawArtifact:rawPath,rawHash:byteHash(readFileSync(rawPath)),historicalTerminal:t.terminal,persistedCapture:t.persistedCapture,
   ownerBody,bodyHash:byteHash(JSON.stringify(ownerBody)),historicalTrusted:frame.trusted,historicalDraft:frame.untrusted.finalDraft,historicalTime:time,
   latest:t.latest??raw.runtime?.latest,history:t.history??raw.runtime?.history??[],historicalContextScope:'EXACT_CAPTURED_REQUEST_AND_VERIFIER_SNAPSHOT_NOT_FULL_DATABASE'};
 });
 const input={kind:'BC_CONTROLLED_INPUTS_V1',bSourceSha:B_SHA,cSourceSha:C_SHA,bRoot:resolve(bRoot),cRoot:resolve(root),cWorld:resolve(cWorld),cWorldHash:byteHash(readFileSync(cWorld)),
  model:registration.models.conversation,cases,slots:registerSlots(cases),maximumGenerationRequests:18,retry:0,effectsEnabled:false,sendEnabled:false,artifacts:[...artifacts.values()],
  limitations:['Same current captured world between code arms is not a complete historical B database','Historical live Qdrant HNSW parity cannot be reconstructed from a public frozen point index','One-step replay samples owner choices only; no tool/effect/send or whole-turn pass is inferred']};
 validateInput(input);mkdirSync(out);write(resolve(out,'INPUTS.json'),input);return input;
}
if(process.argv[1]?.endsWith('bc-control.mjs')){
 const[root,bRoot,bRaw,cWorld,out]=process.argv.slice(2);assert(out,'CONTROL_ARGS');const input=prepareInputs({root,bRoot,bRaw,cWorld,out});
 console.log(JSON.stringify({cases:input.cases.length,slots:input.slots.length,inputsHash:digest(input),providerRequests:0}));
}
