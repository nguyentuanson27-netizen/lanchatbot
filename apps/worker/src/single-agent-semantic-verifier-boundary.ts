import { createHash } from "node:crypto";
import { ProtectedClaimV1Schema, ProductContentV1Schema, SizeChartV1Schema, type ProductAttributesV1,
  type ProductFactsV2, type ProductPresentationEvidenceV1, type SizeChartV1 } from "@lana/contracts";
import { verifyProductAttributesV1, verifyProductPresentationEvidenceV1 } from "@lana/business-tools";
import { hasResidualPii } from "@lana/dataset-review";
import { authorizeRealtimeProtectedClaimProposal } from "./realtime-protected-claim-boundary.js";
import {validSelectionEvidence,MAX_SELECTION_OBSERVATIONS,type CandidateSelectionEvidence} from "./single-agent-commerce-selection-evidence.js";

// Shared isolated egress mechanics. No provider, tool, mutation or send interface.
interface ProductProfile {
  ref: string; subjectRef: string; authority: "EVALUATION_FIXTURE"; sourceVersion: string;
  observedAt: string; expiresAt: string; contentHash: string;
  details: { silhouette: string; material: string; colors: string[]; sizeChart: string[]; care: string; limitations: string };
}
const boundedText = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function validProfile(v: unknown): v is ProductProfile {
  if (!record(v) || Object.keys(v).sort().join(",") !== "authority,contentHash,details,expiresAt,observedAt,ref,sourceVersion,subjectRef" ||
    v.authority !== "EVALUATION_FIXTURE" || ![v.ref, v.subjectRef, v.sourceVersion].every(s => boundedText(s, 128)) ||
    !boundedText(v.observedAt, 64) || !boundedText(v.expiresAt, 64) || !boundedText(v.contentHash, 64) || !/^[a-f0-9]{64}$/u.test(v.contentHash)) return false;
  const d = v.details;
  return record(d) && Object.keys(d).sort().join(",") === "care,colors,limitations,material,silhouette,sizeChart" &&
    [d.silhouette, d.material, d.care, d.limitations].every(s => boundedText(s, 1024)) &&
    Array.isArray(d.colors) && d.colors.length <= 8 && d.colors.every(s => boundedText(s, 64)) &&
    Array.isArray(d.sizeChart) && d.sizeChart.length <= 4 && d.sizeChart.every(s => boundedText(s, 1024));
}
export interface RuntimeProductEvidence {
  ref: string; subjectRef: string; attributes?: ProductAttributesV1;
  presentation?: ProductPresentationEvidenceV1; sizeCharts?: SizeChartV1[];
  content?: ProductFactsV2["content"];
  selectionEvidence?:CandidateSelectionEvidence[];
  offerReadCoverage?:{offerType:string;price:"AVAILABLE"|"UNAVAILABLE"|"NOT_READ";stock:"AVAILABLE"|"UNAVAILABLE"|"NOT_READ"}[];
}
export const MAX_RUNTIME_PRODUCTS = 4;
export interface TrustedContext {
  boundSubjects: { ref: string; kind: string; label: string; bindingVersion: string; variantId?: string | null; productId?: string }[];
  protectedClaims: unknown[];
  policyLiterals: { ref: string; text: string; sourceVersion: string; observedAt: string; expiresAt: string | null }[];
  effectReceipts: { ref: string; operationId: string; subjectRef: string; status: string; effect: string;
    stateRevision: number; recipient: string; observedAt: string; expiresAt: string }[];
  productProfiles?: ProductProfile[];
  runtimeProducts?: RuntimeProductEvidence[];
  cartBinding?: { cartId: string; cartVersion: number };
  state: { [key: string]: unknown; conversationOwner: string; revision: number; currentProductId: string | null;
    factSnapshotVersion: string; bindingVersion: string; recipient: string; permission: boolean; privacyAllowed: boolean };
}
export interface VerifierBinding {
  requestId: string; finalDraftHash: string; trustedSnapshotId: string;
  stateRevision: number; factSnapshotVersion: string; recipient: string;
}
export type VerifierResponse = { kind: "VERDICT"; binding: VerifierBinding; result: unknown }
  | { kind: "TIMEOUT" | "PROVIDER_ERROR" };
