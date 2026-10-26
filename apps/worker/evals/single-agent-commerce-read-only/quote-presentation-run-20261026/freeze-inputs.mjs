// Reproducible offline extraction from the registered preceding run. Never dispatches.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {sha256} from '../protocol.mjs';
const [raw,out]=process.argv.slice(2);assert(raw&&out);
const population=['b1-buying-concern-v2','b1-price','b1-price-v3','b1-buying-concern','b1-buying-concern-v3','b1-price-v2','b1-current-policy','b1-changed-occasion-v3'];
const records=[];
for(const cohort of ['b1-first','b1-rest']){
 const log=readFileSync(resolve(raw,cohort,'requests.jsonl'));
 const rows=log.toString('utf8').trim().split('\n').map(JSON.parse);
 for(const name of readdirSync(resolve(raw,cohort)).filter(n=>/^attempt-\d+\.json$/.test(n))){
  const bytes=readFileSync(resolve(raw,cohort,name)),a=JSON.parse(bytes);
  if(!population.includes(a.caseId))continue;
  const id=a.result.generations.filter(g=>g.role==='owner'&&g.telemetry?.providerRequests>0).at(-1)?.id;assert(id);
  const find=phase=>{const found=rows.filter(r=>r.id===id&&r.phase===phase);assert.equal(found.length,1);return found[0].value;};
  const original=find('OWNER_REQUEST'),wire=structuredClone(original),capture=find('PUBLIC_CONTEXT_CAPTURE');
  // Same registered text-only normalization discards opaque provider continuation tokens.
  for(const m of wire.contents)for(const p of m.parts)delete p.thoughtSignature;
  records.push({caseId:a.caseId,runtime:a.runtime,capture,wire,source:{sourceSha:'468d85ea6577c428cf2f6f155c9774926537364b',
   artifact:cohort+'/'+name,artifactHash:sha256(bytes),logHash:sha256(log),generationId:id,
   originalOwnerRequestHash:sha256(JSON.stringify(original)),ownerRequestHash:sha256(JSON.stringify(wire)),captureHash:sha256(JSON.stringify(capture))}});
 }
}
assert.equal(records.length,8);records.sort((a,b)=>population.indexOf(a.caseId)-population.indexOf(b.caseId));
const payload={schemaVersion:1,records};
writeFileSync(out,JSON.stringify({...payload,hash:sha256(JSON.stringify(payload))},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'FROZEN',records:records.length,hash:sha256(JSON.stringify(payload)),providerRequests:0}));
