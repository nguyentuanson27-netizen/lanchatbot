import {describe,it,expect,vi} from 'vitest';
import {createCommerceTools} from './single-agent-commerce.js';
import {runCommerceTurn,type VerifierRequest} from './single-agent-commerce-read-only.js';
import {commerceScope,commerceNow,fixtureProduct,fixturePolicy} from './single-agent-commerce.test-support.js';
import {createConversationState} from '@lana/conversation-engine';
import {OPENING_PRODUCT_MEDIA_RULE,withOpeningProductMedia,type OpeningProductMediaRule} from './single-agent-commerce-opening-media.js';
import type {HandoffAuthority,CommerceHandoffCommit} from './single-agent-commerce-handoff.js';
const rule={version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'} as const;
async function setup(ids=['SM613'],firstContact:boolean|null=true,withImages=true,focus?:string,mediaRule:OpeningProductMediaRule=rule){
 const scope=commerceScope(),fixtures=ids.map(id=>fixtureProduct(id));
 for(const f of fixtures)if(withImages)f.product.images=[{url:`https://content.pancake.vn/${f.product.productId}.jpg`,role:'PRIMARY',angle:'FRONT',imageType:'MODEL',intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:'a'.repeat(64),observedAt:commerceNow.toISOString(),partsVisible:['AO']}];
 const readProduct=vi.fn(async(id:string,_readPos?:boolean)=>fixtures.find(f=>f.product.productId===id)!);
 const original=(await fixturePolicy()).bundle!;
 const policy={...original,artifacts:{...original.artifacts,handoffMatrix:{schemaVersion:1 as const,kind:'HANDOFF_MATRIX' as const,sourceMetadata:original.artifacts.shopPolicy.sourceMetadata,rules:[{reason:'DEPENDENCY_FAILURE' as const,customerMessagePolicy:'SILENT_HANDOFF' as const,holdingReply:null,tag:'NHAN_VIEN' as const}]}}};
 let authority:HandoffAuthority={...scope,fence:1,stateVersion:scope.revision,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:'APP',now:commerceNow}),revision:scope.revision}};
 const commit=vi.fn(async(change:CommerceHandoffCommit)=>{authority=structuredClone(change.next);return true;});
 const tools=await createCommerceTools({openingMediaRule:mediaRule,read:{scope,clock:()=>commerceNow,entry:{firstContact,fromAd:false},...(focus?{state:()=>({...scope,currentProductId:focus,factSnapshotVersion:""})}:{}),initialProducts:fixtures.map(f=>f.product),policy:fixturePolicy,catalog:{readProduct,searchText:async(query:string)=>{const f=fixtures.find(f=>f.product.productId===query);return f?{status:'MATCHED' as const,matchKind:'EXACT_CODE' as const,product:f.product,score:1,gap:null}:{status:'NOT_FOUND' as const,reasonCode:'NO_CANDIDATES' as const};}}},media:{allowedHostSuffixes:['pancake.vn']},handoff:{read:async()=>structuredClone(authority),commit,policy:async()=>policy}} as Parameters<typeof createCommerceTools>[0]);
 const verifier=vi.fn(async(_request:VerifierRequest)=>({result:{verdict:'PASS',violations:[]}}));
 const run=(text='Dạ chị.')=>runCommerceTurn({scope,tools,clock:()=>commerceNow,latest:'Mẫu này nhé em.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>({kind:'FINAL',text}),verifier});
 return {scope,tools,fixtures,readProduct,verifier,run,commit,authority:()=>authority,transferToHuman:()=>{authority={...authority,stateVersion:authority.stateVersion+1,state:{...authority.state,revision:authority.stateVersion+1,conversationOwner:"HUMAN"}};}};
}
describe('code-owned opening product photos',()=>{
 it.each(['Dạ chị.','Shop không hẹn sáng mai chị nhé.','Áo 499.000đ chị nhé.'])('prepares photo before verification for opening FINAL: %s',async text=>{
  const s=await setup();s.verifier.mockImplementation(async r=>{expect(r.trusted.protectedClaims.some(c=>(c as {type?:string})?.type==='PRODUCT_MEDIA')).toBe(true);return {result:{verdict:'PASS',violations:[]}};});
  const r=await s.run(text);expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.tools.mediaSelection?.()).toHaveLength(1);expect(r.normalToolCalls).toBe(2);expect(r.ownerGenerations).toBe(1);expect(r.verifierGenerations).toBe(1);
 });
 it('missing photo silently hands off and never verifies or sends a bare reply',async()=>{
  const s=await setup(['SM613'],true,false),r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');expect(r.terminal.text).toBeNull();expect(s.verifier).not.toHaveBeenCalled();expect(s.authority().state.conversationOwner).toBe('HUMAN');
 });
 it('covers both admitted products despite an initial focus, with one photo each',async()=>{
  const s=await setup(['SM613','P2'],true,true,'SM613');const r=await s.run();expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(new Set(s.tools.mediaSelection?.().map(i=>i.productId))).toEqual(new Set(['SM613','P2']));expect(r.normalToolCalls).toBe(3);
 });
 it('returning reply does not force photos or add media work',async()=>{
  const s=await setup(['SM613'],false,false),r=await s.run();expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.tools.mediaSelection?.()).toEqual([]);expect(r.normalToolCalls).toBe(1);
 });
 it('unknown history fails closed for an identified product',async()=>{
  const s=await setup(['SM613'],null),r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');expect(s.verifier).not.toHaveBeenCalled();expect(s.tools.mediaSelection?.()).toEqual([]);
 });
});

