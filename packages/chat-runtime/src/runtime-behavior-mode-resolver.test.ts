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

function commercePointer(revision = 1): RuntimeBehaviorModePointer {
  const payload = {
    confirmationMode: "V2_ACTIVE" as const,
    salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const,
    authorityBundleHash: "a".repeat(64),
  };
  return {
    ...pointer("V2_ACTIVE", revision),
    version: {
      ...pointer("V2_ACTIVE", revision).version,
      ...payload,
      contentHash: behaviorModeContentHash(payload),
    },
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
    expect(await new RuntimeBehaviorModeResolver(source, { allowedPageIds: [pageId] }).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", source: "FAIL_SAFE",
      salesAuthorityMode: "LEGACY",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_LKG_EXPIRED", "RUNTIME_BEHAVIOR_COMMERCE_STALE_AUTHORITY"],
    });
  });

  it("rejects a COMMERCE pointer unless an explicitly scoped validation-only consumer admits it", async () => {
    const source = new MutableSource();
    source.value = commercePointer();

    expect(await new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [pageId],
    }).resolve(input())).toMatchObject({
      source: "FAIL_SAFE",
      status: "REJECTED",
      salesAuthorityMode: "LEGACY",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_PAGE_NOT_ALLOWED"],
    });

    expect(await new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [pageId],
      allowedCommercePageIds: [pageId],
    }).resolve(input())).toMatchObject({
      source: "FAIL_SAFE",
      status: "REJECTED",
      salesAuthorityMode: "LEGACY",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_UNAVAILABLE"],
    });

    expect(await new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [pageId],
      allowedCommercePageIds: [pageId],
      commerceAuthorityConsumer: {
        async admitCommerceAuthority() {
          return { status: "ADMITTED" };
        },
      },
    }).resolve(input())).toMatchObject({
      source: "DATABASE",
      status: "RESOLVED",
      salesAuthorityMode: "COMMERCE",
      authorityProvenance: "COMMERCE_POINTER",
      authorityBundleHash: "a".repeat(64),
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

  it("preserves COMMERCE provenance when a validated COMMERCE resolution cannot be audited", async () => {
    const source = new MutableSource();
    source.value = commercePointer();
    source.auditFailure = true;

    expect(await new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [pageId],
      allowedCommercePageIds: [pageId],
      commerceAuthorityConsumer: {
        async admitCommerceAuthority() {
          return { status: "ADMITTED" };
        },
      },
    }).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      source: "FAIL_SAFE",
      auditWrite: "FAILED",
      salesAuthorityMode: "LEGACY",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_AUDIT_FAILED", "RUNTIME_BEHAVIOR_AUDIT_FAILED"],
    });
  });

  it("preserves COMMERCE provenance when confirmation page scope rejects an otherwise admitted COMMERCE pointer", async () => {
    const source = new MutableSource();
    source.value = commercePointer();

    expect(await new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [],
      allowedCommercePageIds: [pageId],
      commerceAuthorityConsumer: {
        async admitCommerceAuthority() {
          return { status: "ADMITTED" };
        },
      },
    }).resolve(input())).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      source: "FAIL_SAFE",
      status: "REJECTED",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: [
        "RUNTIME_BEHAVIOR_ACTIVE_PAGE_NOT_ALLOWED",
        "RUNTIME_BEHAVIOR_COMMERCE_CONFIRMATION_PAGE_NOT_ALLOWED",
      ],
    });
  });

  it("preserves COMMERCE provenance after a last-known-good COMMERCE pointer expires", async () => {
    const source = new MutableSource();
    source.value = commercePointer();
    const resolver = new RuntimeBehaviorModeResolver(source, {
      cacheTtlMs: 100,
      lastKnownGoodTtlMs: 300_000,
      allowedPageIds: [pageId],
      allowedCommercePageIds: [pageId],
      commerceAuthorityConsumer: {
        async admitCommerceAuthority() {
          return { status: "ADMITTED" };
        },
      },
    });

    await resolver.resolve(input());
    source.failure = true;
    expect(await resolver.resolve(input(300_001))).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      source: "FAIL_SAFE",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_LKG_EXPIRED", "RUNTIME_BEHAVIOR_COMMERCE_STALE_AUTHORITY"],
    });
  });

  it("records a refused COMMERCE pointer while serving LEGACY LKG and remains fail-closed after expiry", async () => {
    const source = new MutableSource();
    source.value = pointer("LEGACY", 5);
    const resolver = new RuntimeBehaviorModeResolver(source, {
      cacheTtlMs: 100,
      lastKnownGoodTtlMs: 300_000,
    });

    await resolver.resolve(input());
    source.value = commercePointer(3);

    expect(await resolver.resolve(input(101))).toMatchObject({
      salesAuthorityMode: "LEGACY",
      source: "LAST_KNOWN_GOOD",
      authorityProvenance: "LEGACY_POINTER",
      reasonCodes: [
        "RUNTIME_BEHAVIOR_SOURCE_UNAVAILABLE",
        "RUNTIME_BEHAVIOR_COMMERCE_SOURCE_REFUSED",
      ],
    });
    expect(source.audits.at(-1)?.reasonCodes).toEqual([
      "RUNTIME_BEHAVIOR_SOURCE_UNAVAILABLE",
      "RUNTIME_BEHAVIOR_COMMERCE_SOURCE_REFUSED",
    ]);

    expect(await resolver.resolve(input(300_001))).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      source: "FAIL_SAFE",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: [
        "RUNTIME_BEHAVIOR_LKG_EXPIRED",
        "RUNTIME_BEHAVIOR_COMMERCE_STALE_AUTHORITY",
      ],
    });
  });

  it("keeps an expired COMMERCE LKG fail-closed when the current LEGACY pointer is invalid", async () => {
    const source = new MutableSource();
    source.value = commercePointer(5);
    const resolver = new RuntimeBehaviorModeResolver(source, {
      cacheTtlMs: 100,
      lastKnownGoodTtlMs: 300_000,
      allowedPageIds: [pageId],
      allowedCommercePageIds: [pageId],
      commerceAuthorityConsumer: {
        async admitCommerceAuthority() {
          return { status: "ADMITTED" };
        },
      },
    });

    await resolver.resolve(input());
    source.value = pointer("LEGACY", 3);

    expect(await resolver.resolve(input(300_001))).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      source: "FAIL_SAFE",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: [
        "RUNTIME_BEHAVIOR_LKG_EXPIRED",
        "RUNTIME_BEHAVIOR_COMMERCE_STALE_AUTHORITY",
      ],
    });
  });

  it("bounds validation-only COMMERCE consumer admission and fails closed on timeout", async () => {
    const source = new MutableSource();
    source.value = commercePointer();
    const resolver = new RuntimeBehaviorModeResolver(source, {
      allowedPageIds: [pageId],
      allowedCommercePageIds: [pageId],
      commerceConsumerTimeoutMs: 5,
      commerceAuthorityConsumer: {
        async admitCommerceAuthority() {
          return new Promise(() => undefined);
        },
      },
    });

    const result = await Promise.race([
      resolver.resolve(input()),
      new Promise<"TEST_TIMEOUT">((resolve) => setTimeout(() => resolve("TEST_TIMEOUT"), 100)),
    ]);
    expect(result).toMatchObject({
      confirmationMode: "CLARIFY_ONLY",
      source: "FAIL_SAFE",
      status: "REJECTED",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_TIMEOUT"],
    });

    expect(() => new RuntimeBehaviorModeResolver(source, {
      commerceConsumerTimeoutMs: 0,
    })).toThrow("RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_TIMEOUT_INVALID");
    expect(() => new RuntimeBehaviorModeResolver(source, {
      commerceConsumerTimeoutMs: 5_001,
    })).toThrow("RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_TIMEOUT_INVALID");
    expect(() => new RuntimeBehaviorModeResolver(source, {
      commerceConsumerTimeoutMs: Number.NaN,
    })).toThrow("RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_TIMEOUT_INVALID");
  });

  it("keeps pure LEGACY resolutions free of COMMERCE authority markers", async () => {
    const freshSource = new MutableSource();
    const auditFailureSource = new MutableSource();
    auditFailureSource.auditFailure = true;
    const missingSource = new MutableSource();
    missingSource.value = null;
    const failedSource = new MutableSource();
    failedSource.failure = true;

    const results = await Promise.all([
      new RuntimeBehaviorModeResolver(freshSource).resolve(input()),
      new RuntimeBehaviorModeResolver(auditFailureSource).resolve(input()),
      new RuntimeBehaviorModeResolver(missingSource).resolve(input()),
      new RuntimeBehaviorModeResolver(failedSource).resolve(input()),
    ]);

    for (const result of results) {
      expect(result.salesAuthorityMode).toBe("LEGACY");
      expect(result.stateReadMode).toBe("LEGACY");
      expect(result.authorityProvenance).not.toBe("COMMERCE_POINTER");
      expect(result.reasonCodes.some((reasonCode) => reasonCode.includes("COMMERCE")))
        .toBe(false);
    }
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

  it("never accepts a regressed or conflicting pointer revision", async () => {
    const source = new MutableSource();
    source.value = pointer("V2_SHADOW", 2);
    const resolver = new RuntimeBehaviorModeResolver(source, {
      cacheTtlMs: 100,
      lastKnownGoodTtlMs: 300_000,
    });
    await resolver.resolve(input());

    source.value = pointer("LEGACY", 1);
    expect(await resolver.resolve(input(101))).toMatchObject({
      confirmationMode: "V2_SHADOW",
      pointerRevision: 2,
      source: "LAST_KNOWN_GOOD",
    });

    source.value = pointer("V2_ACTIVE", 2);
    expect(await resolver.resolve(input(202))).toMatchObject({
      confirmationMode: "V2_SHADOW",
      pointerRevision: 2,
      source: "LAST_KNOWN_GOOD",
    });
  });

  it("does not extend cache or LKG lifetime when the wall clock moves backward", async () => {
    const source = new MutableSource();
    const resolver = new RuntimeBehaviorModeResolver(source, {
      cacheTtlMs: 5_000,
      lastKnownGoodTtlMs: 300_000,
    });
    await resolver.resolve(input());
    source.failure = true;
    expect(await resolver.resolve(input(-1))).toMatchObject({
      confirmationMode: "CLARIFY_ONLY", source: "FAIL_SAFE",
    });
  });
});
