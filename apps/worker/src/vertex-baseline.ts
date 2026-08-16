import type { VertexShadowModel } from "./vertex.js";

/**
 * Byte-frozen generation capability shared by realtime and the V1 replay.
 * Candidate-only generation must use a different capability and prompt builder.
 */
export type BaselineModelCapability = Pick<
  VertexShadowModel,
  | "generate"
  | "groundWithFacts"
  | "groundDraftWithFacts"
  | "repairSizeClaimDraft"
  | "draftMultiProductClarification"
  | "draftCustomerUrlExplanation"
  | "judgeSalesReply"
  | "judgeSalesReplyV2"
>;

export function baselineModelCapability(
  model: BaselineModelCapability,
): BaselineModelCapability {
  return Object.freeze({
    generate: (...args) => model.generate(...args),
    groundWithFacts: (...args) => model.groundWithFacts(...args),
    groundDraftWithFacts: (...args) => model.groundDraftWithFacts(...args),
    repairSizeClaimDraft: (...args) => model.repairSizeClaimDraft(...args),
    draftMultiProductClarification: (...args) =>
      model.draftMultiProductClarification(...args),
    draftCustomerUrlExplanation: (...args) =>
      model.draftCustomerUrlExplanation(...args),
    judgeSalesReply: (...args) => model.judgeSalesReply(...args),
    judgeSalesReplyV2: (...args) => model.judgeSalesReplyV2(...args),
  });
}