it('prepays missing mandatory photos before exposing actual owner call capacity',async()=>{
 const s=await setup(['SM613'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);let turn=0,remaining:number|undefined;
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Áo này giá bao nhiêu em?',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',
  owner:async request=>{if(++turn===1){remaining=request.toolBudget.callsRemaining;
   const calls=Array.from({length:request.toolBudget.callsRemaining},()=>({name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}}));
   return {kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}};
  }return {kind:'FINAL',text:'Dạ chị.'};},verifier:s.verifier});
 expect(remaining).toBe(4);expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(r.normalToolCalls).toBe(6);expect(s.tools.mediaSelection?.()).toHaveLength(1);
});

it('rejects a batch exceeding prepaid photo capacity before any tool effects',async()=>{
 const s=await setup(['SM613'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE),invoke=vi.spyOn(s.tools,'invokeBatch');const calls=Array.from({length:5},()=>({name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}}));
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Mẫu này nhé.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}}),verifier:s.verifier});
 expect(['HANDOFF','NO_SEND']).toContain(r.terminal.disposition);expect(invoke).not.toHaveBeenCalled();expect(r.rejectedToolCalls).toBe(5);expect(s.verifier).not.toHaveBeenCalled();
});

it('V2 does not turn ambiguous admitted candidates into mandatory image targets',async()=>{
 const s=await setup(['SM613','P2'],true,false,'SM613',OPENING_PRODUCT_MEDIA_RULE),r=await s.run('Chị hỏi áo hay cả set ạ?');
 expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.tools.mediaSelection?.()).toEqual([]);expect(r.openingMediaWork?.status).toBe('NOT_REQUIRED');expect(s.verifier).toHaveBeenCalledOnce();
});

it.each(['add_to_cart','change_cart_item'])('V2 rejects predictable new cart media beyond remaining work before %s effects',async name=>{
 const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
 s.tools.availableTools=[...s.tools.availableTools!,name];const invoke=vi.spyOn(s.tools,'invokeBatch');
 const args=name==='add_to_cart'?{subjectRef:'P2',offerType:'DIRECT',size:'M',color:'navy'}:{subjectRef:'line',action:'REPLACE_LINE',targetSubjectRef:'P2',offerType:'DIRECT',size:'M',color:'navy'};
 const calls=[{name,args},...Array.from({length:3},()=>({name:'read_product',args:{subjectRef:'SM613',offerType:'DIRECT'}}))];
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Lấy áo P2 nhé.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}}),verifier:s.verifier});
 expect(r.recovery?.originalReason).toBe('OPENING_MEDIA_BUDGET');expect(invoke).not.toHaveBeenCalled();expect(s.verifier).not.toHaveBeenCalled();expect(r.normalToolCalls).toBe(2);
});

