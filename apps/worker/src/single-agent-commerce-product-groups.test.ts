import { expect, it } from "vitest";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { commerceProductGroup, commerceSizeSource, type CommerceProductGroup } from "./single-agent-commerce-product-groups.js";
import { fixtureProduct, fixtureSizeInput, fixturePolicy, fixtureProfile, commerceScope, commerceNow } from "./single-agent-commerce.test-support.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";

const group: CommerceProductGroup = { name: "Thanh Mai", customerNames: ["set Thanh Mai"],
  productTitles: { SOURCE: "Set quần Thanh Mai", MEMBER: "Set váy Thanh Mai" }, approvalRef: "owner-decision",
  sharedSize: { artifactKey: "source-chart", sourceProductId: "SOURCE", brand: "LANA_DESIGN", category: "PANTS", componentRole: "PANTS" } };
function fixture() {
  const product = fixtureProduct("MEMBER").product; product.title = group.productTitles.MEMBER!;
  const scoped = fixtureSizeInput("SOURCE").charts[0]!;
  const artifact = { schemaVersion: 1, kind: "SIZE_CHART", ...scoped,
    scope: { ...scoped.scope!, parentProductIds: ["SOURCE"], categories: ["PANTS"], forms: [], materials: [] },
    extraction: { measurementBasis: "BODY", confidence: 1, extractorVersion: "fixture" } };
  const policy = { status: "RESOLVED", reasonCodes: [], bundle: { channel: "PUBLISHED", resolvedAt: commerceNow.toISOString(),
    versionReferences: [{ artifactKey: "source-chart", artifactKind: "SIZE_CHART", lifecycle: "PUBLISHED" }],
    artifacts: { sizeCharts: { "source-chart": artifact } } } } as unknown as RuntimePolicyResolution;
  return { product, policy, artifact };
}
it("delegates only chart applicability to an approved same-name member, preserving source provenance", () => {
  const { product, policy, artifact } = fixture(), before = structuredClone({ product, artifact });
  expect(commerceSizeSource(product, policy).charts).toEqual([]);
  const actual = commerceSizeSource(product, policy, [group]);
  expect(actual.target).toMatchObject({ parentProductId: "MEMBER", componentProductId: "MEMBER" });
  expect(actual.charts).toHaveLength(1);
  expect(actual.charts[0]!.chart).toBe(artifact.chart);
  expect(actual.charts[0]!.scope?.parentProductIds).toEqual(["SOURCE", "MEMBER"]);
  expect({ product, artifact }).toEqual(before);
});
it.each(["unlisted", "renamed", "ambiguous", "unverified", "garment", "unpublished", "stale", "brand", "scope", "missing"])(
  "does not borrow a chart after %s changes", fault => {
    const { product, policy, artifact } = fixture(); let groups = [group];
    if (fault === "unlisted") product.productId = "OTHER";
    if (fault === "renamed") product.title = "Set khác";
    if (fault === "ambiguous") groups = [group, structuredClone(group)];
    if (fault === "unverified") artifact.chart.reference.verificationStatus = "EXTRACTED_UNREVIEWED";
    if (fault === "garment") artifact.extraction.measurementBasis = "GARMENT";
    if (fault === "unpublished") Object.assign(policy.bundle!, { channel: "CANARY_LIVE" });
    if (fault === "stale") Object.assign(policy, { status: "LAST_KNOWN_GOOD" });
    if (fault === "brand") artifact.chart.brand = "OTHER";
    if (fault === "scope") artifact.scope.parentProductIds = ["OTHER"];
    if (fault === "missing") Object.assign(policy.bundle!.artifacts, { sizeCharts: {} });
    expect(commerceSizeSource(product, policy, groups).charts).toEqual([]);
  });
it("does not let another eligible chart authorize the configured chart with wrong source scope", () => {
  const { product, policy, artifact } = fixture();
  const other = structuredClone(artifact); other.chart.reference.chartId = "another";
  Object.assign(policy.bundle!.artifacts.sizeCharts, { another: other });
  Object.assign(policy.bundle!, { versionReferences: [...policy.bundle!.versionReferences,
    { artifactKey: "another", artifactKind: "SIZE_CHART", lifecycle: "PUBLISHED" }] });
  artifact.scope.parentProductIds = ["OTHER"];
  expect(commerceSizeSource(product, policy, [group]).charts).toEqual([]);
});
it("requires a unique explicit ID and exact registered source title", () => {
  expect(commerceProductGroup("MEMBER", "Set váy Thanh Mai", [group])).toBe(group);
  expect(commerceProductGroup("OTHER", "Set váy Thanh Mai", [group])).toBeUndefined();
  expect(commerceProductGroup("MEMBER", "Set váy Thanh Mai", [group, group])).toBeUndefined();
});
it("keeps delegation inside code, binds fit to the requested member and revokes changed chart evidence", async () => {
  const { product, policy: chartPolicy, artifact } = fixture(), policy = await fixturePolicy();
  Object.assign(policy.bundle!, { channel: "PUBLISHED", versionReferences: [
    ...policy.bundle!.versionReferences.map(r => ({ ...r, lifecycle: "PUBLISHED" })), ...chartPolicy.bundle!.versionReferences] });
  Object.assign(policy.bundle!.artifacts, { sizeCharts: chartPolicy.bundle!.artifacts.sizeCharts });
  const snapshot = fixtureProduct("MEMBER").snapshot, scope = commerceScope();
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: async () => policy, initialProducts: [product], productGroups: [group],
    catalog: { readProduct: async () => ({ product, snapshot }), searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  await base.invoke({ name: "read_policy", args: {} });
  expect((await base.invoke({ name: "read_product", args: { subjectRef: "MEMBER" } })).status).toBe("OK");
  expect(base.snapshot().runtimeProducts![0]!.sizeCharts).toBeUndefined();
  expect(base.snapshot().policyLiterals.some(p => p.ref === "owner-approved-size-sharing")).toBe(false);
  const tools = await createCustomerStateTools({ base, scope, clock: () => commerceNow,
    store: { read: async () => fixtureProfile(), compareAndSwap: async () => false },
    sizeInput: async () => commerceSizeSource(product, policy, [group]), sourceMessages: [] });
  expect(await tools.invoke({ name: "recommend_size", args: { subjectRef: "MEMBER" } })).toMatchObject({ status: "OK", data: { status: "RECOMMENDED" } });
  expect(tools.snapshot().protectedClaims).toContainEqual(expect.objectContaining({ type: "SIZE_FIT", scope: expect.objectContaining({ productId: "MEMBER" }) }));
  artifact.chart.reference.version = "2";
  await tools.readback();
  expect(tools.snapshot().protectedClaims.some(c => (c as { type: string }).type === "SIZE_FIT")).toBe(false);
});
