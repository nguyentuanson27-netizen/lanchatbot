// Structural information coverage only. Does not infer semantic equivalence from prose.
import {digest} from './qualification.mjs';
export function referenceContextCoverage(trusted,context,historyMetadata){
 const claims=new Set(context.verifiedClaims.map(digest)),runtime=trusted.runtimeProducts??[],
  attributes=context.productAttributes,presentation=context.productPresentation;
 const loss={protectedClaims:trusted.protectedClaims.filter(c=>!claims.has(digest(c))).map(c=>c.claimId),
  policyLiterals:(trusted.policyLiterals??[]).map(p=>p.ref),
  customerProfile:['customerProfileId','customerProfileRevision','customerMeasurements','fitPreference','preferences','consideredSize',
   'customerStateUpdatePending','sizeMeasurementFingerprints'].filter(k=>Object.hasOwn(trusted.state,k)),
  cartAndCheckout:['cartQuote','cartItems','checkoutStatus','salesStage'].filter(k=>Object.hasOwn(trusted.state,k)),
  acceptedCommunicationHistory:historyMetadata?.publicCartEvents?.length?['publicCartEvents']:[],
  effectReceipts:(trusted.effectReceipts??[]).map(r=>r.ref),
  productAttributes:runtime.filter(p=>p.attributes&&digest(p.attributes)!==digest(attributes??null)).map(p=>p.ref),
  productPresentation:runtime.filter(p=>p.presentation&&digest(p.presentation)!==digest(presentation??null)).map(p=>p.ref),
  sizeCharts:runtime.filter(p=>p.sizeCharts?.length).map(p=>p.ref),
  sourceContent:runtime.filter(p=>p.content).map(p=>p.ref)};
 return {version:1,status:Object.values(loss).some(rows=>rows.length)?'INFORMATION_PARITY_NOT_ESTABLISHED':'STRUCTURAL_COMMON_FIELDS_PRESENT',
  trustedHash:digest(trusted),contextHash:context.contextHash,
  provided:{protectedClaimIds:context.verifiedClaims.map(c=>c.claimId),productIds:context.productBinding.productIds,fields:Object.keys(context).sort()},loss,
  note:'Policy literals, receipts, charts and source content have no exact native Context V2 field. Do not assert semantic equivalence or matched replacement solely from a shared world hash.'};
}
