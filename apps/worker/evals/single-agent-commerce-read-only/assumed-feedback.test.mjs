import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSUMPTION,assumedFeedback} from './assumed-feedback.mjs';
test('assumption changes only feedback metadata in an isolated clone of a known approved asset',()=>{
 const p={productId:ASSUMPTION.productId,images:[{url:ASSUMPTION.url,feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:'a'.repeat(64)}]};
 const expected=structuredClone(p);expected.images[0].feedback=true;
 assert.deepEqual(assumedFeedback(p),expected);assert.equal(p.images[0].feedback,false);
 assert.throws(()=>assumedFeedback({...p,images:[]}),/ASSUMED_ASSET_UNAVAILABLE/);
 assert.equal(assumedFeedback(null),null);
 assert.doesNotMatch(JSON.stringify(assumedFeedback(p)),/ASSUMPTION|evaluation|expected|caseId/);
});
