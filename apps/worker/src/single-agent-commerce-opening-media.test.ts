import {describe,it,expect,vi} from 'vitest';
import {createCommerceTools} from './single-agent-commerce.js';
import {runCommerceTurn,type VerifierRequest} from './single-agent-commerce-read-only.js';
import {commerceScope,commerceNow,fixtureProduct,fixturePolicy} from './single-agent-commerce.test-support.js';
import {createConversationState} from '@lana/conversation-engine';
import {OPENING_PRODUCT_MEDIA_RULE,type OpeningProductMediaRule} from './single-agent-commerce-opening-media.js';
import type {HandoffAuthority,CommerceHandoffCommit} from './single-agent-commerce-handoff.js';
const rule={version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'} as const;
async function setup(ids=['SM613'],firstContact:boolean|null=true,withImages=true,focus?:string,mediaRule:OpeningProductMediaRule=rule){
 const scope=commerceScope(),fixtures=ids.map(id=>fixtureProduct(id));
 for(const f of fixtures)if(withImages)f.product.images=[{url:`https://content.pancake.vn/${f.product.productId}.jpg`,role:'PRIMARY',angle:'FRONT',imageType:'MODEL',intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:'a'.repeat(64),observedAt:commerceNow.toISOString(),partsVisible:['AO']}];
 const readProduct=vi.fn(async(id:string)=>fixtures.find(f=>f.product.productId===id)!);
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
 for(const call of [{...media,name:'view_product_media'},{...media,args:{...media.args,subjectRef:'SM613'}},{...media,args:{...media.args,color:'red'}},{...media,args:{...media.args,intent:'SIZE_GUIDE'}}])
  expect(s.tools.openingMediaFeasible?.([mutation,call],0)).toBe(false);
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
 const count=s.readProduct.mock.calls.length;const r=await s.run();expect(r.terminal.disposition).toBe('HANDOFF');expect(s.readProduct).toHaveBeenCalledTimes(count);expect(s.verifier).not.toHaveBeenCalled();
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
