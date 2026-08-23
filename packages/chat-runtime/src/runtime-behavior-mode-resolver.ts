import { createHash } from "node:crypto";

export type ConfirmationBehaviorMode = "LEGACY" | "V2_SHADOW" | "V2_ACTIVE" | "CLARIFY_ONLY";
export type StartupConfirmationBehaviorMode = "LEGACY" | "CLARIFY_ONLY";
export type BehaviorModeResolutionSource = "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";
export interface RuntimeBehaviorModePayload {
  readonly confirmationMode: ConfirmationBehaviorMode;
  readonly salesAuthorityMode: "LEGACY" | "SHADOW" | "COMMERCE";
  readonly stateReadMode: "LEGACY" | "SHADOW" | "V2";
  /** Present only for the immutable COMMERCE authority bundle. */
  readonly authorityBundleHash?: string | null;
}
export interface RuntimeBehaviorModeVersion extends RuntimeBehaviorModePayload {
  readonly schemaVersion: 1;
  readonly modeVersionId: string;
  readonly pageId: string;
  readonly channel: string;
  readonly contentHash: string;
  readonly createdBy: string;
  readonly reason: string;
  readonly createdAt: string;
}
export interface RuntimeBehaviorModePointer {
  readonly version: RuntimeBehaviorModeVersion;
  readonly pointerRevision: number;
  readonly updatedBy: string;
  readonly reason: string;
  readonly updatedAt: string;
}
export interface RuntimeBehaviorModeAuditEvent {
  readonly resolutionId: string;
  readonly pageId: string;
  readonly channel: string;
  readonly confirmationMode: ConfirmationBehaviorMode;
  readonly modeVersionId: string | null;
  readonly contentHash: string | null;
  readonly pointerRevision: number | null;
  readonly source: BehaviorModeResolutionSource;
  readonly status: "RESOLVED" | "FALLBACK" | "REJECTED";
  readonly reasonCodes: readonly string[];
  readonly workerId: string;
  readonly pointerUpdatedAt: string | null;
  readonly resolvedAt: string;
  readonly propagationMs: number | null;
}
export interface RuntimeBehaviorModeSourcePort {
  loadActiveMode(input: { readonly pageId: string; readonly channel: string }): Promise<RuntimeBehaviorModePointer | null>;
  recordResolution?(event: RuntimeBehaviorModeAuditEvent): Promise<void>;
}
export interface CommerceAuthorityConsumerPort {
  /**
   * Validation-only boundary for the dedicated Commerce consumer. Calling this
   * method must not plan or execute a side effect.
   */
  admitCommerceAuthority(input: {
    readonly pageId: string;
    readonly channel: string;
    readonly modeVersionId: string;
    readonly contentHash: string;
    readonly authorityBundleHash: string;
    readonly pointerRevision: number;
    readonly source: "DATABASE" | "CACHE";
  }): Promise<{ readonly status: "ADMITTED" | "REJECTED" }>;
}
export type RuntimeBehaviorModeAuthorityProvenance =
  | "LEGACY_POINTER"
  | "COMMERCE_POINTER"
  | "STARTUP_DEFAULT"
  | "UNKNOWN";
export interface RuntimeBehaviorModeResolution extends RuntimeBehaviorModePayload {
  readonly authorityBundleHash: string | null;
  readonly modeVersionId: string | null;
  readonly contentHash: string | null;
  readonly pointerRevision: number | null;
  readonly source: BehaviorModeResolutionSource;
  readonly status: "RESOLVED" | "FALLBACK" | "REJECTED";
  readonly reasonCodes: readonly string[];
  readonly pointerUpdatedAt: string | null;
  readonly resolvedAt: string;
  readonly propagationMs: number | null;
  readonly auditWrite: "RECORDED" | "FAILED" | "NOT_CONFIGURED";
  /**
   * Resolver-owned origin retained even when the effective payload falls back
   * to LEGACY fields. Consumers must not infer origin from fallback fields.
   */
  readonly authorityProvenance: RuntimeBehaviorModeAuthorityProvenance;
}

