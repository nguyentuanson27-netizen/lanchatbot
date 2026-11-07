import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {captureTestMediaWorld,supplementTestMediaProduct,assertTestMediaWorld} from './test-media-source.mjs';
test('new test media keeps original source separate, binds actual prepared bytes and rejects changed source',async()=>{
 const image={url:'https://content.pancake.vn/test.jpg',sourceContentSha256:'a'.repeat(64),metadataVerified:true,reviewStatus:'APPROVED',imageType:'MODEL'};
 const world={config:{testMediaSources:{approvalRef:'owner',assets:[{productId:'SD023',url:image.url,priorSha256:image.sourceContentSha256}]}},
  products:[{productId:'SD023',catalogVersion:'v1',images:[image]}],snapshots:{},policyRecords:[]};
 const original=structuredClone(world),bytes=Buffer.from('actual prepared test image');
 const actual=await captureTestMediaWorld(world,{prepare:async()=>({buffer:bytes}),clock:()=>new Date('2026-11-05T00:00:00Z')});
 assert.deepEqual(world,original);assertTestMediaWorld(actual);
 assert.equal(actual.products[0].images[0].sourceContentSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.deepEqual(supplementTestMediaProduct(original.products[0],actual),actual.products[0]);
 const changed=structuredClone(original.products[0]);changed.images[0].sourceContentSha256='b'.repeat(64);assert.throws(()=>supplementTestMediaProduct(changed,actual),/CHANGED/);
 const tampered=structuredClone(actual);tampered.config.testMediaSources.approvalRef='other';assert.throws(()=>assertTestMediaWorld(tampered),/PROVENANCE/);
});