it('V2 FINAL cannot rescue invalidated coverage with another lookup',async()=>{
 const s=await setup(['SM613'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE),prepare=vi.spyOn(s.tools,'prepareOpeningMedia');
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Áo này nhé.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>{s.tools.openingMediaReady=()=>false;return {kind:'FINAL',text:'Dạ chị.'};},verifier:s.verifier});
 expect(prepare).toHaveBeenCalledOnce();expect(r.openingMediaWork?.reason).toBe('OPENING_MEDIA_INVALIDATED');expect(s.verifier).not.toHaveBeenCalled();
});

it.each([null,undefined])('V2 does not credit a current photo to an unresolved REPLACE colour %s',async color=>{
 const s=await setup(['SM613'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
 await s.tools.prepareOpeningMedia!({maxCalls:6,onDispatch:()=>{}});
 const calls=[{name:'change_cart_item',args:{subjectRef:'line',action:'REPLACE_LINE',targetSubjectRef:'SM613',offerType:'OTHER',...(color===undefined?{}:{color})}}];
 expect(s.tools.openingMediaReady?.(s.tools.snapshot())).toBe(true);
 expect(s.tools.openingMediaFeasible?.(calls,0)).toBe(false);
 expect(s.tools.openingMediaFeasible?.(calls,1)).toBe(true);
});

it('V2 admits a matching prepaid photo in the same cart batch, without crediting other media work',async()=>{
 const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
 const mutation={name:'add_to_cart',args:{subjectRef:'P2',offerType:'DIRECT',size:'M',color:'navy'}};
 const media={name:'select_product_media',args:{subjectRef:'P2',intent:'GENERIC',color:'navy'}};
 expect(s.tools.openingMediaFeasible?.([mutation,media],0)).toBe(true);
 for(const call of [{...media,name:'view_product_media'},{...media,args:{...media.args,subjectRef:'SM613'}},{...media,args:{...media.args,color:'red'}},{...media,args:{...media.args,intent:'SIZE_GUIDE'}},
  {...media,args:{...media.args,unexpected:true}},{...media,args:{...media.args,componentRole:'OTHER'}},{...media,args:{...media.args,componentRole:['TOP']}},{...media,args:{...media.args,color:'x'.repeat(65)}}])
  expect(s.tools.openingMediaFeasible?.([mutation,call],0)).toBe(false);
});

it('malformed prepaid media cannot admit an otherwise infeasible mutation batch',async()=>{
 const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
 s.tools.availableTools=[...s.tools.availableTools!,'add_to_cart'];const invoke=vi.spyOn(s.tools,'invokeBatch');
 const calls=[{name:'add_to_cart',args:{subjectRef:'P2',offerType:'DIRECT',size:'M',color:'navy'}},
  {name:'select_product_media',args:{subjectRef:'P2',intent:'GENERIC',color:'navy',unexpected:true}},
  ...Array.from({length:2},()=>({name:'read_product',args:{subjectRef:'P2',offerType:'DIRECT'}}))];
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Lấy áo P2 nhé.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}}),verifier:s.verifier});
 expect(r.recovery?.originalReason).toBe('OPENING_MEDIA_BUDGET');expect(invoke).not.toHaveBeenCalled();expect(r.normalToolCalls).toBe(2);expect(s.verifier).not.toHaveBeenCalled();
});

it.each([rule,OPENING_PRODUCT_MEDIA_RULE])('unlabelled cart proof cannot erase a retained physical colour constraint: $version',async mediaRule=>{
 const s=await setup();await s.tools.invoke({name:'select_product_media',args:{subjectRef:'SM613',intent:'GENERIC'}});
 const context=s.tools.snapshot();context.state.cartItems=[{productRef:'SM613',components:[{color:'__NO_COLOR__',size:'M'}]}];
 context.policyLiterals.push({ref:'media-lookup:physical',text:JSON.stringify({productId:'SM613',color:'red'}),sourceVersion:'v1',observedAt:commerceNow.toISOString(),expiresAt:null});
 const tools=withOpeningProductMedia({...s.tools,snapshot:()=>context,unlabelledCartProducts:()=>['SM613']},{rule:mediaRule,scope:s.scope,clock:()=>commerceNow,firstContact:true});
 expect(tools.openingMediaReady?.(context)).toBe(false);
 expect(await tools.prepareOpeningMedia!({maxCalls:6,onDispatch:()=>{}})).toMatchObject({status:'UNAVAILABLE',reason:'OPENING_MEDIA_COLOR_SCOPE',chargedUnits:0});
});

