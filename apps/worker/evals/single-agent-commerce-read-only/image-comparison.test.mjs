import test from 'node:test';
import assert from 'node:assert/strict';
import {imageComparisonSlots,prepareImageComparison,readImageComparisonCases,readImageComparisonRegistration,verifyImageComparisonPins,sha256} from './protocol.mjs';
import {readFileSync} from 'node:fs';
import {buildGeminiCommerceRequest,readOnlyDeclarations,mediaDeclarations} from './gemini-inference.mjs';
test('comparison has six cases, twelve alternating registered slots and preserves fixed B1',()=>{
 const path=new URL('./cases.image-comparison.json',import.meta.url);
 const {samples,inputs}=readImageComparisonCases(path);assert.equal(samples.length,6);assert.equal(inputs.length,6);
 const slots=imageComparisonSlots();assert.equal(slots.length,12);
 for(let i=0;i<6;i++)assert.deepEqual(slots.filter(s=>s.caseIndex===i).map(s=>s.arm).sort(),['CONTROL','PRELOAD']);
 assert.equal(JSON.parse(readFileSync(new URL('./cases.b1.json',import.meta.url))).length,24);
 assert.doesNotMatch(JSON.stringify(inputs),/caseId|evaluator|expected|purposeId/);
});
test('preload prepares once, keeps owner accounting and passes pinned bytes through existing tools',async()=>{
 let preparation=0,views=0;const images=[{subjectRef:'P1',assetRef:'asset:1',sha256:'a',downloadSha256:'b',registrySha256:'c',mimeType:'image/png',data:'PRIVATE_BYTES'}];
 const tools={prepare:async()=>{preparation++;return 1},invoke:async c=>{views++;assert.equal(c.name,'view_product_media');assert.deepEqual(c.args,{subjectRef:'P1',intent:'GENERIC'});return {status:'OK'}},catalogImages:()=>images,snapshot:()=>({boundSubjects:[{kind:'PRODUCT',ref:'P1'}]})};
 const pinned=images.map(({data,...x})=>x),telemetry={};const candidate=prepareImageComparison(tools,{arm:'PRELOAD',subjectRef:'P1',pinned},telemetry);
 assert.equal(await candidate.prepare(),1);assert.equal(await candidate.prepare(),0);assert.equal(preparation,1);assert.equal(views,1);assert.equal(telemetry.preloadCalls,1);assert.equal(telemetry.status,'OK');
 const control=prepareImageComparison(tools,{arm:'CONTROL',subjectRef:'P1',pinned},{});await control.prepare();assert.equal(views,1);
 const bad=prepareImageComparison(tools,{arm:'PRELOAD',subjectRef:'P1',pinned:[{...pinned[0],sha256:'wrong'}]},{});
 await assert.rejects(bad.prepare(),/IMAGE_PIN_CHANGED/);
});

test('source preflight rejects drifted image pins before any model generation',async()=>{
 const corpus=readImageComparisonCases(new URL('./cases.image-comparison.json',import.meta.url));
 const registration=JSON.parse(readFileSync(new URL('./contract-advice-run-20261022/image-registration.json',import.meta.url)));
 let views=0;
 const buildTools=async i=>({prepare:async()=>0,snapshot:()=>({boundSubjects:[{kind:'PRODUCT',ref:registration.cases[i].productCode}]}),
  invoke:async()=>{views++;return {status:'OK'};},catalogImages:()=>registration.cases[i].images.map(a=>({...a,data:'YQ=='}))});
 const ready=await verifyImageComparisonPins(corpus,registration,buildTools);
 assert.equal(ready.length,6);assert.equal(views,6);
 const changed=structuredClone(registration);changed.cases[4].images[0].sha256='0'.repeat(64);
 await assert.rejects(verifyImageComparisonPins(corpus,changed,buildTools),/IMAGE_PIN_CHANGED/);
 assert.equal(views,11);
});

