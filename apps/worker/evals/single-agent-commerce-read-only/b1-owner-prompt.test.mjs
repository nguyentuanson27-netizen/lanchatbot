import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readB1OwnerPrompt,sha256} from './protocol.mjs';
import {buildGeminiCommerceRequest,readOnlyDeclarations} from './gemini-inference.mjs';

test('explicit B1 prompt uses frozen bytes and refuses changed or missing registration before generation',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c3-b1-prompt-'));
 try{
  const text='Chỉ viết tin nhắn gửi khách.',file=join(dir,'prompt.txt'),reg=join(dir,'registration.json');
  writeFileSync(file,text);writeFileSync(reg,JSON.stringify({promptPath:'prompt.txt',sha256:sha256(text)}));
  assert.deepEqual(readB1OwnerPrompt(reg),{text,sha256:sha256(text),registrationHash:sha256(readFileSync(reg))});
  writeFileSync(file,text+' changed');assert.throws(()=>readB1OwnerPrompt(reg),/B1_OWNER_PROMPT_HASH/);
  assert.throws(()=>readB1OwnerPrompt(join(dir,'missing.json')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('default prompt stays full-capability; an explicit B1 selection changes neither native dialogue nor capabilities',()=>{
 const full=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
 assert.equal(readB1OwnerPrompt().text,full);
 const contents=[{role:'user',parts:[{text:'Chị muốn mua riêng áo.'}]},
  {role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'SV2447',offerType:'AO'}}}]},
  {role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{price:499000}}}}]}];
 const request={instructions:full,contents,toolsAllowed:true,toolBudget:{roundsRemaining:1,callsRemaining:5},
  context:{runtimeProducts:[],boundSubjects:[],protectedClaims:[],policyLiterals:[],effectReceipts:[],state:{}},
  caseId:'CASE_CANARY',arm:'ARM_CANARY',evaluator:{requiredBehaviors:['RUBRIC_CANARY']}};
 const before=buildGeminiCommerceRequest(request),after=buildGeminiCommerceRequest({...request,instructions:'Candidate instructions'});
 const strip=body=>{const copy=structuredClone(body);delete copy.systemInstruction;return copy;};
 assert.deepEqual(strip(after),strip(before));
 assert.equal(after.toolConfig.functionCallingConfig.mode,'AUTO');
 assert.deepEqual(after.tools[0].functionDeclarations,readOnlyDeclarations);
 assert.ok(after.contents.some(c=>c.parts.some(p=>p.functionResponse)));
 assert.doesNotMatch(JSON.stringify(after),/CASE_CANARY|ARM_CANARY|RUBRIC_CANARY/);
 assert.equal(readB1OwnerPrompt().text,full);
});

test('B1 registration rejects undeclared fields, empty or oversized prompts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c3-b1-prompt-'));
 try{
  const reg=join(dir,'registration.json'),file=join(dir,'prompt.txt');
  for(const text of ['', 'x'.repeat(20001)]){
   writeFileSync(file,text);writeFileSync(reg,JSON.stringify({promptPath:'prompt.txt',sha256:sha256(text)}));
   assert.throws(()=>readB1OwnerPrompt(reg),/B1_OWNER_PROMPT_BOUND/);
  }
  writeFileSync(reg,JSON.stringify({promptPath:'prompt.txt',sha256:'x',caseId:'PRIVATE'}));
  assert.throws(()=>readB1OwnerPrompt(reg),/B1_OWNER_REGISTRATION/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
