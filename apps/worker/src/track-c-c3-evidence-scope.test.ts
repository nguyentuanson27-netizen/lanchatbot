import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { trackCEvidenceHasSafeFactualEgress } from
  "./track-c-c3-strategy-contract.js";

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

function evidenceFor(claimRefs: readonly string[]) {
  const capture = materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "C3_SCOPE_TEST",
      latest_customer_message: "Đơn này phí ship bao nhiêu em?",
      context: {
        product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
        phase: "BROWSING",
        canonical_flags: [],
        buying_intent: {
          decision: "NONE", requested_action: "NONE",
          quantity: null, evidence: null,
        },
        source_stage: null,
        runtime_claim_refs: claimRefs,
      },
    },
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
  if (capture.status !== "BUILT" || capture.context === null) {
    throw new Error("TEST_CAPTURE_REQUIRED");
  }
  return buildTrackCSelectableEvidence({
    context: capture.context,
    simulationFacts: [],
    executionLane: "BEHAVIOR_SIMULATION",
  });
}

describe("Track C C3 evidence subject scope", () => {
  it("keeps cart identity and version on a cart-scoped claim", () => {
    const [shipping] = evidenceFor(["RC_SHIP_30"]).filter(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    expect(shipping?.subject).toMatchObject({ scope: "CART" });
    expect(typeof shipping?.subject?.cartVersion).toBe("number");
    // A cart fact must not be reported under a product subject.
    expect(shipping?.subject?.productId).toBeUndefined();
  });

  it("can state a cart shipping fee that previously had no projection", () => {
    const [shipping] = evidenceFor(["RC_SHIP_30"]).filter(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    expect(shipping && trackCEvidenceHasSafeFactualEgress(shipping)).toBe(true);
    expect(shipping?.deterministicText).toContain("phí giao hàng");
  });

  it("distinguishes an ineligible freeship from an eligible one", () => {
    const eligible = evidenceFor(["RC_FREESHIP_Y"]).find(
      ({ capability }) => capability === "FREESHIP",
    );
    const ineligible = evidenceFor(["RC_FREESHIP_N"]).find(
      ({ capability }) => capability === "FREESHIP",
    );
    expect(eligible?.deterministicText).toContain("được miễn phí giao hàng");
    expect(ineligible?.deterministicText).toContain("chưa đạt điều kiện");
  });

  it("changes the stated fee when the cart claim changes", () => {
    const cheap = evidenceFor(["RC_SHIP_30"]).find(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    const dear = evidenceFor(["RC_SHIP_45"]).find(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    expect(cheap?.deterministicText).not.toBe(dear?.deterministicText);
    expect(cheap?.subject?.cartVersion).not.toBe(dear?.subject?.cartVersion);
  });

  it("marks a product-scoped claim with the product scope", () => {
    const price = evidenceFor(["RC_PRICE_A"]).find(
      ({ capability }) => capability === "PRICE",
    );
    expect(price?.subject).toMatchObject({ scope: "PRODUCT", productId: "SQ9012" });
  });
});
