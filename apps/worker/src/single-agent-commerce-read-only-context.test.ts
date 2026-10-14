import { describe, expect, it } from "vitest";
import { buildProductAttributesV1 } from "@lana/business-tools";
import { buildReadOnlyContext } from "./single-agent-commerce-read-only-context.js";
import { finalGate, hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";

const now = new Date("2026-10-14T10:00:00.000Z");
const testState = () => ({ conversationOwner: "BOT", revision: 1, currentProductId: null,
  factSnapshotVersion: "unused", bindingVersion: "binding-1", recipient: "recipient-hash",
  permission: true, privacyAllowed: true });
const attributes = () => buildProductAttributesV1({ productId: "SM613", observedAt: now.toISOString(), data: {
  materials: ["cotton"], materialComponents: {}, colors: ["navy"], styles: [], silhouettes: [], occasions: ["đi làm"],
  designAttributes: null, careInstructions: null, wearProperties: null, backCoverage: null, designComplexity: null,
} });

describe("read-only source context", () => {
  it("accepts current source content and invalidates its changed or expired version", () => {
    const content = { productName: "Áo thử nghiệm", description: "Vải cotton, dáng suông.", productUrl: null,
      metadata: { authority: "WEBSTORE_XML" as const, sourceVersion: "xml-v1", observedAt: now.toISOString(),
        expiresAt: null, freshForSeconds: null, freshnessState: "FRESH" as const } };
    const c = buildReadOnlyContext({ state: testState(), subjects: [{ ref: "SM613", kind: "PRODUCT", label: "Áo", bindingVersion: "binding-1" }],
      products: [{ ref: "product:SM613", subjectRef: "SM613", content }] });
    expect(hardPrecheck(c, "Áo dáng suông chị nhé.", now)).toBeNull();
    const old = makeBinding("request", "Áo dáng suông chị nhé.", c), changed = structuredClone(c);
    changed.runtimeProducts![0]!.content!.description = "Vải khác.";
    expect(makeBinding("request", "Áo dáng suông chị nhé.", changed)).not.toEqual(old);
    changed.runtimeProducts![0]!.content!.metadata.freshnessState = "STALE";
    expect(hardPrecheck(changed, "Áo dáng suông chị nhé.", now)).toBe("STALE");
  });
  it("does not create a fake product for a clarification", () => {
    const c = buildReadOnlyContext({ state: testState() });
    expect(c.boundSubjects).toEqual([]);
    expect(hardPrecheck(c, "Chị muốn xem áo hay quần ạ?", now)).toBeNull();
  });
  it("keeps source values/provenance and changes identity when source content changes", () => {
    const input = { state: testState(), subjects: [{ ref: "SM613", kind: "PRODUCT", label: "Sơ mi", bindingVersion: "binding-1" }],
      products: [{ ref: "attributes:SM613", subjectRef: "SM613", attributes: attributes() }] };
    const a = buildReadOnlyContext(input), b = buildReadOnlyContext(structuredClone(input));
    expect(makeBinding("request", "Áo cotton chị nhé.", a)).toEqual(makeBinding("request", "Áo cotton chị nhé.", b));
    expect(a.runtimeProducts![0]!.attributes).toEqual(input.products[0]!.attributes);
    const changed = structuredClone(input);
    const { schemaVersion: _v, productId: _p, metadata: _m, ...data } = attributes();
    changed.products[0]!.attributes = buildProductAttributesV1({ productId: "SM613", observedAt: now.toISOString(),
      data: { ...data, materials: ["viscose"] } });
    expect(buildReadOnlyContext(changed).state.factSnapshotVersion).not.toBe(a.state.factSnapshotVersion);
  });
  it("never serializes arbitrary state or evaluator fields", () => {
    const c = buildReadOnlyContext({ state: { ...testState(), caseId: "hidden", privateAddress: "hidden", expectedSafe: true } });
    expect(JSON.stringify(c)).not.toMatch(/caseId|expectedSafe|privateAddress/);
  });
  it("invalidates an old PASS when current source identity changes", () => {
    const c = buildReadOnlyContext({ state: testState() }), text = "Chị muốn xem mẫu nào ạ?";
    const binding = makeBinding("request", text, c);
    const changed = buildReadOnlyContext({ state: { ...testState(), bindingVersion: "binding-2" } });
    expect(finalGate({ expected: binding, response: { kind: "VERDICT", binding, result: { verdict: "PASS", violations: [] } },
      current: changed, finalDraft: text, now }).disposition).toBe("HANDOFF");
  });
});
