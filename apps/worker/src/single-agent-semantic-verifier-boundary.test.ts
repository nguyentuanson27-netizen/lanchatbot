import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildProductAttributesV1 } from "@lana/business-tools";
import { finalGate, hardPrecheck, makeBinding, terminalFallback, type TrustedContext,
  type PostEffectRecoveryCompatibility } from "./single-agent-semantic-verifier-boundary.js";

const corpus = JSON.parse(readFileSync(new URL("../evals/single-agent-semantic-verifier/corpus-a2.json", import.meta.url), "utf8"));
const fixture = corpus.cases.find((c: { evaluator: { caseId: string } }) => c.evaluator.caseId === "safe-multipart").runtime;
const now = new Date(fixture.evaluationAt);
const draft: string = fixture.finalDraft;
const trusted: TrustedContext = fixture.trusted;
const binding = makeBinding("opaque-request", draft, trusted);
const pass = () => ({ kind: "VERDICT" as const, binding: structuredClone(binding), result: { verdict: "PASS", violations: [] } });
const gate = (response = pass(), current = structuredClone(trusted), currentDraft = draft, at = now, includeDiagnostic = false) =>
  finalGate({ expected: binding, response, current, finalDraft: currentDraft, now: at, includeDiagnostic });

describe("Phase B source evidence and absence", () => {
  it("allows a policy-only turn without inventing a product", () => {
    const t = { ...structuredClone(trusted), boundSubjects: [], protectedClaims: [],
      state: { ...trusted.state, currentProductId: null } };
    expect(hardPrecheck(t, "Shop áp dụng chính sách trong nguồn hiện tại.", now)).toBeNull();
  });
  it("rejects a claim for another variant of the same product", () => {
    const t = structuredClone(trusted);
    const claim = t.protectedClaims[0] as { scope: { productId: string; variantId: string | null } };
    claim.scope.variantId = "VARIANT-M";
    const scoped = { ...t, boundSubjects: t.boundSubjects.map(s => ({ ...s, variantId: "VARIANT-L" })) };
    expect(hardPrecheck(scoped, draft, now)).toBe("STALE");
  });
  it("checks existing source-owned attributes instead of accepting a fixture authority label", () => {
    const productId = trusted.state.currentProductId!;
    const attributes = buildProductAttributesV1({ productId, observedAt: now.toISOString(), data: {
      materials: ["cotton"], materialComponents: {}, colors: ["navy"], styles: [], silhouettes: [], occasions: [],
      designAttributes: null, careInstructions: null, wearProperties: null, backCoverage: null, designComplexity: null,
    } });
    const t = { ...structuredClone(trusted), runtimeProducts: [{ ref: "product-attributes-1", subjectRef: productId, attributes }] };
    expect(hardPrecheck(t, draft, now)).toBeNull();
    t.runtimeProducts[0]!.attributes.materials = ["silk"];
    expect(hardPrecheck(t, draft, now)).toBe("STALE");
  });
});

describe("Round41 truthful static fallback compatibility", () => {
  const fallback = { id: "C3_A_NONPROTECTED_V2", text: "Phần này em chưa trả lời được, chị nhé." };
  it("accepts only the exact code-owned V2 and retains historical V1", () => {
    expect(terminalFallback(fallback.id, fallback.text)).toEqual({ disposition: "FALLBACK", reason: "FAIL", text: fallback.text, fallbackId: fallback.id });
    expect(terminalFallback().fallbackId).toBe("C3_A_NONPROTECTED_V1");
    expect(terminalFallback(fallback.id, "Size M vừa chị nhé, đã tạo đơn.").disposition).toBe("NO_SEND");
  });
  it("uses selected V2 on failure without changing valid PASS or current-world authority", () => {
    const input = { expected: binding, current: trusted, finalDraft: draft, now, fallback };
    expect(finalGate({ ...input, response: { kind: "TIMEOUT" } })).toEqual({ disposition: "FALLBACK", reason: "TIMEOUT", text: fallback.text, fallbackId: fallback.id });
    expect(finalGate({ ...input, response: pass() }).disposition).toBe("SEND_ELIGIBLE");
    expect(finalGate({ ...input, current: { ...trusted, state: { ...trusted.state, recipient: "changed" } }, response: pass() }).disposition).toBe("NO_SEND");
  });
});

