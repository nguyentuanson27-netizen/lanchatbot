import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAdviceCapture} from './advice-diagnostic.mjs';

test('capture selection is fixed by dispatch order, never by output or verdict',()=>{
 const rows=[{generationId:'a',toolsAllowed:true},{generationId:'b',toolsAllowed:false},{generationId:'c',toolsAllowed:false}];
 assert.equal(selectAdviceCapture(rows).generationId,'b');
 assert.equal(selectAdviceCapture(rows.slice(0,1)).generationId,'a');
 assert.equal(selectAdviceCapture([]),null);
});
