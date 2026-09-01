import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V2,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";

function canonicalHash(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

describe("DF13 Commerce authority bundle identity", () => {
  it("binds Track B strategy and CTA authority to the baseline AgentProposalV1 contracts", () => {
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V2).toMatchObject({
      contractVersion: "DF13_COMMERCE_AUTHORITY_BUNDLE_V2",
      strategy: "AGENT_PROPOSAL_V1_STRATEGY_ANALYSIS",
      cta: "AGENT_PROPOSAL_V1_SALES_SIGNALS",
      context: "CONTEXT_V2",
      phase: "COMMERCE_DERIVED",
      reconciliation: "COMMERCE_FINAL",
      legacySalesStage: "DEMOTED_TELEMETRY_ONLY",
    });
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V2.authorityDependentConsumers)
      .toBe(DF13_COMMERCE_AUTHORITY_CONSUMERS_V1);
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V2.authorityIndependentBypassClasses)
      .toEqual([]);
    expect(canonicalHash(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V2))
      .toBe(DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash);
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash)
      .not.toBe(DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash);
  });

  it("freezes every collection participating in the immutable authority identity", () => {
    expect(Object.isFrozen(DF13_COMMERCE_AUTHORITY_CONSUMERS_V1)).toBe(true);
    expect(Object.isFrozen(
      DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1.authorityIndependentBypassClasses,
    )).toBe(true);
    expect(Object.isFrozen(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1)).toBe(true);
    expect(Object.isFrozen(DF13_COMMERCE_AUTHORITY_BUNDLE_V1)).toBe(true);

    const mutableBypassClasses = DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1
      .authorityIndependentBypassClasses as unknown as string[];
    expect(() => {
      mutableBypassClasses.push("UNREVIEWED_BYPASS");
    }).toThrow(TypeError);
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1.authorityIndependentBypassClasses)
      .toEqual([]);
  });

  it("binds the complete ordered consumer set into the canonical contract hash", () => {
    expect(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1.authorityDependentConsumers)
      .toBe(DF13_COMMERCE_AUTHORITY_CONSUMERS_V1);
    expect(canonicalHash(DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1))
      .toBe(DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash);

    const missingClassification = {
      ...DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1,
      authorityDependentConsumers:
        DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1.authorityDependentConsumers.slice(1),
    };
    const reorderedConsumers = {
      ...DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1,
      authorityDependentConsumers: [
        ...DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1.authorityDependentConsumers,
      ].reverse(),
    };

    expect(canonicalHash(missingClassification))
      .not.toBe(DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash);
    expect(canonicalHash(reorderedConsumers))
      .not.toBe(DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash);
  });
});
