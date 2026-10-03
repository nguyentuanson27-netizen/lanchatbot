import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";
import { validateResponderOutput } from "./track-c-c3-v5-benchmark-runner.js";
import { materializeTrackCV5CaseCapture } from "./track-c-c3-v5-benchmark-materialization.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";

const root = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", root), "utf8"));
const at = new Date(recipe.evaluation_at);
const context = contextFromFrozenTrackCCapture({ evaluationAt: at, capture: materializeTrackCV5CaseCapture({
  lane: "BEHAVIOR_SIMULATION", recipe, runtimeClaimCatalog: {}, fixture: { id: "TYPED_LIMIT",
    latest_customer_message: "Thông tin mẫu này?", context: { product_binding: { status: "RESOLVED", product_ids: ["ITEM42"] },
      phase: "BROWSING", canonical_flags: [], source_stage: null, runtime_claim_refs: [],
      buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null } } } }),
});
const pairs = [
  ["customer offer", "PROMOTION_OFFER", "CUSTOMER_OFFER", "mức chị đề xuất", "Shop đồng ý mức chị đề xuất."],
  ["unknown wrinkle", "PRODUCT_ATTRIBUTES", "WRINKLE_RESISTANCE", "khả năng chống nhăn", "Mẫu ITEM42 chống nhăn."],
  ["dispatch uncertainty", "ETA", "DISPATCH_TIME", "thời điểm shop gửi hàng", "Shop sẽ gửi hàng hôm nay."],
  ["fit comfort", "PRODUCT_ATTRIBUTES", "COMFORT", "độ thoải mái", "Size M hợp với chị."],
  ["future promotion", "PROMOTION_OFFER", "FUTURE_PROMOTION", "ưu đãi tương lai", "Shop sẽ giảm 10% ngày mai."],
  ["no alternative", null, null, "lựa chọn khác", "Shop có mẫu ITEM99 giá 450k."],
  ["deadline uncertainty", "ETA", "DELIVERY_DEADLINE", "khả năng đáp ứng hạn nhận hàng", "Shop giao trong 2 ngày."],
  ["comparative uncertainty", "PRODUCT_COMPARISON", "COMPARATIVE_PROPERTY", "thuộc tính so sánh", "Mẫu ITEM42 nhẹ hơn mẫu ITEM99."],
] as const;

describe("typed obligation limitations", () => {
  it.each(pairs)("preserves identity/status and admits only the code limitation: %s", (_label, capability, scope, topic, unsafe) => {
    const obligation = { kind: capability === null ? "PRODUCT_SEARCH" : "FACT_REQUEST", capability, scope,
      productId: "ITEM42" } as TrackCRequestedObligation;
    const task = compileTrackCStrategistDecision({ evidence: [], requestedObligations: [obligation], boundProductIds: ["ITEM42"],
      permittedCanonicalActions: ["NONE"], measurementsUnavailable: false, productResolved: true, hardStop: false,
      requireStructuredGoal: true, decision: { replyAct: "ANSWER", proposition: capability ?? "NONE", evidenceRefs: [],
        canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" },
        goal: "NEED: current obligation\nKNOWN: NONE\nANSWER: NONE\nLIMIT: no evidence\nNEXT: NONE" } }).task;
    const resolutions = (task as unknown as { obligationResolutions?: readonly Record<string, unknown>[] }).obligationResolutions;
    expect(resolutions).toHaveLength(1);
    expect(resolutions![0]).toMatchObject({ capability, scope, subject: { productId: "ITEM42" }, status: "UNSUPPORTED",
      limitation: { kind: "NO_VERIFIED_EVIDENCE" } });
    expect(resolutions![0]!.obligationId).toEqual(expect.any(String));
    const safe = `Em chưa có thông tin xác nhận về ${topic} của mẫu ITEM42.`;
    const validate = (text: string) => validateResponderOutput(context, {
      segments: [{ kind: "GENERAL", text }], strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
    }, "PRODUCTION_CONTRACT", at, [], null, [], { task, dialogue: [] });
    expect(() => validate(safe)).not.toThrow();
    expect(() => validate(unsafe)).toThrow();
    expect(() => validate(`${safe} ${unsafe}`)).toThrow();
    for (const patch of [{ obligationId: "other" }, { status: "SUPPORTED", limitation: null },
      { subject: { productId: "ITEM99", variantId: null, size: null, color: null } },
      { scope: "MATERIALS" }, { evidenceRefs: [{ ref: "invented", contentHash: "invented" }] }]) {
      const tampered = { ...task, obligationResolutions: [{ ...task.obligationResolutions![0]!, ...patch }] };
      expect(() => validateResponderOutput(context, {
        segments: [{ kind: "GENERAL", text: safe }], strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
      }, "PRODUCTION_CONTRACT", at, [], null, [], { task: tampered as typeof task, dialogue: [] }))
        .toThrow("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
    }
  });
});
