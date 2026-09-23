import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  materializeTrackCV5CaseCapture,
  materializeTrackCV5CaseCurrentCart,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";
import { trackCEvidenceHasSafeFactualEgress } from
  "./track-c-c3-strategy-contract.js";
import { trackCCartClaimIsCurrent } from "./track-c-c3-cart-binding.js";
import { runTrackCC3TwoPassQualityCandidate } from
  "./track-c-c3-two-pass-quality-adapter.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";

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
  it("revalidates DEV cart facts against the same materialized cart and policy", () => {
    const chunk = JSON.parse(readFileSync(
      new URL("quality-03.json", EVAL_ROOT), "utf8",
    )) as { cases: Array<{ id: string }> };
    for (const id of ["V5V4Q022", "V5V4Q023", "V5V4Q025", "V5V4Q026"]) {
      const fixture = chunk.cases.find((entry) => entry.id === id)!;
      const input = {
        fixture: fixture as never,
        runtimeClaimCatalog: facts.runtime_claim_catalog,
        recipe,
      };
      const capture = materializeTrackCV5CaseCapture({ ...input, lane: "BEHAVIOR_SIMULATION" });
      const currentCart = materializeTrackCV5CaseCurrentCart(input);
      expect(capture.context).not.toBeNull();
      expect(currentCart).not.toBeNull();
      const cartClaims = capture.context!.verifiedClaims.filter((claim) =>
        claim.scope.kind === "CART"
      );
      expect(cartClaims.length).toBeGreaterThan(0);
      expect(cartClaims.every((claim) => trackCCartClaimIsCurrent(
        claim, currentCart, new Date(recipe.evaluation_at),
      ))).toBe(true);
      const evidence = buildTrackCSelectableEvidence({
        context: capture.context!, simulationFacts: [],
        executionLane: "BEHAVIOR_SIMULATION", currentCart,
        evaluationAt: new Date(recipe.evaluation_at),
      });
      expect(evidence.filter((entry) => entry.subject?.scope === "CART")
        .every(trackCEvidenceHasSafeFactualEgress)).toBe(true);
    }
  });

  it("rejects a cart fixture if the diagnostic runner omits its current-cart readback", async () => {
    const chunk = JSON.parse(readFileSync(
      new URL("quality-03.json", EVAL_ROOT), "utf8",
    )) as { cases: Array<{ id: string }> };
    const fixture = chunk.cases.find((entry) => entry.id === "V5V4Q022")!;
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION", fixture: fixture as never,
      runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
    });
    await expect(runTrackCC3TwoPassQualityCandidate({
      lane: "BEHAVIOR_SIMULATION", fixture,
      capture, evaluationAt: new Date(recipe.evaluation_at),
      modelResource: "projects/test/locations/global/publishers/google/models/gemini-3.5-flash-lite",
      evaluationContext: [], simulationFacts: [],
      transport: { send: async () => { throw new Error("SHOULD_NOT_CALL_PROVIDER"); } },
    } as never)).rejects.toThrow("TRACK_C_C3_CURRENT_CART_BINDING_REQUIRED");
  });

  it("carries current-cart readback through the simulation final guard", () => {
    const chunk = JSON.parse(readFileSync(
      new URL("quality-03.json", EVAL_ROOT), "utf8",
    )) as { cases: Array<{ id: string }> };
    const fixture = chunk.cases.find((entry) => entry.id === "V5V4Q025")!;
    const input = { fixture: fixture as never,
      runtimeClaimCatalog: facts.runtime_claim_catalog, recipe };
    const capture = materializeTrackCV5CaseCapture({
      ...input, lane: "BEHAVIOR_SIMULATION",
    });
    const currentCart = materializeTrackCV5CaseCurrentCart(input)!;
    const claim = capture.context!.verifiedClaims.find(({ type }) =>
      type === "SHIPPING_FEE"
    )!;
    expect(validateResponderOutput(capture.context!, {
      segments: [{
        kind: "VERIFIED_CLAIM", text: "Phí giao hàng của giỏ hiện tại là 30.000đ ạ.",
        claimContentHash: claim.provenance.contentHash,
      }],
      strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
    }, "BEHAVIOR_SIMULATION", new Date(recipe.evaluation_at), [], currentCart)
      .segments).toHaveLength(1);
  });
  it("keeps cart identity and version on a cart-scoped claim", () => {
    const [shipping] = evidenceFor(["RC_SHIP_30"]).filter(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    expect(shipping?.subject).toMatchObject({ scope: "CART" });
    expect(typeof shipping?.subject?.cartVersion).toBe("number");
    // A cart fact must not be reported under a product subject.
    expect(shipping?.subject?.productId).toBeUndefined();
  });

  it("keeps a cart fact selectable but not statable without a cart binding", () => {
    // Quoting a fee asserts it about the cart as it is now, and the input
    // contract carries no current cart revision to check that against. The
    // fact keeps its authority and is reported as a realization limit rather
    // than being quoted from a cart the customer may have changed.
    for (const ref of ["RC_SHIP_30", "RC_FREESHIP_Y", "RC_FREESHIP_N"]) {
      const [entry] = evidenceFor([ref]).filter(
        ({ subject }) => subject?.scope === "CART",
      );
      expect(entry).toBeDefined();
      expect(trackCEvidenceHasSafeFactualEgress(entry!)).toBe(false);
    }
  });

  it("keeps the cart version distinct when the cart claim changes", () => {
    const cheap = evidenceFor(["RC_SHIP_30"]).find(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    const dear = evidenceFor(["RC_SHIP_45"]).find(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    expect(cheap?.subject?.cartVersion).not.toBe(dear?.subject?.cartVersion);
  });

  it("never emits a cart fact through the final guard", () => {
    // The guard rejects cart-scoped output because nothing has revalidated the
    // cart. Since the projection no longer offers wording, that rejection is
    // unreachable from a normal turn instead of being a live failure mode.
    const [shipping] = evidenceFor(["RC_SHIP_30"]).filter(
      ({ capability }) => capability === "SHIPPING_FEE",
    );
    expect(shipping?.deterministicText).toBeUndefined();
  });

  it("marks a product-scoped claim with the product scope", () => {
    const price = evidenceFor(["RC_PRICE_A"]).find(
      ({ capability }) => capability === "PRICE",
    );
    expect(price?.subject).toMatchObject({ scope: "PRODUCT", productId: "SQ9012" });
  });
});