describe("Round4 current customer size binding", () => {
  const c = JSON.parse(readFileSync(new URL("../evals/single-agent-semantic-verifier/round-4/corpus-a3.json", import.meta.url), "utf8")).cases[0].runtime;
  const text = "Em chọn ST411 M.";
  it("accepts the existing engine's current measurement-bound claim", () => {
    expect(hardPrecheck(c.trusted, text, new Date(c.evaluationAt))).toBeNull();
  });
  it.each(["customerProfileId", "customerProfileRevision", "measurementFingerprint"])("rejects missing or mismatched current %s", key => {
    const t = structuredClone(c.trusted);
    t.state[key] = key === "customerProfileRevision" ? 2 : "changed";
    expect(hardPrecheck(t, text, new Date(c.evaluationAt))).toBe("STALE");
    delete t.state[key];
    expect(hardPrecheck(t, text, new Date(c.evaluationAt))).toBe("STALE");
  });
});

describe("Round3 bounded synthetic fashion authority", () => {
  const corpus3 = JSON.parse(readFileSync(new URL("../evals/single-agent-semantic-verifier/round-3/corpus-a2.json", import.meta.url), "utf8"));
  const r = corpus3.cases.find((c: { evaluator: { caseId: string } }) => c.evaluator.caseId === "fashion-safe-chart").runtime;
  const check = (current = structuredClone(r.trusted), at = new Date(r.evaluationAt)) => hardPrecheck(current, r.finalDraft, at);
  it("accepts current source-bound profile data", () => expect(check()).toBeNull());
  it.each(["subjectRef", "sourceVersion", "contentHash"])("rejects changed profile %s", key => {
    const t = structuredClone(r.trusted);t.productProfiles[0][key] = key === "contentHash" ? "0".repeat(64) : "wrong";
    expect(check(t)).toBe("STALE");
  });
  it("rejects expired profile while other facts are still fresh", () => {
    const t = structuredClone(r.trusted);t.productProfiles[0].expiresAt = r.evaluationAt;
    expect(check(t)).toBe("STALE");
  });
  it("rejects wrong authority/shape and unbounded data", () => {
    const t = structuredClone(r.trusted);t.productProfiles[0].authority = "CUSTOMER";
    expect(check(t)).toBe("MALFORMED");
    const oversized = structuredClone(r.trusted);oversized.productProfiles[0].details.material = "x".repeat(2049);
    expect(check(oversized)).toBe("MALFORMED");
  });
  it("profile expires after verifier PASS before final eligibility", () => {
    const t = structuredClone(r.trusted);t.productProfiles[0].expiresAt = "2026-10-06T03:00:01.000Z";
    const b = makeBinding("opaque", r.finalDraft, t);
    expect(finalGate({ expected: b, response: { kind: "VERDICT", binding: b, result: { verdict: "PASS", violations: [] } }, current: t,
      finalDraft: r.finalDraft, now: new Date("2026-10-06T03:00:01.000Z") }).disposition).toBe("HANDOFF");
  });
  it("changed current catalog content cannot reuse earlier PASS even with a new valid content hash", () => {
    const t = structuredClone(r.trusted), b = makeBinding("opaque", r.finalDraft, t);
    t.productProfiles[0].details.material = "Different material";
    t.productProfiles[0].contentHash = createHash("sha256").update(JSON.stringify(t.productProfiles[0].details)).digest("hex");
    expect(check(t)).toBeNull();
    expect(finalGate({ expected: b, response: { kind: "VERDICT", binding: b, result: { verdict: "PASS", violations: [] } }, current: t,
      finalDraft: r.finalDraft, now: new Date(r.evaluationAt) }).disposition).toBe("HANDOFF");
  });
  it("known profile refs can appear in semantic violations", () => {
    const t = structuredClone(r.trusted), b = makeBinding("opaque", r.finalDraft, t);
    expect(finalGate({ expected: b, response: { kind: "VERDICT", binding: b, result: { verdict: "FAIL", violations: [{ kind: "SUBJECT_MISMATCH", protectedRef: t.productProfiles[0].ref }] } },
      current: t, finalDraft: r.finalDraft, now: new Date(r.evaluationAt) }).reason).toBe("FAIL");
  });
});

