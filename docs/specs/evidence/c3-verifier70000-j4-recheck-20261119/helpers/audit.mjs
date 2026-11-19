import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';const mod=p=>import(pathToFileURL(resolve(p)).href);
const {digest,textDigest,assertRuntimeFirewall}=await mod('apps/worker/evals/single-agent-commerce-qualification/qualification.mjs');
const {ownerTextBytes,ownerSignatureBytes}=await mod('apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs');
const root=process.argv[2],read=p=>JSON.parse(readFileSync(p)),home=resolve(root,'native'),input=read(resolve(root,'INPUT.json')),seal=read(resolve(root,'SEAL.json'));
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),input.runSourceSha);assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');assert.equal(digest(input),seal.inputHash);
for(const h of seal.helpers)assert.equal(createHash('sha256').update(readFileSync(h.path)).digest('hex'),h.sha256);
const result=read(resolve(home,'J4_RECHECK_RESULT.json')),integration=read(resolve(home,'integration.json')),account=read(resolve(home,'ACCOUNTING.json'));
assert.equal(result.rows.length,5);assert.equal(result.measuredTurns,5);assert.equal(integration.testDatabaseDropped,true);assert.equal(integration.sendEnabled,false);assert.equal(account.unknownAttempts,0);assert(account.providerRequests<=20);
const journal=readFileSync(resolve(home,'CAMPAIGN.jsonl'),'utf8').trim().split('\n').map(JSON.parse),wire=[];
for(const row of journal.filter(x=>x.event==='OWNER_REQUEST'||x.event==='VERIFIER_REQUEST')){const body=row.value.body;assertRuntimeFirewall(body);wire.push({id:row.value.id,role:row.event==='OWNER_REQUEST'?'OWNER':'VERIFIER',wireBytes:Buffer.byteLength(JSON.stringify(body)),textBytes:row.event==='OWNER_REQUEST'?ownerTextBytes(body):null,signatureBytes:row.event==='OWNER_REQUEST'?ownerSignatureBytes(body):null,requestHash:digest(body)});}
assert.equal(wire.length,account.attempted);
assert(wire.every(w=>w.role==='OWNER'?w.textBytes<=70000&&w.signatureBytes<=65536:w.wireBytes<=70000));
const cases=[];const md=['# Năm lượt J4 cuối — verifier 70.000 byte','','Source '+input.runSourceSha,'','Hai lượt đầu của mỗi ca là scripted fixture từ public history đã nhận, không phải generation mới. Chỉ lượt hỏi tổng dưới đây dùng model thật.',''];
for(const row of result.rows){
 const state=row.observed.result,gens=account.generations.filter(g=>g.turn===row.repetition),v=gens.find(g=>g.role==='VERIFIER');let verdict=null;
 if(v?.telemetry?.answer)try{verdict=JSON.parse(v.telemetry.answer);}catch{}
 let finalDraft=null;if(v){const body=journal.find(x=>x.event==='VERIFIER_REQUEST'&&x.value.id===v.id).value.body,frame=JSON.parse(body.input[0].content[0].text);finalDraft=frame.untrusted.finalDraft;assert.equal(frame.requestIdentity.finalDraftHash,textDigest(finalDraft));if(verdict?.verdict==='PASS'&&state.terminal.disposition==='SEND_ELIGIBLE')assert.equal(finalDraft,state.terminal.text);}
 const accepted=row.acceptedMessages.filter(x=>typeof x.text==='string').map(x=>x.text);
 if(state.terminal.disposition==='SEND_ELIGIBLE')assert.deepEqual(accepted,[state.terminal.text]);else assert.equal(accepted.length,0);
 const outputs=journal.filter(x=>x.event==='GENERATION_RESULT'&&x.value.turn===row.repetition&&x.value.output).map(x=>x.value.output.kind==='FINAL'?{kind:'FINAL',text:x.value.output.text}:{kind:'TOOLS',calls:x.value.output.calls});
 cases.push({repetition:row.repetition,customer:row.customer,terminal:state.terminal,finalDraft,acceptedMessages:accepted,verdict,ownerGenerations:state.ownerGenerations,verifierGenerations:state.verifierGenerations,recovery:state.recovery??null,
  tools:row.observed.toolResponses.map(t=>({name:t.name,status:t.response.status,reason:t.response.reason??null,data:Object.fromEntries(Object.entries(t.response.data??{}).filter(([k])=>['cartQuote','preCartQuote','pendingSupport','supportEvaluation','choiceOptions','duplicate','pendingReused','effectCommitted'].includes(k)))})),
  outputs,pendingBefore:row.before.publicState.pendingSupportProof??null,pendingAfter:row.after.publicState.pendingSupportProof??null,cartAfter:row.after.publicState.cart??null,committedEvents:row.after.events.filter(e=>!row.before.events.some(b=>b.command_id_hash===e.command_id_hash)),verificationLatencyMs:state.verificationLatencyMs});
 md.push('## Lần '+row.repetition,'','Khách: '+row.customer,'','Kết quả: **'+state.terminal.disposition+'**','','```text',state.terminal.text??'(Không gửi tin.)','```','','Verifier: '+JSON.stringify(verdict),'','Tool: '+row.observed.toolResponses.map(t=>t.name+' '+t.response.status+(t.response.reason?' '+t.response.reason:'')).join(', '),'');
}
const safeGens=account.generations.map(g=>({id:g.id,phase:g.phase,turn:g.turn,role:g.role,status:g.status,providerRequests:g.providerRequests,latencyMs:g.telemetry?.latencyMs??null,
 model:g.telemetry?.modelVersion??null,httpStatus:g.telemetry?.httpStatus??null,inputTokens:g.telemetry?.inputTokens??g.telemetry?.usage?.input_tokens??null,outputTokens:g.telemetry?.outputTokens??g.telemetry?.usage?.output_tokens??null}));
