import { describe, expect, it } from "vitest";
import {
  RuntimeBehaviorModeResolver,
  behaviorModeContentHash,
  type RuntimeBehaviorModeAuditEvent,
  type RuntimeBehaviorModePointer,
  type RuntimeBehaviorModeSourcePort,
} from "./runtime-behavior-mode-resolver.js";

const pageId = "1198992073286645";
const channel = "MESSENGER";
const baseTime = "2026-08-03T00:00:00.000Z";
function pointer(mode: "LEGACY" | "V2_SHADOW" | "V2_ACTIVE" | "CLARIFY_ONLY", revision = 1): RuntimeBehaviorModePointer {
  const payload = { confirmationMode: mode, salesAuthorityMode: "LEGACY" as const, stateReadMode: "LEGACY" as const };
  return {
    version: {
      schemaVersion: 1,
      modeVersionId: `10000000-0000-4000-8000-00000000000${revision}`,
      pageId,
      channel,
      ...payload,
      contentHash: behaviorModeContentHash(payload),
      createdBy: "operator",
      reason: "test",
      createdAt: baseTime,
    },
    pointerRevision: revision,
    updatedBy: "operator",
    reason: "test",
    updatedAt: baseTime,
  };
}
class MutableSource implements RuntimeBehaviorModeSourcePort {
  value: RuntimeBehaviorModePointer | null = pointer("LEGACY");
  failure = false;
  calls = 0;
  audits: RuntimeBehaviorModeAuditEvent[] = [];
  auditFailure = false;
  async loadActiveMode(): Promise<RuntimeBehaviorModePointer | null> {
    this.calls += 1;
    if (this.failure) throw new Error("database unavailable");
    return this.value;
  }
  async recordResolution(event: RuntimeBehaviorModeAuditEvent): Promise<void> {
    if (this.auditFailure) throw new Error("audit unavailable");
    this.audits.push(event);
  }
}
function input(nowMs = 0) {
  return {
    resolutionId: `20000000-0000-4000-8000-00000000000${nowMs}`,
    pageId,
    channel,
    workerId: "worker-1",
    now: new Date(Date.parse(baseTime) + nowMs),
  };
}

describe("RuntimeBehaviorModeResolver", () => {
  it("propagates a CAS pointer switch within the bounded five-second cache", async () => {
    const source = new MutableSource();
    const resolver = new RuntimeBehaviorModeResolver(source, { cacheTtlMs: 5_000, allowedPageIds: [pageId] });
    expect(await resolver.resolve(input())).toMatchObject({ confirmationMode: "LEGACY", source: "DATABASE" });
    source.value = pointer("V2_SHADOW", 2);
    expect(await resolver.resolve(input(4_999))).toMatchObject({ confirmationMode: "LEGACY", source: "CACHE" });
    expect(await resolver.resolve(input(5_000))).toMatchObject({
      confirmationMode: "V2_SHADOW",
      source: "DATABASE",
      pointerRevision: 2,
      auditWrite: "RECORDED",
    });
    expect(source.calls).toBe(2);
    expect(source.audits).toHaveLength(3);
  });

  it("uses LKG for at most five minutes then fails safe to CLARIFY_ONLY", async () => {
    const source = new MutableSource();
    source.value = pointer("V2_ACTIVE");
    const resolver = new RuntimeBehaviorModeResolver(source, {
      cacheTtlMs: 100,
      lastKnownGoodTtlMs: 300_000,
      allowedPageIds: [pageId],
    });
    await resolver.resolve(input());
    source.failure = true;
    expect(await resolver.resolve(input(101))).toMatchObject({
      confirmationMode: "V2_ACTIVE", source: "LAST_KNOWN_GOOD", status: "FALLBACK",
    });
    expect(await resolver.resolve(input(300_001))).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", source: "FAIL_SAFE", status: "FALLBACK",
      salesAuthorityMode: "LEGACY", stateReadMode: "LEGACY",
    });
  });

  it("rejects a tampered hash and never activates non-confirmation tracks", async () => {
    const source = new MutableSource();
    source.value = { ...pointer("V2_ACTIVE"), version: { ...pointer("V2_ACTIVE").version, contentHash: `sha256:${"f".repeat(64)}` } };
    expect(await new RuntimeBehaviorModeResolver(source).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", source: "FAIL_SAFE",
    });
    source.value = { ...pointer("V2_ACTIVE"), version: { ...pointer("V2_ACTIVE").version, salesAuthorityMode: "COMMERCE" } };
    expect(await new RuntimeBehaviorModeResolver(source).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", source: "FAIL_SAFE",
      salesAuthorityMode: "LEGACY",
    });
  });

  it("fails safe when the required per-command resolution audit cannot be written", async () => {
    const source = new MutableSource();
    source.value = pointer("V2_ACTIVE");
    source.auditFailure = true;
    expect(await new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [pageId],
    }).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", source: "FAIL_SAFE", auditWrite: "FAILED",
      reasonCodes: ["RUNTIME_BEHAVIOR_AUDIT_FAILED"],
    });
  });

  it("hard-gates V2_ACTIVE to the configured canary page while permitting side-effect-free shadow", async () => {
    const source = new MutableSource();
    source.value = pointer("V2_ACTIVE");
    source.value = {
      ...source.value,
      version: { ...source.value.version, pageId: "other-page" },
    };
    const result = await new RuntimeBehaviorModeResolver(source, { allowedPageIds: [pageId] }).resolve({
      ...input(), pageId: "other-page",
    });
    expect(result).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      status: "REJECTED",
      source: "FAIL_SAFE",
      reasonCodes: ["RUNTIME_BEHAVIOR_ACTIVE_PAGE_NOT_ALLOWED"],
    });
    expect(source.calls).toBe(1);

    source.value = pointer("V2_SHADOW", 2);
    const shadow = await new RuntimeBehaviorModeResolver(source, { allowedPageIds: [] }).resolve(input(10));
    expect(shadow).toMatchObject({ confirmationMode: "V2_SHADOW", status: "RESOLVED" });
  });

  it("fails closed when V2_ACTIVE is selected with an empty canary allowlist", async () => {
    const source = new MutableSource();
    source.value = pointer("V2_ACTIVE");
    expect(await new RuntimeBehaviorModeResolver(source, { allowedPageIds: [] }).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", status: "REJECTED", source: "FAIL_SAFE",
    });
  });
});
