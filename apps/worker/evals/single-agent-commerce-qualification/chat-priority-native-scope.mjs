import assert from 'node:assert/strict';
import {read} from './bc-control.mjs';

export const CHAT_PRIORITY_NATIVE_SCOPE=read(new URL('./CHAT_PRIORITY_SCOPE_20261119.json',import.meta.url)).scope;

export function priorityNativeMessage(scenario,turnIndex,input){
 const ads=CHAT_PRIORITY_NATIVE_SCOPE.ads;
 if(scenario.id!==ads.caseId)return {};
 assert.equal(turnIndex,ads.turnIndex,'CHAT_PRIORITY_ADS_TURN');
 assert.deepEqual(input.initialProductCodes,[ads.productCode],'CHAT_PRIORITY_ADS_PRODUCT');
 return {messages:[{text:input.latest,attachments:[],adsContext:{source:'ADS',
  adTitle:ads.productCode,postId:null,adId:null,ref:null}}]};
}
