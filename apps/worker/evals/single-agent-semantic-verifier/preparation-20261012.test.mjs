import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRequest,projectRuntime,hash} from './protocol.mjs';
import {buildPreparedRequest} from './preparation-20261012.mjs';

const read=name=>JSON.parse(readFileSync(new URL('./round-52/'+name,import.meta.url),'utf8'));
const manifest=read('manifest.json'),a3=read('corpus-a3.json');
const ownerPolicy=JSON.parse(readFileSync(new URL('./prompts/owner-policy-source-preparation-20261012.json',import.meta.url),'utf8'));
const context=request=>JSON.parse(request.contents[0].parts[0].text.split('\n')[1]);
const sorted=items=>[...items].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const originalProfile=({codeSizeInput,...profile})=>profile;
const businessClaim=({type,scope,value})=>({type,scope,value});
const businessProfile=({ref,subjectRef,details})=>({ref,subjectRef,details});
const businessPolicy=({ref,text})=>({ref,text});
const profilesOf=product=>product.profiles??(product.profile?[product.profile]:[]);

test('preparation retains every business fact, profile qualifier and policy across all 42 native histories',()=>{
  for(const fixture of a3.cases){
    const projection=projectRuntime(manifest,fixture,'conversation','opaque');
    const request=buildPreparedRequest(manifest,'conversation',projection),display=context(request);
    assert.deepEqual(display.requestIdentity,projection.requestIdentity);
    assert.deepEqual(display.trusted.products.map(p=>p.subject),projection.trusted.boundSubjects);
    assert.deepEqual(sorted([...display.trusted.products.flatMap(p=>p.claims),...display.trusted.otherClaims]),sorted(projection.trusted.protectedClaims.map(businessClaim)));
    assert.deepEqual(sorted([...display.trusted.products.flatMap(profilesOf),...display.trusted.otherProfiles].map(originalProfile)),sorted(projection.trusted.productProfiles.map(businessProfile)));
    assert.deepEqual(display.trusted.policyLiterals,projection.trusted.policyLiterals.map(businessPolicy));
    assert.deepEqual(display.trusted.effectReceipts,projection.trusted.effectReceipts);
    assert.deepEqual(display.trusted.state,context(buildRequest(manifest,'conversation',projection)).trusted.state);
    assert.deepEqual(request.contents.slice(1),buildRequest(manifest,'conversation',projection).contents.slice(1));
    assert.equal(projection.requestIdentity.trustedSnapshotId,hash(JSON.stringify(projection.trusted)));
  }
});

test('same prompts take conflicting policies and ETA anchors exclusively from current source data',()=>{
  const snapshots=[
    {policy:ownerPolicy.policyLiterals[0].text,eta:'Dự kiến 4–6 ngày kể từ khi đơn vị vận chuyển nhận kiện, không cam kết giờ đến.'},
    {policy:'Fixture đối chứng: đổi màu trong 11 ngày sau bàn giao; phí 41.000đ, không hỗ trợ hoàn tiền.',eta:'Fixture đối chứng: 1–2 ngày sau ngày thanh toán đã xác nhận.'},
  ];
  const requests=[];
  for(const snapshot of snapshots){
    const fixture=structuredClone(a3.cases[0]);
    fixture.policySourceAudit=ownerPolicy;
    fixture.runtime.finalDraft='Dạ, chị nhé.';
    fixture.runtime.trusted.policyLiterals=[
      {...fixture.runtime.trusted.policyLiterals[0],text:snapshot.policy,sourceVersion:'LOCAL_PREPARATION_ONLY:policy'},
      {...fixture.runtime.trusted.policyLiterals[1],text:snapshot.eta,sourceVersion:'LOCAL_PREPARATION_ONLY:eta'},
    ];
    const pair={};
    for(const role of ['conversation','verifier']){
      const projection=projectRuntime(manifest,fixture,role,'opaque');
      pair[role]=buildPreparedRequest(manifest,role,projection);
      const delivered=role==='conversation'?context(pair[role]):JSON.parse(pair[role].input[0].content[0].text);
      assert.deepEqual(delivered.trusted.policyLiterals,role==='conversation'?projection.trusted.policyLiterals.map(businessPolicy):projection.trusted.policyLiterals);
      const prompt=role==='conversation'?pair[role].systemInstruction.parts[0].text:pair[role].instructions;
      for(const rule of ['7 ngày','15 ngày','chỉ thử trong nhà','7ngày'])assert.ok(!prompt.includes(rule));
      assert.ok(!prompt.includes(snapshot.policy));assert.ok(!prompt.includes(snapshot.eta));
      const body=JSON.stringify(pair[role]);
      for(const label of ['notEstablishedForThisRule','historicalRepositorySource','PREPARATION_ONLY_NOT_FROZEN_FOR_PROVIDER'])assert.ok(!body.includes(label));
    }
    requests.push(pair);
  }
  assert.equal(requests[0].conversation.systemInstruction.parts[0].text,requests[1].conversation.systemInstruction.parts[0].text);
  assert.equal(requests[0].verifier.instructions,requests[1].verifier.instructions);
});

