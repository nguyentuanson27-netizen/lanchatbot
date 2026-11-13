// Evaluation-only lossless presentation. No inferred advice, source change or model instruction.
import assert from 'node:assert/strict';
import {expandOwnerProducts,expandCurrentFacts} from './owner-product-tables.mjs';
const labels={sharedSingleItemReads:'Cùng một món bán lẻ, các mã set chỉ là đường tra nguồn',turnTime:'Thời điểm xử lý',products:'Sản phẩm',subjects:'Đối tượng đã gắn',facts:'Giá, tồn và kết quả đã xác minh',
 policy:'Quy định và dữ liệu nguồn',state:'Hồ sơ và trạng thái hiện tại',receipts:'Kết quả thao tác đã xác nhận',execution:'Khả năng thực hiện lượt này',untrusted:'Dữ liệu hội thoại kèm theo'};
const trace=m=>m.parts.flatMap((p,i)=>{try{const v=JSON.parse(p.text);return Array.isArray(v.completedToolTurns)?[{i,value:v}]:[];}catch{return [];}});
export function contextDataBlocks(wire){
 assert.equal(wire.contents[0].role,'user');assert.equal(wire.contents[0].parts.length,1,'CONTEXT_ENVELOPE_PARTS');
 const top=JSON.parse(wire.contents[0].parts[0].text),blocks=[];
 const add=(path,value,label)=>blocks.push({path,label,value});
 for(const k of Object.keys(top).filter(k=>k!=='trusted'))add([k],top[k],labels[k]??k);
 const t=top.trusted;assert(t&&typeof t==='object');
 const preferred=['sharedSingleItemReads','facts','products','policy','state','receipts','subjects','execution'];
 const order=[...preferred,...Object.keys(t).filter(k=>!preferred.includes(k))];
 for(const k of order){
  if(!Object.hasOwn(t,k))continue;
  if(Array.isArray(t[k])&&t[k].length)for(const [i,value]of t[k].entries())add(['trusted',k,i],value,`${labels[k]??k} ${i+1}`);
  else add(['trusted',k],t[k],labels[k]??k);
 }
 for(const [index,message]of wire.contents.entries())if(index>0)for(const part of trace(message))
  add(['completedToolTurns',index,part.i],part.value,`Lịch sử công cụ đã hoàn tất ${index}`);
 return blocks;
}
const render=({path,label,value})=>`## ${label}\nDữ liệu ${JSON.stringify(path)}\n~~~json\n${JSON.stringify(value,null,2)}\n~~~`;
export function readDataBlocks(message){
 assert(message.parts.length>0);return message.parts.map(part=>{
  assert.equal(typeof part.text,'string');
  const match=/^## ([^\n]+)\nDữ liệu ([^\n]+)\n~~~json\n([\s\S]*)\n~~~$/.exec(part.text);assert(match,'PRESENTATION_BLOCK');
  return {path:JSON.parse(match[2]),label:match[1],value:JSON.parse(match[3])};
 });
}
export function presentOwnerData(original){
 assert.equal(original.toolConfig.functionCallingConfig.mode,'NONE','OWNER_PRESENTATION_FINAL_ONLY');assert.equal(original.tools.length,0);
 assert(original.contents.every(m=>m.parts.every(p=>typeof p.text==='string')),'OWNER_PRESENTATION_TEXT_ONLY');
 const wire=structuredClone(original),blocks=contextDataBlocks(original);
 const history=wire.contents.slice(1).filter(m=>{
  const parts=trace(m);if(parts.length)assert.equal(parts.length,m.parts.length,'MIXED_TRACE_MESSAGE');return parts.length===0;
 });
 wire.contents=[{role:'user',parts:blocks.map(b=>({text:render(b)}))},...history];
 assert.deepEqual(readDataBlocks(wire.contents[0]),blocks,'PRESENTATION_DATA_LOSS');
 return wire;
}

