// Synthetic contract fixtures only; this is not the repository's 70-case corpus.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v !== null && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);
export const sha = value => createHash('sha256').update(value).digest('hex');
export const hash = v => sha(stable(v));
export const HEAD = '6ae9ad3d33010e5262ae5eb303df75411974960e';
export const ids = [...Array.from({length:9},(_,i)=>Array.from({length:7},(_,j)=>i*10+j+1)).flat(),91,92,93,94,95,96,100].map(i=>`V5V4Q${String(i).padStart(3,'0')}`);
export function seal(root, data) {
  const {input, judging, facts, changes, manifest} = data;
  for (const [i,c] of input.cases.entries()) changes.changes[i].new_dialogue_sha256 = hash([c.history,c.latest_customer_message]);
  const values = {'dev70.cases.json':input, 'dev70.expectations.json':judging, 'facts-used.json':facts,'change-map.json':changes};
  for(const [name, value] of Object.entries(values)){
    const bytes=JSON.stringify(value,null,2)+'\n';
    writeFileSync(join(root,name),bytes); manifest.payload_sha256[name]=sha(bytes);
  }
  manifest.fact_entry_sha256=Object.fromEntries(['runtime_claim_catalog','simulation_fact_catalog'].map(name=>[name,Object.fromEntries(Object.entries(facts[name]).map(([k,v])=>[k,hash(v)]))]));
  const baselinePath=join(root,'review-baseline.json');
  if (!data.baseline) {
    data.baseline={schema:'DEV70_REVIEW_BASELINE_V1', head:HEAD, input_sha256:manifest.payload_sha256['dev70.cases.json'], expectations_sha256:manifest.payload_sha256['dev70.expectations.json'], facts_used_sha256:manifest.payload_sha256['facts-used.json'], cases:input.cases.map(c=>({id:c.id,immutable_sha256:hash({id:c.id,split:c.split,context:c.context}),dialogue_sha256:hash([c.history,c.latest_customer_message])}))};
  }
  const baselineBytes=JSON.stringify(data.baseline,null,2)+'\n';writeFileSync(baselinePath,baselineBytes);
  manifest.payload_sha256['review-baseline.json']=sha(baselineBytes);
  manifest.review_baseline_head=HEAD;
  writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const files=readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile() && x.name!=='SHA256SUMS').map(x=>x.name).sort();
  writeFileSync(join(root,'SHA256SUMS'),files.map(n=>`${sha(readFileSync(join(root,n)))}  ${n}`).join('\n')+'\n');
}
export function makeFixture(source) {
  const root=mkdtempSync(join(tmpdir(),'pr379-contract-'));
  copyFileSync(source,join(root,'validate.mjs'));
  const product = {kind:'PRODUCT',productId:'SQ9012'};
  const cart = version => ({kind:'CART',cartVersion:version});
  const facts={runtime_claim_catalog:{
    RC_PRICE_A:{type:'PRICE',scope:product,freshness:'FRESH',value:{amountVnd:849000}},
    RC_SHIP_30:{type:'SHIPPING_FEE',scope:cart(1),freshness:'FRESH',value:{amountVnd:30000}},
    RC_FREESHIP_Y:{type:'FREESHIP',scope:cart(1),freshness:'FRESH',value:{eligible:true}},
    RC_FREESHIP_N:{type:'FREESHIP',scope:cart(1),freshness:'FRESH',value:{eligible:false}},
    RC_PROMO_50:{type:'PROMOTION_OFFER',scope:cart(1),freshness:'FRESH',value:{discountVnd:50000}},
    RC_PROMO_EXPIRED:{type:'PROMOTION_OFFER',scope:cart(1),freshness:'EXPIRED',value:{discountVnd:50000}},
    RC_ETA_EXPIRED:{type:'ETA',scope:product,freshness:'EXPIRED',value:{minDays:2,maxDays:4}},
    RC_STOCK_BLACK_M_IN:{type:'STOCK',scope:{...product,variantId:'black-M'},freshness:'FRESH',value:{status:'IN_STOCK'}},
  },simulation_fact_catalog:{SF_PRODUCT_A:{productId:'SQ9012',kind:'PRODUCT_PROFILE'}}};
  const input={dataset_id:'TRACK_C_DEV70_REALISTIC',revision:'R2',cases:ids.map((id,i)=>({id,split:'DEV',context:{origin:i<3?'ADVERTISEMENT':'ORGANIC',first_meaningful_inbound:i<3,product_binding:{status:'RESOLVED',product_ids:['SQ9012']},phase:'BROWSING',canonical_flags:[],buying_intent:{decision:'NONE',requested_action:'NONE',quantity:null,evidence:null},source_stage:null,runtime_claim_refs:['RC_PRICE_A'],simulation_fact_refs:['SF_PRODUCT_A']},history:[],latest_customer_message:`Question ${id}`}))};
  const judging={cases:ids.map(id=>({id,title:id,category:'TEST',domain:'TEST',expected:{required_behaviors:['Answer using supplied evidence.'],forbidden_behaviors:['Do not invent an effect.'],next_step:{requirement:'NONE',allowed_actions:['NONE']}},expected_admission:'MODEL_ELIGIBLE'}))};
  const byId=id=>input.cases.find(c=>c.id===id);
  const judge=id=>judging.cases.find(c=>c.id===id);
  for(const id of ['V5V4Q014','V5V4Q032','V5V4Q036','V5V4Q082']) byId(id).history=Array.from({length:16},(_,i)=>[i%2?'shop':'customer',`Synthetic history ${id} ${i}`]);
  byId('V5V4Q031').context.canonical_flags=['MEASUREMENTS_REQUIRED'];
  judge('V5V4Q031').expected.next_step={requirement:'REQUIRED',allowed_actions:['ASK_MEASUREMENTS']};
  byId('V5V4Q017').context.buying_intent={decision:'CONSIDERING',requested_action:'NONE',quantity:null,evidence:null};
  const checkout=byId('V5V4Q092');
  Object.assign(checkout.context,{phase:'CART_ACTIVE',source_stage:'CART_OPEN',checkout_completeness:{state:'REQUIRED',missing_fields:['ADDRESS','PAYMENT_METHOD']}});
  judge('V5V4Q092').expected.next_step={requirement:'REQUIRED',allowed_actions:['ASK_CHECKOUT_DETAILS']};
  for(const [id,ref,fee] of [['V5V4Q022','RC_PROMO_50',null],['V5V4Q023','RC_FREESHIP_Y',0],['V5V4Q025','RC_SHIP_30',30000]]){
    Object.assign(byId(id).context,{phase:'CART_ACTIVE',source_stage:'CART_OPEN',runtime_claim_refs:[ref],cart_snapshot:{shipping_fee_vnd:fee}});
  }
  byId('V5V4Q024').context.runtime_claim_refs=['RC_FREESHIP_N'];
  byId('V5V4Q043').context.runtime_claim_refs=['RC_STOCK_BLACK_M_IN'];
  for(const [id,ref] of [['V5V4Q027','RC_PROMO_EXPIRED'],['V5V4Q066','RC_ETA_EXPIRED']]){
    byId(id).context.runtime_claim_refs=[ref];
    Object.assign(judge(id),{expected_admission:'PRE_MODEL_REJECT',expected_error:'TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE'});
  }
  const changes={changes:input.cases.map(c=>({id:c.id,r1_dialogue_sha256:'1'.repeat(64),source_dialogue_sha256:'2'.repeat(64),new_dialogue_sha256:''}))};
  const manifest={expected_ids:ids,payload_sha256:{},source_files_sha256:{},review_baseline_head:HEAD};
  const data={input,judging,facts,changes,manifest};
  seal(root,data);
  return {root,data,byId};
}
