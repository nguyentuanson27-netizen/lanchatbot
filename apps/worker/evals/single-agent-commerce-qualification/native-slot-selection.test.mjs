import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRegisteredNativeSlots} from './native-population.mjs';

const registration={slots:[
 {slotId:'done',arm:'CANDIDATE',mode:'SINGLE'},
 {slotId:'pending-1',arm:'CANDIDATE',mode:'JOURNEY'},
 {slotId:'safety',arm:'CANDIDATE',mode:'SAFETY'},
 {slotId:'baseline',arm:'C3',mode:'SINGLE'},
 {slotId:'pending-2',arm:'CANDIDATE',mode:'SINGLE'}
]};

test('continuation selects only admitted pending slots in registration order',()=>{
 const selected=selectRegisteredNativeSlots(registration,'CANDIDATE',['pending-2','pending-1']);
 assert.deepEqual(selected.map(slot=>slot.slotId),['pending-1','pending-2']);
 assert(!selected.some(slot=>slot.slotId==='done'));
 assert.equal(registration.slots.length,5);
});

test('full runs retain every native slot for the selected arm',()=>{
 assert.deepEqual(selectRegisteredNativeSlots(registration,'CANDIDATE').map(slot=>slot.slotId),
  ['done','pending-1','pending-2']);
 assert.deepEqual(selectRegisteredNativeSlots(registration,'C3').map(slot=>slot.slotId),['baseline']);
});

test('continuation rejects unknown, duplicate, empty and other-arm or safety slots',()=>{
 for(const ids of [[],['missing'],['pending-1','pending-1'],['baseline'],['safety'],'pending-1']){
  assert.throws(()=>selectRegisteredNativeSlots(registration,'CANDIDATE',ids),/C_RESUME_SLOT_SELECTION/);
 }
});
