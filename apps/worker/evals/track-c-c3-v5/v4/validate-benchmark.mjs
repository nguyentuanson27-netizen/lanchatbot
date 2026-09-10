import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const read=(n)=>JSON.parse(readFileSync(join(root,n),'utf8'));
const ok=(v,m)=>{if(!v) throw new Error(m)};
const stable=(v)=>Array.isArray(v)?`[${v.map(stable).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`:JSON.stringify(v);
const hash=(v)=>createHash('sha256').update(stable(v)).digest('hex');
const manifest=read('manifest.json'), facts=read('facts.json'), gaps=read('contract-gaps.json'), owner=read('owner-safety.json');
const cases=Array.from({length:10},(_,i)=>read(`quality-${String(i+1).padStart(2,'0')}.json`)).flatMap((chunk,i)=>{ok(chunk.chunk===i+1,`chunk ${i+1}: number`);ok(chunk.cases.length===10,`chunk ${i+1}: count`);return chunk.cases});
ok(cases.length===100,'quality count'); ok(owner.cases.length===15,'owner count');
ok(cases.filter(c=>c.split==='DEV').length===70 && cases.filter(c=>c.split==='HOLDOUT').length===30,'70/30 split');
for(let i=0;i<100;i++) ok(cases[i].id===`V5V4Q${String(i+1).padStart(3,'0')}`,`case order ${i+1}`);
const runtime=facts.runtime_claim_catalog, sim=facts.simulation_fact_catalog, gapcat=gaps.gaps;
const allow=new Set(['V5V4Q082','V5V4Q083']), productRe=/\b(?:SQ|SV|SD|CB|V)\d{4}\b/g;
for(const c of cases){
  const ctx=c.context,bound=new Set(ctx.product_binding.product_ids),blocked=c.execution.production_contract==='BLOCKED_BY_CONTRACT';
  ok(blocked===(c.execution.contract_gaps.length>0),`${c.id}: gap lane`); ok(c.history.length<=10,`${c.id}: history length`);
  for(const g of c.execution.contract_gaps) ok(gapcat[g],`${c.id}: gap ${g}`);
  for(const ref of ctx.runtime_claim_refs){const claim=runtime[ref];ok(claim,`${c.id}: runtime ${ref}`);if(ctx.product_binding.status==='RESOLVED'&&claim.scope.kind==='PRODUCT')ok(bound.has(claim.scope.productId),`${c.id}: runtime product scope`)}
  for(const ref of ctx.simulation_fact_refs){const fact=sim[ref];ok(fact,`${c.id}: sim ${ref}`);if(ctx.product_binding.status==='RESOLVED'){if(fact.productId)ok(bound.has(fact.productId),`${c.id}: sim product scope`);if(fact.products)ok(fact.products.every(id=>bound.has(id)),`${c.id}: sim multi-product scope`)}}
  if(c.execution.production_contract==='SUPPORTED') ok(ctx.simulation_fact_refs.length===0,`${c.id}: production lane uses simulation fact`);
  if(ctx.product_binding.status==='RESOLVED'&&!allow.has(c.id)){const text=[...c.history.map(([,t])=>t),c.latest_customer_message].join(' ');for(const code of new Set(text.match(productRe)??[]))ok(bound.has(code),`${c.id}: dialogue ${code} outside binding`)}
}
const stages=new Map([['V5V4Q092','ORDER_PREVIEW'],['V5V4Q093','ORDER_PREVIEW'],['V5V4Q094','ORDER_PREVIEW'],['V5V4Q095','PURCHASE_CONFIRMED'],['V5V4Q096','ORDER_PREVIEW'],['V5V4Q100','ORDER_PREVIEW']]);
for(const c of cases) ok(c.context.source_stage===(stages.get(c.id)??null),`${c.id}: source_stage`);
ok(cases[99].split==='DEV'&&cases[99].execution.contract_gaps.includes('GAP_CHECKOUT_COMPLETENESS'),'Q100 regression placement'); ok(cases[96].split==='HOLDOUT','Q097 replacement holdout');
const expand=(c)=>{const x=structuredClone(c);x.context.runtime_claims=x.context.runtime_claim_refs.map(r=>runtime[r]);x.context.simulation_facts=x.context.simulation_fact_refs.map(r=>sim[r]);delete x.context.runtime_claim_refs;delete x.context.simulation_fact_refs;return x};
const hashes={dev_70_expanded_sha256:hash(cases.filter(c=>c.split==='DEV').map(expand)),holdout_30_expanded_sha256:hash(cases.filter(c=>c.split==='HOLDOUT').map(expand)),owner_safety_15_sha256:hash(owner.cases)};
for(const [k,v] of Object.entries(hashes)) ok(v===manifest.content_hashes[k],`${k}: hash mismatch`);
const prod=cases.reduce((a,c)=>(a[c.execution.production_contract]=(a[c.execution.production_contract]??0)+1,a),{});ok(prod.SUPPORTED===manifest.quality.production_contract_supported,'supported count');ok(prod.BLOCKED_BY_CONTRACT===manifest.quality.production_contract_blocked,'blocked count');
console.log(JSON.stringify({ok:true,cases:cases.length,split:{DEV:70,HOLDOUT:30},production:prod,hashes},null,2));
