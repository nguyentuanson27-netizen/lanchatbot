import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildProductAttributesV1 } from "@lana/business-tools";
import type { ContextV2, ProductAttributesDataV1 } from "@lana/contracts";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";

/**
 * End-to-end egress cases: a fact is projected from typed source, selected,
 * rendered, and then re-derived by the final validator. They cover the two
 * wiring failures where the projector and the validator disagreed, so a valid
 * runtime fact was rejected at the boundary.
 */

const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", EVAL_ROOT), "utf8",
)) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(
  new URL("facts.json", EVAL_ROOT), "utf8",
)) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
  simulation_fact_catalog: Record<string, unknown>;
};

const EMPTY: ProductAttributesDataV1 = {
  materials: [], materialComponents: {}, colors: [], styles: [],
  silhouettes: [], occasions: [], designAttributes: null,
  careInstructions: null, wearProperties: null, backCoverage: null,
  designComplexity: null,
};

const PRODUCT_ID = "SQ9012";

describe("C3 promotion uncertainty versus offer authority", () => {
  it.each([
    ["Em chưa có thông tin xác nhận mẫu này có ưu đãi giảm thêm.", true],
    ["Hiện em chưa thể xác nhận giá đã bao gồm ưu đãi hay chưa.", true],
    ["Chị cứ cân nhắc thêm nhé; hiện chưa có thông tin xác nhận lựa chọn khác hay ưu đãi cho mẫu SQ9012.", true],
    ["Mẫu này có ưu đãi giảm thêm.", false],
    ["Em chưa có thông tin xác nhận ưu đãi. Nhưng shop vẫn giảm giá cho chị.", false],
    ["Em chưa xác nhận ưu đãi nhưng shop có voucher.", false],
    ["Em chưa xác nhận ưu đãi và shop đang giảm giá.", false],
    ["Em chưa xác nhận ưu đãi giảm 10%.", false],
    ["Em chưa xác nhận ưu đãi. 10%.", false],
    ["Em chưa xác nhận ưu đãi, giá chỉ 690k.", false],
    ["Em chưa xác nhận ưu đãi. Mẫu này còn hàng.", false],
    ["Em chưa xác nhận ưu đãi. Giao trong 2 ngày.", false],
    ["Em chưa xác nhận ưu đãi sẽ áp dụng cho chị.", false],
  ] as const)("checks the complete reply: %s", (text, accepted) => {
    const run = () => validateResponderOutput(baseContext([]), {
      segments: [{ kind: "GENERAL", text }], strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
    }, "PRODUCTION_CONTRACT", new Date(recipe.evaluation_at));
    if (accepted) expect(run).not.toThrow();
    else expect(run).toThrow("TRACK_C_V5_PRODUCTION_GUARD_FAILED");
  });
});

function baseContext(claimRefs: readonly string[]): ContextV2 {
  const capture = materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "C3_EGRESS_TEST",
      latest_customer_message: "Mẫu này chất liệu gì em?",
      context: {
        product_binding: { status: "RESOLVED", product_ids: [PRODUCT_ID] },
        phase: "BROWSING",
        canonical_flags: [],
        buying_intent: {
          decision: "NONE", requested_action: "NONE", quantity: null, evidence: null,
        },
        source_stage: null,
        runtime_claim_refs: claimRefs,
      },
    },
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
  return contextFromFrozenTrackCCapture({
    capture, evaluationAt: new Date(recipe.evaluation_at),
  });
}

/** The materializer builds no attribute/presentation evidence, so the typed
 * inputs under test are attached here to exercise the runtime projection. */
function withAttributes(
  context: ContextV2,
  data: Partial<ProductAttributesDataV1>,
): ContextV2 {
  return {
    ...context,
    productAttributes: buildProductAttributesV1({
      productId: PRODUCT_ID,
      data: { ...EMPTY, ...data },
      observedAt: "2026-09-10T01:00:00.000Z",
    }),
  };
}

function withPresentation(
  context: ContextV2,
  variants: readonly Readonly<{
    variantId: string; color: string | null; size: string | null;
  }>[] = [{ variantId: "BLACK_M", color: "đen", size: "M" }],
): ContextV2 {
  return {
    ...context,
    productPresentation: {
      schemaVersion: 1,
      productId: PRODUCT_ID,
      displayName: "Tường Vi",
      variants: [...variants],
      provenance: { contentHash: "b".repeat(64) },
    } as unknown as ContextV2["productPresentation"],
  };
}

