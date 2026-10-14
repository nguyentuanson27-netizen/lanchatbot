import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from './protocol.mjs';
const root=new URL('./round-22/',import.meta.url);
const profiles=JSON.parse(readFileSync(new URL('fashion-profiles.json',root))).profiles;
const records=JSON.parse(readFileSync(new URL('size-inputs.json',root))).records;
const fixture=subject=>({profile:structuredClone(profiles.find(p=>p.subjectRef===subject)),input:structuredClone(records.find(r=>r.input.target.parentProductId===subject).input)});

test('code size context asks only missing chest and preserves existing chart/facts/binding without a new field',async()=>{
 const {prepareSizeInputContext}=await import('./size-input-context.mjs');
 const {profile,input}=fixture('SM613');input.profile.measurements=[];
 const original=structuredClone(profile),result=prepareSizeInputContext(profile,input);
 assert.deepEqual(result.summary,{supportedInputs:['BUST_CM'],missingInputs:['BUST_CM']});
 assert.deepEqual(result.profile.details.sizeChart.slice(0,-1),original.details.sizeChart);
 assert.equal(result.profile.details.sizeChart.at(-1),'CodeSizeInput: '+JSON.stringify(result.summary));
 assert.equal(result.profile.contentHash,hash(JSON.stringify(result.profile.details)));
 assert.deepEqual(profile,original);
 for(const key of ['ref','subjectRef','sourceVersion','observedAt','expiresAt','authority'])assert.equal(result.profile[key],original[key]);
});

test('known waist is not requested again; unsupported height/weight is not advertised',async()=>{
 const {prepareSizeInputContext}=await import('./size-input-context.mjs');
 const {profile,input}=fixture('QU714');input.profile.measurements=input.profile.measurements.filter(m=>m.kind==='WAIST_CM');
 assert.deepEqual(prepareSizeInputContext(profile,input).summary,{supportedInputs:['WAIST_CM','HIPS_CM'],missingInputs:['HIPS_CM']});
});

test('chart-backed height/weight remains supported, and complete engine input has no missing measurements',async()=>{
 const {prepareSizeInputContext}=await import('./size-input-context.mjs');
 const {profile,input}=fixture('QU714');
 assert.deepEqual(prepareSizeInputContext(profile,input).summary,{supportedInputs:['WAIST_CM','HIPS_CM'],missingInputs:[]});
 input.charts[0].chart.bands=[{size:'M',ranges:[{kind:'HEIGHT_CM',minInclusive:150,maxInclusive:170},{kind:'WEIGHT_KG',minInclusive:45,maxInclusive:65}],note:null}];
 input.profile.measurements=[];
 assert.deepEqual(prepareSizeInputContext(profile,input).summary,{supportedInputs:['HEIGHT_CM','WEIGHT_KG'],missingInputs:['HEIGHT_CM','WEIGHT_KG']});
});

test('wrong subject or unverified chart cannot generate trusted sizing hints',async()=>{
 const {prepareSizeInputContext}=await import('./size-input-context.mjs');
 const {profile,input}=fixture('QU714');input.target.parentProductId='SM613';
 assert.throws(()=>prepareSizeInputContext(profile,input),/SIZE_CONTEXT_SUBJECT/);
 input.target.parentProductId='QU714';input.charts[0].chart.reference.verificationStatus='STAGED';
 assert.throws(()=>prepareSizeInputContext(profile,input),/SIZE_CONTEXT_NO_VERIFIED_CHART/);
});
