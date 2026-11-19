// Evaluation-only, owner-authorized assumption. Never publish this metadata.
import assert from 'node:assert/strict';
export const ASSUMPTION={id:'CATALOG_IMAGE_AS_ASSUMED_FEEDBACK_V1',productId:'SV2447',
 url:'https://content.pancake.vn/1/s3000x3000/d9/a1/e3/e9/02be5da5317318f897bfb1d9832209119f6bd9ce6375c86e1732fdf1-w:3689-h:4356-l:748803-t:image/jpeg.jpeg',
 meaning:'Existing public catalog photo is treated as approved customer feedback only inside this isolated evaluation. Not verified customer provenance.'};
export function assumedFeedback(product){
 if(!product||product.productId!==ASSUMPTION.productId)return product;
 const result=structuredClone(product),image=result.images?.find(i=>i.url===ASSUMPTION.url);
 assert(image&&image.reviewStatus==='APPROVED'&&image.metadataVerified===true&&image.sourceContentSha256,'ASSUMED_ASSET_UNAVAILABLE');
 image.feedback=true;
 return result;
}
