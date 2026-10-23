import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCapturedAttachments} from './delivery-capture.mjs';
test('media evidence retains each delivered URL and turn order without recipient or token',()=>{
 const payloads=[{text:'Em gửi ảnh chị nhé.'},
  {attachment:{type:'image',payload:{url:'https://content.pancake.vn/a.jpg',token:'SECRET'}},recipient:'PRIVATE'},
  {attachment:{type:'image',payload:{url:'https://content.pancake.vn/b.jpg'}}}];
 assert.deepEqual(publicCapturedAttachments(payloads,0),[
  {sequence:1,type:'image',url:'https://content.pancake.vn/a.jpg'},
  {sequence:2,type:'image',url:'https://content.pancake.vn/b.jpg'}]);
 const boundary=payloads.length;
 payloads.push({attachment:{type:'image',payload:{url:'https://content.pancake.vn/c.jpg'}}});
 assert.deepEqual(publicCapturedAttachments(payloads,boundary),[{sequence:0,type:'image',url:'https://content.pancake.vn/c.jpg'}]);
 assert.doesNotMatch(JSON.stringify(publicCapturedAttachments(payloads,0)),/SECRET|PRIVATE|recipient|token/);
 assert.deepEqual(publicCapturedAttachments(payloads,payloads.length),[]);
 assert.throws(()=>publicCapturedAttachments(payloads,-1));
});
