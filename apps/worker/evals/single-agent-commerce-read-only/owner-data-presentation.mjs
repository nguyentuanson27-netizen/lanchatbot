// Evaluation-only lossless presentation. No inferred advice, source change or model instruction.
import assert from 'node:assert/strict';
const labels={turnTime:'Thời điểm xử lý',products:'Sản phẩm',subjects:'Đối tượng đã gắn',facts:'Giá, tồn và kết quả đã xác minh',
 policy:'Quy định và dữ liệu nguồn',state:'Hồ sơ và trạng thái hiện tại',receipts:'Kết quả thao tác đã xác nhận',execution:'Khả năng thực hiện lượt này',untrusted:'Dữ liệu hội thoại kèm theo'};
const trace=m=>m.parts.flatMap((p,i)=>{try{const v=JSON.parse(p.text);return Array.isArray(v.completedToolTurns)?[{i,value:v}]:[];}catch{return [];}});
export function contextDataBlocks(wire){
 assert.equal(wire.contents[0].role,'user');assert.equal(wire.contents[0].parts.length,1,'CONTEXT_ENVELOPE_PARTS');
 const top=JSON.parse(wire.contents[0].parts[0].text),blocks=[];
 const add=(path,value,label)=>blocks.push({path,label,value});
 for(const k of Object.keys(top).filter(k=>k!=='trusted'))add([k],top[k],labels[k]??k);
 const t=top.trusted;assert(t&&typeof t==='object');
 const order=['products','facts','policy','state','receipts','subjects','execution',...Object.keys(t).filter(k=>!['products','facts','policy','state','receipts','subjects','execution'].includes(k))];
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
