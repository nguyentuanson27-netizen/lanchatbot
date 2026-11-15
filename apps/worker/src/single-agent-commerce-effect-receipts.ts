import {createHash} from "node:crypto";
import {canonicalJsonV1} from "@lana/contracts";
import type {TrustedContext} from "./single-agent-semantic-verifier-boundary.js";

export interface EffectReceiptContinuity {
 kind:"UNCHANGED_CART_NEGOTIATION_V1";cartId:string;cartVersion:number;
 stateRevision:number;bindingVersion:string;recipient:string;cartItemsHash:string;receiptRefs:string[];
}
export const receiptCartItemsHash=(items:unknown)=>createHash("sha256").update(canonicalJsonV1(items??[])).digest("hex");

/** Accept older original receipts only within the code-proved, unchanged-cart sequence.
 * This validates the serialized proof; the executor establishes continuity from actual commits/readback.
 */
export function validatedReceiptContinuity(context:TrustedContext):Set<string>|null {
 const p=context.effectReceiptContinuity;if(p===undefined)return new Set();
 const s=context.state,cart=context.cartBinding;
 if(!p||p.kind!=="UNCHANGED_CART_NEGOTIATION_V1"||!cart||p.cartId!==cart.cartId||p.cartVersion!==cart.cartVersion||
  p.stateRevision!==s.revision||p.bindingVersion!==s.bindingVersion||p.recipient!==s.recipient||
  p.cartItemsHash!==receiptCartItemsHash(s.cartItems)||!Array.isArray(p.receiptRefs)||p.receiptRefs.length<2||p.receiptRefs.length>8||
  new Set(p.receiptRefs).size!==p.receiptRefs.length||p.receiptRefs.some(ref=>typeof ref!=="string"||ref.length>256)||
  Object.keys(p).some(k=>!["kind","cartId","cartVersion","stateRevision","bindingVersion","recipient","cartItemsHash","receiptRefs"].includes(k)))return null;
 const receipts=p.receiptRefs.map(ref=>context.effectReceipts.filter(r=>r.ref===ref));
 if(receipts.some(rs=>rs.length!==1))return null;
 const ordered=receipts.map(rs=>rs[0]!);
 if(ordered[0]!.effect!=="CART_OPENED"||ordered.at(-1)!.stateRevision!==s.revision||
  new Set(ordered.map(r=>r.operationId)).size!==ordered.length||
  ordered.some((r,i)=>r.subjectRef!==cart.cartId||r.status!=="SUCCESS"||r.recipient!==s.recipient||
    !Number.isSafeInteger(r.stateRevision)||r.stateRevision<0||i>0&&(r.effect!=="NEGOTIATION_UPDATED"||r.stateRevision!==ordered[i-1]!.stateRevision+1||
      Date.parse(r.observedAt)<Date.parse(ordered[i-1]!.observedAt))))return null;
 return new Set(p.receiptRefs);
}
