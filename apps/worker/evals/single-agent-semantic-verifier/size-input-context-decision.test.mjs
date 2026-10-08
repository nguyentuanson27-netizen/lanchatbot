import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSizeInputContext} from './size-input-context.mjs';
import {hash} from './protocol.mjs';
const read=f=>JSON.parse(readFileSync(new URL('./round-24/'+f,import.meta.url)));
const fixture=subject=>({profile:structuredClone(read('fashion-profiles.json').profiles.find(p=>p.subjectRef===subject)),input:structuredClone(read('size-inputs.json').records.find(r=>r.input.target.parentProductId===subject).input)});

test('waist-only context explicitly has no recommendation and presents missing hips before ranges',()=>{
 const {profile,input}=fixture('QU714');input.profile.measurements=input.profile.measurements.filter(m=>m.kind==='WAIST_CM');
 const original=structuredClone(profile),result=prepareSizeInputContext(profile,input,{includeDecision:true});
 assert.deepEqual(result.summary,{status:'NEEDS_MEASUREMENTS',supportedInputs:['WAIST_CM','HIPS_CM'],missingInputs:['HIPS_CM']});
 assert.equal(result.profile.details.sizeChart[0],'CodeSizeInput: '+JSON.stringify(result.summary));
 assert.deepEqual(result.profile.details.sizeChart.slice(1),original.details.sizeChart);
 assert.equal(result.profile.contentHash,hash(JSON.stringify(result.profile.details)));assert.deepEqual(profile,original);
 for(const k of ['ref','subjectRef','sourceVersion','observedAt','expiresAt','authority'])assert.equal(result.profile[k],original[k]);
});
test('complete inputs expose engine status without creating a fit claim, size or permission',()=>{
 const {profile,input}=fixture('QU714'),result=prepareSizeInputContext(profile,input,{includeDecision:true});
 assert.deepEqual(result.summary,{status:'RECOMMENDED',supportedInputs:['WAIST_CM','HIPS_CM'],missingInputs:[]});
 assert.deepEqual(Object.keys(result),['profile','summary']);assert.ok(Buffer.byteLength(JSON.stringify(result.profile))<=2048);
 const legacy=prepareSizeInputContext(profile,input);
 assert.deepEqual(legacy.summary,{supportedInputs:['WAIST_CM','HIPS_CM'],missingInputs:[]});
 assert.equal(legacy.profile.details.sizeChart.at(-1),'CodeSizeInput: '+JSON.stringify(legacy.summary));
});
test('no missing inputs in an out-of-range result cannot be presented as a recommendation',()=>{
 const {profile,input}=fixture('QU714');input.profile.measurements=input.profile.measurements.map(m=>({...m,value:130}));
 const result=prepareSizeInputContext(profile,input,{includeDecision:true});
 assert.equal(result.summary.status,'OUT_OF_RANGE');assert.deepEqual(result.summary.missingInputs,[]);
 assert.equal(result.profile.details.sizeChart[0],'CodeSizeInput: '+JSON.stringify(result.summary));
});