describe("Phase B bounded final-gate diagnostics", () => {
  it("preserves the legacy terminal JSON when diagnostic output is not requested", () => {
    expect(gate(pass(), structuredClone(trusted), draft, new Date("2026-10-05T03:05:00Z"))).toEqual({
      disposition: "HANDOFF", reason: "STALE", text: null, fallbackId: null,
    });
  });
  it("distinguishes a fact expiring after verifier PASS without exposing source or recipient data", () => {
    const current = structuredClone(trusted), expiredAt = new Date(now.getTime() + 1000);
    const claim = current.protectedClaims[0] as { claimId: string; provenance: { expiresAt: string; evidenceRef: string; sourceVersion: string } };
    claim.provenance.expiresAt = expiredAt.toISOString();
    current.state.recipient = "private-recipient-diagnostic-test";
    current.policyLiterals[0]!.text = "Private source text must not appear in a terminal diagnostic.";
    const ownBinding = makeBinding("expiry-request", draft, current);
    expect(hardPrecheck(current, draft, now)).toBeNull();
    const outcome = finalGate({ expected: ownBinding, response: { ...pass(), binding: ownBinding }, current, finalDraft: draft, now: expiredAt, includeDiagnostic: true });
    expect(outcome).toEqual({ disposition: "HANDOFF", reason: "STALE", text: null, fallbackId: null,
      diagnostic: { check: "HARD_PRECHECK", checkedAtMs: expiredAt.getTime(), expectedSnapshotId: ownBinding.trustedSnapshotId,
        currentSnapshotId: ownBinding.trustedSnapshotId, expectedRevision: ownBinding.stateRevision, currentRevision: current.state.revision,
        reasonCodes: ["PROTECTED_CLAIM_STALE"] } });
    for (const secret of [current.state.recipient, draft, current.policyLiterals[0]!.text,
      claim.claimId, claim.provenance.evidenceRef, claim.provenance.sourceVersion]) {
      expect(JSON.stringify(outcome)).not.toContain(secret);
    }
  });
  it.each(["snapshot", "revision"] as const)("distinguishes a changed current %s from expired evidence", change => {
    const current = structuredClone(trusted);
    if (change === "revision") current.state.revision++;
    else current.policyLiterals[0]!.text = "Different current policy source text.";
    expect(hardPrecheck(current, draft, now)).toBeNull();
    const currentBinding = makeBinding(binding.requestId, draft, current);
    expect(currentBinding.trustedSnapshotId).not.toBe(binding.trustedSnapshotId);
    expect(gate(pass(), current, draft, now, true)).toEqual({ disposition: "HANDOFF", reason: "STALE", text: null, fallbackId: null,
      diagnostic: { check: "CURRENT_SNAPSHOT", checkedAtMs: now.getTime(), expectedSnapshotId: binding.trustedSnapshotId,
        currentSnapshotId: currentBinding.trustedSnapshotId, expectedRevision: binding.stateRevision, currentRevision: current.state.revision,
        reasonCodes: [] } });
  });
  it("distinguishes a replayed response binding while the current snapshot remains valid and unchanged", () => {
    const response = pass();
    response.binding.requestId = "another-request";
    expect(hardPrecheck(trusted, draft, now)).toBeNull();
    expect(gate(response, structuredClone(trusted), draft, now, true)).toEqual({ disposition: "HANDOFF", reason: "STALE", text: null, fallbackId: null,
      diagnostic: { check: "RESPONSE_BINDING", checkedAtMs: now.getTime(), expectedSnapshotId: binding.trustedSnapshotId,
        currentSnapshotId: binding.trustedSnapshotId, expectedRevision: binding.stateRevision, currentRevision: trusted.state.revision,
        reasonCodes: [] } });
  });
});

