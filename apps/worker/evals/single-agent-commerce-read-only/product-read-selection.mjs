// Public shape and decoder share the same schema; domain ports still own refs/byte/source/permission checks.
import Ajv from 'ajv';
export const productReadSelections=Object.freeze(['SINGLE','COMPARE','DETAILS_ONLY']); // Historical diagnostics only; no legacy input aliases.
const text=max=>({type:'string',minLength:1,maxLength:max});
export function productReadSchema(allowCustomerSelection=false){
 const subjectRef=text(128),offers=(min,max)=>({type:'array',items:text(64),minItems:min,maxItems:max,uniqueItems:true});
 const filters={color:{anyOf:[text(64),{type:'null'}]},size:{anyOf:[text(16),{type:'null'}]},deliveryRegion:{anyOf:[text(64),{type:'null'}]}};
 const branch=(properties,required=['subjectRef','offerTypes'])=>({type:'object',properties,required,additionalProperties:false});
 return {type:'object',properties:{subjectRef,offerTypes:offers(0,3),...filters,...(allowCustomerSelection?{customerSelected:{type:'boolean',enum:[true]}}:{})},
  required:['subjectRef','offerTypes'],additionalProperties:false,anyOf:[
   branch({subjectRef,offerTypes:offers(0,0)}),branch({subjectRef,offerTypes:offers(1,3),...filters}),
   ...(allowCustomerSelection?[branch({subjectRef,offerTypes:offers(1,1),...filters,customerSelected:{type:'boolean',enum:[true]}},['subjectRef','offerTypes','customerSelected'])]:[])]};
}
const validator=new Ajv({strict:false}).compile(productReadSchema(true));
export function decodeProductRead(a){
 if(!validator(a)){
  const known=['subjectRef','offerTypes','color','size','deliveryRegion','customerSelected'];
  const field=a&&typeof a==='object'?Object.keys(a).find(k=>!known.includes(k))?'UNKNOWN_FIELD':!Object.hasOwn(a,'subjectRef')?'subjectRef':'offerTypes':'ARGS';
  return {ok:false,diagnostic:{field,selection:'INVALID',fieldPresent:!!a&&Object.hasOwn(a,field),fieldType:'OTHER'}};
 }
 const {offerTypes,...args}=a;
 for(const key of ['color','size','deliveryRegion'])if(args[key]===null)delete args[key];
 if(!offerTypes.length)return {ok:true,args:{...args,detailsOnly:true}};
 return {ok:true,args:{...args,...(offerTypes.length===1?{offerType:offerTypes[0]}:{offerTypes:[...offerTypes]})}};
}
