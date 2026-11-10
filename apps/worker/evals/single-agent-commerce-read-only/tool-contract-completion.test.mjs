import {test} from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {decodeProductRead} from './product-read-selection.mjs';
import {readOnlyDeclarations,buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';

test('flat public reads preserve exact offer scope and explicit retained selection',()=>{
 assert.deepEqual(decodeProductRead({subjectRef:'P1',offerTypes:[]}),{ok:true,args:{subjectRef:'P1',detailsOnly:true}});
 assert.deepEqual(decodeProductRead({subjectRef:'P1',offerTypes:['AO'],customerSelected:true,color:null}),
  {ok:true,args:{subjectRef:'P1',offerType:'AO',customerSelected:true}});
 assert.deepEqual(decodeProductRead({subjectRef:'P1',offerTypes:['AO','CV'],size:'M'}),
  {ok:true,args:{subjectRef:'P1',offerTypes:['AO','CV'],size:'M'}});
 for(const a of [{subjectRef:'P1',offerTypes:[],color:null},{subjectRef:'P1',offerTypes:[],customerSelected:true},
  {subjectRef:'P1',offerTypes:['AO','CV'],customerSelected:true},{subjectRef:'P1',offerTypes:null},
  {subjectRef:'P1',offerTypes:['AO','AO']},{subjectRef:'P1',offerTypes:['AO'],customerSelected:false}])assert.equal(decodeProductRead(a).ok,false);
});
test('actual wire schema accepts precisely the same public read branches as the decoder',async()=>{
 const f=fixtureProduct(),tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],
  catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const wire=buildGeminiCommerceRequest({generationId:'contract:1',instructions:'Tư vấn',context:tools.snapshot(),contents:[],
  availableTools:['read_product','apply_customer_state'],toolsAllowed:true,toolBudget:{roundsRemaining:2,callsRemaining:6}});
 const d=wire.tools[0].functionDeclarations.find(d=>d.name==='read_product');assert(d.parametersJsonSchema);assert(!d.parameters);
 const validate=new Ajv({strict:false}).compile(d.parametersJsonSchema);
 for(const n of [0,1,2,3,4])for(const selected of [undefined,true,false])for(const filter of [undefined,null,'navy']){
  const a={subjectRef:'SM613',offerTypes:['AO','CV','SET','EXTRA'].slice(0,n),...(selected===undefined?{}:{customerSelected:selected}),...(filter===undefined?{}:{color:filter})};
  assert.equal(Boolean(validate(a)),decodeProductRead(a).ok,JSON.stringify(a));
 }
 assert(!Object.hasOwn(d.parametersJsonSchema.properties,'selection'));assert(!Object.hasOwn(d.parametersJsonSchema.properties,'offerType'));
 assert(readOnlyDeclarations.some(d=>d.name==='read_product'));
});


test('frozen map component labels preserve exact source, UTF8 limits, both native wire bounds and opaque roundtrip',async()=>{
 const {readFileSync}=await import('node:fs');
 const {makeBinding}=await import('../../dist/single-agent-semantic-verifier-boundary.js');
 const {buildVerifierRequest}=await import('./protocol.mjs');
 const parent=fixtureProduct(),child=fixtureProduct('component-unknown');
 child.product.title='á'.repeat(64); // exactly128UTF8bytes, not128characters
 parent.snapshot.offers.DIRECT.rows[0].components=[{product_sku:child.product.productId,quantity:1}];
 const map=new Map([parent,child].map(f=>[f.product.productId,f]));let reads=0;
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[parent.product,child.product],catalog:{readProduct:async id=>{reads++;return map.get(id);},searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 await tools.prepare();const afterPrepare=reads,context=tools.snapshot();
 const literal=context.policyLiterals.find(p=>p.ref==='offers:SM613');const c=JSON.parse(literal.text).purchaseOptions[0].componentSource;
 assert.equal(c.structureKnown,true);assert.equal(c.labelsStatus,'KNOWN');assert.equal(c.components[0].label,child.product.title);
 assert.equal(c.components[0].componentRef,child.product.productId);assert.deepEqual(c.components[0].labelSource,{productRef:child.product.productId,sourceVersion:child.product.catalogVersion,observedAt:child.product.observedAt});
 const request={generationId:'labels:1',instructions:'Tư vấn',context,contents:[],toolsAllowed:false,ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',toolBudget:{roundsRemaining:0,callsRemaining:0}};
 const owner=buildGeminiCommerceRequest(request);assert(Buffer.byteLength(JSON.stringify(owner))<=65536);
 const m=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
 const verifier=buildVerifierRequest(m,{instructions:'Kiểm',binding:makeBinding('labels','Dạ chị.',context),trusted:context,latest:'Bộ này bao nhiêu?',history:[],finalDraft:'Dạ chị.'});
 assert(Buffer.byteLength(JSON.stringify(verifier))<=65536);assert(JSON.stringify(verifier).includes('component-unknown'));assert.equal(reads,afterPrepare);
 child.product.title+='á'; //130UTF8bytes: no truncated or guessed label
 const t=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[parent.product,child.product],catalog:{readProduct:async id=>map.get(id),searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 await t.prepare();const invalid=JSON.parse(t.snapshot().policyLiterals.find(p=>p.ref==='offers:SM613').text).purchaseOptions[0].componentSource;
 assert.equal(invalid.labelsStatus,'UNKNOWN');assert.equal(invalid.components[0].label,null);assert.equal(invalid.components[0].componentRef,child.product.productId);
});

test('public flat read mapping is differential with the existing domain API for 0,1,2,3 offers',async()=>{
 const f=fixtureProduct();for(const offer of ['AO','CV']){f.snapshot.offers[offer]=structuredClone(f.snapshot.offers.DIRECT);for(const row of f.snapshot.offers[offer].rows)row.offer_type=offer;}
 const make=()=>createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 for(const n of [0,1,2,3]){
  const offers=['DIRECT','AO','CV'].slice(0,n),decoded=decodeProductRead({subjectRef:'SM613',offerTypes:offers});assert(decoded.ok);
  const a=make(),b=make();await a.prepare();await b.prepare();
  const internal={subjectRef:'SM613',...(n===0?{detailsOnly:true}:n===1?{offerType:offers[0]}:{offerTypes:offers})};
  assert.deepEqual(await a.invoke({name:'read_product',args:decoded.args}),await b.invoke({name:'read_product',args:internal}));
  assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(await a.readback(),await b.readback());
 }
});