test('actual composed request preserves business/history and effective tools across image treatment',async()=>{
 const {createCommerceTools}=await import('../../dist/single-agent-commerce.js');
 const {runCommerceTurn}=await import('../../dist/single-agent-commerce-read-only.js');
 const {fixtureProduct,fixturePolicy,commerceScope,commerceNow}=await import('../../dist/single-agent-commerce.test-support.js');
 const {createHash}=await import('node:crypto');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY90AAAAASUVORK5CYII=','base64');
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(png,{headers:{'content-type':'image/png'}});
 try{
  const build=async()=>{
   const f=fixtureProduct();f.product.images=[{url:'https://content.pancake.vn/image.png',role:'PRIMARY',angle:'FRONT',imageType:'PRODUCT_ONLY',intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:createHash('sha256').update(png).digest('hex'),observedAt:commerceNow.toISOString(),partsVisible:['AO']}];
   let preparations=0;const raw=await createCommerceTools({read:{scope:commerceScope(),clock:()=>commerceNow,initialProducts:[f.product],policy:fixturePolicy,catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}},media:{allowedHostSuffixes:['content.pancake.vn']}});
   return {...raw,prepare:async()=>{preparations++;assert.equal(preparations,1);return raw.prepare()}};
  };
  const probe=await build();await probe.invoke({name:'view_product_media',args:{subjectRef:'SM613',intent:'GENERIC'}});
  const pinned=probe.catalogImages().map(({data,...m})=>m),bodies=[];
  for(const arm of ['CONTROL','PRELOAD']){
   const prep={};const tools=prepareImageComparison(await build(),{arm,subjectRef:'SM613',pinned},prep);
   const result=await runCommerceTurn({scope:commerceScope(),tools,clock:()=>commerceNow,latest:'Mặc áo này với quần jeans được không em?',history:[{role:'customer',text:'Chị có quần jeans xanh.'}],ownerPrompt:'Tư vấn.',verifierPrompt:'Kiểm.',owner:async request=>{bodies.push(buildGeminiCommerceRequest({...request,caseId:'CASE_CANARY',evaluator:{expected:'LABEL_CANARY'}}));return {kind:'FINAL',text:'Chị phối với quần jeans nhé.'}},verifier:async()=>({result:{verdict:'PASS',violations:[]}})});
   assert.equal(result.terminal.disposition,'SEND_ELIGIBLE',JSON.stringify({arm,prep,result}));assert.equal(result.toolCalls,1);assert.equal(result.toolRounds,0);assert.equal(result.ownerGenerations,1);assert.equal(result.verifierGenerations,1);
  }
  assert.deepEqual(bodies[0].tools,bodies[1].tools);assert.deepEqual(bodies[0].systemInstruction,bodies[1].systemInstruction);assert.equal(bodies[1].contents[1].parts.filter(p=>p.inlineData).length,1);
  const stripped=structuredClone(bodies[1]);stripped.contents.splice(1,1);
  const trusted=JSON.parse(stripped.contents[0].parts[0].text);trusted.trusted.policy=trusted.trusted.policy.filter(p=>!p.ref.startsWith('vision:'));stripped.contents[0].parts[0].text=JSON.stringify(trusted);delete stripped.generationConfig.mediaResolution;
  assert.deepEqual(stripped,bodies[0]);assert.doesNotMatch(JSON.stringify(bodies),/CASE_CANARY|LABEL_CANARY|evaluator|caseId/);
 }finally{globalThis.fetch=original;}
});

test('comparison registration rejects a changed corpus, slots, repetition or image identity before dispatch',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'c3-image-reg-')),file=join(dir,'registration.json');
 const corpus=readImageComparisonCases(new URL('./cases.image-comparison.json',import.meta.url));
 const r={kind:'IMAGE_PRELOAD_VS_ON_DEMAND',corpusHash:corpus.hash,registered:12,repetitions:1,maximumGenerationRequests:48,retry:0,slots:imageComparisonSlots(),cases:corpus.samples.map((s,i)=>({caseId:s.caseId,productCode:corpus.inputs[i].initialProductCodes[0],images:[{subjectRef:corpus.inputs[i].initialProductCodes[0],assetRef:'asset:1',sha256:'a'.repeat(64),downloadSha256:'b'.repeat(64),registrySha256:'c'.repeat(64),mimeType:'image/png'}]}))};
 try{
  writeFileSync(file,JSON.stringify(r));assert.equal(readImageComparisonRegistration(file,corpus).registration.registered,12);
  for(const edit of [x=>x.corpusHash='bad',x=>x.slots.pop(),x=>x.repetitions=2,x=>x.maximumGenerationRequests=49,x=>x.cases[0].images[0].subjectRef='OTHER',x=>x.cases[0].images[0].sha256='bad']){
   const bad=structuredClone(r);edit(bad);writeFileSync(file,JSON.stringify(bad));assert.throws(()=>readImageComparisonRegistration(file,corpus));
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
