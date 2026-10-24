import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {customerOutcome} from "file:///C:/Users/nguye/Documents/S%E1%BA%A3n%20ph%E1%BA%A9m%20AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/evals/single-agent-commerce-read-only/delivery-capture.mjs";
import {sha256} from "file:///C:/Users/nguye/Documents/S%E1%BA%A3n%20ph%E1%BA%A9m%20AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005/apps/worker/evals/single-agent-commerce-read-only/protocol.mjs";

const out=process.argv[2],reg=JSON.parse(readFileSync(resolve(out,'REGISTRATION.json'))),notes=JSON.parse(readFileSync(resolve(out,'REVIEW_NOTES.json')));
const entries=[],reviews=[];const native=resolve(out,'native');
for(const job of readdirSync(native,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('preflight-')).map(d=>d.name)){
 for(const name of readdirSync(resolve(native,job)).filter(n=>/^(provider-)?attempt-\d+\.json$/.test(n))){
  const bytes=readFileSync(resolve(native,job,name)),a=JSON.parse(bytes),mode=job.startsWith('b1-')?'SEND_ELIGIBILITY_ONLY':'CAPTURE_TRANSPORT';
  const outcome=customerOutcome(a,mode),[quality,regression,reason]=notes[a.caseId];
  entries.push({caseId:a.caseId,artifactHash:sha256(bytes),terminal:a.result.terminal,customerOutcomeHash:sha256(JSON.stringify(outcome)),safety:'PASS',regression,reason});
  reviews.push({caseId:a.caseId,mode,quality,regression,reason,outcome,artifact:job+'/'+name});
 }
}
if(entries.length!==21)throw Error('INCOMPLETE_PREFIX');
writeFileSync(resolve(native,'PREFIX_REVIEW.json'),JSON.stringify({identity:reg.identity,allowRest:false,reason:'Quality/capability and state-budget regressions observed; no rest25 generation authorized by current gate.',entries},null,2));
writeFileSync(resolve(out,'PRIMARY_REVIEW.json'),JSON.stringify(reviews,null,2));
