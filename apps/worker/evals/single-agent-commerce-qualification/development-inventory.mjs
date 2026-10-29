// Offline exposure bookkeeping only; never semantic classification or provider dispatch.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {digest} from './qualification.mjs';
import {assertNativeRuntime,NATIVE_CODECS} from './native-wire.mjs';
export function runtimeFingerprints(t){
 const common={latest:t.latest.normalize('NFC').trim(),history:t.history,
  ...(typeof t.finalDraft==='string'?{finalDraft:t.finalDraft}:{})};
 return {exact:digest({...common,initialProductCodes:t.initialProductCodes}),withoutProducts:digest(common)};
}
export function developmentInventory(sources){
 const exact=new Set(),withoutProducts=new Set(),artifacts=[],missing=[];
 for(const s of sources){
  assert(['A','B','C','DIAGNOSTIC'].includes(s.population)&&typeof s.path==='string'&&!/PRIVATE|credential|token/i.test(s.path),'C_EXPOSURE_SOURCE');
  let bytes;try{bytes=readFileSync(s.path);}catch{missing.push(s.path);continue;}
  const text=bytes.toString('utf8').replace(/^\uFEFF/,''),runtimes=[];let wireCount=0,unmappedWireCount=0;
  const sha256=createHash('sha256').update(bytes).digest('hex');
  let documents=[],parseError=false;
  try{documents=s.path.endsWith('.jsonl')?text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)):[JSON.parse(text)];}catch{parseError=true;}
  const values=documents[0],legacy=!parseError&&documents.length===1&&Array.isArray(values)&&values.every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v));
  if(s.format==='LEGACY_FINGERPRINTS_V1')assert(legacy,'C_EXPOSURE_LEGACY_FORMAT');
  if(legacy){
   for(const value of values)exact.add(value);
   artifacts.push({path:s.path,population:s.population,sha256,runtimeCount:0,legacyFingerprintCount:values.length,needsSourceMapping:false});continue;
  }
  const walk=(v,parentDraft)=>{if(!v||typeof v!=='object')return;
   const draft=typeof v.finalDraft==='string'?v.finalDraft:parentDraft;
   if(typeof v.latest==='string'&&Array.isArray(v.history)&&Array.isArray(v.initialProductCodes)){
    const f=runtimeFingerprints({...v,...(draft===undefined?{}:{finalDraft:draft})});exact.add(f.exact);withoutProducts.add(f.withoutProducts);runtimes.push(f.exact);
   }
   for(const [key,x]of Object.entries(v)){
    if(key==='requestBody'&&x){wireCount++;try{assert(v.runtimeInput&&NATIVE_CODECS[v.role]);assertNativeRuntime(x,NATIVE_CODECS[v.role],v.runtimeInput);}catch{unmappedWireCount++;}}
    if(!['blindSeed','requestBody','telemetry','config'].includes(key))walk(x,draft);
   }
  };
  try{for(const document of documents)walk(document);}catch{parseError=true;}
  artifacts.push({path:s.path,population:s.population,sha256,runtimeCount:runtimes.length,wireCount,unmappedWireCount,
   needsSourceMapping:parseError||unmappedWireCount>0||wireCount===0&&text.includes('requestBody')});
 }
 const body={kind:'DEVELOPMENT_EXPOSURE_INVENTORY_V1',artifacts,missing,fingerprints:[...exact].sort(),withoutProducts:[...withoutProducts].sort()};
 return {...body,inventoryHash:digest(body),review:{status:'PENDING'}};
}
export function approvedDevelopmentInventory(v,corpus){
 const {review,inventoryHash,...body}=v??{};
 assert(body.kind==='DEVELOPMENT_EXPOSURE_INVENTORY_V1'&&digest(body)===inventoryHash&&body.missing.length===0,'C_EXPOSURE_INVENTORY');
 assert(['A','B','C'].every(p=>body.artifacts.some(a=>a.population===p)),'C_EXPOSURE_HISTORY_COVERAGE');
 assert(review?.status==='APPROVED'&&review.inventoryHash===inventoryHash&&review.corpusHash===digest(corpus)&&
  review.reviewer&&/^[a-f0-9]{64}$/.test(review.nearDuplicateReviewHash??'')&&review.historyCoverageComplete===true,'C_EXPOSURE_REVIEW_REQUIRED');
 const known=new Set(body.withoutProducts);
 for(const s of corpus.scenarios)for(const t of s.turns)assert(!known.has(runtimeFingerprints(t).withoutProducts),'C_DEVELOPMENT_REUSE_WITHOUT_PRODUCT_CODES');
 const derived=developmentInventory(body.artifacts.map(a=>({path:a.path,population:a.population})));
 assert(digest(derived.artifacts)===digest(body.artifacts)&&derived.missing.length===0,'C_EXPOSURE_SOURCE_CHANGED');
 assert(digest(derived.fingerprints)===digest(body.fingerprints)&&digest(derived.withoutProducts)===digest(body.withoutProducts),
  'C_EXPOSURE_FINGERPRINT_DERIVATION');
 const exact=new Set(derived.fingerprints);
 for(const a of derived.artifacts.filter(a=>a.needsSourceMapping)){
  const mappings=(review.sourceMappings??[]).filter(m=>m.sourceHash===a.sha256);assert(mappings.length===1,'C_EXPOSURE_MAPPING_REQUIRED');
  const m=mappings[0],bytes=readFileSync(m.artifactPath);assert(createHash('sha256').update(bytes).digest('hex')===m.artifactSha256,'C_EXPOSURE_MAPPING_HASH');
  const data=JSON.parse(bytes.toString('utf8'));assert(data.kind==='EXPOSURE_RUNTIME_MAPPING_V1'&&data.sourceHash===a.sha256&&
   Array.isArray(data.runtimes)&&data.runtimes.length>0&&data.runtimes.length<=10000,'C_EXPOSURE_MAPPING_ROWS');
  for(const t of data.runtimes){
   assert(typeof t.latest==='string'&&Array.isArray(t.history)&&t.history.every(h=>['customer','shop'].includes(h.role)&&typeof h.text==='string')&&
    Array.isArray(t.initialProductCodes)&&t.initialProductCodes.every(c=>typeof c==='string')&&
    (t.finalDraft===undefined||typeof t.finalDraft==='string')&&Buffer.byteLength(JSON.stringify(t))<=1048576,'C_EXPOSURE_MAPPING_RUNTIME');
   const f=runtimeFingerprints(t);exact.add(f.exact);known.add(f.withoutProducts);
  }
 }
 for(const s of corpus.scenarios)for(const t of s.turns)assert(!known.has(runtimeFingerprints(t).withoutProducts),'C_DEVELOPMENT_REUSE_WITHOUT_PRODUCT_CODES');
 return [...exact].sort();
}
if(process.argv[1]?.endsWith('development-inventory.mjs')){
 const [sources,out]=process.argv.slice(2);assert(out,'C_EXPOSURE_ARGS');
 const result=developmentInventory(JSON.parse(readFileSync(sources,'utf8')));
 writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'PENDING_REVIEW',artifacts:result.artifacts.length,missing:result.missing.length,providerRequests:0}));
}