interface SemanticViolation { kind:string; protectedRef:string|null; excerpt?:string; basis?:string }
export interface TerminalOutcome {
  disposition: "SEND_ELIGIBLE" | "FALLBACK" | "HANDOFF" | "NO_SEND";
  reason: string; text: string | null; fallbackId: string | null;
  semanticDiagnostic?: SemanticViolation[];
  diagnostic?: { check: "HARD_PRECHECK" | "CURRENT_SNAPSHOT" | "RESPONSE_BINDING";
    checkedAtMs: number | null; expectedSnapshotId: string; currentSnapshotId: string;
    expectedRevision: number; currentRevision: number | null; reasonCodes: string[] };
}
export interface PostEffectRecoveryCompatibility { receiptRef: string; effectReplayAllowed: false }
const FALLBACK_ID = "C3_A_NONPROTECTED_V1";
const FALLBACK_TEXT = "Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.";
const FALLBACK_V2_ID = "C3_A_NONPROTECTED_V2";
const MEDIA_FALLBACK_ID = "C3_B_MEDIA_NEXT_STEP_V1";
const MEDIA_FALLBACK_TEXT = "Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?";
const FALLBACK_V2_TEXT = "Phần này em chưa trả lời được, chị nhé.";
const MEDIA_RECOVERY_ID = "C3_B_VERIFIED_MEDIA_V1";
const MEDIA_RECOVERY_TEXT = "Em gửi chị ảnh của mẫu để mình xem trước nhé.";
const MEDIA_UNAVAILABLE_ID = "C3_B_MEDIA_UNAVAILABLE_V1";
const MEDIA_UNAVAILABLE_TEXT = "Lúc này em chưa gửi được ảnh chị cần.";
const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const kinds = new Set(["UNSUPPORTED_PROTECTED_ASSERTION", "SUBJECT_MISMATCH", "CONTRADICTION_OR_NEGATION",
  "MATERIAL_CONDITION_LOSS", "POLICY_OR_BENEFIT_STRENGTHENING", "EFFECT_WITHOUT_RECEIPT",
  "STALE_OR_SUPERSEDED_MEANING", "OTHER_PROTECTED_SEMANTIC_RISK"]);
const terminal = (disposition: TerminalOutcome["disposition"], reason: string): TerminalOutcome =>
  ({ disposition, reason, text: null, fallbackId: null });

export function terminalFallback(id = FALLBACK_ID, text = id === MEDIA_UNAVAILABLE_ID ? MEDIA_UNAVAILABLE_TEXT : id === MEDIA_RECOVERY_ID ? MEDIA_RECOVERY_TEXT : id === MEDIA_FALLBACK_ID ? MEDIA_FALLBACK_TEXT : id === FALLBACK_V2_ID ? FALLBACK_V2_TEXT : FALLBACK_TEXT): TerminalOutcome {
  return (id === FALLBACK_ID && text === FALLBACK_TEXT) || (id === FALLBACK_V2_ID && text === FALLBACK_V2_TEXT) || (id === MEDIA_FALLBACK_ID && text === MEDIA_FALLBACK_TEXT) || (id === MEDIA_RECOVERY_ID && text === MEDIA_RECOVERY_TEXT) || (id === MEDIA_UNAVAILABLE_ID && text === MEDIA_UNAVAILABLE_TEXT)
    ? { disposition: "FALLBACK", reason: "FAIL", text, fallbackId: id }
    : terminal("NO_SEND", "UNVERIFIED_FALLBACK");
}
export function makeBinding(requestId: string, finalDraft: string, trusted: TrustedContext): VerifierBinding {
  return { requestId, trustedSnapshotId: hash(JSON.stringify(trusted)), stateRevision: trusted.state.revision,
    factSnapshotVersion: trusted.state.factSnapshotVersion, recipient: trusted.state.recipient, finalDraftHash: hash(finalDraft) };
}
function fresh(value: { observedAt: string; expiresAt: string }, now: Date): boolean {
  const observed = Date.parse(value.observedAt), expires = Date.parse(value.expiresAt), at = now.getTime();
  return Number.isFinite(observed) && Number.isFinite(expires) && Number.isFinite(at) && observed <= at && expires > at;
}

