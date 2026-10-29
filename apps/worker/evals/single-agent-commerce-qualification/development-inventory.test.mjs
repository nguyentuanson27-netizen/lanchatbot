import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runtimeFingerprints,approvedDevelopmentInventory,developmentInventory,sealDevelopmentInventory,loadSealedDevelopment} from './development-inventory.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
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

test('sealed mappings are copied and hash checked even when original mapping paths disappear',t=>{
 const root=mkdtempSync(resolve(tmpdir(),'c3-exposure-seal-unit-'));
 t.after(()=>{assert.equal(dirname(root),resolve(tmpdir()));assert(basename(root).startsWith('c3-exposure-seal-unit-'));rmSync(root,{recursive:true,force:true});});
 const sources=['A','B','C'].map(population=>{const path=resolve(root,population+'.json');writeFileSync(path,JSON.stringify({requestBody:{unknown:true}}));return {path,population};});
 const inventory=developmentInventory(sources),corpus={scenarios:[{turns:[{latest:'new input',history:[],initialProductCodes:[]}]}]};
 const sourceHash=inventory.artifacts[0].sha256,mapping=resolve(root,'mapping.json');
 writeFileSync(mapping,JSON.stringify({kind:'EXPOSURE_RUNTIME_MAPPING_V1',sourceHash,runtimes:[{latest:'old input',history:[],initialProductCodes:[]}]}));
 inventory.review={status:'APPROVED',inventoryHash:inventory.inventoryHash,corpusHash:digest(corpus),reviewer:'UNIT_ONLY',nearDuplicateReviewHash:'a'.repeat(64),historyCoverageComplete:true,
  sourceMappings:[{sourceHash,artifactPath:mapping,artifactSha256:createHash('sha256').update(readFileSync(mapping)).digest('hex')}]};
 const out=resolve(root,'seal');mkdirSync(out);const record=sealDevelopmentInventory(inventory,corpus,out);rmSync(mapping);
 const loaded=loadSealedDevelopment(record,out);assert(approvedDevelopmentInventory(loaded.inventory,corpus,{readMapping:loaded.readMapping}).length>0);
 assert.throws(()=>approvedDevelopmentInventory(loaded.inventory,{scenarios:[]},{readMapping:loaded.readMapping}),/REVIEW_REQUIRED/);
 const artifact=resolve(out,record.mappings[0].artifactFile),bytes=readFileSync(artifact);writeFileSync(artifact,'{}');
 assert.throws(()=>loadSealedDevelopment(record,out),/MAPPING_HASH/);writeFileSync(artifact,bytes);rmSync(artifact);
 assert.throws(()=>loadSealedDevelopment(record,out));
 const removed=structuredClone(record);removed.mappings=[];assert.throws(()=>loadSealedDevelopment(removed,out),/SEAL_MAPPING/);
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
 const stripped=structuredClone(manifest);stripped.fingerprints=[];stripped.withoutProducts=[];
 const {review,inventoryHash,...body}=stripped;stripped.inventoryHash=digest(body);stripped.review.inventoryHash=stripped.inventoryHash;
 assert.throws(()=>approvedDevelopmentInventory(stripped,corpus),/FINGERPRINT_DERIVATION/);
 writeFileSync(paths[0].path,'[]');assert.throws(()=>approvedDevelopmentInventory(manifest,corpus),/SOURCE_CHANGED/);
 const partial=resolve(root,'partial.json');writeFileSync(partial,JSON.stringify({runtimeInput:{latest:'known',history:[],initialProductCodes:[]},
  requestBody:{unknownWire:true},role:'OWNER'}));
 const flagged=developmentInventory([{path:partial,population:'C'}]);assert.equal(flagged.artifacts[0].runtimeCount,1);
 assert.equal(flagged.artifacts[0].needsSourceMapping,true);
 // Concrete mapping rows, not a bare source hash, must participate in the reuse check.
 const runtime={latest:'mapped unit input',history:[],initialProductCodes:[]},target={scenarios:[{turns:[runtime]}]};
 const full=developmentInventory([...paths,{path:partial,population:'C'}]);
 full.review={status:'APPROVED',inventoryHash:full.inventoryHash,corpusHash:digest(target),reviewer:'UNIT_ONLY',nearDuplicateReviewHash:'a'.repeat(64),
  historyCoverageComplete:true,mappedSourceHashes:[full.artifacts.at(-1).sha256]};
 assert.throws(()=>approvedDevelopmentInventory(full,target),/MAPPING_REQUIRED/);
 const mapping=resolve(root,'mapping.json'),sourceHash=full.artifacts.at(-1).sha256;
 writeFileSync(mapping,JSON.stringify({kind:'EXPOSURE_RUNTIME_MAPPING_V1',sourceHash,runtimes:[runtime]}));
 full.review.sourceMappings=[{sourceHash,artifactPath:mapping,artifactSha256:createHash('sha256').update(readFileSync(mapping)).digest('hex')}];
 assert.throws(()=>approvedDevelopmentInventory(full,target),/REUSE_WITHOUT_PRODUCT/);
});
