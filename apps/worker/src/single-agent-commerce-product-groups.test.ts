import { expect, it } from "vitest";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { commerceProductGroup, commerceSizeSource,commerceComponentSizeSource, type CommerceProductGroup } from "./single-agent-commerce-product-groups.js";
import { fixtureProduct, fixtureSizeInput, fixturePolicy, fixtureProfile, commerceScope, commerceNow } from "./single-agent-commerce.test-support.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";
import {recommendSize} from "@lana/business-tools";

it("normalizes only explicitly approved body maxima and selects the smallest fitting size",()=>{
 const {product,policy,artifact}=fixture();
 artifact.chart.bands=["S","M","L"].map((size,i)=>({size,note:null,ranges:[
  {kind:"WAIST_CM",minInclusive:62+i*4,maxInclusive:78+i*4},
  {kind:"BUST_CM",minInclusive:86+i*4,maxInclusive:86+i*4},{kind:"HIPS_CM",minInclusive:98+i*4,maxInclusive:98+i*4}]}));
 const approved={...group,sharedSize:{...group.sharedSize,bodyMaximum:{kinds:["BUST_CM","HIPS_CM"],approvalRef:"owner-body-maxima"}}} as CommerceProductGroup;
 const original=structuredClone(artifact.chart);
 const source=commerceSizeSource(product,policy,[approved]),customer=fixtureProfile().profile;
 customer.measurements=[{kind:"BUST_CM",value:88},{kind:"WAIST_CM",value:74},{kind:"HIPS_CM",value:94}].map(m=>({...m,
  provenance:{source:"CUSTOMER_MESSAGE" as const,sourceEventHash:"a".repeat(64),observedAt:commerceNow.toISOString(),confidence:1}})) as typeof customer.measurements;
 customer.fitPreference="RELAXED";
 const d=recommendSize({...source,profile:customer,generatedAt:commerceNow.toISOString()});
 expect(d.recommendation.status).toBe("RECOMMENDED");expect(d.recommendation.recommendedSizes[0]?.size).toBe("M");
 expect(artifact.chart).toEqual(original);
 expect(source.charts[0]!.chart.reference.version).not.toBe(original.reference.version);
 expect(commerceSizeSource(product,policy,[group]).charts[0]!.chart).toEqual(original);
});

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
it.each(["valid","stale","wrong-role","unverified","wrong-parent","global","brand","ambiguous-bom","missing-bom"])("resolves component size only from exact current BOM and scoped chart: %s",fault=>{
 const {product,policy,artifact}=fixture(),raw=fixtureProduct("MEMBER").snapshot;
 artifact.scope.parentProductIds=["MEMBER"];
 raw.offers.DIRECT!.rows[0]!.component_1_sku="MEMBER-QUAN";
 if(fault==="stale")raw.synced_at="2020-01-01T00:00:00.000Z";
 if(fault==="wrong-role")artifact.chart.componentRole="TOP";
 if(fault==="unverified")artifact.chart.reference.verificationStatus="EXTRACTED_UNREVIEWED";
 if(fault==="wrong-parent")artifact.scope.parentProductIds=["OTHER"];
 if(fault==="global")Object.assign(artifact.scope,{level:"GLOBAL"});
 if(fault==="brand")artifact.chart.brand="OTHER";
 if(fault==="ambiguous-bom")raw.offers.DIRECT!.rows.push({...structuredClone(raw.offers.DIRECT!.rows[0]!),component_1_sku:"OTHER-QUAN"});
 if(fault==="missing-bom")delete raw.offers.DIRECT!.rows[0]!.component_1_sku;
 const read=()=>commerceComponentSizeSource(product,raw,policy,"PANTS",commerceNow);
 if(fault!=="valid")expect(read).toThrow();
 else{
  const source=read();expect(source.fitTarget).toEqual({kind:"COMPONENT",parentProductId:"MEMBER",componentProductId:"MEMBER-QUAN",componentRole:"PANTS"});
  expect(source.charts).toHaveLength(1);expect(source.sourceBindingHash).toMatch(/^[a-f0-9]{64}$/);expect(Date.parse(source.sourceExpiresAt)).toBe(commerceNow.getTime()+1200000);
 }
});
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

it.each(["TOP","PANTS","SKIRT"] as const)("uses explicit owner-approved shared chart for a separate %s without changing published data",role=>{
 const {product,policy,artifact}=fixture(),raw=fixtureProduct("MEMBER").snapshot;
 raw.offers.DIRECT!.rows[0]!.component_1_sku=`MEMBER-${{TOP:"AO",PANTS:"QUAN",SKIRT:"CV"}[role]}`;
 const approved={...group,sharedSize:{...group.sharedSize,componentRoles:[role],componentApprovalRef:"owner-test-size-sharing"}};
 const before=structuredClone({policy,raw});
 expect(()=>commerceComponentSizeSource(product,raw,policy,role,commerceNow,1200)).toThrow("COMPONENT_CHART_UNAVAILABLE");
 const source=commerceComponentSizeSource(product,raw,policy,role,commerceNow,1200,[approved]);
 expect(source.fitTarget).toMatchObject({kind:"COMPONENT",parentProductId:"MEMBER",componentRole:role});
 expect(source.charts[0]!.chart.bands).toEqual(artifact.chart.bands);
 expect(source.charts[0]!.chart.reference).toEqual(artifact.chart.reference);
 expect(source.charts[0]!.chart.componentRole).toBe(role);
 expect({policy,raw}).toEqual(before);
 const otherBrand=structuredClone(raw);otherBrand.brand="OTHER_BRAND";
 expect(()=>commerceComponentSizeSource(product,otherBrand,policy,role,commerceNow,1200,[approved])).toThrow("COMPONENT_CHART_UNAVAILABLE");
 for(const sharedSize of [{...approved.sharedSize,componentApprovalRef:""},{...approved.sharedSize,componentRoles:[]}] )
  expect(()=>commerceComponentSizeSource(product,raw,policy,role,commerceNow,1200,[{...approved,sharedSize}])).toThrow("COMPONENT_CHART_UNAVAILABLE");
 artifact.scope.parentProductIds=["MEMBER"];
 // A published PANTS chart scoped directly to MEMBER remains independently valid.
 if(role!=="PANTS")expect(()=>commerceComponentSizeSource(product,raw,policy,role,commerceNow,1200,[approved])).toThrow("COMPONENT_CHART_UNAVAILABLE");
 artifact.scope.parentProductIds=["SOURCE"];
 const changedApproval={...approved,sharedSize:{...approved.sharedSize,componentApprovalRef:"replacement-approval"}};
 expect(commerceComponentSizeSource(product,raw,policy,role,commerceNow,1200,[changedApproval]).sourceBindingHash).not.toBe(source.sourceBindingHash);
 artifact.chart.reference.verificationStatus="EXTRACTED_UNREVIEWED";
 expect(()=>commerceComponentSizeSource(product,raw,policy,role,commerceNow,1200,[approved])).toThrow("COMPONENT_CHART_UNAVAILABLE");
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