/** Reject-only authority mechanics; no language classification and no verifier bypass. */
export function hardPrecheck(trusted: TrustedContext, draft: string, now: Date, reportStale?: (reasons: string[]) => void): string | null {
  const s = trusted.state;
  const stale = (...reasons: string[]) => { reportStale?.(reasons); return "STALE"; };
  if (!Number.isFinite(now.getTime())) return stale("INVALID_CLOCK");
  if (s.privacyAllowed !== true || hasResidualPii(draft)) return "PRIVACY";
  if (s.permission !== true || s.conversationOwner !== "BOT") return "PERMISSION";
  if (s.customerStateUpdatePending === true) return "STATE_UPDATE_INCOMPLETE";
  if (typeof s.recipient !== "string" || s.recipient.length === 0) return "RECIPIENT";
  if (!draft.trim() || Buffer.byteLength(draft) > 4096 || Buffer.byteLength(JSON.stringify(trusted)) > 32768 ||
    trusted.boundSubjects.length > 8 || trusted.protectedClaims.length > 32 || trusted.effectReceipts.length > 8) return "MALFORMED";
  if (!Number.isSafeInteger(s.revision) || s.revision < 0 || !s.factSnapshotVersion || !s.bindingVersion ||
    (s.currentProductId !== null && !trusted.boundSubjects.some(subject => subject.ref === s.currentProductId)) ||
    trusted.boundSubjects.some(subject => subject.bindingVersion !== s.bindingVersion)) return stale("STATE_BINDING");
  if (trusted.boundSubjects.some(subject => subject.kind === "VARIANT" && (!subject.productId ||
    !trusted.boundSubjects.some(parent => parent.kind === "PRODUCT" && parent.ref === subject.productId)))) return stale("VARIANT_BINDING");
  const parsed = trusted.protectedClaims.map(claim => ProtectedClaimV1Schema.safeParse(claim));
  if (parsed.some(claim => !claim.success)) return "MALFORMED";
  const claims = parsed.flatMap(claim => claim.success ? [claim.data] : []);
  // Supplied Size Engine results belong to the exact current customer measurements.
  if (claims.some(claim => claim.type === "SIZE_FIT" &&
    (claim.value.customerProfileId !== s.customerProfileId ||
      claim.value.customerProfileRevision !== s.customerProfileRevision ||
      claim.value.measurementFingerprint !== (record(s.sizeMeasurementFingerprints) && claim.scope.kind === "PRODUCT"
        ? s.sizeMeasurementFingerprints[claim.scope.productId] : s.measurementFingerprint)))) return stale("SIZE_PROFILE_BINDING");
  const authorization = authorizeRealtimeProtectedClaimProposal({
    declaredClaimIds: claims.map(claim => claim.claimId), observedClaimTypes: [], availableClaims: claims,
    expectedProductIds: trusted.boundSubjects.filter(subject => subject.kind === "PRODUCT").map(subject => subject.ref), now,
    ...(trusted.boundSubjects.some(subject => subject.variantId !== undefined || subject.kind === "VARIANT") ? {
      expectedProductScopes: trusted.boundSubjects.filter(subject => subject.kind === "PRODUCT" && subject.variantId !== undefined)
        .map(subject => ({ productId: subject.ref, variantId: subject.variantId ?? null }))
        .concat(trusted.boundSubjects.filter(subject => subject.kind === "VARIANT" && subject.productId)
          .map(subject => ({ productId: subject.productId!, variantId: subject.ref }))),
    } : {}),
    ...(trusted.cartBinding ? { expectedCart: trusted.cartBinding } : {}),
  });
  if (authorization.outcome !== "AUTHORIZED") return stale(...authorization.reasonCodes.map(reason => reason.split(":", 1)[0]!));
  if (trusted.policyLiterals.some(policy => policy.expiresAt === null
    ? !Number.isFinite(Date.parse(policy.observedAt)) || Date.parse(policy.observedAt) > now.getTime()
    : !fresh({ observedAt: policy.observedAt, expiresAt: policy.expiresAt }, now))) return stale("POLICY_FRESHNESS");
  if (trusted.effectReceipts.some(receipt => !fresh(receipt, now) || receipt.status !== "SUCCESS" ||
    receipt.recipient !== s.recipient || receipt.stateRevision !== s.revision ||
    !trusted.boundSubjects.some(subject => subject.ref === receipt.subjectRef))) return stale("EFFECT_RECEIPT");
  if (trusted.productProfiles !== undefined) {
    if (!Array.isArray(trusted.productProfiles) || trusted.productProfiles.length > 4 || trusted.productProfiles.some(profile =>
      !validProfile(profile) || Buffer.byteLength(JSON.stringify(profile)) > 2048)) return "MALFORMED";
    if (trusted.productProfiles.some(profile => !fresh(profile, now) || profile.sourceVersion !== s.factSnapshotVersion ||
      !trusted.boundSubjects.some(subject => subject.kind === "PRODUCT" && subject.ref === profile.subjectRef) ||
      profile.contentHash !== hash(JSON.stringify(profile.details)))) return stale("PRODUCT_PROFILE");
  }
  if (trusted.cartBinding && (!Number.isSafeInteger(trusted.cartBinding.cartVersion) ||
    trusted.cartBinding.cartVersion < 0 || !trusted.boundSubjects.some(subject =>
      subject.kind === "CART" && subject.ref === trusted.cartBinding!.cartId))) return stale("CART_BINDING");
  if (trusted.runtimeProducts !== undefined) {
    if (!Array.isArray(trusted.runtimeProducts) || trusted.runtimeProducts.length > MAX_RUNTIME_PRODUCTS) return "MALFORMED";
    for (const p of trusted.runtimeProducts) {
      if (!record(p) || !boundedText(p.ref, 128) || !boundedText(p.subjectRef, 128) ||
        Buffer.byteLength(JSON.stringify(p)) > 8192 ||
        Object.keys(p).some(key => !["ref", "subjectRef", "attributes", "presentation", "sizeCharts", "content","selectionEvidence","offerReadCoverage"].includes(key)) ||
        (!p.attributes && !p.presentation && !p.sizeCharts?.length && !p.content&&!p.selectionEvidence?.length)) return "MALFORMED";
      if (!trusted.boundSubjects.some(subject => subject.kind === "PRODUCT" && subject.ref === p.subjectRef)) return stale("PRODUCT_BINDING");
      if(p.selectionEvidence&&(!Array.isArray(p.selectionEvidence)||p.selectionEvidence.length>MAX_SELECTION_OBSERVATIONS||p.selectionEvidence.some(e=>!validSelectionEvidence(e,p.subjectRef,now))))return stale("SELECTION_EVIDENCE");
      if(p.offerReadCoverage&&(!Array.isArray(p.offerReadCoverage)||p.offerReadCoverage.length>8||p.offerReadCoverage.some(o=>!record(o)||Object.keys(o).sort().join(',')!=="offerType,price,stock"||!boundedText(o.offerType,64)||!["AVAILABLE","UNAVAILABLE","NOT_READ"].includes(o.price)||!["AVAILABLE","UNAVAILABLE","NOT_READ"].includes(o.stock))))return "MALFORMED";
      const metadataFresh = (m: { observedAt: string; expiresAt: string | null; freshnessState: string }) =>
        m.freshnessState === "FRESH" && Number.isFinite(Date.parse(m.observedAt)) && Date.parse(m.observedAt) <= now.getTime() &&
        (m.expiresAt === null || Date.parse(m.expiresAt) > now.getTime());
      if (p.attributes && (!verifyProductAttributesV1(p.attributes, p.subjectRef) || !metadataFresh(p.attributes.metadata))) return stale("PRODUCT_ATTRIBUTES");
      if (p.content && (!ProductContentV1Schema.safeParse(p.content).success || !metadataFresh(p.content.metadata))) return stale("PRODUCT_CONTENT");
      if (p.presentation && (!verifyProductPresentationEvidenceV1(p.presentation, p.subjectRef) ||
        ![p.presentation.provenance.identity, p.presentation.provenance.content, p.presentation.provenance.inventory].every(metadataFresh))) return stale("PRODUCT_PRESENTATION");
      if (p.sizeCharts && (!Array.isArray(p.sizeCharts) || p.sizeCharts.length > 4 || p.sizeCharts.some(chart => {
        const parsed = SizeChartV1Schema.safeParse(chart);
        return !parsed.success || parsed.data.reference.verificationStatus !== "VERIFIED" ||
          !parsed.data.reference.verifiedAt || Date.parse(parsed.data.reference.verifiedAt) > now.getTime();
      }))) return stale("SIZE_CHART");
    }
  }
  const refs = [...trusted.boundSubjects.map(v => v.ref), ...claims.map(v => v.claimId),
    ...trusted.policyLiterals.map(v => v.ref), ...trusted.effectReceipts.map(v => v.ref), ...(trusted.productProfiles ?? []).map(v => v.ref),
    ...(trusted.runtimeProducts ?? []).map(v => v.ref)];
  if (new Set(refs).size !== refs.length) return "MALFORMED";
  return null;
}

