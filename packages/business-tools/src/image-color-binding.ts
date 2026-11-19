import type { ProductImage } from './types.js';

/** Reviewed SKU-color evidence, never visual/AI color inference. Preserve corruption. */
export function imageColorBindingFromPayload(p: Record<string, unknown>): ProductImage['colorBinding'] {
 const keys=['image_verified_product_color','image_color_binding_sha256','image_color_binding_status'];
 if(!keys.some(k=>Object.hasOwn(p,k)))return undefined;
 const color=typeof p.image_verified_product_color==='string'?p.image_verified_product_color.trim():'';
 const sha=typeof p.image_color_binding_sha256==='string'?p.image_color_binding_sha256:'';
 if(p.image_color_binding_status!=='VALID'||p.image_metadata_review_status!=='APPROVED'||p.metadata_verified!==true||
  !color||Buffer.byteLength(color)>64||!/^[a-f0-9]{64}$/.test(sha)||sha!==p.image_content_sha256)return {status:'INVALID'};
 return {status:'VALID',color,sha256:sha};
}