function output(text: string, claimContentHash: string) {
  return {
    segments: [{ kind: "VERIFIED_CLAIM", text, claimContentHash }],
    strategy: "ANSWER_VERIFIED_FACTS",
    cta: "NONE",
  };
}

function validate(context: ContextV2, value: unknown) {
  return validateResponderOutput(
    context, value, "PRODUCTION_CONTRACT", new Date(recipe.evaluation_at),
  );
}

describe("Track C C3 projection egress", () => {
  it("accepts a field-level attribute projection the validator can re-derive", () => {
    const context = withAttributes(baseContext(["RC_PRICE_A"]), {
      materials: ["tơ xước"],
    });
    const entry = buildTrackCSelectableEvidence({
      context, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT",
    }).find(({ ref }) => ref.endsWith("_MATERIALS"));

    expect(entry?.deterministicText).toBeDefined();
    // Previously rejected: only the parent attribute hash was known, so a
    // valid runtime attribute could never reach output.
    expect(() => validate(context, output(
      entry!.deterministicText!, entry!.provenance.contentHash,
    ))).not.toThrow();
  });

  it("rejects a projection hash carrying someone else's wording", () => {
    const context = withAttributes(baseContext(["RC_PRICE_A"]), {
      materials: ["tơ xước"],
    });
    const entry = buildTrackCSelectableEvidence({
      context, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT",
    }).find(({ ref }) => ref.endsWith("_MATERIALS"));

    expect(() => validate(context, output(
      "Dạ mẫu này có chất liệu lụa ạ.", entry!.provenance.contentHash,
    ))).toThrow("TRACK_C_V5_PRODUCTION_DETERMINISTIC_TEXT_MISMATCH");
  });

  it("rejects a forged projection hash the source does not derive", () => {
    const context = withAttributes(baseContext(["RC_PRICE_A"]), {
      materials: ["tơ xước"],
    });
    expect(() => validate(context, output(
      "Dạ mẫu này có chất liệu tơ xước ạ.", "a".repeat(64),
    ))).toThrow("TRACK_C_V5_RESPONDER_PROVENANCE_INVALID");
  });

  it("agrees on variant stock wording for an opaque variant id", () => {
    const context = withPresentation(baseContext(["RC_STOCK_BLACK_M_IN"]));
    const entry = buildTrackCSelectableEvidence({
      context, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT",
    }).find(({ capability }) => capability === "STOCK");

    // The projector resolves colour+size from the presentation; the guard must
    // rebuild the identical string or it rejects a correct answer.
    expect(entry?.deterministicText).toContain("màu đen size M");
    expect(() => validate(context, output(
      entry!.deterministicText!, entry!.provenance.contentHash,
    ))).not.toThrow();
  });

  it("agrees on variant stock wording when the id also encodes a size", () => {
    // The review's failing case: the id parses to a size on its own, so the
    // two sides previously produced "size S" and "màu đen size S" and the
    // guard rejected the richer, more accurate answer.
    const context = withPresentation(baseContext(["RC_STOCK_SIZE_S_OUT"]), [
      { variantId: "SIZE_S", color: "đen", size: "S" },
    ]);
    const entry = buildTrackCSelectableEvidence({
      context, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT",
    }).find(({ capability }) => capability === "STOCK");

    expect(entry?.deterministicText).toContain("màu đen size S");
    expect(() => validate(context, output(
      entry!.deterministicText!, entry!.provenance.contentHash,
    ))).not.toThrow();
  });

  it("still rejects variant wording that does not match the claim", () => {
    const context = withPresentation(baseContext(["RC_STOCK_BLACK_M_IN"]));
    const entry = buildTrackCSelectableEvidence({
      context, simulationFacts: [], executionLane: "PRODUCTION_CONTRACT",
    }).find(({ capability }) => capability === "STOCK");

    expect(() => validate(context, output(
      "Dạ mẫu này hiện còn màu trắng size L ạ.", entry!.provenance.contentHash,
    ))).toThrow("TRACK_C_V5_PRODUCTION_DETERMINISTIC_TEXT_MISMATCH");
  });
});
