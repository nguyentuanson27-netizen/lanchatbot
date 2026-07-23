import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  RUNTIME_POLICY_CANARY_PAGE_ID,
  RuntimePolicyResolver,
  decideRuntimeMultiItemOffer,
  outboundRuntimePolicy,
  runtimePolicyBundleReference,
  type RuntimePolicyAuditEvent,
  type RuntimePolicyPin,
  type RuntimePolicyPointerRecord,
  type RuntimePolicySourcePort,
} from "./runtime-policy-resolver.js";

const pageId = RUNTIME_POLICY_CANARY_PAGE_ID;
const at = "2026-07-22T09:00:00.000Z";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

function hash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}

const sourceMetadata = {
  source: "ADMIN",
  sourceReference: null,
  sourceVersion: "source-1",
  observedAt: at,
} as const;

const contents = {
  SHOP_POLICY: {
    schemaVersion: 1,
    kind: "SHOP_POLICY",
    shopId: "LANA_DESIGN",
    defaultShippingFeeVnd: 30_000,
    deliveryPromiseText: "Shop xác nhận lịch giao theo đơn.",
    requireRecipientName: true,
    requirePhoneNumber: true,
    requireDeliveryAddress: true,
    allowedPaymentMethods: ["COD", "BANK_TRANSFER"],
    customerCare: {
      exchange: {
        windowDaysFromReceipt: 15,
        maxExchangesPerOrder: 1,
        supportedActions: ["SIZE", "COLOR", "MODEL"],
        saleRestriction: { discountThresholdBps: 3_000, allowedActions: ["SIZE", "COLOR"] },
        requiredConditions: { originalTags: true, unused: true, unwashed: true, clean: true, undamaged: true },
        totalTwoWayShippingFeeVnd: 30_000,
        modelExchangePricing: "NEW_PRODUCT_LIST_PRICE_NO_SALE",
        customerPaysPositivePriceDifference: true,
        fulfillmentMethod: "COURIER_SWAP",
      },
      returns: {
        eligibleReasons: ["MANUFACTURING_FABRIC_DEFECT", "MANUFACTURING_SEAM_DEFECT", "WRONG_PRODUCT_SENT"],
        reportingWindowDaysFromReceipt: 5,
        shopShippingCoveragePercent: 100,
        refundBusinessDaysMin: 1,
        refundBusinessDaysMax: 3,
        refundStartsAfter: "SHOP_CONFIRMS_ELIGIBLE_ERROR",
      },
      inspection: { tryOnMode: "HOLD_UP_ONLY", refusedParcelShippingFeeVnd: 30_000 },
      marketplacePricing: { shopeePriceMatch: false, reason: "PLATFORM_SUBSIDY_AND_VOUCHERS" },
      customerFaq: {
        discloseLightingAndDisplayColorVariance: true,
        handWashPreferred: true,
        machineWashAllowedWithLaundryBagAndGentleCycle: true,
      },
    },
    sourceMetadata,
  },
  OFFER_POLICY: {
    schemaVersion: 1,
    kind: "OFFER_POLICY",
    scope: "SHOP_WIDE",
    multiItem: {
      minimumParentProductUnits: 2,
      discountBps: 500,
      setAndComboCountAsOne: true,
    },
    concessions: {
      second: { freeShipping: true, fixedDiscountVnd: 0 },
      final: { freeShipping: true, fixedDiscountVnd: 20_000 },
      stackMultiItemWithSecond: true,
      stackMultiItemWithFinal: true,
      deduplicateFreeShipping: true,
    },
    sourceMetadata,
  },
  CLOSING_STRATEGY: {
    schemaVersion: 1,
    kind: "CLOSING_STRATEGY",
    decisionMode: "DETERMINISTIC_POLICY_ONLY",
    retryMayEscalateConcession: false,
    okConfirmsOnlyAtOrderPreview: true,
    steps: [
      { state: "READY", nextAction: "SHOW_ORDER_PREVIEW", promptTemplate: "Xem đơn" },
      { state: "HESITANT", nextAction: "APPLY_SECOND_CONCESSION", promptTemplate: "Hỗ trợ ship" },
      { state: "CAUTIOUS", nextAction: "HANDOFF", promptTemplate: "Mời nhân viên" },
    ],
    sourceMetadata,
  },
} as const;

const ids = {
  SHOP_POLICY: "10000000-0000-4000-8000-000000000001",
  OFFER_POLICY: "10000000-0000-4000-8000-000000000002",
  CLOSING_STRATEGY: "10000000-0000-4000-8000-000000000003",
} as const;
const pointerIds = {
  SHOP_POLICY: "20000000-0000-4000-8000-000000000001",
  OFFER_POLICY: "20000000-0000-4000-8000-000000000002",
  CLOSING_STRATEGY: "20000000-0000-4000-8000-000000000003",
} as const;

