import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runtimeFingerprints,approvedDevelopmentInventory,developmentInventory} from './development-inventory.mjs';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,basename} from 'node:path';
import {digest} from './qualification.mjs';
test('SKU metadata changes do not hide exact reused dialogue; incomplete history remains blocked',()=>{
 const t={latest:'Áo này giá bao nhiêu em?',history:[],initialProductCodes:['P1']},other={...t,initialProductCodes:['P2']};
 assert.notEqual(runtimeFingerprints(t).exact,runtimeFingerprints(other).exact);
 assert.equal(runtimeFingerprints(t).withoutProducts,runtimeFingerprints(other).withoutProducts);
 const corpus={scenarios:[{turns:[other]}]},body={kind:'DEVELOPMENT_EXPOSURE_INVENTORY_V1',artifacts:['A','B','C'].map(population=>({population})),
  missing:[],fingerprints:[runtimeFingerprints(t).exact],withoutProducts:[runtimeFingerprints(t).withoutProducts]};
 const inventoryHash=digest(body),v={...body,inventoryHash,review:{status:'APPROVED',inventoryHash,corpusHash:digest(corpus),reviewer:'UNIT',nearDuplicateReviewHash:'a'.repeat(64),historyCoverageComplete:true}};
 assert.throws(()=>approvedDevelopmentInventory(v,corpus),/REUSE_WITHOUT_PRODUCT/);
 const changed=structuredClone(v);changed.review.historyCoverageComplete=false;
 assert.throws(()=>approvedDevelopmentInventory(changed,corpus),/REVIEW_REQUIRED/);
});
test('existing approved fingerprint lists are retained, not silently dropped by structured extraction',t=>{
 const root=mkdtempSync(resolve(tmpdir(),'c3-exposure-unit-'));
 t.after(()=>{assert.equal(dirname(root),resolve(tmpdir()));assert(basename(root).startsWith('c3-exposure-unit-'));rmSync(root,{recursive:true,force:true});});
 const path=resolve(root,'legacy.json');writeFileSync(path,JSON.stringify(['f'.repeat(64)]));
 const result=developmentInventory([{path,population:'A',format:'LEGACY_FINGERPRINTS_V1'}]);
 assert(result.fingerprints.includes('f'.repeat(64)));assert.equal(result.artifacts[0].legacyFingerprintCount,1);
 assert.equal(result.review.status,'PENDING');
 const paths=['A','B','C'].map(population=>{const path=resolve(root,population+'.json');writeFileSync(path,JSON.stringify(['f'.repeat(64)]));return {path,population,format:'LEGACY_FINGERPRINTS_V1'};});
 const manifest=developmentInventory(paths),corpus={scenarios:[{turns:[{latest:'new unit input',history:[],initialProductCodes:[]}]}]};
 manifest.review={status:'APPROVED',inventoryHash:manifest.inventoryHash,corpusHash:digest(corpus),reviewer:'UNIT_ONLY',nearDuplicateReviewHash:'a'.repeat(64),historyCoverageComplete:true};
 assert.deepEqual(approvedDevelopmentInventory(manifest,corpus),['f'.repeat(64)]);
 writeFileSync(paths[0].path,'[]');assert.throws(()=>approvedDevelopmentInventory(manifest,corpus),/SOURCE_CHANGED/);
 const partial=resolve(root,'partial.json');writeFileSync(partial,JSON.stringify({runtimeInput:{latest:'known',history:[],initialProductCodes:[]},
  requestBody:{unknownWire:true},role:'OWNER'}));
 const flagged=developmentInventory([{path:partial,population:'C'}]);assert.equal(flagged.artifacts[0].runtimeCount,1);
 assert.equal(flagged.artifacts[0].needsSourceMapping,true);
});
