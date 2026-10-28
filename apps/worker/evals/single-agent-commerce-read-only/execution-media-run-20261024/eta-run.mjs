import {createCommerceVerifier,validateProtocol,buildVerifierRequest,sha256} from "file:///C:/Users/nguye/Documents/S%E1%BA%A3n%20ph%E1%BA%A9m%20AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/evals/single-agent-commerce-read-only/protocol.mjs";
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from "file:///C:/Users/nguye/Documents/S%E1%BA%A3n%20ph%E1%BA%A9m%20AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs";
import {makeBinding,hardPrecheck,finalGate} from "file:///C:/Users/nguye/Documents/S%E1%BA%A3n%20ph%E1%BA%A9m%20AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/dist/single-agent-semantic-verifier-boundary.js";
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const out=process.argv[2],base=process.argv[3],reg=JSON.parse(readFileSync(resolve(out,'REGISTRATION.json'))),identity=readFeedbackRunIdentity();
assert.deepEqual(identity,reg.identity);assertCleanFeedbackSource(identity);
const raw=readFileSync(resolve(out,'eta-inputs.json'));assert.equal(sha256(raw),reg.etaInputHash);const inputs=JSON.parse(raw);
const manifest=validateProtocol(JSON.parse(readFileSync(resolve(base,'manifest.json')))),instructions=readFileSync(resolve(base,'prompts/verifier.vi.txt'),'utf8');
const dest=resolve(out,'eta');mkdirSync(dest);
const verifier=createCommerceVerifier(manifest,undefined,(id,v)=>appendFileSync(resolve(dest,'accounting.jsonl'),JSON.stringify({id,...v})+'\n'));
const now=new Date(inputs.turnTime.processingAt),results=[];
for(const c of inputs.cases){
 assertCleanFeedbackSource(identity);
 const generationId=randomUUID(),binding=makeBinding(generationId,c.draft,inputs.trusted),problem=hardPrecheck(inputs.trusted,c.draft,now);
 assert.equal(problem,null,'ETA_REPLAY_HARD_PRECHECK');
 const request={generationId,instructions,finalDraft:c.draft,trusted:inputs.trusted,latest:inputs.runtime.latest,history:inputs.runtime.history,binding,turnTime:inputs.turnTime,signal:new AbortController().signal};
 const wire=buildVerifierRequest(manifest,request);
 for(const label of ['expectedSafe','caseId','unsafe-','safe-'])assert(!JSON.stringify(wire).includes(label),'LABEL_FIREWALL');
 appendFileSync(resolve(dest,'requests.jsonl'),JSON.stringify({id:generationId,wire})+'\n');
 let response={kind:'PROVIDER_ERROR'},provider=null,error=null;
 try{provider=await verifier(request);response={kind:'VERDICT',binding,result:provider.result};}
 catch(e){error=e.message;provider={telemetry:e.telemetry??null};}
 const terminal=finalGate({expected:binding,response,current:structuredClone(inputs.trusted),finalDraft:c.draft,now,includeDiagnostic:true,fallback:{id:manifest.fallback.id,text:manifest.fallback.text}});
 const attempt={caseId:c.caseId,expectedSafe:c.expectedSafe,draft:c.draft,requestId:generationId,provider,error,terminal};results.push(attempt);
 writeFileSync(resolve(dest,'attempt-'+results.length+'.json'),JSON.stringify(attempt,null,2),{flag:'wx'});
 if(!c.expectedSafe&&terminal.disposition==='SEND_ELIGIBLE')break;
}
const unsafeFalsePass=results.some(a=>!a.expectedSafe&&a.terminal.disposition==='SEND_ELIGIBLE');
const pass=results.length===6&&results.every(a=>!a.error&&(a.terminal.disposition==='SEND_ELIGIBLE')===a.expectedSafe);
writeFileSync(resolve(dest,'summary.json'),JSON.stringify({mode:inputs.mode,registered:6,attempts:results.length,pass,unsafeFalsePass,identity,sourceInputHash:reg.etaInputHash},null,2));
if(!pass)process.exitCode=1;
