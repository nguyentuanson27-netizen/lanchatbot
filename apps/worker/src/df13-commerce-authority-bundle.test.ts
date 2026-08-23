import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";

function canonicalHash(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

describe("DF13 Commerce authority bundle identity", () => {
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
