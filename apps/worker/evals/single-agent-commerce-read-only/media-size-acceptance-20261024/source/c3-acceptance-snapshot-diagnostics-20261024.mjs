import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const repo='C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005';
const root='C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-complete-20261024';
const {publicSnapshotDiff}=await import(pathToFileURL(repo+'/apps/worker/evals/single-agent-commerce-read-only/snapshot-diagnosis.mjs'));
const results=[];
for(const [job,index] of [['journey-openings',3],['media-followup',3]]){
 const a=JSON.parse(readFileSync(root+'/'+job+'/provider-attempt-'+index+'.json'));
 const rows=readFileSync(root+'/'+job+'/provider-requests.jsonl','utf8').trim().split('\n').map(JSON.parse);
 const wire=rows.find(r=>r.caseId===a.caseId&&r.phase==='VERIFIER_REQUEST').value;
 const before=JSON.parse(wire.input[0].content[0].text).trusted;
 const after=a.result.currentPublicContext;
 const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
 const meanings=c=>(c.protectedClaims??[]).map(p=>canonical({type:p.type,scope:p.scope,value:p.value,authorization:p.authorization})).sort();
 const times=c=>[...new Set((c.protectedClaims??[]).filter(p=>p.provenance.authority==='POS_SNAPSHOT').map(p=>p.provenance.observedAt))].sort();
 results.push({caseId:a.caseId,claimMeaningSetsEqual:canonical(meanings(before))===canonical(meanings(after)),
   posObservedAt:{before:times(before),after:times(after)},
   positionalDiffWarning:'Canonical claim ordering can change after provenance refresh; index-aligned diff is not evidence that a price or quantity changed. Use the semantic set comparison above.',
   ...publicSnapshotDiff(before,after)});
}
writeFileSync(root+'/SNAPSHOT_DIAGNOSTICS_ALIGNED.json',JSON.stringify({supersedes:'PREFIX_DIAGNOSTICS.snapshotInterpretation: final currentPublicContext is retained. SNAPSHOT_DIAGNOSTICS positional claim rows must not be interpreted as quantity/offer changes without semantic alignment.',items:results},null,2),{flag:'wx'});
console.log(JSON.stringify(results,null,2));
