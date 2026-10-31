import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referenceContextCoverage} from './context-coverage.mjs';
test('native profile/cart/history fields cannot disappear behind a common world hash',()=>{
 const trusted={protectedClaims:[],runtimeProducts:[],policyLiterals:[],effectReceipts:[],state:{customerMeasurements:[{kind:'WAIST_CM',value:74}],
  fitPreference:'RELAXED',preferences:{colors:['be']},cartQuote:{totalVnd:499000},cartItems:[],checkoutStatus:{previewAvailable:false}}},
  context={verifiedClaims:[],productBinding:{productIds:[]},contextHash:'a'.repeat(64)},
  coverage=referenceContextCoverage(trusted,context,{publicCartEvents:[{text:'Accepted public cart summary.'}]});
 assert.equal(coverage.status,'INFORMATION_PARITY_NOT_ESTABLISHED');
 assert.deepEqual(coverage.loss.customerProfile,['customerMeasurements','fitPreference','preferences']);
 assert(coverage.loss.cartAndCheckout.includes('cartQuote'));assert.deepEqual(coverage.loss.acceptedCommunicationHistory,['publicCartEvents']);
});
