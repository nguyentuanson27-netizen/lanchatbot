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
  readonly source: "DATABASE";
  readonly salesAuthorityMode: "COMMERCE";
  readonly stateReadMode: "LEGACY";
  readonly authorityBundleHash: string;
}>;

export type Df13CommerceAuthorityFenceAdmission =
  | Readonly<{ status: "LEGACY_ADMITTED" }>
  | Readonly<{
    status: "COMMERCE_ADMITTED";
    fenceToken: string;
    workId: string;
    authority: Df13CommerceAuthorityIdentity;
  }>
  | Readonly<{
    status: "HELD";
    fenceToken: string;
    reasonCode: string;
  }>
  | Readonly<{
    status: "REJECTED";
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
    workId: string;
    consumers: readonly CommerceAuthorityConsumer[];
    authority: Df13CommerceAuthorityIdentity;
  }>): Promise<
    | Readonly<{
      status: "ADMITTED";
      fenceToken: string;
      authority: Df13CommerceAuthorityIdentity;
    }>
    | Readonly<{
      status: "HELD";
      fenceToken: string;
      reasonCode: string;
    }>
  >;
  complete(input: Readonly<{
    fenceToken: string;
    workId: string;
    authority: Df13CommerceAuthorityIdentity;
  }>): Promise<"RELEASED" | "ALREADY_RELEASED">;
}

function validWorkId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && /^[A-Za-z0-9:_-]+$/u.test(value);
}

function commerceIdentity(
  resolution: RuntimeBehaviorModeResolution,
): Df13CommerceAuthorityIdentity | null {
  if (
    resolution.salesAuthorityMode !== "COMMERCE" ||
    resolution.stateReadMode !== "LEGACY" ||
    resolution.source !== "DATABASE" ||
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
    source: "DATABASE",
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    authorityBundleHash: resolution.authorityBundleHash,
  };
}

function safeLegacy(resolution: RuntimeBehaviorModeResolution): boolean {
  return resolution.salesAuthorityMode === "LEGACY" &&
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
 */
export class Df13CommerceAuthorityFenceAdapter {
  constructor(private readonly port?: Df13CommerceAuthorityFencePort) {}

  async admit(input: Readonly<{
    pageId: string;
    channel: string;
    workId: string;
    resolution: RuntimeBehaviorModeResolution;
  }>): Promise<Df13CommerceAuthorityFenceAdmission> {
    if (!validWorkId(input.workId) || !input.pageId || !input.channel) {
      return { status: "REJECTED", reasonCode: "DF13_FENCE_SCOPE_INVALID" };
    }
    if (safeLegacy(input.resolution)) return { status: "LEGACY_ADMITTED" };
    const authority = commerceIdentity(input.resolution);
    if (authority === null) {
      return {
        status: "REJECTED",
        reasonCode: input.resolution.source !== "DATABASE"
          ? "DF13_COMMERCE_IDENTITY_NOT_DATABASE_RESOLVED"
          : "DF13_COMMERCE_IDENTITY_INVALID",
      };
    }
    if (!this.port) {
      return { status: "REJECTED", reasonCode: "DF13_FENCE_PROVIDER_REQUIRED" };
    }
    return {
      status: "REJECTED",
      reasonCode: "DF13_COMMERCE_CONSUMER_DISPATCHER_REQUIRED",
    };
  }

  async complete(
    admission: Df13CommerceAuthorityFenceAdmission,
  ): Promise<"RELEASED" | "ALREADY_RELEASED" | "NOT_APPLICABLE"> {
    if (admission.status !== "COMMERCE_ADMITTED") return "NOT_APPLICABLE";
    if (!this.port) throw new Error("DF13_FENCE_PROVIDER_REQUIRED");
    let result: "RELEASED" | "ALREADY_RELEASED";
    try {
      result = await this.port.complete({
        fenceToken: admission.fenceToken,
        workId: admission.workId,
        authority: admission.authority,
      });
    } catch {
      throw new Error("DF13_FENCE_COMPLETION_UNPROVEN");
    }
    if (result !== "RELEASED" && result !== "ALREADY_RELEASED") {
      throw new Error("DF13_FENCE_COMPLETION_UNPROVEN");
    }
    return result;
  }
}
