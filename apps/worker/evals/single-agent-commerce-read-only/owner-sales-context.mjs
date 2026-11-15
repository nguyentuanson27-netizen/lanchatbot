import {createHash} from 'node:crypto';
import {readCompactSections} from './owner-data-presentation.mjs';
import {compactOwnerProducts} from './owner-product-tables.mjs';
import {presentVerifiedOfferTerms} from './owner-offer-terms.mjs';

export const SALES_ATTRIBUTE_FIELDS=Object.freeze(['materials','materialComponents','colors','styles','silhouettes','occasions',
 'designAttributes','careInstructions','wearProperties','backCoverage','designComplexity']);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rawLabel='Mô tả nguồn nguyên văn';
const traitsLabel='Đặc điểm ghi trong nguồn';

/** Owner-only layout of existing data. Source language and negative/unknown values stay in this request. */
export function presentSalesContext(original,sources,claims){
 const sections=readCompactSections(original.contents[0]);
 if(sections.some(s=>s.label===rawLabel))return original;
 const wire=structuredClone(original),raw=new Map(),traits=[];
 function project(product,header=false){
  if(!product||typeof product.subjectRef!=='string')return product;
  // The current trusted header is built from sources in this request. Historical tool results must prove their own provenance.
  if(!header&&!product.content?.metadata)return product;
  const matches=sources.filter(s=>s.subjectRef===product.subjectRef&&
   typeof s.content?.metadata?.sourceVersion==='string'&&s.content?.description===product.content?.description&&
   (header||JSON.stringify(s.content.metadata)===JSON.stringify(product.content.metadata)));
  if(matches.length!==1)return product;
  const source=matches[0],metadata=source.content.metadata;
  const matchingAttributes=header||JSON.stringify(source.attributes?.metadata)===JSON.stringify(product.attributes?.metadata);
  const attributes=Object.fromEntries(SALES_ATTRIBUTE_FIELDS.filter(k=>matchingAttributes&&Object.hasOwn(source.attributes??{},k)&&
   JSON.stringify(source.attributes[k])===JSON.stringify(product.attributes?.[k])).map(k=>[k,product.attributes[k]]));
  if(Object.keys(attributes).length&&!traits.some(t=>t.subjectRef===product.subjectRef&&digest(t.attributes)===digest(attributes)))
   traits.push({subjectRef:product.subjectRef,attributes,sourceVersion:source.attributes?.metadata?.sourceVersion??metadata.sourceVersion});
  if(typeof product.content?.description!=='string')return product;
  const scope={productId:product.subjectRef,offerType:product.offerType??null,componentRole:product.componentRole??null};
  const ref='source-description:'+digest({scope,metadata,description:product.content.description});
  raw.set(ref,{ref,scope,sourceVersion:metadata.sourceVersion,metadata:structuredClone(metadata),description:product.content.description});
  const {description,...content}=product.content;
  return {...product,content:{...content,sourceDescriptionRef:ref}};
 }
 const products=sections.find(s=>s.label==='Sản phẩm');
 if(products&&Array.isArray(products.value))products.value=compactOwnerProducts(products.value.map(p=>project(p,true)));
 // Only the source-content fields of tool responses are projected. Signed model call parts remain byte-identical.
 for(const message of wire.contents.slice(1))for(const part of message.parts){
  const response=part.functionResponse;
  if(!response||!['read_product','quote_product','search_products'].includes(response.name)||!response.response?.data)continue;
  const data=response.response.data;
  if(Array.isArray(data.products))data.products=data.products.map(p=>project(p));
  else response.response.data=project(data);
 }
 if(!raw.size&&!traits.length)return original;
 if(traits.length){
  const idx=sections.findIndex(s=>s.label==='Sản phẩm');
  sections.splice(Math.max(idx,0),0,{label:traitsLabel,value:traits});
 }
 sections.push({label:rawLabel,value:[...raw.values()]});
 wire.contents[0].parts[0].text=sections.map(s=>s.label+'\n'+JSON.stringify(s.value)).join('\n\n');
 return presentVerifiedOfferTerms(wire,claims);
}
