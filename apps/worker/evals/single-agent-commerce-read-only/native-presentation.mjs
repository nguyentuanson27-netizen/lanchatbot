// Evaluation-only explicit selection; no default/provider/prompt change.
import assert from 'node:assert/strict';
export function nativePresentation(args){
 const indices=args.flatMap((v,i)=>v==='--owner-presentation'?[i]:[]);
 assert(indices.length<=1,'OWNER_PRESENTATION_ARGUMENT');
 if(!indices.length)return undefined;
 const value=args[indices[0]+1];
 assert.equal(value,'VI_DATA_BLOCKS_COMPACT_V2','OWNER_PRESENTATION_ARGUMENT');
 return value;
}
export function withNativePresentation(request,presentation){
 if(presentation===undefined)return request;
 assert.equal(presentation,'VI_DATA_BLOCKS_COMPACT_V2','OWNER_PRESENTATION_ARGUMENT');
 assert(request.ownerContextPresentation===undefined||request.ownerContextPresentation===presentation,'OWNER_PRESENTATION_CHANGED');
 return {...request,ownerContextPresentation:presentation};
}
