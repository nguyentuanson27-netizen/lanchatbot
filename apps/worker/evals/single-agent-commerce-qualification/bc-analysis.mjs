// Post-run accounting only; no provider imports, no generation or tool execution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {read,write,byteHash,digest,assertWire,normalizeOutput} from './bc-control.mjs';
const [dir,out]=process.argv.slice(2);assert(out,'CONTROL_ANALYSIS_ARGS');
const input=read(resolve(dir,'INPUTS.json')),seal=read(resolve(dir,'SEAL.json')),owner=read(resolve(dir,'OWNER_RESULTS.json'));
assert.equal(digest(input),seal.inputHash);assert.equal(owner.runSourceSha,seal.runSourceSha);
const requests=readFileSync(resolve(dir,'OWNER_REQUESTS.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(requests.length,18);assert.equal(owner.attempts.length,18);assert.equal(owner.completed,18);
assert.deepEqual(owner.attempts.map(a=>a.slotId),input.slots.map(s=>s.slotId));
const b=read(resolve(dir,'B_CODE_2.json')),c=read(resolve(dir,'C_CODE_2.json'));
assert.equal(b.inputHash,seal.inputHash);assert.equal(c.inputHash,seal.inputHash);
assert.equal(b.worldHash,c.worldHash);assert.equal(b.size.inputHash,c.size.inputHash);
assert.deepEqual(b.historical.map(x=>x.inputHash),c.historical.map(x=>x.inputHash));
assert.deepEqual(b.readProbes.map(x=>x.sourceInputHash),c.readProbes.map(x=>x.sourceInputHash));
for(const artifact of seal.artifacts)assert.equal(byteHash(readFileSync(artifact.path)),artifact.sha256,'CONTROL_SEALED_ARTIFACT_CHANGED');
for(const [i,request]of requests.entries()){
 assertWire(request.body);assert.equal(request.slotId,input.slots[i].slotId);
 assert.equal(byteHash(JSON.stringify(request.body)),input.slots[i].bodyHash);
 const result=read(resolve(dir,owner.attempts[i].resultFile));assert.equal(result.telemetry.providerRequests,owner.attempts[i].providerRequests);
 assert(result.telemetry.providerRequests<=1);assert.equal(result.telemetry.requestHash,request.bodyHash);
 if(result.status==='OK')assert.equal(digest(normalizeOutput(result.output)),owner.attempts[i].outputHash);
}
const cases=input.cases.map(item=>{
 const raw=read(item.rawArtifact),id=raw.result.generations.find(g=>g.role==='owner').id;
 const log=resolve(dirname(item.rawArtifact),item.persistedCapture?'provider-requests.jsonl':'requests.jsonl');
 const historical=readFileSync(log,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(r=>r.id===id&&r.phase==='OWNER_RESULT')?.value;
 assert(historical,'CONTROL_HISTORICAL_RESULT');
 return {caseId:item.caseId,priorDisposition:item.historicalTerminal.disposition,bodyHash:item.bodyHash,
  historicalFirstDecision:normalizeOutput(historical),samples:owner.attempts.filter(a=>a.caseId===item.caseId).map(a=>({repetition:a.repetition,status:a.status,normalized:a.normalized,telemetry:a.telemetry})),
  ...owner.cases.find(c=>c.caseId===item.caseId)};
});
const files=['INPUTS.json','SEAL.json','B_CODE_2.json','C_CODE_2.json','OWNER_RESULTS.json','OWNER_REQUESTS.jsonl'];
const result={kind:'BC_CONTROLLED_DIAGNOSIS_POST_RUN_ACCOUNTING',runSourceSha:seal.runSourceSha,bSourceSha:seal.bSourceSha,cRuntimeSourceSha:seal.cRuntimeSourceSha,
 inputHash:seal.inputHash,worldHash:b.worldHash,registered:18,completed:owner.completed,generationRequests:owner.providerRequests,
 errors:owner.attempts.filter(a=>a.status!=='OK').length,retry:owner.retry,toolsExecuted:0,effects:0,sendEnabled:false,evaluatorLabelFirewall:'ALL_18_CAPTURED_BODIES_CHECKED',
 model:input.model,usage:{inputTokens:owner.attempts.reduce((n,a)=>n+(a.telemetry.inputTokens??0),0),outputIncludingThinkingTokens:owner.attempts.reduce((n,a)=>n+(a.telemetry.outputTokens??0),0),
  missingTokenUsage:owner.attempts.filter(a=>a.telemetry.inputTokens===null||a.telemetry.outputTokens===null).length,cost:null,
  generationAndAuthLatencySumMs:owner.attempts.reduce((n,a)=>n+a.telemetry.latencyMs,0)},
 pairedHistorical:b.historical.map((x,i)=>({caseId:x.caseId,sameInputHash:x.inputHash===c.historical[i].inputHash,clockProvenance:x.clockProvenance,b:x.hardPrecheck,c:c.historical[i].hardPrecheck})),
 pairedReads:b.readProbes.map((x,i)=>({query:x.query,sameSourceInputHash:x.sourceInputHash===c.readProbes[i].sourceInputHash,b:{status:x.status,reason:x.reason},c:{status:c.readProbes[i].status,reason:c.readProbes[i].reason}})),
 sameSizeEngineInputHash:b.size.inputHash,bSize:b.size.result.recommendation.recommendedSizes,cSize:c.size.result.recommendation.recommendedSizes,
 contexts:{b:b.contexts.map(({snapshot,...x})=>x),c:c.contexts.map(({snapshot,...x})=>x)},freshness:{b:b.freshness,c:c.freshness},cases,
 artifacts:files.map(file=>({file,sha256:byteHash(readFileSync(resolve(dir,file)))})),
 limitations:['Component replay is not paired B/C end-to-end qualification','Historical final gate clock is unavailable; lower-bound clock is derived','One-step owner samples do not execute tools or measure whole-turn quality','Historical full database and live Qdrant index/vector parity unavailable','Normalized differences can be wording/sourceQuote differences, not changed business decisions']};
write(out,result);console.log(JSON.stringify({completed:result.completed,requests:result.generationRequests,errors:result.errors,firewall:result.evaluatorLabelFirewall}));
