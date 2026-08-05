import { createHash, randomUUID } from "node:crypto";
import {
  AdminActivePointerV1Schema,
  AdminArtifactContentV1Schema,
  AdminArtifactVersionV1Schema,
  PolicyBundleV1Schema,
  type AdminArtifactContentV1,
  type AdminArtifactKindV1,
  type AdminArtifactLifecycleV1,
  type PolicyBundleV1,
} from "@lana/contracts";

export const RUNTIME_POLICY_CANARY_PAGE_ID = "1198992073286645" as const;

export type RuntimePolicyChannel =
  | "CANARY_SHADOW"
  | "CANARY_LIVE"
  | "PUBLISHED";
export type RuntimePolicyPinScope = "SALES_EPISODE" | "CART";

export interface RuntimePolicyPointerRecord {
  readonly pointer: unknown;
  readonly version: unknown;
}

export interface RuntimePolicySourcePort {
  loadActivePointers(input: {
    readonly pageId: string;
    readonly channel: RuntimePolicyChannel;
  }): Promise<readonly RuntimePolicyPointerRecord[]>;
}

export interface RuntimePolicyVersionReference {
  readonly artifactKey: string;
  readonly artifactKind: AdminArtifactKindV1;
  readonly versionId: string;
  readonly versionNumber: number;
  /** Present on BF-05+ bundles. Missing only on valid, persisted pre-BF-05 pins. */
  readonly lifecycle?: AdminArtifactLifecycleV1;
  readonly contentHash: string;
  readonly pointerId: string;
  readonly pointerRevision: number;
}

export interface RuntimePolicyBundle {
  readonly schemaVersion: 1;
  readonly bundleId: string;
  readonly bundleHash: string;
  readonly pageId: string;
  readonly channel: RuntimePolicyChannel;
  readonly sideEffects: "DISABLED" | "LIVE_OUTBOUND";
  readonly resolvedAt: string;
  readonly policy: PolicyBundleV1;
  readonly versionReferences: readonly RuntimePolicyVersionReference[];
  readonly artifacts: {
    readonly shopPolicy: Extract<AdminArtifactContentV1, { kind: "SHOP_POLICY" }>;
    readonly offerPolicy: Extract<AdminArtifactContentV1, { kind: "OFFER_POLICY" }>;
    readonly closingStrategy: Extract<AdminArtifactContentV1, { kind: "CLOSING_STRATEGY" }>;
    readonly sizeCharts: Readonly<Record<string, Extract<AdminArtifactContentV1, { kind: "SIZE_CHART" }>>>;
    readonly handoffMatrix: Extract<AdminArtifactContentV1, { kind: "HANDOFF_MATRIX" }> | null;
    readonly paymentPolicy: Extract<AdminArtifactContentV1, { kind: "PAYMENT_POLICY" }> | null;
  };
}

export interface RuntimePolicyPin {
  readonly scopeType: RuntimePolicyPinScope;
  readonly scopeId: string;
  readonly pageId: string;
  readonly channel: RuntimePolicyChannel;
  readonly bundleHash: string;
  readonly bundle: RuntimePolicyBundle;
  readonly pinnedAt: string;
}

export interface RuntimePolicyPinPort {
  loadPin(scopeType: RuntimePolicyPinScope, scopeId: string): Promise<RuntimePolicyPin | null>;
  savePinIfAbsent(pin: RuntimePolicyPin): Promise<RuntimePolicyPin>;
}

export type RuntimePolicyResolutionStatus =
  | "RESOLVED"
  | "PINNED"
  | "LAST_KNOWN_GOOD"
  | "DISABLED"
  | "UNAVAILABLE"
  | "REJECTED";

export interface RuntimePolicyAuditEvent {
  readonly schemaVersion: 1;
  readonly resolutionId: string;
  readonly pageId: string;
  readonly channel: RuntimePolicyChannel;
  readonly status: RuntimePolicyResolutionStatus;
  readonly source: "DATABASE" | "CACHE" | "PIN" | "LAST_KNOWN_GOOD" | "NONE";
  readonly sideEffects: "DISABLED" | "LIVE_OUTBOUND";
  readonly bundleId: string | null;
  readonly bundleHash: string | null;
  readonly versionIds: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly pinScopeType: RuntimePolicyPinScope | null;
  readonly pinScopeId: string | null;
  readonly occurredAt: string;
}