it('V2 uses current physical cart colour after a prior read, while V1 retains its original strict union',async()=>{
 const s=await setup();await s.tools.invoke({name:'select_product_media',args:{subjectRef:'SM613',intent:'GENERIC',color:'navy'}});
 const context=s.tools.snapshot();context.state.cartItems=[{productRef:'SM613',components:[{color:'navy',size:'M'}]}];
 context.policyLiterals.push({ref:'read:old',text:JSON.stringify({productId:'SM613',color:'red'}),sourceVersion:'v1',observedAt:commerceNow.toISOString(),expiresAt:null});
 for(const mediaRule of [rule,OPENING_PRODUCT_MEDIA_RULE]){
  const tools=withOpeningProductMedia({...s.tools,snapshot:()=>context},{rule:mediaRule,scope:s.scope,clock:()=>commerceNow,firstContact:true});
  expect(tools.openingMediaReady?.(context)).toBe(mediaRule===OPENING_PRODUCT_MEDIA_RULE);
 }
});


it('reuses an existing eligible selected product photo without repeating selection',async()=>{
 const s=await setup();await s.tools.invoke({name:'select_product_media',args:{subjectRef:'SM613',intent:'GENERIC'}});
 const r=await s.run();expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(r.normalToolCalls).toBe(1);expect(s.tools.mediaSelection?.()).toHaveLength(1);
});
it('does not accept a chart-only asset as an opening product photo',async()=>{
 const s=await setup();s.fixtures[0]!.product.images[0]!.imageType='SIZE_GUIDE';const r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');expect(s.verifier).not.toHaveBeenCalled();
});
it('does not retry a failed colour lookup as generic opening media',async()=>{
 const s=await setup();await s.tools.invoke({name:'select_product_media',args:{subjectRef:'SM613',intent:'GENERIC',color:'red'}});
 const mediaReads=s.readProduct.mock.calls.filter(c=>c[1]===false).length;
 const r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');
 expect(s.readProduct.mock.calls.filter(c=>c[1]===false)).toHaveLength(mediaReads);expect(s.verifier).not.toHaveBeenCalled();
});
it('four missing photos cannot exceed the six primitive budget',async()=>{
 const s=await setup(['P1','P2','P3','P4']);const r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');expect(r.normalToolCalls).toBe(4);expect(s.tools.mediaSelection?.()).toEqual([]);expect(s.verifier).not.toHaveBeenCalled();
});
it('first-opening add plus confirm is fenced before any batch effects',async()=>{
 const s=await setup();const invoke=vi.spyOn(s.tools,'invokeBatch');const calls=[{name:'add_to_cart',args:{subjectRef:'SM613',offerType:'DIRECT',color:'navy',size:'M'}},{name:'confirm_purchase',args:{}}];
 // These configured names expose the same native batch surface as a composed executor.
 s.tools.availableTools=[...s.tools.availableTools!,'add_to_cart','confirm_purchase'];
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Chị lấy áo này, chốt luôn nhé.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>({kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}}),verifier:s.verifier});
 expect(r.terminal.disposition).toBe('HANDOFF');expect(invoke).not.toHaveBeenCalled();expect(s.verifier).not.toHaveBeenCalled();
});
it('authority transfer during photo preparation prevents verification and reply',async()=>{
 const s=await setup();s.readProduct.mockImplementation(async id=>{if(s.readProduct.mock.calls.length===2)s.transferToHuman();return s.fixtures.find(f=>f.product.productId===id)!;});
 const r=await s.run();expect(r.terminal.disposition).toBe('NO_SEND');expect(s.verifier).not.toHaveBeenCalled();
});
it('media invalidation after verification cannot authorize a changed image snapshot',async()=>{
 const s=await setup();s.verifier.mockImplementation(async()=>{s.fixtures[0]!.product.images=[];return {result:{verdict:'PASS',violations:[]}};});
 const r=await s.run();expect(r.terminal.disposition).not.toBe('SEND_ELIGIBLE');expect(r.terminal.text).toBeNull();expect(s.verifier).toHaveBeenCalledOnce();
});

