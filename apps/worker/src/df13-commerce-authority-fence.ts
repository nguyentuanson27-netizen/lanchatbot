import { createHash } from "node:crypto";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  type CommerceAuthorityConsumer,
} from "./df13-commerce-authority-contract.js";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * A COMMERCE admission is intentionally narrow. There are no bypass classes:
 * the runner treats its complete semantic path as authority-dependent.
 */
export const DF13_AUTHORITY_INDEPENDENT_BYPASS_CLASSES_V1 = Object.freeze(
  [] as readonly [],
);

export type Df13CommerceAuthorityIdentity = Readonly<{
  readonly modeVersionId: string;
  readonly contentHash: string;
  readonly pointerRevision: number;
  /** A bounded resolver cache is fresh enough; LKG and startup are never. */
  readonly source: "DATABASE" | "CACHE";
  readonly salesAuthorityMode: "COMMERCE";
  readonly stateReadMode: "LEGACY";
  readonly authorityBundleHash: string;
}>;

export type Df13CommerceAuthorityFenceAdmission =
  | Readonly<{ status: "LEGACY_ADMITTED" }>
  | Readonly<{
    status: "COMMERCE_ADMITTED";
    fenceToken: string;
    acquisition: "NEW" | "REACQUIRED";
    workId: string;
    inboxIds: readonly string[];
    authority: Df13CommerceAuthorityIdentity;
  }>
  | Readonly<{
    status: "HELD";
    fenceToken: string;
    reasonCode: string;
  }>
  | Readonly<{
    /**
     * No provider fence was acquired. The inbox must durably block this work
     * without consuming an attempt; it must never use the generic retry path.
     */
    status: "BLOCKED";
    blockId: string;
    reasonCode: string;
  }>;

/**
 * This port owns durable admission and recovery. Its implementation is not
 * wired into a runtime until a separately owner-authorized DF13 release; a
 * transient process-local mutex is therefore never an acceptable substitute.
 */
export interface Df13CommerceAuthorityFencePort {
  admit(input: Readonly<{
    pageId: string;
    channel: string;
    /** Sorted unique durable inbox row IDs; this is the authorization scope. */
    inboxIds: readonly string[];
    /** Audit correlation only. It must never be used to authorize overlap. */
    workId: string;
    consumers: readonly CommerceAuthorityConsumer[];
    authority: Df13CommerceAuthorityIdentity;
  }>): Promise<
    | Readonly<{
      status: "ADMITTED";
      fenceToken: string;
      /** New durable lease, or a new epoch after verified prior lease expiry. */
      acquisition: "NEW" | "REACQUIRED";
      authority: Df13CommerceAuthorityIdentity;
    }>
    | Readonly<{
      status: "HELD";
      fenceToken: string;
      reasonCode: string;
    }>
  >;
}

function validWorkId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && /^[A-Za-z0-9:_-]+$/u.test(value);
}

function canonicalInboxIds(values: readonly string[]): readonly string[] | null {
  if (values.length === 0) return null;
  const normalized = [...values].sort();
  if (new Set(normalized).size !== normalized.length) return null;
  return normalized.every((value) =>
    value.length > 0 && value.length <= 128 && /^[A-Za-z0-9:_-]+$/u.test(value)
  ) ? normalized : null;
}

function authorityBlockId(input: Readonly<{
  pageId: string;
  channel: string;
  workId: string;
  inboxIds: readonly string[];
}>): string {
  return "df13-block-" + createHash("sha256")
    .update(JSON.stringify({
      pageId: input.pageId,
      channel: input.channel,
      workId: input.workId,
      inboxIds: input.inboxIds,
    }), "utf8")
    .digest("hex");
}

