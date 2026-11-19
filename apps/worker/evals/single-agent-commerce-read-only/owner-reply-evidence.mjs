import {buildVerifiedFactBlocks,normalizeCatalogToken} from '@lana/business-tools';
import {commerceHash} from '../../dist/single-agent-commerce-read-only-context.js';
import {validSelectionEvidence} from '../../dist/single-agent-commerce-selection-evidence.js';
import {COMPONENT_OFFER_LABELS,WHOLE_PRODUCT_OFFERS} from '../../dist/single-agent-commerce-read-only-tools.js';

const same=(a,b)=>commerceHash(a)===commerceHash(b);
const knownTime=(o,at)=>Number.isFinite(Date.parse(o.observedAt))&&Date.parse(o.observedAt)<=at.getTime()&&Date.parse(o.expiresAt)>at.getTime();
const filter=value=>typeof value==='string'?normalizeCatalogToken(value):null;

// The quote tool content-addresses the current proof and invalidates it on cart/source change.
function currentTotal(data,args,trusted,at){
 const q=data.preCartQuote;
 if(q?.kind!=='PRE_CART_TOTAL_V1'||q.calculationBasis!=='PRE_CART_POLICY'||q.appliesNegotiationReceipt!==false||
  args.offerTypes.length!==1||!Number.isSafeInteger(q.quantity)||q.quantity<1||q.subjectRef!==data.subjectRef||q.subjectRef!==args.subjectRef||q.offerType!==args.offerTypes[0]||
  (args.quantity===undefined&&args.deliveryRegion===undefined)||q.quantity!==(args.quantity??1)||
  q.deliveryRegion!==(args.deliveryRegion??null)||(q.color??null)!==(args.color??null)||
  q.bindingVersion!==trusted.state.bindingVersion||q.recipient!==trusted.state.recipient||
  q.cartStateHash!==commerceHash({binding:trusted.cartBinding??null,items:trusted.state.cartItems??[]})||
  ![q.subtotalVnd,q.grandTotalVnd,q.shippingFeeVnd,q.discountTotalVnd].every(v=>Number.isSafeInteger(v)&&v>=0))return null;
 // The owner view places the exact support block next to preCartQuote. Rebind
 // the proof as issued, without duplicating the block in the presented data.
 const proof=q.negotiationAssessment==='QUOTED'&&!Object.hasOwn(q,'supportEvaluation')&&data.supportEvaluation?.status==='QUOTED'
  ?{...q,supportEvaluation:data.supportEvaluation}:q;
 const hash=commerceHash(proof),matches=trusted.policyLiterals.filter(p=>p.ref==='pre-cart-quote:'+hash);
 if(matches.length!==1||matches[0].sourceVersion!==hash||!knownTime(matches[0],at))return null;
 try{return same(JSON.parse(matches[0].text),proof)?q:null;}catch{return null;}
}

function duplicatePriceCard(data,quote,context){
 const card=data.openingQuote;
 if(!card||card.subjectRef!==quote.subjectRef||card.offerType!==quote.offerType||
  Object.keys(card).some(k=>!['subjectRef','offerType','text'].includes(k)))return false;
 const option=data.sellingOptions?.[0],availability=option?.sizeAvailability;
 if(data.sellingOptions?.length!==1||option.offerType!==quote.offerType||option.availability?.price?.status!=='OK'||
  (availability&&(availability.productId!==quote.subjectRef||availability.offerType!==quote.offerType||
    !Array.isArray(availability.confirmedInStockSizes))))return false;
 const claims=context.protectedClaims.filter(c=>c.type==='PRICE'&&c.scope?.kind==='PRODUCT'&&
  c.scope.productId===quote.subjectRef&&c.scope.variantId===option.variantId&&c.value.currency==='VND'&&commerceHash(c)===quote.priceHash);
 const price=claims.length===1?claims[0].value.amountVnd:null;
 if(!Number.isSafeInteger(price)||price<0)return false;
 const subject=context.boundSubjects.filter(s=>s.kind==='PRODUCT'&&s.ref===quote.subjectRef&&s.label===data.label);
 if(subject.length!==1||typeof data.label!=='string')return false;
 const component=COMPONENT_OFFER_LABELS[quote.offerType],whole=WHOLE_PRODUCT_OFFERS.includes(quote.offerType);
 const productId=quote.subjectRef;
 // Compare the existing assembler's output from the replacement fields. A card with
 // extra product copy, a different name or unmatched sizing stays in the owner view.
 const displayed=buildVerifiedFactBlocks({status:'OK',productId,observedAt:option.observedAt,
  facts:{productId,salePriceVnd:price,listPriceVnd:null,sizes:availability?.confirmedInStockSizes??[]}},
 'PRICE',{productId,title:component??data.label,materials:whole?data.attributes?.materials??[]:[],
  silhouettes:whole?data.attributes?.silhouettes??[]:[]}).blocks.map(b=>b.text).join('\n');
 return displayed.length>0&&displayed===card.text;
}