it.each(['',' '.repeat(2),'x'.repeat(4097)])('invalid FINAL never starts opening-media I/O',async text=>{
 const s=await setup();const prepare=vi.spyOn(s.tools,'prepareOpeningMedia');const r=await s.run(text);
 expect(r.terminal.disposition).not.toBe('SEND_ELIGIBLE');expect(prepare).not.toHaveBeenCalled();expect(s.verifier).not.toHaveBeenCalled();
});
it('newly read product joins the opening required set even when focus stays on the first product',async()=>{
 const s=await setup(['SM613']);const next=fixtureProduct('P2');next.product.images=structuredClone(s.fixtures[0]!.product.images);
 s.fixtures.push(next);let n=0;const call={name:'search_products',args:{productCode:'P2'}};
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Xem thêm P2 nhé em.',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>++n===1?{kind:'TOOLS',calls:[call],content:{role:'model',parts:[{functionCall:call}]}}:{kind:'FINAL',text:'Dạ chị.'},verifier:s.verifier});
 expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(new Set(s.tools.mediaSelection?.().map(i=>i.productId))).toEqual(new Set(['SM613','P2']));
});

it('image cap preserves four existing selections instead of dropping them for another product',async()=>{
 const s=await setup(['SM613','P2']);const image=s.fixtures[0]!.product.images[0]!;
 s.fixtures[0]!.product.images=Array.from({length:4},(_,n)=>({...image,url:`https://content.pancake.vn/photo-${n}.jpg`,sortOrder:n,feedback:true}));
 await s.tools.invoke({name:'select_product_media',args:{subjectRef:'SM613',intent:'FEEDBACK'}});expect(s.tools.mediaSelection?.()).toHaveLength(4);
 const r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');expect(s.tools.mediaSelection?.()).toHaveLength(4);expect(s.verifier).not.toHaveBeenCalled();
});


it('reserves replacement loss before any batch write and does not credit selections cleared later in the batch',async()=>{
 const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
 await s.tools.prepare!();
 const t=withOpeningProductMedia({...s.tools,openingQuoteTargets:()=>['SM613','P2']},{rule:OPENING_PRODUCT_MEDIA_RULE,scope:s.scope,clock:()=>commerceNow,firstContact:true});
 expect((await t.prepareOpeningMedia!({maxCalls:6,onDispatch:()=>{}})).status).toBe('READY');
 const select=(subjectRef:string,deliveryMode='REPLACE')=>({name:'select_product_media',args:{subjectRef,intent:'GENERIC',deliveryMode}});
 expect(t.openingMediaFeasible?.([select('P2')],0)).toBe(false);
 expect(t.openingMediaFeasible?.([select('P2')],1)).toBe(true);
 expect(t.openingMediaFeasible?.([select('SM613'),select('P2')],0)).toBe(false);
 expect(t.openingMediaFeasible?.([select('SM613'),select('P2','APPEND')],0)).toBe(true);
});