function commerceIdentity(
  resolution: RuntimeBehaviorModeResolution,
): Df13CommerceAuthorityIdentity | null {
  if (
    resolution.salesAuthorityMode !== "COMMERCE" ||
    resolution.stateReadMode !== "LEGACY" ||
    (resolution.source !== "DATABASE" && resolution.source !== "CACHE") ||
    resolution.status !== "RESOLVED" ||
    resolution.auditWrite !== "RECORDED"
  ) {
    return null;
  }
  if (
    resolution.modeVersionId === null ||
    resolution.contentHash === null ||
    resolution.pointerRevision === null ||
    resolution.authorityBundleHash === null ||
    !UUID_PATTERN.test(resolution.modeVersionId ?? "") ||
    !CONTENT_HASH_PATTERN.test(resolution.contentHash ?? "") ||
    !Number.isSafeInteger(resolution.pointerRevision) ||
    resolution.pointerRevision < 1 ||
    resolution.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash ||
    !SHA256_PATTERN.test(resolution.authorityBundleHash ?? "")
  ) {
    return null;
  }
  return {
    modeVersionId: resolution.modeVersionId,
    contentHash: resolution.contentHash,
    pointerRevision: resolution.pointerRevision,
    source: resolution.source,
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    authorityBundleHash: resolution.authorityBundleHash,
  };
}

function safeLegacy(resolution: RuntimeBehaviorModeResolution): boolean {
  return resolution.source !== "FAIL_SAFE" &&
    resolution.status !== "REJECTED" &&
    resolution.salesAuthorityMode === "LEGACY" &&
    resolution.stateReadMode === "LEGACY" &&
    resolution.authorityBundleHash === null;
}

/**
 * Real consumer boundary for the entire RealtimeRunner semantic path. A
 * LEGACY resolution stays default-off. COMMERCE cannot enter the runner until
 * both a durable fence and the separately implemented all-or-nothing COMMERCE
 * dispatcher prove the same immutable authority identity. This source revision
 * contains neither dispatcher nor configured provider, so it fails closed
 * before any prospective fence admission can enter the LEGACY semantic path.
 *
 * A future port must atomically claim each `inboxIds` row under `fenceToken`,
 * reject any intersection with an unexpired holder, and make completion token
 * and epoch conditional. `workId` is only an audit digest and cannot prove
 * non-overlap by itself.
 */
export class Df13CommerceAuthorityFenceAdapter {
  constructor(private readonly port?: Df13CommerceAuthorityFencePort) {}

  async admit(input: Readonly<{
    pageId: string;
    channel: string;
    workId: string;
    inboxIds: readonly string[];
    resolution: RuntimeBehaviorModeResolution;
  }>): Promise<Df13CommerceAuthorityFenceAdmission> {
    // LEGACY is the default-off path and has no COMMERCE fence scope. In
    // particular, the native customer-burst claim is not cardinality-bounded,
    // so a current LEGACY batch must not be blocked by a prospective COMMERCE
    // provider's scope validation.
    if (safeLegacy(input.resolution)) return { status: "LEGACY_ADMITTED" };
    const inboxIds = canonicalInboxIds(input.inboxIds);
    const blockId = authorityBlockId({
      pageId: input.pageId,
      channel: input.channel,
      workId: input.workId,
      inboxIds: inboxIds ?? input.inboxIds,
    });
    if (!validWorkId(input.workId) || !input.pageId || !input.channel || inboxIds === null) {
      return { status: "BLOCKED", blockId, reasonCode: "DF13_FENCE_SCOPE_INVALID" };
    }
    const authority = commerceIdentity(input.resolution);
    if (authority === null) {
      return {
        status: "BLOCKED",
        blockId,
        reasonCode: input.resolution.source !== "DATABASE" && input.resolution.source !== "CACHE"
          ? "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED"
          : "DF13_COMMERCE_IDENTITY_INVALID",
      };
    }
    if (!this.port) {
      return { status: "BLOCKED", blockId, reasonCode: "DF13_FENCE_PROVIDER_REQUIRED" };
    }
    return {
      status: "BLOCKED",
      blockId,
      reasonCode: "DF13_COMMERCE_CONSUMER_DISPATCHER_REQUIRED",
    };
  }

}