export interface RuntimePolicyAuditPort {
  recordResolution(event: RuntimePolicyAuditEvent): Promise<void>;
}

export interface RuntimePolicyResolution {
  readonly status: RuntimePolicyResolutionStatus;
  readonly source: RuntimePolicyAuditEvent["source"];
  readonly bundle: RuntimePolicyBundle | null;
  readonly mayAffectOutbound: boolean;
  readonly reasonCodes: readonly string[];
  readonly audit: RuntimePolicyAuditEvent;
  readonly auditWrite: "RECORDED" | "FAILED" | "NOT_CONFIGURED";
}

export interface RuntimePolicyResolveInput {
  readonly pageId: string;
  readonly channel: RuntimePolicyChannel;
  readonly pin?: {
    readonly scopeType: RuntimePolicyPinScope;
    readonly scopeId: string;
  };
  readonly now?: Date;
}

export interface RuntimePolicyResolverOptions {
  readonly enabled?: boolean;
  readonly canaryLiveEnabled?: boolean;
  readonly publishedEnabled?: boolean;
  readonly cacheTtlMs?: number;
  readonly lastKnownGoodTtlMs?: number;
}

interface CacheEntry {
  readonly bundle: RuntimePolicyBundle;
  readonly cachedAtMs: number;
  readonly expiresAtMs: number;
}

interface CoreArtifacts {
  readonly shop: Extract<AdminArtifactContentV1, { kind: "SHOP_POLICY" }>;
  readonly offer: Extract<AdminArtifactContentV1, { kind: "OFFER_POLICY" }>;
  readonly closing: Extract<AdminArtifactContentV1, { kind: "CLOSING_STRATEGY" }>;
}

interface ParsedArtifactItem {
  readonly content: AdminArtifactContentV1;
  readonly ref: RuntimePolicyVersionReference;
  readonly updatedAt: string;
}

const MIN_CACHE_TTL_MS = 100;
const MAX_CACHE_TTL_MS = 5 * 60 * 1_000;
const MAX_LKG_TTL_MS = 24 * 60 * 60 * 1_000;
const SINGLETON_KINDS = new Set<AdminArtifactKindV1>([
  "SHOP_POLICY",
  "OFFER_POLICY",
  "CLOSING_STRATEGY",
  "HANDOFF_MATRIX",
  "PAYMENT_POLICY",
]);

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  const candidate = value ?? fallback;
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new Error(`${name}_OUT_OF_RANGE`);
  }
  return candidate;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function contentHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

function bundleHash(bundle: Omit<RuntimePolicyBundle, "bundleHash">): string {
  return contentHash(bundle);
}

function metadata(reference: RuntimePolicyVersionReference, observedAt: string) {
  return {
    authority: "ADMIN_POLICY" as const,
    sourceVersion: `${reference.artifactKey}@${reference.versionNumber}`,
    observedAt,
    expiresAt: null,
    freshForSeconds: null,
    freshnessState: "FRESH" as const,
  };
}

function selected<T extends AdminArtifactKindV1>(
  values: readonly ParsedArtifactItem[],
  kind: T,
): (Omit<ParsedArtifactItem, "content"> & {
  readonly content: Extract<AdminArtifactContentV1, { kind: T }>;
}) | null {
  return (values.find((item) => item.content.kind === kind) ?? null) as
    (Omit<ParsedArtifactItem, "content"> & {
      readonly content: Extract<AdminArtifactContentV1, { kind: T }>;
    }) | null;
}