const FAIL_SAFE: RuntimeBehaviorModePayload = {
  confirmationMode: "CLARIFY_ONLY",
  salesAuthorityMode: "LEGACY",
  stateReadMode: "LEGACY",
  authorityBundleHash: null,
};
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}
export function behaviorModeContentHash(payload: RuntimeBehaviorModePayload): string {
  const canonicalPayload = {
    confirmationMode: payload.confirmationMode,
    salesAuthorityMode: payload.salesAuthorityMode,
    schemaVersion: 1,
    stateReadMode: payload.stateReadMode,
    ...(payload.salesAuthorityMode === "COMMERCE"
      ? { authorityBundleHash: payload.authorityBundleHash ?? null }
      : {}),
  };
  return `sha256:${createHash("sha256").update(canonicalJson(canonicalPayload), "utf8").digest("hex")}`;
}
interface CachedPointer { readonly pointer: RuntimeBehaviorModePointer; readonly fetchedAtMs: number; }

class RuntimeBehaviorModeLoadError extends Error {
  constructor(
    readonly authorityProvenance: RuntimeBehaviorModeAuthorityProvenance,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : "RUNTIME_BEHAVIOR_LOAD_INVALID");
  }
}

function authorityProvenanceForPointer(
  pointer: RuntimeBehaviorModePointer | null | undefined,
): RuntimeBehaviorModeAuthorityProvenance {
  return pointer?.version?.salesAuthorityMode === "COMMERCE"
    ? "COMMERCE_POINTER"
    : pointer?.version?.salesAuthorityMode === "LEGACY"
      ? "LEGACY_POINTER"
      : "UNKNOWN";
}

export class RuntimeBehaviorModeResolver {
  private readonly cacheTtlMs: number;
  private readonly lastKnownGoodTtlMs: number;
  private readonly allowedPageIds: ReadonlySet<string>;
  private readonly allowedCommercePageIds: ReadonlySet<string>;
  private readonly commerceAuthorityConsumer: CommerceAuthorityConsumerPort | undefined;
  private readonly cache = new Map<string, CachedPointer>();
  private readonly lastKnownGood = new Map<string, CachedPointer>();
  private readonly inFlight = new Map<string, Promise<CachedPointer>>();

  constructor(
    private readonly source: RuntimeBehaviorModeSourcePort,
    options: {
      readonly cacheTtlMs?: number;
      readonly lastKnownGoodTtlMs?: number;
      readonly allowedPageIds?: readonly string[];
      readonly allowedCommercePageIds?: readonly string[];
      readonly commerceAuthorityConsumer?: CommerceAuthorityConsumerPort;
    } = {},
  ) {
    this.cacheTtlMs = options.cacheTtlMs ?? 5_000;
    this.lastKnownGoodTtlMs = options.lastKnownGoodTtlMs ?? 300_000;
    if (this.cacheTtlMs < 0 || this.cacheTtlMs > 5_000) throw new Error("RUNTIME_BEHAVIOR_CACHE_TTL_INVALID");
    if (this.lastKnownGoodTtlMs < 0 || this.lastKnownGoodTtlMs > 300_000) throw new Error("RUNTIME_BEHAVIOR_LKG_TTL_INVALID");
    this.allowedPageIds = new Set(options.allowedPageIds ?? []);
    this.allowedCommercePageIds = new Set(options.allowedCommercePageIds ?? []);
    this.commerceAuthorityConsumer = options.commerceAuthorityConsumer;
  }

  invalidate(pageId: string, channel: string): void {
    this.cache.delete(`${pageId}:${channel.trim().toUpperCase()}`);
  }

