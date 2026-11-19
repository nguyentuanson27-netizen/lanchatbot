// Offline size probe. Does not construct an adapter, load credentials or call a provider.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownerTextBytes,OWNER_REQUEST_MAX_BYTES} from '../../../../apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs';
import {readCompactSections} from '../../../../apps/worker/evals/single-agent-commerce-read-only/owner-data-presentation.mjs';
const root=resolve(process.argv[2]),out=resolve(fileURLToPath(new URL('CAPACITY.json',import.meta.url)));
const prompt=readFileSync(new URL('../../../../apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt',import.meta.url),'utf8');
const files=readdirSync(root,{recursive:true}).filter(p=>String(p).endsWith('NATIVE_REQUESTS.jsonl'));
const rows=[];
for(const file of files)for(const line of readFileSync(join(root,String(file)),'utf8').trim().split('\n')){
 const event=JSON.parse(line),value=event.value;
 if(event.phase!=='REQUEST'||value.role!=='OWNER')continue;
 const body=structuredClone(value.requestBody),beforeBytes=ownerTextBytes(body);let inserted=0;
 body.systemInstruction={parts:[{text:prompt}]};
 const visit=v=>{
  if(!v||typeof v!=='object')return;
  const f=v.functionResponse,d=f?.response?.data;
  if(f?.name==='quote_product'&&d?.preCartQuote){
   const q=d.preCartQuote;
   // Synthetic representative payload: two source colours, a 64-byte hash.
   // This is a size probe, not reconstruction of the original source evidence.
   d.choiceOptions={purpose:'CUSTOMER_CHOICE_LABELS_ONLY',subjectRef:q.subjectRef,offerType:q.offerType,
    query:{quantity:1,size:null,color:null},colors:['Trắng','Be'],complete:true,purchaseStock:'NOT_CHECKED',evidenceHash:'a'.repeat(64)};
   inserted++;
  }
  for(const child of Object.values(v))if(typeof child==='object')visit(child);
 };
 visit(body.contents.slice(1));
 const sections=readCompactSections(body.contents[0],{expandProducts:false});
 for(const section of sections)visit(section.value);
 body.contents[0].parts[0].text=sections.map(s=>s.label+'\n'+JSON.stringify(s.value)).join('\n\n');
 const afterBytes=ownerTextBytes(body);
 rows.push({requestId:value.id,beforeBytes,afterBytes,inserted});
}
assert.equal(rows.length,60,'expected the 60 captured owner requests');
const report={kind:'OFFLINE_SYNTHETIC_CAPACITY_NOT_PROVIDER_OR_QUALITY_EVIDENCE',ownerPromptHash:createHash('sha256').update(prompt).digest('hex'),
 bound:OWNER_REQUEST_MAX_BYTES,requests:rows.length,maximumBefore:Math.max(...rows.map(r=>r.beforeBytes)),maximumAfter:Math.max(...rows.map(r=>r.afterBytes)),
 overflowCount:rows.filter(r=>r.afterBytes>OWNER_REQUEST_MAX_BYTES).length,providerRequests:0,rows};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({requests:report.requests,bound:report.bound,maximumBefore:report.maximumBefore,maximumAfter:report.maximumAfter,overflowCount:report.overflowCount,providerRequests:0}));
assert.equal(report.overflowCount,0);