function presentTotal(data,call,trusted,at){
 const q=currentTotal(data,call.args,trusted,at);
 if(!q)return data;
 const {preCartQuote:_,...other}=data;
 if(duplicatePriceCard(data,q,trusted))delete other.openingQuote;
 const {grandTotalVnd,shippingFeeVnd,deliveryRegion,...evidence}=q;
 return {preCartQuote:{grandTotalVnd,currency:'VND',
  shippingBasis:'DEFAULT_SHOP_POLICY',
  shippingFeeVnd,deliveryRegion,...evidence},...other};
}

function matchedSaleTuples(data,call,context,at){
 const args=call.args,subjectRef=args.subjectRef,offerType=args.offerTypes[0];
 const opt=data.sellingOptions?.[0];
 if(args.offerTypes.length!==1||data.subjectRef!==subjectRef||data.sellingOptions?.length!==1||
  opt.offerType!==offerType||opt.availability?.stock?.status!=='OK')return null;
 const products=(context.runtimeProducts??[]).filter(p=>p.subjectRef===subjectRef);
 if(products.length!==1)return null;
 const ref=data.selectionEvidenceFromProduct;
 if(ref&&ref.subjectRef!==subjectRef)return null;
 const hash=ref?.contentHash??data.selectionEvidence?.contentHash;
 const matches=(products[0].selectionEvidence??[]).filter(e=>e.offerType===offerType&&filter(e.size)===filter(args.size)&&
  filter(e.color)===filter(args.color)&&e.quantity===1&&e.sourceVersion===opt.sourceVersion&&
  (!hash||e.contentHash===hash)&&validSelectionEvidence(e,subjectRef,at));
 if(matches.length!==1||matches[0].observedAt!==opt.observedAt||
  (data.selectionEvidence&&!same(data.selectionEvidence,matches[0])))return null;
 return matches[0];
}

function presentStock(data,call,context,at){
 const e=matchedSaleTuples(data,call,context,at);
 if(!e||e.completeness!=='ALL_EXACT_TUPLES_FOR_QUERY'||!e.options.length||
  e.options.some(o=>!o.color||o.color==='__NO_COLOR__'||o.status==='UNKNOWN'))return data;
 const byColor=new Map();
 for(const option of e.options){
  const key=filter(option.color);
  if(!byColor.has(key))byColor.set(key,{color:option.color,bySize:new Map()});
  const group=byColor.get(key).bySize,previous=group.get(option.size);
  if(previous&&previous!==option.status)return data;
  group.set(option.size,option.status);
 }
 const colors=[...byColor.values()].map(({color,bySize})=>{
  const statuses=new Set(bySize.values());
  return statuses.size===1?{color,status:statuses.values().next().value,sizes:[...bySize.keys()]}:
   {color,bySize:[...bySize].map(([size,status])=>({size,status}))};
 });
 return {verifiedColorAvailability:{subjectRef:e.productId,offerType:e.offerType,
  query:{color:e.color,size:e.size,quantity:e.quantity},colors},...data};
}

/** Owner view only. Adjacent native call/result pairs carry provenance; customer text is never decoded. */
export function projectOwnerReplyEvidence(messages,context,at=new Date()){
 if(!Number.isFinite(at.getTime()))return messages;
 let result=messages;
 for(let i=1;i<messages.length;i++){
  const model=messages[i-1],tool=messages[i];
  if(model.role!=='model'||tool.role!=='user')continue;
  const calls=model.parts.flatMap(p=>p.functionCall?[p.functionCall]:[]);
  const ids=calls.flatMap(call=>call.id===undefined?[]:[call.id]);
  if(!calls.length||new Set(ids).size!==ids.length||tool.parts.length!==calls.length||
   tool.parts.some((p,j)=>!p.functionResponse||p.functionResponse.name!==calls[j].name||p.functionResponse.id!==calls[j].id))continue;
  const parts=tool.parts.map((p,j)=>{
   const call=calls[j],r=p.functionResponse.response,data=r?.data;
   if(r?.status!=='OK'||!data||!Array.isArray(call.args?.offerTypes))return p;
   const projected=call.name==='quote_product'?presentTotal(data,call,context,at):
    call.name==='read_product'?presentStock(data,call,context,at):data;
   return projected===data?p:{...p,functionResponse:{...p.functionResponse,response:{...r,data:projected}}};
  });
  if(parts.some((p,j)=>p!==tool.parts[j])){
   if(result===messages)result=[...messages];
   result[i]={...tool,parts};
  }
 }
 return result;
}
