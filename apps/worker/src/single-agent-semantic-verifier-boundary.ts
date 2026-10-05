import { createHash } from "node:crypto";
import { ProtectedClaimV1Schema } from "@lana/contracts";
import { hasResidualPii } from "@lana/dataset-review";
import { authorizeRealtimeProtectedClaimProposal } from "./realtime-protected-claim-boundary.js";

// Isolated Checkpoint-A mechanics. No provider, tool, mutation or send interface.
export interface TrustedContext {
  boundSubjects: { ref: string; kind: string; label: string; bindingVersion: string }[];
  protectedClaims: unknown[];
  policyLiterals: { ref: string; text: string; sourceVersion: string; observedAt: string; expiresAt: string }[];
  effectReceipts: { ref: string; operationId: string; subjectRef: string; status: string; effect: string;
    stateRevision: number; recipient: string; observedAt: string; expiresAt: string }[];
  state: { [key: string]: unknown; conversationOwner: string; revision: number; currentProductId: string;
    factSnapshotVersion: string; bindingVersion: string; recipient: string; permission: boolean; privacyAllowed: boolean };
}
export interface VerifierBinding {
  requestId: string; finalDraftHash: string; trustedSnapshotId: string;
  stateRevision: number; factSnapshotVersion: string; recipient: string;
}
export type VerifierResponse = { kind: "VERDICT"; binding: VerifierBinding; result: unknown }
  | { kind: "TIMEOUT" | "PROVIDER_ERROR" };
export interface TerminalOutcome {
  disposition: "SEND_ELIGIBLE" | "FALLBACK" | "HANDOFF" | "NO_SEND";
  reason: string; text: string | null; fallbackId: string | null;
}
export interface PostEffectRecoveryCompatibility { receiptRef: string; effectReplayAllowed: false }
const FALLBACK_ID = "C3_A_NONPROTECTED_V1";
const FALLBACK_TEXT = "Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.";
const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const kinds = new Set(["UNSUPPORTED_PROTECTED_ASSERTION", "SUBJECT_MISMATCH", "CONTRADICTION_OR_NEGATION",
  "MATERIAL_CONDITION_LOSS", "POLICY_OR_BENEFIT_STRENGTHENING", "EFFECT_WITHOUT_RECEIPT",
  "STALE_OR_SUPERSEDED_MEANING", "OTHER_PROTECTED_SEMANTIC_RISK"]);
const terminal = (disposition: TerminalOutcome["disposition"], reason: string): TerminalOutcome =>
  ({ disposition, reason, text: null, fallbackId: null });