test('unseen products, multiple profiles and unbound source facts survive without SKU/ref-specific overrides',()=>{
  const fixture=structuredClone(a3.cases[0]),trusted=fixture.runtime.trusted;
  const firstRef=trusted.boundSubjects[0].ref;
  trusted.boundSubjects[0].ref='UNSEEN_PRODUCT';
  for(const claim of trusted.protectedClaims)if(claim.scope.productId===firstRef)claim.scope.productId='UNSEEN_PRODUCT';
  for(const profile of trusted.productProfiles)if(profile.subjectRef===firstRef)profile.subjectRef='UNSEEN_PRODUCT';
  trusted.productProfiles.push({...structuredClone(trusted.productProfiles[0]),ref:'profile:second-source'});
  trusted.productProfiles.push({...structuredClone(trusted.productProfiles[0]),ref:'profile:unbound',subjectRef:'NOT_BOUND'});
  trusted.protectedClaims.push({...structuredClone(trusted.protectedClaims[0]),claimId:'unbound-claim',scope:{kind:'PRODUCT',productId:'NOT_BOUND',variantId:null}});
  const projection=projectRuntime(manifest,fixture,'conversation','opaque');
  const display=context(buildPreparedRequest(manifest,'conversation',projection)).trusted;
  assert.equal(profilesOf(display.products.find(p=>p.subject.ref==='UNSEEN_PRODUCT')).length,2);
  assert.deepEqual(display.otherProfiles.map(originalProfile),projection.trusted.productProfiles.filter(p=>p.subjectRef==='NOT_BOUND').map(businessProfile));
  assert.deepEqual(display.otherClaims,projection.trusted.protectedClaims.filter(c=>c.scope.productId==='NOT_BOUND').map(businessClaim));
});

test('code size inputs stay with their product and complete size charts remain available without deriving fit',()=>{
  const fixture=a3.cases.find(c=>c.evaluator.caseId==='r16-pants-color-alternative');
  const projection=projectRuntime(manifest,fixture,'conversation','opaque');
  const products=context(buildPreparedRequest(manifest,'conversation',projection)).trusted.products;
  const pants=profilesOf(products.find(p=>p.subject.ref==='QU714'))[0];
  const shirt=profilesOf(products.find(p=>p.subject.ref==='SM613'))[0];
  assert.deepEqual((pants.codeSizeInput??pants.details.codeSizeInput).missingInputs,['WAIST_CM','HIPS_CM']);
  assert.deepEqual((shirt.codeSizeInput??shirt.details.codeSizeInput).missingInputs,['BUST_CM']);
  assert.deepEqual(pants.details.sizeChart,projection.trusted.productProfiles.find(p=>p.subjectRef==='QU714').details.sizeChart);
  assert.ok(!products.find(p=>p.subject.ref==='QU714').claims.some(c=>c.type==='SIZE_FIT'));
});

test('verifier schema, exact draft, canonical snapshot and generation envelope stay unchanged except instructions',()=>{
  const fixture={runtime:{...a3.cases[0].runtime,finalDraft:'Dạ, chị chọn navy nhé.'}};
  const projection=projectRuntime(manifest,fixture,'verifier','opaque');
  const before=buildRequest(manifest,'verifier',projection),after=buildPreparedRequest(manifest,'verifier',projection);
  const {instructions:oldPrompt,...oldEnvelope}=before,{instructions:newPrompt,...newEnvelope}=after;
  assert.deepEqual(newEnvelope,oldEnvelope);
  assert.equal(JSON.parse(after.input[0].content[0].text).requestIdentity.finalDraftHash,hash(fixture.runtime.finalDraft));
  const changed=structuredClone(fixture);changed.runtime.finalDraft+=' Em đã giữ hàng.';changed.runtime.trusted.state.revision++;changed.runtime.trusted.state.recipient='other-recipient';
  const next=projectRuntime(manifest,changed,'verifier','opaque');
  assert.notEqual(next.requestIdentity.finalDraftHash,projection.requestIdentity.finalDraftHash);
  assert.notEqual(next.requestIdentity.trustedSnapshotId,projection.requestIdentity.trustedSnapshotId);
  assert.equal(next.requestIdentity.stateRevision,changed.runtime.trusted.state.revision);
  assert.equal(next.requestIdentity.recipient,'other-recipient');
});

test('captured preparation bodies exclude evaluator labels and non-allowlisted private state',()=>{
  const marker='PREPARATION_EVALUATOR_ONLY_SENTINEL';
  for(const original of a3.cases){
    const fixture=structuredClone(original);for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
    fixture.regression=marker;fixture.runtime.caseId=marker;
    fixture.runtime.trusted.state.privateCheckout='PRIVATE_SENTINEL';fixture.runtime.trusted.state.caseId=marker;
    fixture.runtime.finalDraft='Dạ, chị nhé.';
    const captured=[];
    for(const role of ['conversation','verifier'])captured.push(buildPreparedRequest(manifest,role,projectRuntime(manifest,fixture,role,'opaque')));
    for(const request of captured){
      const text=JSON.stringify(request);assert.ok(!text.includes(marker));assert.ok(!text.includes('PRIVATE_SENTINEL'));
      for(const label of ['caseId','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric','a3CaseIds'])assert.ok(!text.includes('"'+label+'"'));
      assert.deepEqual(request.tools,[]);
    }
  }
});

test('all historical envelopes fit frozen bounds and oversized preparation fails rather than truncating source',()=>{
  for(const original of a3.cases){
    const fixture=structuredClone(original);fixture.runtime.finalDraft='x'.repeat(manifest.bounds.draftBytes);
    for(const role of ['conversation','verifier']){
      const request=buildPreparedRequest(manifest,role,projectRuntime(manifest,fixture,role,'opaque'));
      assert.ok(Buffer.byteLength(JSON.stringify(request))<=manifest.bounds.totalBytes);
    }
  }
  const projection=projectRuntime(manifest,a3.cases[0],'conversation','opaque');
  projection.untrusted.retrievedText=['x'.repeat(manifest.bounds.totalBytes)];
  assert.throws(()=>buildPreparedRequest(manifest,'conversation',projection),/TOTAL_BOUND/);
});