function records(
  channel: "CANARY_SHADOW" | "CANARY_LIVE" | "PUBLISHED" = "CANARY_SHADOW",
  versionNumber = 1,
): RuntimePolicyPointerRecord[] {
  return (Object.keys(contents) as (keyof typeof contents)[]).map((kind) => {
    const content = contents[kind];
    return {
      pointer: {
        schemaVersion: 1,
        pointerId: pointerIds[kind],
        artifactKey: `lana.${kind.toLowerCase()}`,
        artifactKind: kind,
        pageId,
        channel,
        versionId: ids[kind],
        revision: versionNumber,
        updatedBy: "admin@example.invalid",
        updatedAt: at,
      },
      version: {
        schemaVersion: 1,
        versionId: ids[kind],
        artifactKey: `lana.${kind.toLowerCase()}`,
        artifactKind: kind,
        versionNumber,
        lifecycle: channel === "PUBLISHED" ? "PUBLISHED" : "CANARY",
        revision: versionNumber,
        contentHash: hash(content),
        content,
        createdBy: "admin@example.invalid",
        createdAt: at,
        updatedAt: at,
      },
    };
  });
}

class MutableSource implements RuntimePolicySourcePort {
  calls = 0;
  failure: Error | null = null;
  value: readonly RuntimePolicyPointerRecord[] = records();

  async loadActivePointers(): Promise<readonly RuntimePolicyPointerRecord[]> {
    this.calls += 1;
    if (this.failure) throw this.failure;
    return this.value;
  }
}

class MemoryPins {
  readonly values = new Map<string, RuntimePolicyPin>();

  async loadPin(scopeType: string, scopeId: string): Promise<RuntimePolicyPin | null> {
    return this.values.get(`${scopeType}:${scopeId}`) ?? null;
  }

  async savePinIfAbsent(pin: RuntimePolicyPin): Promise<RuntimePolicyPin> {
    const key = `${pin.scopeType}:${pin.scopeId}`;
    const winner = this.values.get(key) ?? pin;
    this.values.set(key, winner);
    return winner;
  }
}

