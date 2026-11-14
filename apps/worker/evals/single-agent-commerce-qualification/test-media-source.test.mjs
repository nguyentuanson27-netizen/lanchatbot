import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {captureTestMediaWorld,supplementTestMediaProduct,assertTestMediaWorld,reuseTestMediaWorld} from './test-media-source.mjs';
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
test('reusing an approved test asset preserves its real check time and rejects changed source identity',async()=>{
 const image={url:'https://content.pancake.vn/test.jpg',sourceContentSha256:'a'.repeat(64),metadataVerified:true,reviewStatus:'APPROVED',imageType:'MODEL'};
 const world={config:{testMediaSources:{approvalRef:'owner',assets:[{productId:'SD023',url:image.url,priorSha256:image.sourceContentSha256}]}},
  products:[{productId:'SD023',catalogVersion:'v1',images:[image]}],snapshots:{},policyRecords:[]};
 const previous=await captureTestMediaWorld(world,{prepare:async()=>({buffer:Buffer.from('approved bytes')}),
  clock:()=>new Date('2026-11-05T00:00:00Z')});
 const fresh={...structuredClone(world),capturedAt:'2026-11-11T12:00:00Z'};
 const reused=reuseTestMediaWorld(fresh,previous);
 assertTestMediaWorld(reused);
 assert.equal(reused.testMediaSupplement.assets[0].checkedAt,'2026-11-05T00:00:00.000Z');
 assert.deepEqual(reused.products,previous.products);
 assert.equal(fresh.products[0].images[0].sourceContentSha256,'a'.repeat(64));
 const changed=structuredClone(fresh);changed.products[0].images[0].sourceContentSha256='b'.repeat(64);
 assert.throws(()=>reuseTestMediaWorld(changed,previous),/CHANGED/);
 const unapproved=structuredClone(fresh);unapproved.config.testMediaSources.approvalRef='other';
 assert.throws(()=>reuseTestMediaWorld(unapproved,previous),/REUSE_CONFIG/);
});