export function terminalFallback(id = FALLBACK_ID, text = FALLBACK_TEXT): TerminalOutcome {
  return id === FALLBACK_ID && text === FALLBACK_TEXT
    ? { disposition: "FALLBACK", reason: "FAIL", text: FALLBACK_TEXT, fallbackId: FALLBACK_ID }
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
export function hardPrecheck(trusted: TrustedContext, draft: string, now: Date): string | null {
  const s = trusted.state;
  if (!Number.isFinite(now.getTime())) return "STALE";
  if (s.privacyAllowed !== true || hasResidualPii(draft)) return "PRIVACY";
  if (s.permission !== true || s.conversationOwner !== "BOT") return "PERMISSION";
  if (typeof s.recipient !== "string" || s.recipient.length === 0) return "RECIPIENT";
  if (!draft.trim() || Buffer.byteLength(draft) > 4096 || Buffer.byteLength(JSON.stringify(trusted)) > 32768 ||
    trusted.boundSubjects.length > 8 || trusted.protectedClaims.length > 32 || trusted.effectReceipts.length > 8) return "MALFORMED";
  if (!Number.isSafeInteger(s.revision) || s.revision < 0 || !s.factSnapshotVersion || !s.bindingVersion ||
    !trusted.boundSubjects.some(subject => subject.ref === s.currentProductId) ||
    trusted.boundSubjects.some(subject => subject.bindingVersion !== s.bindingVersion)) return "STALE";
  const parsed = trusted.protectedClaims.map(claim => ProtectedClaimV1Schema.safeParse(claim));
  if (parsed.some(claim => !claim.success)) return "MALFORMED";
  const claims = parsed.flatMap(claim => claim.success ? [claim.data] : []);
  const authorization = authorizeRealtimeProtectedClaimProposal({
    declaredClaimIds: claims.map(claim => claim.claimId), observedClaimTypes: [], availableClaims: claims,
    expectedProductIds: trusted.boundSubjects.filter(subject => subject.kind === "PRODUCT").map(subject => subject.ref), now,
  });
  if (authorization.outcome !== "AUTHORIZED") return "STALE";
  if (trusted.policyLiterals.some(policy => !fresh(policy, now))) return "STALE";
  if (trusted.effectReceipts.some(receipt => !fresh(receipt, now) || receipt.status !== "SUCCESS" ||
    receipt.recipient !== s.recipient || receipt.stateRevision !== s.revision ||
    !trusted.boundSubjects.some(subject => subject.ref === receipt.subjectRef))) return "STALE";
  const refs = [...trusted.boundSubjects.map(v => v.ref), ...claims.map(v => v.claimId),
    ...trusted.policyLiterals.map(v => v.ref), ...trusted.effectReceipts.map(v => v.ref)];
  if (new Set(refs).size !== refs.length) return "MALFORMED";
  return null;
}

function parseVerdict(result: unknown, trusted: TrustedContext): "PASS" | "FAIL" | "UNCERTAIN" | null {
  try {
    const text = typeof result === "string" ? result : JSON.stringify(result);
    if (typeof text !== "string" || Buffer.byteLength(text) > 4096) return null;
    const v = JSON.parse(text) as Record<string, unknown>;
    if (!v || Array.isArray(v) || Object.keys(v).sort().join(",") !== "verdict,violations" ||
      typeof v.verdict !== "string" || !["PASS", "FAIL", "UNCERTAIN"].includes(v.verdict) || !Array.isArray(v.violations) || v.violations.length > 16) return null;
    const claims = trusted.protectedClaims.flatMap(c => { const p = ProtectedClaimV1Schema.safeParse(c); return p.success ? [p.data.claimId] : []; });
    const refs = new Set([...claims, ...trusted.boundSubjects.map(v => v.ref), ...trusted.policyLiterals.map(v => v.ref), ...trusted.effectReceipts.map(v => v.ref)]);
    for (const violation of v.violations) {
      if (!violation || typeof violation !== "object" || Array.isArray(violation) ||
        Object.keys(violation).sort().join(",") !== "kind,protectedRef" || !kinds.has(violation.kind) ||
        (violation.protectedRef !== null && !refs.has(violation.protectedRef))) return null;
    }
    if (v.verdict === "PASS" && v.violations.length > 0) return null;
    return v.verdict as "PASS" | "FAIL" | "UNCERTAIN";
  } catch { return null; }
}

/** Call immediately before send eligibility with a current code-owned readback. */
export function finalGate(input: { expected: VerifierBinding; response: VerifierResponse;
  current: TrustedContext; finalDraft: string; now: Date }): TerminalOutcome {
  const { expected, response, current, finalDraft, now } = input;
  if (current.state.recipient !== expected.recipient) return terminal("NO_SEND", "RECIPIENT");
  const problem = hardPrecheck(current, finalDraft, now);
  if (problem && ["PRIVACY", "PERMISSION", "RECIPIENT"].includes(problem)) return terminal("NO_SEND", problem);
  if (problem === "STALE") return terminal("HANDOFF", "STALE");
  if (problem) return { ...terminalFallback(), reason: problem };
  if (response.kind !== "VERDICT") return { ...terminalFallback(), reason: response.kind };
  const currentBinding = makeBinding(expected.requestId, finalDraft, current);
  if (expected.trustedSnapshotId !== currentBinding.trustedSnapshotId) {
    // Snapshot covers permissions, recipient, revision, binding, facts and receipts.
    return terminal("HANDOFF", "STALE");
  }
  for (const key of ["requestId", "finalDraftHash", "trustedSnapshotId", "stateRevision", "factSnapshotVersion", "recipient"] as const) {
    if (response.binding[key] !== expected[key] || currentBinding[key] !== expected[key]) return terminal("HANDOFF", "STALE");
  }
  const verdict = parseVerdict(response.result, current);
  if (verdict !== "PASS") return { ...terminalFallback(), reason: verdict ?? "MALFORMED" };
  return { disposition: "SEND_ELIGIBLE", reason: "PASS", text: finalDraft, fallbackId: null };
}
