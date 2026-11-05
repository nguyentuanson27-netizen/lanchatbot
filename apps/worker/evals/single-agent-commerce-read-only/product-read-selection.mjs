// One native selection vocabulary and decoder; no customer-language parsing.
export const productReadSelections=Object.freeze(['SINGLE','COMPARE','DETAILS_ONLY']);
const own=(a,k)=>Object.hasOwn(a,k),text=(v,max)=>typeof v==='string'&&v.trim().length>0&&Buffer.byteLength(v)<=max;
export function decodeProductRead(a){
 const selection=productReadSelections.includes(a.selection)?a.selection:'INVALID';
 const fail=field=>({ok:false,diagnostic:{field,selection,fieldPresent:field==='UNKNOWN_FIELD'||own(a,field),fieldType:
  field==='UNKNOWN_FIELD'?'OTHER':!own(a,field)?'MISSING':a[field]===null?'NULL':Array.isArray(a[field])?'ARRAY':typeof a[field]==='string'?'STRING':'OTHER'}});
 if(Object.keys(a).some(k=>!['subjectRef','selection','offerType','offerTypes','color','size','deliveryRegion','customerSelected'].includes(k)))return fail('UNKNOWN_FIELD');
 if(own(a,'customerSelected')&&(a.customerSelected!==true||selection!=='SINGLE'))return fail('customerSelected');
 if(!text(a.subjectRef,128))return fail('subjectRef');
 for(const [k,max]of [['color',64],['size',16],['deliveryRegion',64]])if(own(a,k)&&a[k]!==null&&!text(a[k],max))return fail(k);
 const {selection:_selection,...args}=a;
 // Explicit schema semantics: null means no optional filter, never an inferred colour/size.
 for(const k of ['color','size','deliveryRegion'])if(args[k]===null)delete args[k];
 if(selection==='SINGLE')return text(a.offerType,64)&&!own(a,'offerTypes')?{ok:true,args}:fail('offerType');
 if(selection==='COMPARE')return !own(a,'offerType')&&Array.isArray(a.offerTypes)&&a.offerTypes.length>=2&&a.offerTypes.length<=3&&
  a.offerTypes.every(v=>text(v,64))&&new Set(a.offerTypes).size===a.offerTypes.length?{ok:true,args}:fail('offerTypes');
 return selection==='DETAILS_ONLY'&&!own(a,'offerType')&&!own(a,'offerTypes')?{ok:true,args:{...args,detailsOnly:true}}:fail('selection');
}