function validatePinnedBundle(value: RuntimePolicyPin): boolean {
  if (value.bundle.schemaVersion !== 1 || value.bundleHash !== value.bundle.bundleHash) return false;
  const { bundleHash: ignored, ...hashable } = value.bundle;
  void ignored;
  const artifacts = value.bundle.artifacts;
  const structuredArtifacts = [
    artifacts.shopPolicy,
    artifacts.offerPolicy,
    artifacts.closingStrategy,
    ...Object.values(artifacts.sizeCharts),
    ...(artifacts.handoffMatrix ? [artifacts.handoffMatrix] : []),
    ...(artifacts.paymentPolicy ? [artifacts.paymentPolicy] : []),
  ];
  const expectedLifecycle = value.bundle.channel === "PUBLISHED" ? "PUBLISHED" : "CANARY";
  const missingLifecycleCount = value.bundle.versionReferences.filter((reference) =>
    reference.lifecycle === undefined
  ).length;
  const lifecycleCompatible = missingLifecycleCount === value.bundle.versionReferences.length || (
    missingLifecycleCount === 0 &&
    value.bundle.versionReferences.every((reference) => reference.lifecycle === expectedLifecycle)
  );
  return bundleHash(hashable) === value.bundleHash &&
    lifecycleCompatible &&
    PolicyBundleV1Schema.safeParse(value.bundle.policy).success &&
    structuredArtifacts.every((artifact) => AdminArtifactContentV1Schema.safeParse(artifact).success) &&
    value.bundle.versionReferences.length >= 3 &&
    new Set(value.bundle.versionReferences.map((reference) => reference.versionId)).size ===
      value.bundle.versionReferences.length;
}

export class RuntimePolicyResolver {
  private readonly enabled: boolean;
  private readonly canaryLiveEnabled: boolean;
  private readonly publishedEnabled: boolean;
  private readonly cacheTtlMs: number;
  private readonly lastKnownGoodTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly lastKnownGood = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<RuntimePolicyBundle | null>>();

  constructor(
    private readonly source: RuntimePolicySourcePort,
    options: RuntimePolicyResolverOptions = {},
    private readonly pins?: RuntimePolicyPinPort,
    private readonly audit?: RuntimePolicyAuditPort,
  ) {
    this.enabled = options.enabled ?? false;
    this.canaryLiveEnabled = options.canaryLiveEnabled ?? false;
    this.publishedEnabled = options.publishedEnabled ?? false;
    this.cacheTtlMs = boundedInteger(
      options.cacheTtlMs,
      5_000,
      MIN_CACHE_TTL_MS,
      MAX_CACHE_TTL_MS,
      "RUNTIME_POLICY_CACHE_TTL_MS",
    );
    this.lastKnownGoodTtlMs = boundedInteger(
      options.lastKnownGoodTtlMs,
      5 * 60 * 1_000,
      this.cacheTtlMs,
      MAX_LKG_TTL_MS,
      "RUNTIME_POLICY_LKG_TTL_MS",
    );
  }

