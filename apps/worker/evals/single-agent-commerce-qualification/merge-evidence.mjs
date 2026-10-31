// Complete registered denominator; absent phases remain NOT_RUN, never silently dropped.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {digest} from './qualification.mjs';
export function mergeEvidence(registration,bundles,seed){
 assert.equal(digest(seed),registration.config.blinding.seedCommitment,'C_MERGE_BLIND_SEED');
 const attempts=registration.slots.map(s=>({...s,identity:registration.identity,status:'NOT_RUN'})),seen=new Set();
 for(const bundle of bundles){
  assert.equal(digest(bundle.config),digest(registration.config),'C_MERGE_CONFIG');
  assert.equal(digest(bundle.identity),digest(registration.identity),'C_MERGE_IDENTITY');
  if(bundle.corpus)assert.equal(digest(bundle.corpus),registration.corpusHash,'C_MERGE_CORPUS');
  if(bundle.source)assert(bundle.source.sourceSha===registration.runSourceSha&&bundle.source.corpusHash===registration.corpusHash,'C_MERGE_SOURCE');
  for(const a of bundle.attempts){
   assert(!seen.has(a.slotId),'C_DUPLICATE_IMPORTED_ATTEMPT');seen.add(a.slotId);
   const index=registration.slots.findIndex(s=>s.slotId===a.slotId),slot=registration.slots[index];
   assert(slot&&['caseId','mode','arm','repetition','scenarioHash'].every(k=>a[k]===slot[k]),'C_MERGE_SLOT');
   assert.equal(digest(a.identity),digest(registration.identity),'C_MERGE_ATTEMPT_IDENTITY');
   assert(a.status==='NOT_RUN'||Date.parse(a.startedAt)>=Date.parse(registration.registeredAt),'C_MERGE_PRE_REGISTRATION');
   attempts[index]=structuredClone(a);
  }
 }
 return {config:registration.config,corpus:registration.corpus,identity:registration.identity,blindSeed:seed,
  source:{clean:true,sourceSha:registration.runSourceSha,corpusHash:registration.corpusHash,registeredBeforeFirstRequest:true},attempts,
  importProvenance:{registrationHash:digest(registration),bundleHashes:bundles.map(digest)}};
}
if(process.argv[1]?.endsWith('merge-evidence.mjs')){
 const [registration,seed,out,...files]=process.argv.slice(2);assert(out&&files.length,'C_MERGE_ARGUMENTS');
 const read=p=>JSON.parse(readFileSync(p,'utf8')),result=mergeEvidence(read(registration),files.map(read),read(seed).seed);
 writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'MERGED',registered:result.attempts.length,notRun:result.attempts.filter(a=>a.status==='NOT_RUN').length,providerRequests:0}));
}