const counts=Object.fromEntries(['SEND_ELIGIBLE','HANDOFF','NO_SEND'].map(d=>[d,cases.filter(c=>c.terminal.disposition===d).length]));
const prior=read(resolve(root,'PRIOR_ABORT.json'));
const summary={source:input.runSourceSha,captureSourceSha:input.captureSourceSha,worldHash:input.worldHash,registeredMeasuredTurns:5,completedMeasuredTurns:5,scriptedSetupTurns:10,terminalCounts:counts,
 providerRequests:account.providerRequests,providerErrors:safeGens.filter(g=>g.status!=='OK').length,judgeRequests:0,priorAbortedAttempts:1,priorAbortedProviderRequests:prior.completedProviderRequests,
 totalProviderRequestsIncludingAbort:account.providerRequests+prior.completedProviderRequests,completeAttemptDenominatorIncludingAbort:6,generationRetriesInCompletedRun:cases.reduce((n,c)=>n+Math.max(0,c.ownerGenerations-1-c.outputs.filter(o=>o.kind==='TOOLS').length),0),
 maximumOwnerTextBytes:Math.max(...wire.filter(w=>w.role==='OWNER').map(w=>w.textBytes)),maximumOwnerSignatureBytes:Math.max(...wire.filter(w=>w.role==='OWNER').map(w=>w.signatureBytes)),maximumVerifierWireBytes:Math.max(...wire.filter(w=>w.role==='VERIFIER').map(w=>w.wireBytes)),
 oldFiveTerminalCounts:{HANDOFF:5},testDatabaseDropped:true,liveSends:0,sourceWrites:0,wholeJourneyStabilityTest:false,phaseCStatus:'STOP_UNCHANGED'};
const write=(name,value)=>writeFileSync(resolve(root,name),JSON.stringify(value,null,2)+'\n');
write('SUMMARY.json',summary);write('PUBLIC_RESULTS.json',{source:input.runSourceSha,cases});write('GENERATION_ACCOUNTING.json',{source:input.runSourceSha,generations:safeGens,wire,unknownAttempts:0,priorAbort:prior});writeFileSync(resolve(root,'CONVERSATIONS.md'),md.join('\n'));
console.log(JSON.stringify(summary));for(const c of cases)console.log(JSON.stringify({repetition:c.repetition,terminal:c.terminal,verdict:c.verdict,tools:c.tools.map(t=>({name:t.name,status:t.status,reason:t.reason})),events:c.committedEvents.map(e=>e.command_kind)}));
