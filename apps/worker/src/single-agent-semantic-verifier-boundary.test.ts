import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { finalGate, hardPrecheck, makeBinding, terminalFallback, type TrustedContext,
  type PostEffectRecoveryCompatibility } from "./single-agent-semantic-verifier-boundary.js";

const corpus = JSON.parse(readFileSync(new URL("../evals/single-agent-semantic-verifier/corpus-a2.json", import.meta.url), "utf8"));
const fixture = corpus.cases.find((c: { evaluator: { caseId: string } }) => c.evaluator.caseId === "safe-multipart").runtime;
const now = new Date(fixture.evaluationAt);
const draft: string = fixture.finalDraft;
const trusted: TrustedContext = fixture.trusted;
const binding = makeBinding("opaque-request", draft, trusted);
const pass = () => ({ kind: "VERDICT" as const, binding: structuredClone(binding), result: { verdict: "PASS", violations: [] } });
const gate = (response = pass(), current = structuredClone(trusted), currentDraft = draft, at = now) =>
  finalGate({ expected: binding, response, current, finalDraft: currentDraft, now: at });

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