// Source paths stay in this local plan, never in the compact provider content.
export function compactContextSections(original){
 const top=JSON.parse(original.contents[0].parts[0].text),sections=[],seen=new Set(),traces=[];
 for(const block of contextDataBlocks(original)){
  if(block.path[0]==='completedToolTurns'){traces.push(block.value);continue;}
  const path=block.path[0]==='trusted'?block.path.slice(0,2):block.path;
  const key=JSON.stringify(path);if(seen.has(key))continue;seen.add(key);
  const field=path.at(-1),label=labels[field]??JSON.stringify(field);
  sections.push({path,label,value:path[0]==='trusted'?top.trusted[field]:top[field]});
 }
 if(traces.length)sections.push({path:['completedToolTurns'],label:'Lịch sử công cụ đã hoàn tất',value:traces});
 return sections;
}
export function readCompactSections(message,{expandProducts=true}={}){
 assert.equal(message.parts.length,1,'COMPACT_PARTS');
 assert.equal(typeof message.parts[0].text,'string');
 return message.parts[0].text.split('\n\n').map(section=>{
  const split=section.indexOf('\n');assert(split>0,'COMPACT_SECTION');
  const label=section.slice(0,split),value=JSON.parse(section.slice(split+1));
  return {label,value:expandProducts&&label===labels.products?expandOwnerProducts(value):value};
 });
}
export function presentCompactOwnerData(original){
 // Native tool pairs/signatures and multimodal parts keep their exact positions.
 // The historical final-only textual experiment retains its existing trace ordering.
 const finalText=original.toolConfig.functionCallingConfig.mode==='NONE'&&original.tools.length===0&&
  original.contents.every(m=>m.parts.every(p=>typeof p.text==='string'));
 const wire=finalText?presentOwnerData(original):structuredClone(original);
 const sections=compactContextSections(finalText?original:{...original,contents:[original.contents[0]]});
 wire.contents[0]={role:'user',parts:[{text:sections.map(({label,value})=>label+'\n'+JSON.stringify(value)).join('\n\n')}]};
 assert.deepEqual(readCompactSections(wire.contents[0],{expandProducts:false}),sections.map(({label,value})=>({label,value})),'COMPACT_DATA_LOSS');
 return wire;
}

/** Expand only the bounded same-body reference; no language or task inference. */
export function expandDeclaredToolExecution(execution,declarations){
 assert(execution&&typeof execution==='object'&&!Array.isArray(execution),'EXECUTION_REFERENCE');
 if(!Object.hasOwn(execution,'toolNamesFrom'))return structuredClone(execution);
 assert(execution.toolNamesFrom==='DECLARED_TOOL_SCHEMAS'&&!Object.hasOwn(execution,'availableTools')&&
  !Object.hasOwn(execution,'callableTools')&&Array.isArray(declarations),'EXECUTION_REFERENCE');
 const names=declarations.map(d=>d?.name);
 assert(names.every(n=>typeof n==='string'&&n.length>0)&&new Set(names).size===names.length,'EXECUTION_REFERENCE');
 const expanded=structuredClone(execution);delete expanded.toolNamesFrom;
 return {...expanded,availableTools:names,callableTools:[...names]};
}

export function expandDefaultSellingOption(data,trustedFacts=[]){
 assert(data&&typeof data==='object'&&!Array.isArray(data),'DEFAULT_OPTION_REFERENCE');
 data=structuredClone(data);
 if(Array.isArray(data.sellingOptions))data.sellingOptions=data.sellingOptions.map(o=>expandCurrentFacts(o,trustedFacts));
 if(!Object.hasOwn(data,'defaultFromOption'))return structuredClone(data);
 const keys=['offerType','variantId','facts','availability','sizeAvailability'];
 assert(data.defaultFromOption===0&&Array.isArray(data.sellingOptions)&&data.sellingOptions.length===1&&
  keys.every(k=>!Object.hasOwn(data,k)&&Object.hasOwn(data.sellingOptions[0],k)),'DEFAULT_OPTION_REFERENCE');
 const expanded=structuredClone(data);delete expanded.defaultFromOption;
 for(const k of keys)expanded[k]=structuredClone(data.sellingOptions[0][k]);
 return expanded;
}
