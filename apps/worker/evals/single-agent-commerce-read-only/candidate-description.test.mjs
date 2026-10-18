import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {candidateDescription,candidateSearchResult} from './candidate-description.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('isolated registry description preserves product identity, facts, freshness and candidate provenance',()=>{
 const p={productId:'P1',canonicalCode:'P1',title:'Áo',descriptionXml:'Áo cotton mềm, thật đẹp.',descriptionAuthority:'WEBSTORE_XML',
  catalogVersion:'v1',observedAt:'2026-10-18T00:00:00Z',attributes:{material:'cotton'}};
 const changes={P1:{originalSha256:hash(p.descriptionXml),description:'Áo cotton mềm.'}};
 const out=candidateDescription(p,changes);
 assert.equal(out.descriptionXml,changes.P1.description);assert.equal(out.descriptionAuthority,'GOOGLE_SHEETS_PRODUCT_REGISTRY');
 assert.match(out.descriptionSourceVersion,/^candidate-registry-description:/);
 for(const k of ['productId','canonicalCode','title','catalogVersion','observedAt','attributes'])assert.deepEqual(out[k],p[k]);
 assert.equal(p.descriptionXml,'Áo cotton mềm, thật đẹp.');
 assert.throws(()=>candidateDescription({...p,descriptionXml:'Nguồn đã đổi.'},changes),/CANDIDATE_DESCRIPTION_SOURCE_CHANGED/);
 assert.throws(()=>candidateDescription(p,{P1:{...changes.P1,caseId:'EVALUATOR_ONLY'}}),/CANDIDATE_DESCRIPTION_FIELDS/);
 assert.equal(candidateDescription({...p,productId:'P2'},changes).descriptionXml,p.descriptionXml);
 assert.deepEqual(candidateSearchResult({status:'MATCHED',product:p,score:1},changes).product,out);
 assert.deepEqual(candidateSearchResult({status:'AMBIGUOUS',candidates:[{document:p,score:0.8}]},changes).candidates[0],{document:out,score:0.8});
});

