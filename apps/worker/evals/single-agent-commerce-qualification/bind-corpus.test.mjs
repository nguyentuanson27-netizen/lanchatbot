// Synthetic source fixtures; zero provider requests, not qualification evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProduct,fixturePolicyPointers,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {bindCorpus} from './bind-corpus.mjs';
import {corpus} from './fixtures.test-support.mjs';
import {digest,runtimeProjection} from './qualification.mjs';
import {buildVerifierRequest} from '../single-agent-commerce-read-only/protocol.mjs';
import {readFileSync} from 'node:fs';
test('source binding gives the judge ground truth and real scoped media observation reaches verifier without labels',async()=>{
 const f=fixtureProduct(),world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',capturedAt:commerceNow.toISOString(),sourceWrites:0,providerRequests:0,
  config:{scope:commerceScope(),channel:'CANARY_SHADOW',maxFactAgeSeconds:1200},products:[f.product],snapshots:{SM613:f.snapshot},policyRecords:fixturePolicyPointers()};
 world.sourceEvidenceHashes=[digest(world.products),digest(world.snapshots),digest(world.policyRecords)];
 const draft=corpus(),bindings={capabilities:[],review:{status:'APPROVED',worldHash:digest(world),newProviderResultsObserved:0,reviewer:'UNIT',evidenceRef:'SYNTHETIC_ONLY'},
  scenarios:draft.scenarios.map(s=>({id:s.id,initialProductCodes:['SM613'],mediaAllowedHostSuffixes:['content.pancake.vn'],
   sourceReads:[{name:'read_policy',args:{}},...(s.mode==='SAFETY'?[{name:'select_product_media',args:{subjectRef:'SM613',intent:'FEEDBACK'}}]:[])],
   ...(s.mode==='SAFETY'?{latest:s.turns[0].latest,finalDraft:s.turns[0].finalDraft,expectedUnsafe:s.evaluator.unsafe,sourceRefs:['product:SM613'],reason:'SYNTHETIC_ONLY'}:{})}))};
 draft.provenance={};
 const initialStateArtifact={kind:'REAL_ADAPTER_NATIVE_INITIAL_STATE',worldHash:digest(world),providerRequests:0,testDatabaseDropped:true,sourceDirty:false,publicState:{}};
 const result=await bindCorpus({draft,world,bindings,initialStateArtifact});
 const single=result.scenarios.find(s=>s.mode==='SINGLE');assert(single.judgeContext.sourceInventory.products[0].pos.snapshot.offers.DIRECT);
 assert(!JSON.stringify(runtimeProjection(single,0)).includes('sourceInventory'));
 const safe=result.scenarios.find(s=>s.mode==='SAFETY'&&!s.evaluator.unsafe),trusted=safe.nativeSafety.trusted;
 assert(trusted.policyLiterals.some(p=>p.ref.startsWith('media-lookup:')&&JSON.parse(p.text).authority==='SCOPED_CATALOG_LOOKUP'));
 const manifest=JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/manifest.json',import.meta.url)));
 const wire=buildVerifierRequest(manifest,{finalDraft:safe.turns[0].finalDraft,trusted,instructions:'Unit only',binding:{},latest:safe.turns[0].latest,history:[]});
 assert(JSON.stringify(wire).includes('not shop-wide absence'));
 assert(!JSON.stringify(wire).includes('SYNTHETIC_ONLY'));
});
