import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const repo='C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005';
const root='C:/Users/nguye/Documents/Sản phẩm AI/c3-tool-history-continuation-20261025';
const {assertNoEvaluatorLabels}=await import(pathToFileURL(repo+'/apps/worker/evals/single-agent-commerce-read-only/feedback-control-inputs.mjs'));
const json=p=>JSON.parse(readFileSync(p));
const wires=new Map(),requests=new Map();
for(const job of readdirSync(root).filter(n=>['stateful','journey-openings','media-followup','negotiation','opening-quotes'].includes(n)||/^b1-\d+-\d+$/.test(n))){
 const rows=readFileSync(root+'/'+job+'/'+(job.startsWith('b1-')?'requests.jsonl':'provider-requests.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 for(const row of rows)if(['OWNER_REQUEST','VERIFIER_REQUEST'].includes(row.phase))wires.set(row.id,{role:row.phase==='OWNER_REQUEST'?'owner':'verifier',wire:row.value});
 for(const file of readdirSync(root+'/'+job).filter(f=>(job.startsWith('b1-')?/^attempt-\d+\.json$/:/^provider-attempt-\d+\.json$/).test(f))){
  const a=json(root+'/'+job+'/'+file);
  for(const g of a.result.generations??[]){
   if((g.telemetry?.providerRequests??0)>0){assert.equal(g.telemetry.providerRequests,1);requests.set(g.id,g.role);}
   if(g.role==='verifier'&&g.telemetry?.requestBody)wires.set(g.id,{role:g.role,wire:typeof g.telemetry.requestBody==='string'?JSON.parse(g.telemetry.requestBody):g.telemetry.requestBody});
  }
 }
}
let scanned=0;
for(const[id,role]of requests){
 assert(wires.has(id),'DISPATCHED_WIRE_MISSING:'+id);
 const {wire}=wires.get(id);assertNoEvaluatorLabels(wire);
 if(role==='verifier'){assert.equal(wire.model,'gpt-6.1-sol');assert.equal(wire.reasoning.effort,'high');assert.deepEqual(wire.tools,[]);}
 const bytes=JSON.stringify(wire);
 assert(!bytes.includes('Khách thử nghiệm')&&!bytes.includes('0900000000'),'PRIVATE_FIXTURE_LEAK');
 assert(!bytes.includes('owner-approved-size-sharing')&&!bytes.includes('owner-same-name-size-sharing-20261024'),'INTERNAL_DELEGATION_LEAK');
 scanned++;
}
const result={status:'PASS',actualGenerationRequests:requests.size,actualWiresScanned:scanned,evaluatorLabelLeaks:0,
 privateFixtureLeaks:0,internalDelegationLeaks:0,roles:[...new Set(requests.values())],maximumProviderRequestsPerGeneration:1,
 notes:'Outer audit caseId/evaluator metadata never forwarded. Every dispatched generation has a retained wire; failed provider attempts remain in accounting. B1 verifier wires come from telemetry.requestBody.'};
writeFileSync(root+'/LABEL_FIREWALL_AUDIT.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
