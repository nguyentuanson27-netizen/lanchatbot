import {canonicalJsonV1} from '@lana/contracts';
import {readCompactSections} from './owner-data-presentation.mjs';

const label='Giá và tình trạng bán theo đúng lựa chọn';
const same=(a,b)=>canonicalJsonV1(a)===canonicalJsonV1(b);

function fresh(claim,now){
 const p=claim.provenance;
 return p?.authority==='POS_SNAPSHOT'&&Date.parse(p.observedAt)<=now&&
  Number.isFinite(Date.parse(p.expiresAt))&&now<Date.parse(p.expiresAt);
}

function readFilters(policies){
 return policies.filter(p=>p.ref.startsWith('read:')).flatMap(p=>{
  const data=JSON.parse(p.text);
  return Array.isArray(data.sellingOptions)?data.sellingOptions:[data];
 });
}

function exactChoice(scope,filters,prices,stocks){
 const exact=filters.filter(f=>f.productId===scope.productId&&f.variantId===scope.variantId);
 const choices=exact.map(f=>({offerType:f.offerType,size:f.size??f.sizeAvailability?.requestedSize??null,
  color:f.color??f.sizeAvailability?.color??null}));
 if(choices.length){
  const [first]=choices;
  if(typeof first.offerType!=='string'||!choices.every(c=>same(c,first)))return null;
  if((first.size||first.color)&&!exact.some(f=>prices.some(p=>p.claimId&&p.claimId===f.priceClaimId)&&
   stocks.some(s=>s.claimId&&s.claimId===f.stockClaimId)))return null;
  return first;
 }
 const prefix='offer:'+scope.productId+':';
 const offer=scope.variantId.startsWith(prefix)?scope.variantId.slice(prefix.length):'';
 if(!offer||offer.includes(':'))return null;
 // A scoped read with omitted authority must never become an offer-wide status.
 if(filters.some(f=>f.productId===scope.productId&&f.variantId===undefined&&
  f.sizeAvailability?.offerType===offer&&(f.sizeAvailability.color||f.sizeAvailability.requestedSize)))return null;
 return {offerType:offer,size:null,color:null};
}

/** Copy current sale terms into the Compact V2 owner view. Original evidence and native turns are retained. */
export function presentVerifiedOfferTerms(wire,claims){
 const header=wire.contents[0];
 if(header.parts.length!==1||!header.parts[0].text.startsWith('Thời điểm xử lý\n'))return wire;
 const sections=readCompactSections(header,{expandProducts:false});
 const section=name=>sections.find(s=>s.label===name)?.value;
 const visible=section('Giá, tồn và kết quả đã xác minh');
 const subjects=section('Đối tượng đã gắn');
 const now=Date.parse(section('Thời điểm xử lý')?.processingAt);
 if(!Number.isFinite(now)||!Array.isArray(visible)||!Array.isArray(subjects))return wire;
 if(sections.some(s=>s.label===label))return wire;
 const filters=readFilters(section('Quy định và dữ liệu nguồn')??[]);
 const groups=new Map();
 for(const claim of claims){
  const scope=claim.scope;
  if(!['PRICE','STOCK'].includes(claim.type)||scope?.kind!=='PRODUCT'||typeof scope.variantId!=='string')continue;
  const key=canonicalJsonV1(scope),group=groups.get(key)??{scope,PRICE:[],STOCK:[]};
  group[claim.type].push(claim);groups.set(key,group);
 }
 const available=(claims,type)=>{
  const [first]=claims;
  if(!first||!claims.every(c=>fresh(c,now)&&same(c.value,first.value)))return null;
  const projected={type,scope:first.scope,value:first.value};
  return visible.some(f=>same(f,projected))?first.value:null;
 };
 const rows=[];
 for(const {scope,PRICE,STOCK} of groups.values()){
  const product=subjects.find(s=>s.kind==='PRODUCT'&&s.subjectRef===scope.productId);
  if(!product?.label||!subjects.some(s=>s.kind==='VARIANT'&&s.productId===scope.productId&&s.evidenceRef===scope.variantId))continue;
  const choice=exactChoice(scope,filters,PRICE,STOCK),price=available(PRICE,'PRICE'),stock=available(STOCK,'STOCK');
  if(!choice||price?.currency!=='VND'||!Number.isSafeInteger(price.amountVnd)||price.amountVnd<0||
   !['PRE_ORDER','IN_STOCK','OUT_OF_STOCK','LOW_STOCK'].includes(stock?.status))continue;
  rows.push({productId:scope.productId,variantId:scope.variantId,productName:product.label,offerType:choice.offerType,
   ...(choice.size?{size:choice.size}:{}),...(choice.color?{color:choice.color}:{}),
   amountVnd:price.amountVnd,stockStatus:stock.status});
 }
 if(!rows.length)return wire;
 const original=wire.contents[0].parts[0].text;
 const index=original.indexOf('\n\n');
 if(index<0)return wire;
 const text=original.slice(0,index)+'\n\n'+label+'\n'+JSON.stringify(rows)+original.slice(index);
 return {...wire,contents:[{...wire.contents[0],parts:[{text}]},...wire.contents.slice(1)]};
}