function parseVerdict(result: unknown, trusted: TrustedContext, draft:string): {verdict:"PASS"|"FAIL"|"UNCERTAIN"; violations:SemanticViolation[]} | null {
  try {
    const text = typeof result === "string" ? result : JSON.stringify(result);
    if (typeof text !== "string" || Buffer.byteLength(text) > 4096) return null;
    const v = JSON.parse(text) as Record<string, unknown>;
    if (!v || Array.isArray(v) || Object.keys(v).sort().join(",") !== "verdict,violations" ||
      typeof v.verdict !== "string" || !["PASS", "FAIL", "UNCERTAIN"].includes(v.verdict) || !Array.isArray(v.violations) || v.violations.length > 16) return null;
    const claims = trusted.protectedClaims.flatMap(c => { const p = ProtectedClaimV1Schema.safeParse(c); return p.success ? [p.data.claimId] : []; });
    const refs = new Set([...claims, ...trusted.boundSubjects.map(v => v.ref), ...trusted.policyLiterals.map(v => v.ref),
      ...trusted.effectReceipts.map(v => v.ref), ...(trusted.productProfiles ?? []).map(v => v.ref),
      ...(trusted.runtimeProducts ?? []).map(v => v.ref)]);
    for (const violation of v.violations) {
      if (!violation || typeof violation !== "object" || Array.isArray(violation) ||
        !["kind,protectedRef","basis,excerpt,kind,protectedRef"].includes(Object.keys(violation).sort().join(",")) || !kinds.has(violation.kind) ||
        (violation.protectedRef !== null && !refs.has(violation.protectedRef))) return null;
      if (Object.hasOwn(violation,"excerpt") && (!boundedText(violation.excerpt,256) || !draft.includes(violation.excerpt) ||
        !boundedText(violation.basis,320) || hasResidualPii(violation.excerpt) || hasResidualPii(violation.basis))) return null;
    }
    if (v.verdict === "PASS" && v.violations.length > 0) return null;
    return {verdict:v.verdict as "PASS"|"FAIL"|"UNCERTAIN",violations:v.violations as SemanticViolation[]};
  } catch { return null; }
}

