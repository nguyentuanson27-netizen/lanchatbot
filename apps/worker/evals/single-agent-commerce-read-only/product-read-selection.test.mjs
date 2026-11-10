import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeProductRead} from './product-read-selection.mjs';
import {readOnlyDeclarations,buildGeminiCommerceRequest,expandCurrentPolicyData} from './gemini-inference.mjs';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {readCompactSections} from './owner-data-presentation.mjs';
test('optional read filters explicitly treat null as omitted, retaining closed selection and actual filters',()=>{
 const base={subjectRef:'SV2447',offerTypes:['AO']};
 assert.deepEqual(decodeProductRead({...base,color:null,size:null,deliveryRegion:null}),decodeProductRead(base));
 assert.deepEqual(decodeProductRead({...base,color:'navy',size:'M'}),{ok:true,args:{subjectRef:'SV2447',offerType:'AO',color:'navy',size:'M'}});
 for(const patch of [{offerType:null},{selection:null},{color:1},{color:''},{size:[]},{unknown:null}])assert.equal(decodeProductRead({...base,...patch}).ok,false);
 const props=readOnlyDeclarations.find(d=>d.name==='read_product').parametersJsonSchema.properties;
 for(const key of ['color','size','deliveryRegion'])assert(props[key].anyOf.some(v=>v.type==='null'));
 assert.equal(props.offerTypes.type,'array');
});
test('continuation factors only exact current policy duplicates and preserves native signatures and old values',async()=>{
 const f=fixtureProduct(),tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],
  catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const result=await tools.invoke({name:'read_policy',args:{}}),context=tools.snapshot();assert.equal(result.status,'OK');
 const native={role:'model',parts:[{functionCall:{name:'read_policy',args:{}},thoughtSignature:'exact-native-signature'}]};
 const request=response=>({instructions:'Shop assistant',context,contents:[native,{role:'user',parts:[{functionResponse:{name:'read_policy',response}}]}],ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',availableTools:['read_policy'],toolsAllowed:true});
 const body=buildGeminiCommerceRequest(request(result)),data=body.contents.at(-1).parts[0].functionResponse.response.data;
 assert.equal(Object.hasOwn(data,'policy'),false);assert.equal(typeof data.policyFromTrustedRef,'string');
 const policy=readCompactSections(body.contents[0]).find(s=>s.label==='Quy định và dữ liệu nguồn').value;
 const match=policy.filter(p=>p.ref===data.policyFromTrustedRef);assert.equal(match.length,1);
 assert.deepEqual(expandCurrentPolicyData(data,policy),result.data);
 for(const literals of [[],[...policy,...match]])assert.throws(()=>expandCurrentPolicyData(data,literals),/POLICY_REFERENCE/);
 assert.throws(()=>expandCurrentPolicyData({...data,sourceVersion:'mixed'},policy),/POLICY_REFERENCE/);
 const wrongVersion=structuredClone(result);wrongVersion.data.sourceVersion='different';
 assert.deepEqual(buildGeminiCommerceRequest(request(wrongVersion)).contents.at(-1).parts[0].functionResponse.response,wrongVersion);
 const legacy=buildGeminiCommerceRequest({...request(result),ownerContextPresentation:undefined});
 assert.deepEqual(legacy.contents.at(-1).parts[0].functionResponse.response,result);
 assert.deepEqual(body.contents[1],native);assert.equal(Object.hasOwn(result.data,'policyFromTrustedRef'),false);
 const old=structuredClone(result);old.data.policy.shipping.defaultFeeVnd+=1000;
 const older=buildGeminiCommerceRequest(request(old)).contents.at(-1).parts[0].functionResponse.response;
 assert.deepEqual(older,old);
});


test('read argument diagnostics retain only bounded shape and hashes, never unknown keys or values',async()=>{
 const {productReadArgumentShape}=await import('./gemini-inference.mjs');
 const privateKey='private customer name and address',secretValue='do-not-publish-this-value';
 const d=productReadArgumentShape({subjectRef:'PRIVATE_SUBJECT',selection:'SINGLE',[privateKey]:secretValue,...Object.fromEntries(Array.from({length:20},(_,i)=>['private-'+i,{value:secretValue}]))});
 assert.equal(d.keyCount,23);assert.equal(d.unknownFieldCount,21);assert.equal(d.unknownFieldNameHashes.length,4);
 for(const text of [privateKey,secretValue,'PRIVATE_SUBJECT','private-0'])assert(!JSON.stringify(d).includes(text));
 assert.equal(d.knownFieldTypes.subjectRef,'string');
});