  private validate(pointer: RuntimeBehaviorModePointer, pageId: string, channel: string): void {
    const version = pointer.version;
    if (version.schemaVersion !== 1 || version.pageId !== pageId || version.channel !== channel) throw new Error("RUNTIME_BEHAVIOR_SCOPE_INVALID");
    if (!Number.isInteger(pointer.pointerRevision) || pointer.pointerRevision < 1) throw new Error("RUNTIME_BEHAVIOR_REVISION_INVALID");
    if (version.stateReadMode !== "LEGACY" ||
        (version.salesAuthorityMode !== "LEGACY" && version.salesAuthorityMode !== "COMMERCE")) {
      throw new Error("RUNTIME_BEHAVIOR_NON_CONFIRMATION_TRACK_ACTIVE");
    }
    if (version.salesAuthorityMode === "COMMERCE" &&
        !/^[a-f0-9]{64}$/u.test(version.authorityBundleHash ?? "")) {
      throw new Error("RUNTIME_BEHAVIOR_COMMERCE_BUNDLE_INVALID");
    }
    if (version.salesAuthorityMode === "LEGACY" && version.authorityBundleHash != null) {
      throw new Error("RUNTIME_BEHAVIOR_LEGACY_BUNDLE_INVALID");
    }
    if (behaviorModeContentHash(version) !== version.contentHash) throw new Error("RUNTIME_BEHAVIOR_HASH_MISMATCH");
    if (Number.isNaN(Date.parse(pointer.updatedAt))) throw new Error("RUNTIME_BEHAVIOR_UPDATED_AT_INVALID");
  }

