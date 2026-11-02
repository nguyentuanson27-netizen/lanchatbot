import type {CartV1,ProtectedClaimV1} from '@lana/contracts';
import {normalizeCatalogToken} from '@lana/business-tools';
import {createCommerceTools} from './single-agent-commerce.js';
import type {CommerceTools} from './single-agent-commerce-read-only.js';
import type {CommerceScope,PreparationControl} from './single-agent-commerce-read-only-tools.js';
import type {CommerceMediaAsset} from './single-agent-commerce-media.js';
import {OPENING_PRODUCT_MEDIA_RULE} from './single-agent-commerce-opening-media.js';
import {commerceHash} from './single-agent-commerce-read-only-context.js';
export interface CheckoutMedia {images:CommerceMediaAsset[];claims:ProtectedClaimV1[]}
/** Native checkout only. No private input, model, parser, effect or independent budget. */
export async function prepareCheckoutMedia(input:{cart:CartV1;scope:CommerceScope;clock:()=>Date;firstContact:boolean|null;
 tools?:CommerceTools;control:PreparationControl;read:Parameters<typeof createCommerceTools>[0]['read'];media:NonNullable<Parameters<typeof createCommerceTools>[0]['media']>}):Promise<CheckoutMedia>{
 if(input.firstContact===false)return {images:[],claims:[]};
 if(input.firstContact!==true)throw Error('CHECKOUT_HISTORY_UNKNOWN');
 const items=input.cart.lines.map(l=>({subjectRef:l.lineId,productRef:l.parentProductId,components:l.components.map(c=>({componentRole:c.componentRole,size:c.size,color:c.color}))}));
 const ids=[...new Set(items.map(i=>i.productRef))];if(!ids.length||ids.length>4)throw Error('CHECKOUT_MEDIA_PRODUCTS');
 let tools=input.tools;
 if(!tools){
  if(input.control.maxCalls<ids.length*2)throw Error('CHECKOUT_MEDIA_BUDGET');
  const products=[];
  for(const id of ids){input.control.onDispatch();const source=await input.read.catalog.readProduct(id,false);
   if(source.product.productId!==id)throw Error('CHECKOUT_MEDIA_PRODUCT_SCOPE');products.push(source.product);}
  tools=await createCommerceTools({openingMediaRule:OPENING_PRODUCT_MEDIA_RULE,read:{...input.read,initialProducts:products,
   state:()=>({...input.scope,currentProductId:ids.length===1?ids[0]!:null,factSnapshotVersion:'',cartItems:items}),entry:{firstContact:true,fromAd:false}},media:input.media});
 }
 const work=await tools.prepareOpeningMedia?.(input.control);if(!work||work.status==='UNAVAILABLE')throw Error('CHECKOUT_MEDIA_UNAVAILABLE');
 const world=await tools.readback(),images=[...new Map((tools.mediaSelection?.()??[]).map(a=>[commerceHash([a.productId,a.url]),a])).values()];
 const canonical=(components:typeof items[number]['components'])=>components.map(c=>({...c,color:c.color?normalizeCatalogToken(c.color):null,size:c.size?normalizeCatalogToken(c.size):null}));
 const cartItems=world.state.cartItems;
 if(!Array.isArray(cartItems)||!items.every(i=>cartItems.some((v:typeof i)=>v.subjectRef===i.subjectRef&&v.productRef===i.productRef&&
  Array.isArray(v.components)&&commerceHash(canonical(v.components))===commerceHash(canonical(i.components))))||tools.openingMediaReady?.(world,images)!==true||images.length>4)throw Error('CHECKOUT_MEDIA_SCOPE');
 return {images,claims:(world.protectedClaims as ProtectedClaimV1[]).filter(c=>c.type==='PRODUCT_MEDIA')};
}