describe("RuntimePolicyResolver", () => {
  it("validates structured artifacts and composes a trusted shadow bundle", async () => {
    const source = new MutableSource();
    const audits: RuntimePolicyAuditEvent[] = [];
    const resolver = new RuntimePolicyResolver(source, { enabled: true }, undefined, {
      async recordResolution(event) { audits.push(event); },
    });

    const result = await resolver.resolve({ pageId, channel: "CANARY_SHADOW", now: new Date(at) });

    expect(result).toMatchObject({
      status: "RESOLVED",
      source: "DATABASE",
      mayAffectOutbound: false,
      auditWrite: "RECORDED",
      bundle: {
        sideEffects: "DISABLED",
        policy: {
          shopId: "LANA_DESIGN",
          shipping: { defaultFeeVnd: 30_000 },
          multiItemOffer: { discountBps: 500 },
          commerceAuthority: { priceAuthority: "PANCAKE_POS", allowAdminPriceOverride: false },
        },
        artifacts: {
          shopPolicy: {
            customerCare: {
              exchange: { windowDaysFromReceipt: 15, totalTwoWayShippingFeeVnd: 30_000 },
              returns: { reportingWindowDaysFromReceipt: 5 },
            },
          },
        },
      },
    });
    expect(result.bundle?.versionReferences).toHaveLength(3);
    expect(runtimePolicyBundleReference(result.bundle!)).toMatchObject({
      id: `admin-policy:${pageId}`,
      version: expect.any(String),
      contentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.sideEffects).toBe("DISABLED");
  });

  it("hard-gates live canary to the production canary page and published consumption to an explicit flag", async () => {
    const source = new MutableSource();
    const resolver = new RuntimePolicyResolver(source, {
      enabled: true,
      canaryLiveEnabled: true,
    });
    expect(await resolver.resolve({ pageId: "other-page", channel: "CANARY_LIVE" }))
      .toMatchObject({ status: "REJECTED", reasonCodes: ["CANARY_LIVE_PAGE_FORBIDDEN"] });
    expect(await new RuntimePolicyResolver(source, {
      enabled: true,
      publishedEnabled: true,
    }).resolve({ pageId: "other-page", channel: "PUBLISHED" }))
      .toMatchObject({ status: "REJECTED", reasonCodes: ["PUBLISHED_PAGE_FORBIDDEN"] });
    expect(await resolver.resolve({ pageId, channel: "PUBLISHED" }))
      .toMatchObject({ status: "DISABLED", reasonCodes: ["PUBLISHED_CONSUMPTION_DISABLED"] });
    expect(source.calls).toBe(0);
  });

  it("keeps shadow observational while live exposes policy only to deterministic decisions", async () => {
    const shadowSource = new MutableSource();
    const shadow = await new RuntimePolicyResolver(shadowSource, { enabled: true })
      .resolve({ pageId, channel: "CANARY_SHADOW", now: new Date(at) });
    expect(outboundRuntimePolicy(shadow)).toBeNull();

    const liveSource = new MutableSource();
    liveSource.value = records("CANARY_LIVE");
    const live = await new RuntimePolicyResolver(liveSource, {
      enabled: true,
      canaryLiveEnabled: true,
    }).resolve({ pageId, channel: "CANARY_LIVE", now: new Date(at) });
    const liveBundle = outboundRuntimePolicy(live);
    expect(liveBundle).not.toBeNull();
    expect(decideRuntimeMultiItemOffer(liveBundle!, 1)).toBeNull();
    expect(decideRuntimeMultiItemOffer(liveBundle!, 2)).toMatchObject({
      minimumParentProductUnits: 2,
      discountBps: 500,
      message: expect.stringContaining("5%"),
    });
  });

  it("collapses concurrent cache misses into one consistent database snapshot", async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    const resolver = new RuntimePolicyResolver({
      async loadActivePointers() {
        calls += 1;
        await barrier;
        return records();
      },
    }, { enabled: true, cacheTtlMs: 1_000 });

    const pending = Array.from({ length: 20 }, () =>
      resolver.resolve({ pageId, channel: "CANARY_SHADOW", now: new Date(at) })
    );
    await Promise.resolve();
    release();
    const results = await Promise.all(pending);

    expect(calls).toBe(1);
    expect(new Set(results.map((item) => item.bundle?.bundleHash)).size).toBe(1);
    expect(results.every((item) => item.status === "RESOLVED")).toBe(true);
  });

  it("falls back to a bounded last-known-good bundle after source or schema failure", async () => {
    const source = new MutableSource();
    const resolver = new RuntimePolicyResolver(source, {
      enabled: true,
      cacheTtlMs: 100,
      lastKnownGoodTtlMs: 1_000,
    });
    const first = await resolver.resolve({ pageId, channel: "CANARY_SHADOW", now: new Date(at) });
    source.failure = new Error("database unavailable");
    const fallback = await resolver.resolve({
      pageId,
      channel: "CANARY_SHADOW",
      now: new Date(Date.parse(at) + 101),
    });
    const expired = await resolver.resolve({
      pageId,
      channel: "CANARY_SHADOW",
      now: new Date(Date.parse(at) + 1_001),
    });

    expect(first.status).toBe("RESOLVED");
    expect(fallback).toMatchObject({
      status: "LAST_KNOWN_GOOD",
      source: "LAST_KNOWN_GOOD",
      reasonCodes: ["POLICY_SOURCE_UNAVAILABLE"],
    });
    expect(fallback.bundle?.bundleHash).toBe(first.bundle?.bundleHash);
    expect(expired).toMatchObject({ status: "UNAVAILABLE", bundle: null });
  });

  it("observes a published pointer rollback while preserving the cart's pinned v2 bundle", async () => {
    const source = new MutableSource();
    source.value = records("PUBLISHED", 2).map((record, index) => ({
      pointer: {
        ...(record.pointer as Record<string, unknown>),
        versionId: `30000000-0000-4000-8000-00000000000${index + 1}`,
      },
      version: {
        ...(record.version as Record<string, unknown>),
        versionId: `30000000-0000-4000-8000-00000000000${index + 1}`,
      },
    }));
    const pins = new MemoryPins();
    const resolver = new RuntimePolicyResolver(source, {
      enabled: true,
      publishedEnabled: true,
    }, pins);
    const input = {
      pageId,
      channel: "PUBLISHED" as const,
      pin: { scopeType: "CART" as const, scopeId: "cart-42" },
      now: new Date(at),
    };
    const pinnedV2 = await resolver.resolve(input);
    source.value = records("PUBLISHED", 1);
    resolver.invalidate(pageId, "PUBLISHED");

    const sameCart = await resolver.resolve({ ...input, now: new Date(Date.parse(at) + 5_000) });
    const afterRollback = await resolver.resolve({
      pageId,
      channel: "PUBLISHED",
      now: new Date(Date.parse(at) + 5_000),
    });

    expect(pinnedV2.status).toBe("PINNED");
    expect(sameCart).toMatchObject({ status: "PINNED", source: "PIN" });
    expect(sameCart.bundle?.bundleHash).toBe(pinnedV2.bundle?.bundleHash);
    expect(afterRollback.status).toBe("RESOLVED");
    expect(afterRollback.bundle?.bundleHash).not.toBe(pinnedV2.bundle?.bundleHash);
    expect(afterRollback.bundle?.versionReferences.every((ref) => ref.versionNumber === 1)).toBe(true);
  });

  it("rejects a hash-tampered active artifact and never authorizes shadow outbound", async () => {
    const source = new MutableSource();
    source.value = records().map((record, index) => index === 0
      ? { ...record, version: { ...(record.version as object), contentHash: `sha256:${"f".repeat(64)}` } }
      : record);
    const result = await new RuntimePolicyResolver(source, { enabled: true })
      .resolve({ pageId, channel: "CANARY_SHADOW" });
    expect(result).toMatchObject({
      status: "UNAVAILABLE",
      bundle: null,
      mayAffectOutbound: false,
      reasonCodes: ["POLICY_CONTENT_HASH_MISMATCH"],
    });
  });
});
