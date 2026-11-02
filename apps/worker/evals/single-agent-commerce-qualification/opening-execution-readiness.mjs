// Prospective prerequisites only. Actual candidate composition, no provider/effects/send.
import assert from 'node:assert/strict';
import {CartV1Schema} from '@lana/contracts';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {createCommerceTools} from '../../dist/single-agent-commerce.js';
import {prepareCheckoutMedia} from '../../dist/single-agent-commerce-checkout-media.js';
import {cartSelectionFromSnapshot} from '../../dist/realtime-sales-catalog.js';
import {OPENING_PRODUCT_MEDIA_RULE} from '../../dist/single-agent-commerce-opening-media.js';
const hosts=['content.pancake.vn','lanadesign.vn','fbcdn.net','fbsbx.com'];
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export async function openingExecutionReadiness(world,paths,at){
 assert(Array.isArray(paths)&&paths.length>0&&paths.length<=16,'C_EXECUTION_PATHS');
 const scope={...world.config.scope,conversationId:uuid(1),customerHash:'readiness-only',requestId:uuid(2),sourceMessageId:uuid(3),sourceObservedAt:at.toISOString(),
  revision:1,recipient:'readiness-only',bindingVersion:'readiness-only',conversationOwner:'BOT',permission:true,privacyAllowed:true};
 const resolver=new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(world.policyRecords??[])},{enabled:true,publishedEnabled:world.config.channel==='PUBLISHED'});
 const read={scope,clock:()=>at,maxFactAgeSeconds:world.config.maxFactAgeSeconds,productGroups:world.config.productGroups,
  policy:()=>resolver.resolve({pageId:scope.pageId,channel:world.config.channel,now:at}),catalog:{
   readProduct:async id=>{const p=world.products.find(p=>p.productId===id);assert(p,'C_EXECUTION_SOURCE');return {product:structuredClone(p),snapshot:structuredClone(world.snapshots[id])};},
   searchText:async()=>{throw Error('C_EXECUTION_SEARCH_NOT_REGISTERED');}}};
 const results=[];
 for(const path of paths){
  assert(path&&['POST_CART','DISCOVERY'].includes(path.kind)&&Object.keys(path).every(k=>['kind','selections','productIds'].includes(k)),'C_EXECUTION_PATH');
  let units=0;const control={get maxCalls(){return 6-units;},onDispatch(){assert(units<6,'C_EXECUTION_BUDGET');units++;}};
  try{
   if(path.kind==='POST_CART'){
    assert(Array.isArray(path.selections)&&path.selections.length>0&&path.selections.length<=4&&!path.productIds,'C_EXECUTION_CART');
    const lines=path.selections.map((q,i)=>{
     assert(q.facet==='SELECTION'&&typeof q.productId==='string'&&typeof q.offerType==='string','C_EXECUTION_SELECTION');
     const s=cartSelectionFromSnapshot(world.snapshots[q.productId],{selectionMode:'CANDIDATE_TUPLES',shopAlias:scope.shopAlias,productId:q.productId,offerType:q.offerType,
      size:q.size??null,color:q.color??null,quantity:1,lineId:uuid(i+10),selectionMaxAgeSeconds:read.maxFactAgeSeconds??1200},at);
     assert(s.status==='READY','C_EXECUTION_SELECTION_UNAVAILABLE');
     return {...s.line,priceAuthority:{...s.line.priceAuthority,shopId:scope.shopId}};
    });
    // An unsent prerequisite cart with real source lines; shipping has not been quoted.
    const cart=CartV1Schema.parse({schemaVersion:1,cartId:uuid(4),salesEpisodeId:uuid(5),customerProfileId:uuid(6),revision:1,currency:'VND',status:'OPEN',
     checkoutEligibility:'BLOCKED_MISSING_SHIPPING_FEE',lines,adjustments:[],shippingFeeVnd:null,subtotalVnd:lines.reduce((n,l)=>n+l.lineTotalVnd,0),discountTotalVnd:0,grandTotalVnd:null,createdAt:at.toISOString(),updatedAt:at.toISOString()});
    const media=await prepareCheckoutMedia({cart,scope,clock:()=>at,firstContact:true,control,read,media:{allowedHostSuffixes:hosts}});
    assert(media.images.length>0,'C_EXECUTION_MEDIA');
   }else{
    assert(Array.isArray(path.productIds)&&path.productIds.length>0&&path.productIds.length<=4&&new Set(path.productIds).size===path.productIds.length&&!path.selections,'C_EXECUTION_DISCOVERY');
    const products=path.productIds.map(id=>world.products.find(p=>p.productId===id));assert(products.every(Boolean),'C_EXECUTION_SOURCE');
    const tools=await createCommerceTools({read:{...read,initialProducts:products,entry:{firstContact:true,fromAd:false}},media:{allowedHostSuffixes:hosts},openingMediaRule:OPENING_PRODUCT_MEDIA_RULE});
    const work=await tools.prepareOpeningMedia(control);assert(work.status==='READY','C_EXECUTION_MEDIA');
    assert.equal(tools.openingMediaReady(await tools.readback(),tools.mediaSelection()),true);
   }
   results.push({path:structuredClone(path),status:'AVAILABLE',chargedUnits:units,reason:null});
  }catch{results.push({path:structuredClone(path),status:'FAILED',chargedUnits:units,reason:'EXECUTION_PREREQUISITE_UNAVAILABLE'});}
 }
 return results;
}