/** Call immediately before send eligibility with a current code-owned readback. */
export function finalGate(input: { expected: VerifierBinding; response: VerifierResponse;
  current: TrustedContext; finalDraft: string; now: Date; fallback?: { id: string; text: string };
  includeDiagnostic?: boolean }): TerminalOutcome {
  const { expected, response, current, finalDraft, now } = input;
  const stale = (check: NonNullable<TerminalOutcome["diagnostic"]>["check"], reasons: string[] = []): TerminalOutcome => ({
    ...terminal("HANDOFF", "STALE"), ...(input.includeDiagnostic ? { diagnostic: { check, checkedAtMs: Number.isFinite(now.getTime()) ? now.getTime() : null,
      expectedSnapshotId: expected.trustedSnapshotId, currentSnapshotId: makeBinding(expected.requestId, finalDraft, current).trustedSnapshotId,
      expectedRevision: expected.stateRevision, currentRevision: Number.isSafeInteger(current.state.revision) ? current.state.revision : null,
      reasonCodes: [...new Set(reasons)] } } : {}) });
  if (current.state.recipient !== expected.recipient) return terminal("NO_SEND", "RECIPIENT");
  let reasons: string[] = [];
  const problem = hardPrecheck(current, finalDraft, now, codes => { reasons = codes; });
  if (problem && ["PRIVACY", "PERMISSION", "RECIPIENT"].includes(problem)) return terminal("NO_SEND", problem);
  if (problem === "STALE") return stale("HARD_PRECHECK", reasons);
  if (problem) return { ...terminalFallback(input.fallback?.id, input.fallback?.text), reason: problem };
  if (response.kind !== "VERDICT") return { ...terminalFallback(input.fallback?.id, input.fallback?.text), reason: response.kind };
  const currentBinding = makeBinding(expected.requestId, finalDraft, current);
  if (expected.trustedSnapshotId !== currentBinding.trustedSnapshotId) {
    // Snapshot covers permissions, recipient, revision, binding, facts and receipts.
    return stale("CURRENT_SNAPSHOT");
  }
  for (const key of ["requestId", "finalDraftHash", "trustedSnapshotId", "stateRevision", "factSnapshotVersion", "recipient"] as const) {
    if (response.binding[key] !== expected[key] || currentBinding[key] !== expected[key]) return stale("RESPONSE_BINDING");
  }
  const parsed = parseVerdict(response.result, current, finalDraft);
  if (parsed?.verdict !== "PASS") return { ...terminalFallback(input.fallback?.id, input.fallback?.text), reason: parsed?.verdict ?? "MALFORMED",
    ...(input.includeDiagnostic && parsed?.violations.some(v=>v.excerpt) ? {semanticDiagnostic:parsed.violations} : {}) };
  return { disposition: "SEND_ELIGIBLE", reason: "PASS", text: finalDraft, fallbackId: null };
}
