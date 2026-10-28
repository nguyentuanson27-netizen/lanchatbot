import type { CommerceHandoffSourceCheckV1 } from "@lana/contracts";
import type { CommerceHandoffDeliveryBinding } from "./single-agent-commerce-handoff-delivery.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { toolArgs } from "./single-agent-commerce-read-only-tools.js";
import type { CartSelectionQuery } from "./realtime-sales-catalog.js";

/** Bounded re-read of the exact existing commerce ports. No model, search or effect execution. */
export function createCommerceHandoffSourceReader(input:{
  product:(id:string,readPos:boolean,binding:CommerceHandoffDeliveryBinding)=>Promise<unknown>;
  profile:(binding:CommerceHandoffDeliveryBinding)=>Promise<unknown>;
  size:(id:string,binding:CommerceHandoffDeliveryBinding)=>Promise<unknown>;
  selection:(query:CartSelectionQuery,binding:CommerceHandoffDeliveryBinding)=>Promise<unknown>;
  receipt:(id:string,binding:CommerceHandoffDeliveryBinding)=>Promise<unknown>;
  salesState:(binding:CommerceHandoffDeliveryBinding)=>Promise<unknown>;
}){
  return async(source:CommerceHandoffSourceCheckV1,binding:CommerceHandoffDeliveryBinding)=>{
    const raw:unknown=JSON.parse(source.queryJson),id=(v:unknown):v is string=>typeof v==="string"&&v.length>0&&v.length<=128;
    let value:unknown;
    switch(source.kind){
      case "PRODUCT":{const q=toolArgs(raw,["productId","readPos"]);if(!q||!id(q.productId)||typeof q.readPos!=="boolean")throw Error("HANDOFF_SOURCE_QUERY");value=await input.product(q.productId,q.readPos,binding);break;}
      case "PROFILE":if(!toolArgs(raw,[]))throw Error("HANDOFF_SOURCE_QUERY");value=await input.profile(binding);break;
      case "SALES_STATE":if(!toolArgs(raw,[]))throw Error("HANDOFF_SOURCE_QUERY");value=await input.salesState(binding);break;
      case "SIZE_SOURCE":{const q=toolArgs(raw,["subjectRef"]);if(!q||!id(q.subjectRef))throw Error("HANDOFF_SOURCE_QUERY");value=await input.size(q.subjectRef,binding);break;}
      case "RECEIPT":{const q=toolArgs(raw,["operationId"]);if(!q||!id(q.operationId))throw Error("HANDOFF_SOURCE_QUERY");value=await input.receipt(q.operationId,binding);break;}
      case "CART_SELECTION":{
        const q=toolArgs(raw,["shopAlias","productId","offerType","size","color","quantity","lineId","deliveryAddress"]);
        if(!q||!id(q.shopAlias)||!id(q.productId)||!id(q.lineId)||!Number.isInteger(q.quantity)||Number(q.quantity)<1||Number(q.quantity)>20||
          ["offerType","size","color"].some(k=>q[k]!==null&&!id(q[k]))||
          q.deliveryAddress!==undefined&&q.deliveryAddress!==null&&(typeof q.deliveryAddress!=="string"||q.deliveryAddress.length>1024))throw Error("HANDOFF_SOURCE_QUERY");
        value=await input.selection(q as unknown as CartSelectionQuery,binding);break;
      }
      default:throw Error("HANDOFF_SOURCE_KIND");
    }
    return commerceHash(value);
  };
}
