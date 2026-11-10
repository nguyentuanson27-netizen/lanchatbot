// One bounded verifier request per registered attempt; no owner generation or live effects.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {validateProtocol,createCommerceVerifier,buildVerifierRequest,sha256} from '../protocol.mjs';
import {makeBinding} from '../../../dist/single-agent-semantic-verifier-boundary.js';

const inputBytes=readFileSync(new URL('./inputs.json',import.meta.url));
const inputs=JSON.parse(inputBytes),registration=JSON.parse(readFileSync(new URL('./REGISTRATION.json',import.meta.url)));
const m=validateProtocol(JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url))));
assert.equal(inputs.length,8);assert.equal(sha256(inputBytes),registration.inputHash);
assert.deepEqual(m.promptHashes,registration.promptHashes);
const instructions=readFileSync(new URL('../prompts/verifier.vi.txt',import.meta.url),'utf8');
const requests=inputs.map(row=>{
 const {trusted,untrusted}=row.requestData;
 const requestId=randomUUID(),request={generationId:requestId+':verifier:1',instructions,
  finalDraft:untrusted.finalDraft,trusted,latest:untrusted.latestCustomerMessage,
  history:untrusted.recentAcceptedDialogue,binding:makeBinding(requestId,untrusted.finalDraft,trusted),
  signal:new AbortController().signal};
 const body=buildVerifierRequest(m,request);
 assert(!/"(?:expectedVerdict|originalVerdict|caseId|evaluator)"\s*:/.test(JSON.stringify(body)));
 return request;
});
if(process.argv.includes('--preflight')){
 console.log(JSON.stringify({status:'PREFLIGHT_PASS',registered:8,providerGenerations:0}));process.exit(0);
}
const out=process.argv[2];assert(out,'NEW_OUTPUT_DIRECTORY_REQUIRED');
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all','--',
 'apps/worker/src','packages','apps/worker/evals/single-agent-commerce-read-only',
 'apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs'],{encoding:'utf8'}).trim(),'','DIRTY_SOURCE');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();mkdirSync(out);
writeFileSync(resolve(out,'RUN_SOURCE.json'),JSON.stringify({sourceSha,registeredAttempts:8,sendEnabled:false},null,2));
const verify=createCommerceVerifier(m,undefined,(id,value)=>appendFileSync(resolve(out,'requests.jsonl'),
 JSON.stringify({id,phase:value.phase,value:value.provider})+'\n'));
const rows=[];
for(let i=0;i<inputs.length;i++){
 let result,telemetry;
 try{const v=await verify(requests[i]);telemetry=v.telemetry;result={status:'RECORDED',verdict:JSON.parse(v.result),telemetry};}
 catch(error){result={status:'ERROR',telemetry:error.telemetry??telemetry??null};}
 const row={id:inputs[i].id,expectedVerdict:inputs[i].expectedVerdict,result};
 rows.push(row);writeFileSync(resolve(out,'attempt-'+(i+1)+'.json'),JSON.stringify(row,null,2));
}
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha);
const summary={sourceSha,registered:8,recorded:rows.length,
 matches:rows.filter(r=>r.result.verdict?.verdict===r.expectedVerdict).length,
 providerRequests:rows.reduce((n,r)=>n+(r.result.telemetry?.providerRequests??0),0),retry:0,sendEnabled:false};
assert(summary.providerRequests<=8);
writeFileSync(resolve(out,'SUMMARY.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
