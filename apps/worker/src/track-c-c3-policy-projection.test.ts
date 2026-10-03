import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import { materializeTrackCV5CaseCapture } from "./track-c-c3-v5-benchmark-materialization.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";

const corpusRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", corpusRoot), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("facts.json", corpusRoot), "utf8")) as {
  simulation_fact_catalog: Record<string, { kind: string; policy: string; data: Record<string, unknown> }>;
};
const evaluatedAt = new Date(recipe.evaluation_at);
const context = contextFromFrozenTrackCCapture({ evaluationAt: evaluatedAt, capture: materializeTrackCV5CaseCapture({
  lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: {},
  fixture: { id: "RAW_POLICY_PROJECTION", latest_customer_message: "Chính sách của mẫu này?", context: {
    product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] }, phase: "BROWSING", canonical_flags: [],
    buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
    source_stage: null, runtime_claim_refs: [],
  } },
}) });

function requested(scope: NonNullable<TrackCRequestedObligation["scope"]>): TrackCRequestedObligation {
  return { id: `current:policy:${scope}`, kind: "FACT_REQUEST", capability: "POLICY", scope,
    productId: scope === "ALTERATION" || scope === "SPLIT_SIZE" ? "SQ9012" : null };
}
function project(raw: unknown, currentContext: ContextV2 = context) {
  return buildTrackCSelectableEvidence({ context: currentContext, simulationFacts: [raw], executionLane: "BEHAVIOR_SIMULATION" });
}
function compile(raw: unknown, scope: NonNullable<TrackCRequestedObligation["scope"]>) {
  const evidence = project(raw);
  return { evidence, task: compileTrackCStrategistDecision({ evidence, requestedObligations: [requested(scope)],
    boundProductIds: context.productBinding.productIds, permittedCanonicalActions: ["NONE"],
    productResolved: true, measurementsUnavailable: false, hardStop: false, requireStructuredGoal: true,
    decision: { replyAct: "ANSWER", proposition: "POLICY", evidenceRefs: [], goal: "TYPED_DECISION",
      continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE" },
  }).task };
}

describe("verified raw policy artifacts project exact customer policy evidence", () => {
  it("answers TRY_ON from the actual conditional INSPECTION field without an unrestricted promise", () => {
    const raw = catalog.simulation_fact_catalog.SF_INSPECTION!;
    expect(raw).toMatchObject({ policy: "INSPECTION", data: { tryOn: "ORDER_DEPENDENT" } });
    const { task } = compile(raw, "TRY_ON");
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ obligationId: "current:policy:TRY_ON", outcome: "ANSWERED", status: "SUPPORTED" }),
    ]);
    expect(task.evidence).toHaveLength(1);
    expect(task.evidence[0]!.value).toMatchObject({ policy: "TRY_ON", tryOn: "ORDER_DEPENDENT" });
    expect(task.evidence[0]!.deterministicText).toContain("tuỳ theo từng đơn");
    expect(task.evidence[0]!.deterministicText).not.toContain("được thử tại chỗ");
    expect(task.evidence[0]!.deterministicText).not.toContain("kiểm tra đúng");
    expect(trackCObligationMatchesEvidence(requested("EXCHANGE_SIZE"), task.evidence[0]!)).toBe(false);
  });

  it("answers ALTERATION with the verified negative CUSTOMIZATION rule rather than treating missing evidence as false", () => {
    const raw = catalog.simulation_fact_catalog.SF_CUSTOM_NO!;
    expect(raw).toMatchObject({ policy: "CUSTOMIZATION", data: { supported: false } });
    const { task } = compile(raw, "ALTERATION");
    expect(task.obligationResolutions).toEqual([
      expect.objectContaining({ capability: "POLICY", scope: "ALTERATION", outcome: "ANSWERED", limitation: null,
        subject: expect.objectContaining({ productId: "SQ9012" }) }),
    ]);
    expect(task.evidence[0]?.value).toMatchObject({ policy: "ALTERATION", allowAlteration: false });
    expect(task.evidence[0]?.deterministicText).toContain("chưa nhận chỉnh sửa");
    expect(trackCObligationMatchesEvidence(requested("SPLIT_SIZE"), task.evidence[0]!)).toBe(false);
  });

  it.each(["EXCHANGE_SIZE", "EXCHANGE_COLOR", "EXCHANGE_MODEL"] as const)(
    "answers %s only from its explicit EXCHANGE_SALE field and preserves the discount condition", (scope) => {
      const raw = catalog.simulation_fact_catalog.SF_EXCHANGE_SALE!;
      const { task } = compile(raw, scope);
      expect(task.obligationResolutions).toEqual([
        expect.objectContaining({ scope, outcome: "ANSWERED", status: "SUPPORTED", limitation: null }),
      ]);
      expect(task.evidence).toHaveLength(1);
      expect(task.evidence[0]!.value).toMatchObject({ policy: scope, discountAtLeastPercent: 30,
        allowed: scope !== "EXCHANGE_MODEL" });
      expect(task.evidence[0]!.deterministicText).toContain("30%");
      expect(task.evidence[0]!.deterministicText).toContain(scope === "EXCHANGE_SIZE" ? "size"
        : scope === "EXCHANGE_COLOR" ? "màu" : "mẫu");
      if (scope === "EXCHANGE_MODEL") expect(task.evidence[0]!.deterministicText).toContain("chưa áp dụng");
      expect(trackCObligationMatchesEvidence(requested("TRY_ON"), task.evidence[0]!)).toBe(false);
    },
  );

  it.each(["EXCHANGE_SIZE", "EXCHANGE_COLOR", "EXCHANGE_MODEL"] as const)(
    "does not infer %s permission from the standard EXCHANGE window/conditions alone", (scope) => {
      const { task } = compile(catalog.simulation_fact_catalog.SF_EXCHANGE_STD!, scope);
      expect(task.obligationResolutions?.[0]).toMatchObject({ scope, outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] });
      expect(task.evidence).toEqual([]);
    },
  );

  it.each([
    { policy: "INSPECTION", data: { verifyModel: true }, scope: "TRY_ON" },
    { policy: "INSPECTION", data: { tryOn: "SOMETIMES" }, scope: "TRY_ON" },
    { policy: "CUSTOMIZATION", data: {}, scope: "ALTERATION" },
    { policy: "CUSTOMIZATION", data: { supported: "false" }, scope: "ALTERATION" },
    { policy: "EXCHANGE_SALE", data: { discountAtLeastPercent: 30, allowedChanges: ["size"] }, scope: "EXCHANGE_COLOR" },
    { policy: "EXCHANGE_SALE", data: { discountAtLeastPercent: 30, allowedChanges: ["size", "color"] }, scope: "EXCHANGE_MODEL" },
    { policy: "EXCHANGE_SALE", data: { allowedChanges: ["size", "color"], modelChange: false }, scope: "EXCHANGE_SIZE" },
  ] as const)("keeps missing or unknown $policy/$scope authority bounded", ({ policy, data, scope }) => {
    const { task } = compile({ kind: "POLICY_SNAPSHOT", policy, data }, scope);
    expect(task.obligationResolutions?.[0]).toMatchObject({ outcome: "BOUNDED_UNAVAILABLE", evidenceRefs: [] });
    expect(task.evidence).toEqual([]);
  });

  it("derives distinct projection provenance from the verified raw policy without changing authority", () => {
    const raw = catalog.simulation_fact_catalog.SF_EXCHANGE_SALE!;
    const evidence = project(raw);
    const parentHash = createHash("sha256").update(canonicalJsonV1({ ref: "SIMULATION_001", fact: raw })).digest("hex");
    const projected = evidence.filter(({ value }) => ["EXCHANGE_SIZE", "EXCHANGE_COLOR", "EXCHANGE_MODEL"].includes(String(value.policy)));
    expect(projected).toHaveLength(3);
    for (const entry of projected) {
      expect(entry.provenance).toMatchObject({ authority: "SIMULATION", contentHash: expect.stringMatching(/^[a-f0-9]{64}$/u) });
      expect(entry.value.sourceContentHash).toBe(parentHash);
      expect(entry.provenance.contentHash).not.toBe(parentHash);
    }
    expect(new Set(projected.map(({ provenance }) => provenance.contentHash)).size).toBe(projected.length);
    expect(project(raw)).toEqual(evidence);
    expect(() => buildTrackCSelectableEvidence({ context, simulationFacts: [raw], executionLane: "PRODUCTION_CONTRACT" }))
      .toThrow("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  });

  it.each(["SF_CUSTOM_NO", "SF_SPLIT_SIZE_Y", "SF_SPLIT_SIZE_N"])(
    "applies the global %s rule only to resolved current products, with product-bound provenance", (key) => {
      const raw = catalog.simulation_fact_catalog[key]!;
      const currentContext = { ...context, productBinding: { ...context.productBinding, status: "RESOLVED" as const, productIds: ["SQ9012", "SV9031"] } };
      const projections = project(raw, currentContext).filter(({ value }) => "allowAlteration" in value || "allowMixedSizes" in value);
      expect(projections.map(({ subject }) => subject?.productId)).toEqual(["SQ9012", "SV9031"]);
      expect(new Set(projections.map(({ provenance }) => provenance.contentHash)).size).toBe(2);
      const scope = key === "SF_CUSTOM_NO" ? "ALTERATION" : "SPLIT_SIZE";
      for (const entry of projections) {
        expect(entry.subject?.scope).toBe("PRODUCT");
        expect(trackCObligationMatchesEvidence({ ...requested(scope), productId: entry.subject!.productId! }, entry)).toBe(true);
        expect(trackCObligationMatchesEvidence({ ...requested(scope), productId: "OTHER" }, entry)).toBe(false);
      }
      const unresolved = { ...context, productBinding: { ...context.productBinding, status: "UNRESOLVED" as const, productIds: [] } };
      expect(project(raw, unresolved).some(({ value }) => "allowAlteration" in value || "allowMixedSizes" in value)).toBe(false);
    },
  );

  it("preserves an explicit raw product restriction instead of applying it to every bound product", () => {
    const raw = { ...catalog.simulation_fact_catalog.SF_CUSTOM_NO!, productId: "SQ9012" };
    const currentContext = { ...context, productBinding: { ...context.productBinding, status: "RESOLVED" as const, productIds: ["SQ9012", "SV9031"] } };
    const projected = project(raw, currentContext).filter(({ value }) => "allowAlteration" in value);
    expect(projected).toHaveLength(1);
    expect(projected[0]!.subject).toMatchObject({ productId: "SQ9012" });
    expect(trackCObligationMatchesEvidence({ ...requested("ALTERATION"), productId: "SV9031" }, projected[0]!)).toBe(false);
  });

  it("rejects a conflicting explicit policy identity even when a neighbouring boolean field is present", () => {
    const raw = project(catalog.simulation_fact_catalog.SF_CUSTOM_NO!)[0]!;
    const conflicting = { ...raw, subject: { scope: "PRODUCT" as const, productId: "SQ9012" },
      value: { policy: "SPLIT_SIZE", allowAlteration: false } };
    expect(trackCObligationMatchesEvidence(requested("ALTERATION"), conflicting)).toBe(false);
  });
});
