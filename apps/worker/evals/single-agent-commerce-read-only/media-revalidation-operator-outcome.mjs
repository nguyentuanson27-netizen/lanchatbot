import {isDeepStrictEqual} from 'node:util';

/** Bounded operator accounting only; a proposed proof never proves persistence. */
export function mediaRevalidationOperatorOutcome({apply,results,notRun,semanticFieldsUnchanged}){
 const status=!semanticFieldsUnchanged?'SOURCE_CHANGED_RETAIN_EVIDENCE':
  results.some(r=>r.status==='WRITE_UNCONFIRMED')?'WRITE_UNCONFIRMED_RETAIN_EVIDENCE':
  notRun.length?'INCOMPLETE_RETAIN_EVIDENCE':
  results.some(r=>apply
   ?!((r.status==='VERIFIED'&&r.proposedProof?.status==='VERIFIED'||r.status==='BLOCKED'&&r.proposedProof?.status==='INVALID')&&
      isDeepStrictEqual(r.proposedProof,r.observedProof))
   :!['WOULD_VERIFY','WOULD_INVALIDATE'].includes(r.status))?'UNCONFIRMED_RESULT_RETAIN_EVIDENCE':'COMPLETE';
 return {status,exitCode:status==='COMPLETE'?0:1};
}