// Owner decision 2026-11-13 (PR 392 case P09): a first reply that prices two products read with read_product
// carries a photo of each. An addition only: it never holds a reply back.
describe('photos for two priced reads on a first contact',()=>{
 const read=(subjectRef:string,extra:Record<string,unknown>={offerType:'DIRECT'})=>({name:'read_product',args:{subjectRef,...extra}});
 async function turn(s:Awaited<ReturnType<typeof setup>>,calls:{name:string;args:unknown}[]){
  const outputs=[{kind:'TOOLS' as const,calls,content:{role:'model' as const,parts:calls.map(functionCall=>({functionCall}))}},{kind:'FINAL' as const,text:'Dạ, chị thích mẫu nào hơn ạ?'}];
  return runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Hai mẫu này còn size M không em?',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',owner:async()=>outputs.shift()!,verifier:s.verifier});
 }
 // Measured on the N=5 run of 13 November: added before the owner's next step, the two photos took the last units
 // of the turn, and an owner that still needed one read (care policy, the other offer) handed off instead.
 it('leaves the owner its work: the photos come only from what is unused once the reply is written',async()=>{
  const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE),budgets:number[]=[];
  const rounds=[[read('SM613'),read('P2')],[{name:'read_policy',args:{}}]];
  const outputs=[...rounds.map(calls=>({kind:'TOOLS' as const,calls,content:{role:'model' as const,parts:calls.map(functionCall=>({functionCall}))}})),{kind:'FINAL' as const,text:'Dạ, áo giặt tay chị nhé.'}];
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:'Áo này giặt máy được không em?',history:[],ownerPrompt:'Tư vấn',verifierPrompt:'Kiểm',
   owner:async request=>{budgets.push(request.toolBudget!.callsRemaining);return outputs.shift()!;},verifier:s.verifier});
  // After the two reads the owner still has two units, and uses one for the policy.
  expect(budgets).toEqual([4,2,1]);expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(r.recovery??null).toBeNull();
  // One unit is left at the end: not enough for both photos, so none is taken.
  expect(s.tools.mediaSelection!()).toEqual([]);expect(r.normalToolCalls).toBe(5);
 });
 it('adds one photo of each product after the reply is written and before it is verified',async()=>{
  const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
  s.verifier.mockImplementation(async r=>{expect(r.trusted.protectedClaims.filter(c=>(c as {type?:string})?.type==='PRODUCT_MEDIA')).toHaveLength(2);return {result:{verdict:'PASS',violations:[]}};});
  const r=await turn(s,[read('SM613'),read('P2')]);
  expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.verifier).toHaveBeenCalledOnce();
  expect(s.tools.mediaSelection!().map(a=>a.productId).sort()).toEqual(['P2','SM613']);
  // Two prepared products, two reads, two photos: exactly the six units of a turn.
  expect(r.normalToolCalls).toBe(6);expect(r.openingMediaWork).toMatchObject({status:'READY',requiredProducts:['P2','SM613'],chargedUnits:2});
 });
 it.each([['one product read',['SM613','P2'],[read('SM613')]],['three products read',['SM613','P2','P3'],[read('SM613'),read('P2'),read('P3')]],
  ['reads that carry no price',['SM613','P2'],[read('SM613',{detailsOnly:true}),read('P2',{detailsOnly:true})]]] as const)('leaves the rule as it was for %s',async(_name,ids,calls)=>{
  const s=await setup([...ids],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE),r=await turn(s,[...calls]);
  expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.tools.mediaSelection!()).toEqual([]);expect(r.openingMediaWork?.status).toBe('NOT_REQUIRED');
  expect(r.normalToolCalls).toBe(ids.length+calls.length);
 });
 it('adds nothing for a returning customer',async()=>{
  const s=await setup(['SM613','P2'],false,true,undefined,OPENING_PRODUCT_MEDIA_RULE),r=await turn(s,[read('SM613'),read('P2')]);
  expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.tools.mediaSelection!()).toEqual([]);expect(r.normalToolCalls).toBe(4);
 });
 it('still sends the reply when the work left does not cover both photos, and spends nothing on one',async()=>{
  const s=await setup(['SM613','P2'],true,true,undefined,OPENING_PRODUCT_MEDIA_RULE);
  const r=await turn(s,[read('SM613'),read('P2'),{name:'read_policy',args:{}}]);
  expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.tools.mediaSelection!()).toEqual([]);expect(r.normalToolCalls).toBe(5);
 });
 it('still sends the reply when the source has no photo, and does not look again',async()=>{
  const s=await setup(['SM613','P2'],true,false,undefined,OPENING_PRODUCT_MEDIA_RULE),r=await turn(s,[read('SM613'),read('P2')]);
  expect(r.terminal.disposition).toBe('SEND_ELIGIBLE');expect(s.verifier).toHaveBeenCalledOnce();expect(s.tools.mediaSelection!()).toEqual([]);
  expect(r.normalToolCalls).toBe(6);expect(r.recovery??null).toBeNull();
 });
});
