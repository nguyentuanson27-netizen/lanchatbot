import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAdviceCapture} from './advice-diagnostic.mjs';

test('capture selection is fixed by dispatch order, never by output or verdict',()=>{
 const rows=[{generationId:'a',toolsAllowed:true,providerRequests:1},{generationId:'b',toolsAllowed:false,providerRequests:1},{generationId:'c',toolsAllowed:false,providerRequests:1}];
 assert.equal(selectAdviceCapture(rows).generationId,'b');
 assert.equal(selectAdviceCapture(rows.slice(0,1)).generationId,'a');
 assert.equal(selectAdviceCapture([]),null);
});

test('pre-dispatch failures cannot become advice captures',()=>{
 const earlier={generationId:'a',toolsAllowed:true,providerRequests:1};
 const failed={generationId:'b',toolsAllowed:false,providerRequests:0};
 assert.equal(selectAdviceCapture([earlier,failed]),earlier);
 assert.equal(selectAdviceCapture([failed]),null);
});