  invalidate(pageId?: string, channel?: RuntimePolicyChannel): void {
    if (pageId === undefined) {
      this.cache.clear();
      return;
    }
    if (channel === undefined) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${pageId}\u0000`)) this.cache.delete(key);
      }
      return;
    }
    this.cache.delete(this.cacheKey(pageId, channel));
  }

  async resolve(input: RuntimePolicyResolveInput): Promise<RuntimePolicyResolution> {
    const now = input.now ?? new Date();
    const pageId = input.pageId.trim();
    const scopeId = input.pin?.scopeId.trim() ?? null;
    const gateReason = this.gate(pageId, input.channel);
    if (gateReason !== null) {
      return this.finish(input, now, gateReason.status, "NONE", null, [gateReason.reason], scopeId);
    }
    if (input.pin && !scopeId) {
      return this.finish(input, now, "REJECTED", "NONE", null, ["POLICY_PIN_SCOPE_ID_REQUIRED"], scopeId);
    }

    if (input.pin && this.pins) {
      try {
        const pin = await this.pins.loadPin(input.pin.scopeType, scopeId!);
        if (pin !== null) {
          if (
            pin.pageId !== pageId || pin.channel !== input.channel ||
            !validatePinnedBundle(pin)
          ) {
            return this.finish(input, now, "REJECTED", "PIN", null, ["POLICY_PIN_INVALID"], scopeId);
          }
          return this.finish(input, now, "PINNED", "PIN", pin.bundle, [], scopeId);
        }
      } catch {
        return this.fallback(input, now, ["POLICY_PIN_READ_FAILED"], scopeId);
      }
    }

    const key = this.cacheKey(pageId, input.channel);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAtMs > now.getTime()) {
      return this.pinOrFinish(input, now, cached.bundle, "CACHE", scopeId);
    }

    try {
      let work = this.inFlight.get(key);
      if (!work) {
        work = this.loadAndCompose(pageId, input.channel, now);
        this.inFlight.set(key, work);
        void work.finally(() => {
          if (this.inFlight.get(key) === work) this.inFlight.delete(key);
        }).catch(() => undefined);
      }
      const bundle = await work;
      if (bundle === null) {
        return this.finish(input, now, "UNAVAILABLE", "DATABASE", null, ["POLICY_POINTERS_NOT_FOUND"], scopeId);
      }
      const entry = {
        bundle,
        cachedAtMs: now.getTime(),
        expiresAtMs: now.getTime() + this.cacheTtlMs,
      };
      this.cache.set(key, entry);
      this.lastKnownGood.set(key, {
        ...entry,
        expiresAtMs: now.getTime() + this.lastKnownGoodTtlMs,
      });
      return this.pinOrFinish(input, now, bundle, "DATABASE", scopeId);
    } catch (error) {
      const reason = error instanceof Error && error.message.startsWith("POLICY_")
        ? error.message
        : "POLICY_SOURCE_UNAVAILABLE";
      return this.fallback(input, now, [reason], scopeId);
    }
  }

  private gate(pageId: string, channel: RuntimePolicyChannel): {
    readonly status: "DISABLED" | "REJECTED";
    readonly reason: string;
  } | null {
    if (!this.enabled) return { status: "DISABLED", reason: "RUNTIME_POLICY_DISABLED" };
    if (!pageId) return { status: "REJECTED", reason: "RUNTIME_POLICY_PAGE_ID_REQUIRED" };
    if (channel === "CANARY_LIVE") {
      if (pageId !== RUNTIME_POLICY_CANARY_PAGE_ID) {
        return { status: "REJECTED", reason: "CANARY_LIVE_PAGE_FORBIDDEN" };
      }
      if (!this.canaryLiveEnabled) {
        return { status: "DISABLED", reason: "CANARY_LIVE_DISABLED" };
      }
    }
    if (channel === "PUBLISHED") {
      if (pageId !== RUNTIME_POLICY_CANARY_PAGE_ID) {
        return { status: "REJECTED", reason: "PUBLISHED_PAGE_FORBIDDEN" };
      }
      if (!this.publishedEnabled) {
        return { status: "DISABLED", reason: "PUBLISHED_CONSUMPTION_DISABLED" };
      }
    }
    return null;
  }

  private async loadAndCompose(
    pageId: string,
    channel: RuntimePolicyChannel,
    now: Date,
  ): Promise<RuntimePolicyBundle | null> {
    const records = await this.source.loadActivePointers({ pageId, channel });
    if (records.length === 0) return null;
    const parsed: {
      content: AdminArtifactContentV1;
      ref: RuntimePolicyVersionReference;
      updatedAt: string;
    }[] = [];
    const singletonCounts = new Map<AdminArtifactKindV1, number>();
    const seenScopes = new Set<string>();
    for (const record of records) {
      const pointerResult = AdminActivePointerV1Schema.safeParse(record.pointer);
      const versionResult = AdminArtifactVersionV1Schema.safeParse(record.version);
      if (!pointerResult.success || !versionResult.success) throw new Error("POLICY_ARTIFACT_SCHEMA_INVALID");
      const pointer = pointerResult.data;
      const version = versionResult.data;
      if (
        pointer.pageId !== pageId || pointer.channel !== channel ||
        pointer.versionId !== version.versionId ||
        pointer.artifactKey !== version.artifactKey ||
        pointer.artifactKind !== version.artifactKind
      ) throw new Error("POLICY_POINTER_VERSION_MISMATCH");
      const expectedLifecycle = channel === "PUBLISHED" ? "PUBLISHED" : "CANARY";
      if (version.lifecycle !== expectedLifecycle) throw new Error("POLICY_LIFECYCLE_INVALID");
      if (contentHash(version.content) !== version.contentHash) throw new Error("POLICY_CONTENT_HASH_MISMATCH");
      const scope = `${version.artifactKind}\u0000${version.artifactKey}`;
      if (seenScopes.has(scope)) throw new Error("POLICY_POINTER_SCOPE_DUPLICATE");
      seenScopes.add(scope);
      if (SINGLETON_KINDS.has(version.artifactKind)) {
        const count = (singletonCounts.get(version.artifactKind) ?? 0) + 1;
        singletonCounts.set(version.artifactKind, count);
        if (count > 1) throw new Error(`POLICY_${version.artifactKind}_DUPLICATE`);
      }
      parsed.push({
        content: AdminArtifactContentV1Schema.parse(version.content),
        updatedAt: version.updatedAt,
        ref: {
          artifactKey: version.artifactKey,
          artifactKind: version.artifactKind,
          versionId: version.versionId,
          lifecycle: version.lifecycle,
          versionNumber: version.versionNumber,
          contentHash: version.contentHash,
          pointerId: pointer.pointerId,
          pointerRevision: pointer.revision,
        },
      });
    }
    return this.compose(pageId, channel, parsed, now);
  }

  private compose(
    pageId: string,
    channel: RuntimePolicyChannel,
    values: readonly ParsedArtifactItem[],
    now: Date,
  ): RuntimePolicyBundle {
    const shop = selected(values, "SHOP_POLICY");
    const offer = selected(values, "OFFER_POLICY");
    const closing = selected(values, "CLOSING_STRATEGY");
    if (!shop || !offer || !closing) throw new Error("POLICY_CORE_ARTIFACTS_INCOMPLETE");
    const core: CoreArtifacts = { shop: shop.content, offer: offer.content, closing: closing.content };
    const refs = [...values.map((item) => item.ref)].sort((left, right) =>
      left.artifactKind.localeCompare(right.artifactKind) || left.artifactKey.localeCompare(right.artifactKey)
    );
    const versionDigest = contentHash(refs.map((ref) => [ref.versionId, ref.contentHash])).slice(7, 39);
    const observedAt = values.map((item) => item.updatedAt).sort().at(-1) ?? now.toISOString();
    const shopMetadata = metadata(shop.ref, shop.updatedAt);
    const offerMetadata = metadata(offer.ref, offer.updatedAt);
    const closingMetadata = metadata(closing.ref, closing.updatedAt);
    const policy = PolicyBundleV1Schema.parse({
      schemaVersion: 1,
      policyBundleId: `admin-policy:${pageId}`,
      policyVersion: versionDigest,
      shopId: core.shop.shopId,
      status: "ACTIVE",
      effectiveAt: observedAt,
      effectiveUntil: null,
      supersedesPolicyVersion: null,
      scope: "SHOP_WIDE",
      commerceAuthority: {
        bomAuthority: "PANCAKE_POS",
        priceAuthority: "PANCAKE_POS",
        inventoryAuthority: "PANCAKE_POS",
        allowGoogleSheetsPriceOverride: false,
        allowAdminPriceOverride: false,
        missingPriceBehavior: "DO_NOT_QUOTE",
        metadata: shopMetadata,
      },
      shipping: {
        defaultFeeVnd: core.shop.defaultShippingFeeVnd,
        scope: "SHOP_WIDE",
        metadata: shopMetadata,
      },
      multiItemOffer: {
        minimumProductCount: core.offer.multiItem.minimumParentProductUnits,
        discountBps: core.offer.multiItem.discountBps,
        countingUnit: "PARENT_PRODUCT_UNIT",
        setAndComboCountAsOne: core.offer.multiItem.setAndComboCountAsOne,
        scope: "SHOP_WIDE",
        metadata: offerMetadata,
      },
      negotiation: {
        secondConcession: core.offer.concessions.second,
        finalConcession: core.offer.concessions.final,
        stacking: {
          multiItemDiscountWithSecondConcession: core.offer.concessions.stackMultiItemWithSecond,
          multiItemDiscountWithFinalConcession: core.offer.concessions.stackMultiItemWithFinal,
          deduplicateFreeShipping: core.offer.concessions.deduplicateFreeShipping,
        },
        scope: "SHOP_WIDE",
        metadata: offerMetadata,
      },
      closing: {
        customerStates: ["READY", "HESITANT", "CAUTIOUS"],
        decisionMode: core.closing.decisionMode,
        allowUnlistedOffers: false,
        metadata: closingMetadata,
      },
    });
    const sizeCharts = Object.fromEntries(values
      .filter((item): item is typeof item & { content: Extract<AdminArtifactContentV1, { kind: "SIZE_CHART" }> } => item.content.kind === "SIZE_CHART")
      .map((item) => [item.ref.artifactKey, item.content]));
    const handoff = selected(values, "HANDOFF_MATRIX");
    const payment = selected(values, "PAYMENT_POLICY");
    const hashable: Omit<RuntimePolicyBundle, "bundleHash"> = {
      schemaVersion: 1,
      bundleId: `runtime:${pageId}:${channel}:${versionDigest}`,
      pageId,
      channel,
      sideEffects: channel === "CANARY_SHADOW" ? "DISABLED" : "LIVE_OUTBOUND",
      resolvedAt: now.toISOString(),
      policy,
      versionReferences: refs,
      artifacts: {
        shopPolicy: core.shop,
        offerPolicy: core.offer,
        closingStrategy: core.closing,
        sizeCharts,
        handoffMatrix: handoff?.content ?? null,
        paymentPolicy: payment?.content ?? null,
      },
    };
    return { ...hashable, bundleHash: bundleHash(hashable) };
  }

  private async pinOrFinish(
    input: RuntimePolicyResolveInput,
    now: Date,
    bundle: RuntimePolicyBundle,
    source: "DATABASE" | "CACHE",
    scopeId: string | null,
  ): Promise<RuntimePolicyResolution> {
    if (!input.pin || !this.pins) {
      return this.finish(input, now, "RESOLVED", source, bundle, [], scopeId);
    }
    try {
      const winner = await this.pins.savePinIfAbsent({
        scopeType: input.pin.scopeType,
        scopeId: scopeId!,
        pageId: input.pageId.trim(),
        channel: input.channel,
        bundleHash: bundle.bundleHash,
        bundle,
        pinnedAt: now.toISOString(),
      });
      if (
        winner.pageId !== input.pageId.trim() || winner.channel !== input.channel ||
        !validatePinnedBundle(winner)
      ) {
        return this.finish(input, now, "REJECTED", "PIN", null, ["POLICY_PIN_CONFLICT"], scopeId);
      }
      return this.finish(input, now, "PINNED", "PIN", winner.bundle, [], scopeId);
    } catch {
      return this.fallback(input, now, ["POLICY_PIN_WRITE_FAILED"], scopeId);
    }
  }

  private fallback(
    input: RuntimePolicyResolveInput,
    now: Date,
    reasons: readonly string[],
    scopeId: string | null,
  ): Promise<RuntimePolicyResolution> {
    const entry = this.lastKnownGood.get(this.cacheKey(input.pageId.trim(), input.channel));
    if (entry && entry.expiresAtMs > now.getTime()) {
      return this.finish(input, now, "LAST_KNOWN_GOOD", "LAST_KNOWN_GOOD", entry.bundle, reasons, scopeId);
    }
    return this.finish(input, now, "UNAVAILABLE", "NONE", null, reasons, scopeId);
  }

  private async finish(
    input: RuntimePolicyResolveInput,
    now: Date,
    status: RuntimePolicyResolutionStatus,
    source: RuntimePolicyAuditEvent["source"],
    bundle: RuntimePolicyBundle | null,
    reasonCodes: readonly string[],
    scopeId: string | null,
  ): Promise<RuntimePolicyResolution> {
    const audit: RuntimePolicyAuditEvent = {
      schemaVersion: 1,
      resolutionId: randomUUID(),
      pageId: input.pageId.trim(),
      channel: input.channel,
      status,
      source,
      sideEffects: bundle?.sideEffects ?? "DISABLED",
      bundleId: bundle?.bundleId ?? null,
      bundleHash: bundle?.bundleHash ?? null,
      versionIds: bundle?.versionReferences.map((item) => item.versionId) ?? [],
      reasonCodes,
      pinScopeType: input.pin?.scopeType ?? null,
      pinScopeId: scopeId,
      occurredAt: now.toISOString(),
    };
    let auditWrite: RuntimePolicyResolution["auditWrite"] = "NOT_CONFIGURED";
    if (this.audit) {
      try {
        await this.audit.recordResolution(audit);
        auditWrite = "RECORDED";
      } catch {
        auditWrite = "FAILED";
      }
    }
    return {
      status,
      source,
      bundle,
      mayAffectOutbound: bundle?.sideEffects === "LIVE_OUTBOUND" &&
        (status === "RESOLVED" || status === "PINNED" || status === "LAST_KNOWN_GOOD"),
      reasonCodes,
      audit,
      auditWrite,
    };
  }

  private cacheKey(pageId: string, channel: RuntimePolicyChannel): string {
    return `${pageId}\u0000${channel}`;
  }
}

export interface RuntimePolicyResolverPort {
  resolve(input: RuntimePolicyResolveInput): Promise<RuntimePolicyResolution>;
}

export interface RuntimeMultiItemOfferDecision {
  readonly minimumParentProductUnits: number;
  readonly discountBps: number;
  readonly message: string;
}

/**
 * The sole bridge from a resolver result into outbound deterministic logic.
 * Shadow/disabled/rejected results always collapse to null, so callers cannot
 * accidentally apply observational policy content to a customer response.
 */
export function outboundRuntimePolicy(
  resolution: RuntimePolicyResolution | null,
): RuntimePolicyBundle | null {
  if (
    resolution === null || !resolution.mayAffectOutbound ||
    resolution.bundle?.sideEffects !== "LIVE_OUTBOUND"
  ) return null;
  return resolution.bundle;
}

/** No model input is accepted: this decision is computed only from a trusted bundle. */
export function decideRuntimeMultiItemOffer(
  bundle: RuntimePolicyBundle,
  parentProductUnits: number,
): RuntimeMultiItemOfferDecision | null {
  if (
    bundle.sideEffects !== "LIVE_OUTBOUND" ||
    !Number.isInteger(parentProductUnits) ||
    parentProductUnits < bundle.policy.multiItemOffer.minimumProductCount
  ) return null;
  const offer = bundle.policy.multiItemOffer;
  const percentage = offer.discountBps / 100;
  return {
    minimumParentProductUnits: offer.minimumProductCount,
    discountBps: offer.discountBps,
    message: `Ưu đãi từ ${offer.minimumProductCount} sản phẩm: giảm ${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(percentage)}% trên giá sản phẩm.`,
  };
}

/** Fits the existing canonical message policy_version column (<= 128 chars). */
export function runtimePolicyAuditReference(bundle: RuntimePolicyBundle): string {
  return `${bundle.policy.policyVersion}:${bundle.bundleHash.slice(7)}`;
}

export function runtimePolicyBundleReference(bundle: RuntimePolicyBundle): {
  readonly id: string;
  readonly version: string;
  readonly contentHash: `sha256:${string}`;
} {
  return {
    id: bundle.policy.policyBundleId,
    version: bundle.policy.policyVersion,
    contentHash: contentHash(bundle.policy) as `sha256:${string}`,
  };
}