  private async load(pageId: string, channel: string, nowMs: number): Promise<CachedPointer> {
    const key = `${pageId}:${channel}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const pending = (async () => {
      const pointer = await this.source.loadActiveMode({ pageId, channel });
      if (!pointer) throw new Error("RUNTIME_BEHAVIOR_POINTER_MISSING");
      const authorityProvenance = authorityProvenanceForPointer(pointer);
      try {
        this.validate(pointer, pageId, channel);
        const previous = this.lastKnownGood.get(key)?.pointer;
        if (previous && pointer.pointerRevision < previous.pointerRevision) {
          throw new Error("RUNTIME_BEHAVIOR_POINTER_REVISION_REGRESSION");
        }
        if (
          previous
          && pointer.pointerRevision === previous.pointerRevision
          && (
            pointer.version.modeVersionId !== previous.version.modeVersionId
            || pointer.version.contentHash !== previous.version.contentHash
          )
        ) throw new Error("RUNTIME_BEHAVIOR_POINTER_REVISION_CONFLICT");
        const entry = { pointer, fetchedAtMs: nowMs };
        this.cache.set(key, entry);
        this.lastKnownGood.set(key, entry);
        return entry;
      } catch (error) {
        throw new RuntimeBehaviorModeLoadError(authorityProvenance, error);
      }
    })();
    this.inFlight.set(key, pending);
    try { return await pending; } finally { this.inFlight.delete(key); }
  }

  private async commerceRejectionReason(
    pointer: RuntimeBehaviorModePointer,
    source: BehaviorModeResolutionSource,
  ): Promise<string | null> {
    if (source !== "DATABASE" && source !== "CACHE") {
      return "RUNTIME_BEHAVIOR_COMMERCE_STALE_AUTHORITY";
    }
    if (!this.allowedCommercePageIds.has(pointer.version.pageId)) {
      return "RUNTIME_BEHAVIOR_COMMERCE_PAGE_NOT_ALLOWED";
    }
    if (!this.commerceAuthorityConsumer) {
      return "RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_UNAVAILABLE";
    }
    try {
      const admission = await this.commerceAuthorityConsumer.admitCommerceAuthority({
        pageId: pointer.version.pageId,
        channel: pointer.version.channel,
        modeVersionId: pointer.version.modeVersionId,
        contentHash: pointer.version.contentHash,
        authorityBundleHash: pointer.version.authorityBundleHash!,
        pointerRevision: pointer.pointerRevision,
        source,
      });
      return admission.status === "ADMITTED" ? null : "RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_REJECTED";
    } catch {
      return "RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_REJECTED";
    }
  }

  private async audited(
    input: { readonly resolutionId: string; readonly pageId: string; readonly channel: string; readonly workerId: string },
    resolution: Omit<RuntimeBehaviorModeResolution, "auditWrite">,
  ): Promise<RuntimeBehaviorModeResolution> {
    if (!this.source.recordResolution) return { ...resolution, auditWrite: "NOT_CONFIGURED" };
    try {
      await this.source.recordResolution({
        resolutionId: input.resolutionId,
        pageId: input.pageId,
        channel: input.channel,
        confirmationMode: resolution.confirmationMode,
        modeVersionId: resolution.modeVersionId,
        contentHash: resolution.contentHash,
        pointerRevision: resolution.pointerRevision,
        source: resolution.source,
        status: resolution.status,
        reasonCodes: resolution.reasonCodes,
        workerId: input.workerId,
        pointerUpdatedAt: resolution.pointerUpdatedAt,
        resolvedAt: resolution.resolvedAt,
        propagationMs: resolution.propagationMs,
      });
      return { ...resolution, auditWrite: "RECORDED" };
    } catch {
      return {
        ...FAIL_SAFE,
        modeVersionId: null,
        contentHash: null,
        pointerRevision: null,
        authorityBundleHash: null,
        source: "FAIL_SAFE",
        status: "FALLBACK",
        reasonCodes: [
          ...resolution.reasonCodes,
          ...(resolution.authorityProvenance === "COMMERCE_POINTER"
            ? ["RUNTIME_BEHAVIOR_COMMERCE_AUDIT_FAILED"]
            : []),
          "RUNTIME_BEHAVIOR_AUDIT_FAILED",
        ],
        pointerUpdatedAt: null,
        resolvedAt: resolution.resolvedAt,
        propagationMs: null,
        authorityProvenance: resolution.authorityProvenance,
        auditWrite: "FAILED",
      };
    }
  }

  async resolve(input: {
    readonly resolutionId: string;
    readonly pageId: string;
    readonly channel: string;
    readonly workerId: string;
    readonly now?: Date;
  }): Promise<RuntimeBehaviorModeResolution> {
    const now = input.now ?? new Date();
    const nowMs = now.getTime();
    if (Number.isNaN(nowMs)) throw new Error("RUNTIME_BEHAVIOR_NOW_INVALID");
    const channel = input.channel.trim().toUpperCase();
    const scoped = { ...input, channel };
    const key = `${input.pageId}:${channel}`;
    const cached = this.cache.get(key);
    let entry: CachedPointer | null = null;
    let failedAuthorityProvenance: RuntimeBehaviorModeAuthorityProvenance = "UNKNOWN";
    let source: BehaviorModeResolutionSource = "DATABASE";
    let reasonCodes: readonly string[] = [];
    const cacheAgeMs = cached ? nowMs - cached.fetchedAtMs : null;
    if (cached && cacheAgeMs !== null && cacheAgeMs >= 0 && cacheAgeMs < this.cacheTtlMs) {
      entry = cached;
      source = "CACHE";
    } else {
      try { entry = await this.load(input.pageId, channel, nowMs); }
      catch (error) {
        if (error instanceof RuntimeBehaviorModeLoadError) {
          failedAuthorityProvenance = error.authorityProvenance;
        }
        const lkg = this.lastKnownGood.get(key);
        const lkgAgeMs = lkg ? nowMs - lkg.fetchedAtMs : null;
        if (lkg && lkgAgeMs !== null && lkgAgeMs >= 0 && lkgAgeMs <= this.lastKnownGoodTtlMs) {
          entry = lkg;
          source = "LAST_KNOWN_GOOD";
          reasonCodes = ["RUNTIME_BEHAVIOR_SOURCE_UNAVAILABLE"];
        }
      }
    }
    if (!entry) {
      const expiredAuthorityProvenance = authorityProvenanceForPointer(this.lastKnownGood.get(key)?.pointer);
      const authorityProvenance = expiredAuthorityProvenance === "UNKNOWN"
        ? failedAuthorityProvenance
        : expiredAuthorityProvenance;
      return this.audited(scoped, {
        ...FAIL_SAFE, modeVersionId: null, contentHash: null, pointerRevision: null,
        authorityBundleHash: null,
        source: "FAIL_SAFE", status: "FALLBACK", reasonCodes: [
          "RUNTIME_BEHAVIOR_LKG_EXPIRED",
          ...(authorityProvenance === "COMMERCE_POINTER" ? ["RUNTIME_BEHAVIOR_COMMERCE_STALE_AUTHORITY"] : []),
        ],
        pointerUpdatedAt: null, resolvedAt: now.toISOString(), propagationMs: null,
        authorityProvenance,
      });
    }
    const pointer = entry.pointer;
    const authorityProvenance = authorityProvenanceForPointer(pointer);
    if (authorityProvenance === "COMMERCE_POINTER") {
      const commerceRejectionReason = await this.commerceRejectionReason(pointer, source);
      if (commerceRejectionReason) {
        return this.audited(scoped, {
          ...FAIL_SAFE,
          modeVersionId: pointer.version.modeVersionId,
          contentHash: pointer.version.contentHash,
          pointerRevision: pointer.pointerRevision,
          authorityBundleHash: null,
          source: "FAIL_SAFE",
          status: "REJECTED",
          reasonCodes: [...reasonCodes, commerceRejectionReason],
          pointerUpdatedAt: pointer.updatedAt,
          resolvedAt: now.toISOString(),
          propagationMs: Math.max(0, nowMs - Date.parse(pointer.updatedAt)),
          authorityProvenance,
        });
      }
    }
    if (
      pointer.version.confirmationMode === "V2_ACTIVE"
      && !this.allowedPageIds.has(input.pageId)
    ) {
      return this.audited(scoped, {
        ...FAIL_SAFE,
        modeVersionId: pointer.version.modeVersionId,
        contentHash: pointer.version.contentHash,
        pointerRevision: pointer.pointerRevision,
        authorityBundleHash: null,
        source: "FAIL_SAFE",
        status: "REJECTED",
        reasonCodes: [
          "RUNTIME_BEHAVIOR_ACTIVE_PAGE_NOT_ALLOWED",
          ...(authorityProvenance === "COMMERCE_POINTER" ? ["RUNTIME_BEHAVIOR_COMMERCE_CONFIRMATION_PAGE_NOT_ALLOWED"] : []),
        ],
        pointerUpdatedAt: pointer.updatedAt,
        resolvedAt: now.toISOString(),
        propagationMs: Math.max(0, nowMs - Date.parse(pointer.updatedAt)),
        authorityProvenance,
      });
    }
    return this.audited(scoped, {
      confirmationMode: pointer.version.confirmationMode,
      salesAuthorityMode: pointer.version.salesAuthorityMode,
      stateReadMode: pointer.version.stateReadMode,
      authorityBundleHash: pointer.version.authorityBundleHash ?? null,
      modeVersionId: pointer.version.modeVersionId,
      contentHash: pointer.version.contentHash,
      pointerRevision: pointer.pointerRevision,
      source,
      status: source === "LAST_KNOWN_GOOD" ? "FALLBACK" : "RESOLVED",
      reasonCodes,
      pointerUpdatedAt: pointer.updatedAt,
      resolvedAt: now.toISOString(),
      propagationMs: Math.max(0, nowMs - Date.parse(pointer.updatedAt)),
      authorityProvenance,
    });
  }
}

export function startupBehaviorModeResolution(
  confirmationMode: StartupConfirmationBehaviorMode,
  now = new Date(),
): RuntimeBehaviorModeResolution {
  return {
    confirmationMode, salesAuthorityMode: "LEGACY", stateReadMode: "LEGACY", authorityBundleHash: null,
    modeVersionId: null, contentHash: null, pointerRevision: null,
    source: "STARTUP_DEFAULT", status: "FALLBACK", reasonCodes: ["RUNTIME_BEHAVIOR_RESOLVER_DISABLED"],
    pointerUpdatedAt: null, resolvedAt: now.toISOString(), propagationMs: null, auditWrite: "NOT_CONFIGURED",
    authorityProvenance: "STARTUP_DEFAULT",
  };
}
