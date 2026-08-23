import { createHash } from "node:crypto";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  assessDf13CommerceAuthority,
  type Df13CommerceAuthorityIdentity,
} from "./df13-commerce-authority-contract.js";
import {
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  type CommerceAuthorityConsumer,
} from "./df13-commerce-authority-bundle.js";

const SCOPE_ID_PATTERN = /^[A-Za-z0-9:_-]+$/u;
const PREPROD_TEST_PAGE_ID = "1198992073286645";
const COMMERCE_CHANNEL = "MESSENGER";

/**
 * There is no reviewed authority-independent semantic work in this source
 * unit. A future addition must be finite, explicitly enumerated, and tested.
 */
export const DF13_AUTHORITY_INDEPENDENT_BYPASS_CLASSES_V1 = Object.freeze(
  [] as readonly [],
);

export type Df13CommerceFenceRequest = Readonly<{
  pageId: string;
  channel: string;
  workId: string;
  inboxIds: readonly string[];
  consumers: readonly CommerceAuthorityConsumer[];
  authority: Df13CommerceAuthorityIdentity;
}>;

export type Df13CommerceAuthorityFenceAssessment =
  | Readonly<{ status: "LEGACY_ADMITTED" }>
  | Readonly<{
    status: "COMMERCE_FENCE_REQUIRED";
    request: Df13CommerceFenceRequest;
  }>
  | Readonly<{
    status: "BLOCKED";
    blockId: string;
    reasonCode:
      | "DF13_FENCE_SCOPE_INVALID"
      | "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED"
      | "DF13_COMMERCE_IDENTITY_INVALID";
  }>;

function validScopeId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && SCOPE_ID_PATTERN.test(value);
}

function canonicalInboxIds(values: readonly string[]): readonly string[] | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort();
  if (new Set(sorted).size !== sorted.length || !sorted.every(validScopeId)) return null;
  return Object.freeze(sorted);
}

function authorityBlockId(input: Readonly<{
  pageId: string;
  channel: string;
  workId: string;
  inboxIds: readonly string[];
  resolution: RuntimeBehaviorModeResolution;
  reasonCode: string;
}>): string {
  const identity = {
    pageId: input.pageId,
    channel: input.channel,
    workId: input.workId,
    inboxIds: input.inboxIds,
    authorityProvenance: input.resolution.authorityProvenance,
    modeVersionId: input.resolution.modeVersionId,
    contentHash: input.resolution.contentHash,
    pointerRevision: input.resolution.pointerRevision,
    authorityBundleHash: input.resolution.authorityBundleHash,
    source: input.resolution.source,
    reasonCode: input.reasonCode,
  };
  return "df13-block-" + createHash("sha256")
    .update(canonicalJsonV1(identity), "utf8")
    .digest("hex");
}

/**
 * Pure pre-provider boundary. Absence of a positively identified COMMERCE
 * pointer preserves the existing LEGACY path before prospective fence scope
 * is inspected. A COMMERCE pointer must instead produce one exact durable
 * fence request or a deterministic block; this function acquires no lease and
 * performs no side effect.
 */
export function assessDf13CommerceAuthorityFence(input: Readonly<{
  pageId: string;
  channel: string;
  workId: string;
  inboxIds: readonly string[];
  resolution: RuntimeBehaviorModeResolution;
}>): Df13CommerceAuthorityFenceAssessment {
  if (input.resolution.authorityProvenance !== "COMMERCE_POINTER") {
    return Object.freeze({ status: "LEGACY_ADMITTED" });
  }

  const inboxIds = canonicalInboxIds(input.inboxIds);
  if (
    input.pageId !== PREPROD_TEST_PAGE_ID ||
    input.channel !== COMMERCE_CHANNEL ||
    !validScopeId(input.workId) ||
    inboxIds === null
  ) {
    const reasonCode = "DF13_FENCE_SCOPE_INVALID" as const;
    return Object.freeze({
      status: "BLOCKED",
      reasonCode,
      blockId: authorityBlockId({ ...input, reasonCode }),
    });
  }

  const authority = assessDf13CommerceAuthority(input.resolution);
  if (authority.status === "COMMERCE_BLOCKED") {
    const reasonCode = authority.reasonCode === "DF13_COMMERCE_IDENTITY_INVALID"
      ? authority.reasonCode
      : "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED" as const;
    return Object.freeze({
      status: "BLOCKED",
      reasonCode,
      blockId: authorityBlockId({ ...input, inboxIds, reasonCode }),
    });
  }

  const immutableAuthority = Object.freeze({ ...authority.authority });
  const request = Object.freeze({
    pageId: input.pageId,
    channel: input.channel,
    workId: input.workId,
    inboxIds,
    consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
    authority: immutableAuthority,
  });
  return Object.freeze({ status: "COMMERCE_FENCE_REQUIRED", request });
}