describe("isolated deterministic verifier boundary", () => {
  it("valid PASS with unchanged exact snapshot and draft is send eligible", () => {
    expect(gate()).toEqual({ disposition: "SEND_ELIGIBLE", reason: "PASS", text: draft, fallbackId: null });
  });
  it.each([null, {}, { verdict: "YES", violations: [] }, { verdict: "PASS", violations: [], rewrite: "new reply" },
    { verdict: "PASS", violations: "none" }])("rejects malformed verdict %j", (result) => {
    expect(finalGate({ expected: binding, response: { ...pass(), result }, current: trusted, finalDraft: draft, now }).disposition).toBe("FALLBACK");
  });
  it("PASS with violations cannot authorize", () => {
    const response = pass();
    const result = { verdict: "PASS", violations: [{ kind: "SUBJECT_MISMATCH", protectedRef: "SQ9012" }] };
    expect(finalGate({ expected: binding, response: { ...response, result }, current: trusted, finalDraft: draft, now }).reason).toBe("MALFORMED");
  });
  it("unknown protectedRef rejects even in a FAIL verdict", () => {
    const result = { verdict: "FAIL", violations: [{ kind: "SUBJECT_MISMATCH", protectedRef: "fake-ref" }] };
    expect(finalGate({ expected: binding, response: { ...pass(), result }, current: trusted, finalDraft: draft, now }).reason).toBe("MALFORMED");
  });
  it.each(["requestId", "finalDraftHash", "trustedSnapshotId", "factSnapshotVersion"] as const)("rejects replayed %s", (key) => {
    const response = pass();
    response.binding[key] = "changed";
    expect(gate(response).disposition).toBe("HANDOFF");
  });
  it("rejects changed exact final draft", () => expect(gate(pass(), structuredClone(trusted), draft + "!").disposition).toBe("HANDOFF"));
  it("fact expiry after verdict invalidates PASS at final gate", () => {
    expect(gate(pass(), structuredClone(trusted), draft, new Date("2026-10-05T03:05:00Z")).reason).toBe("STALE");
  });
  it.each(["revision", "bindingVersion", "factSnapshotVersion"])("rechecks current %s", (key) => {
    const current = structuredClone(trusted);
    current.state[key] = key === "revision" ? 2 : "changed";
    expect(gate(pass(), current).disposition).toBe("HANDOFF");
  });
  it("rechecks subject binding", () => {
    const current = structuredClone(trusted);
    current.boundSubjects[0]!.ref = "SQ9020";
    expect(gate(pass(), current).disposition).toBe("HANDOFF");
  });
  it.each(["permission", "privacyAllowed", "recipient", "conversationOwner"])("rechecks current %s", (key) => {
    const current = structuredClone(trusted);
    current.state[key] = key === "recipient" ? "other-recipient" : key === "conversationOwner" ? "HUMAN" : false;
    expect(gate(pass(), current).disposition).toBe("NO_SEND");
  });
  it("rechecks privacy of exact final text", () => {
    const privateDraft = "Liên hệ private@example.com";
    const ownBinding = makeBinding("opaque", privateDraft, trusted);
    expect(finalGate({ expected: ownBinding, response: { ...pass(), binding: ownBinding }, current: trusted, finalDraft: privateDraft, now }).reason).toBe("PRIVACY");
  });
  it.each(["TIMEOUT", "PROVIDER_ERROR"] as const)("%s fails closed without a model fallback", (kind) => {
    expect(finalGate({ expected: binding, response: { kind }, current: trusted, finalDraft: draft, now }).disposition).toBe("FALLBACK");
  });
  it.each(["FAIL", "UNCERTAIN"])("%s uses exact frozen fallback", (verdict) => {
    expect(finalGate({ expected: binding, response: { ...pass(), result: { verdict, violations: [] } }, current: trusted, finalDraft: draft, now }).fallbackId).toBe("C3_A_NONPROTECTED_V1");
  });
  it("unverified fallback containing a protected assertion is rejected by exact code-owned identity", () => {
    expect(terminalFallback("C3_A_NONPROTECTED_V1", "Em đã chốt đơn cho chị.").disposition).toBe("NO_SEND");
    expect(terminalFallback("unknown", "hello").disposition).toBe("NO_SEND");
  });
  it("rechecks a relevant effect receipt, recipient and revision", () => {
    const current: TrustedContext = structuredClone(corpus.cases.find((c: { evaluator: { caseId: string } }) => c.evaluator.caseId === "safe-receipt").runtime.trusted);
    expect(hardPrecheck(current, draft, now)).toBeNull();
    current.effectReceipts[0]!.status = "PENDING";
    const ownBinding = makeBinding("opaque", draft, current);
    expect(finalGate({ expected: ownBinding, response: { ...pass(), binding: ownBinding }, current, finalDraft: draft, now }).disposition).toBe("HANDOFF");
  });
  it("receipt-backed later recovery is representable as a compatibility type only", () => {
    const compatibility = { receiptRef: "receipt-1", effectReplayAllowed: false } satisfies PostEffectRecoveryCompatibility;
    expect(compatibility.effectReplayAllowed).toBe(false);
  });
});

it("accepts exact media next-step fallback without accepting protected additions",()=>{
 expect(terminalFallback("C3_B_MEDIA_NEXT_STEP_V1").disposition).toBe("FALLBACK");
 expect(terminalFallback("C3_B_MEDIA_NEXT_STEP_V1","Em đã gửi ảnh khách mặc cho chị.").disposition).toBe("NO_SEND");
 const fallback={id:"C3_B_MEDIA_NEXT_STEP_V1",text:terminalFallback("C3_B_MEDIA_NEXT_STEP_V1").text!};
 expect(finalGate({expected:binding,current:{...trusted,state:{...trusted.state,recipient:"changed"}},response:pass(),finalDraft:draft,now,fallback}).disposition).toBe("NO_SEND");
});
