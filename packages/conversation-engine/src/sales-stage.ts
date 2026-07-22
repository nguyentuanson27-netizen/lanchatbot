import type { SalesStage, SalesStageTrigger } from "./types.js";

const FORWARD_TRANSITIONS: Readonly<Record<SalesStage, ReadonlySet<SalesStage>>> = {
  DISCOVERY: new Set(["PRODUCT_MATCHED", "POST_SALE"]),
  PRODUCT_MATCHED: new Set(["FIT_CONSULTING", "OBJECTION_HANDLING", "POST_SALE"]),
  FIT_CONSULTING: new Set(["OBJECTION_HANDLING", "READY_TO_BUY", "POST_SALE"]),
  OBJECTION_HANDLING: new Set(["READY_TO_BUY", "POST_SALE"]),
  READY_TO_BUY: new Set(["ORDER_REVIEW", "POST_SALE"]),
  ORDER_REVIEW: new Set(["POST_SALE"]),
  POST_SALE: new Set(),
};

export interface SalesStageTransition {
  readonly stage: SalesStage;
  readonly accepted: boolean;
  readonly code: string;
}

export function transitionSalesStage(
  current: SalesStage,
  requested: SalesStage,
  trigger: SalesStageTrigger,
): SalesStageTransition {
  if (requested === current) {
    return { stage: current, accepted: true, code: "SALES_STAGE_UNCHANGED" };
  }
  if (requested === "POST_SALE") {
    return { stage: requested, accepted: true, code: "SALES_STAGE_POST_SALE" };
  }
  if (current === "POST_SALE") {
    return { stage: current, accepted: false, code: "POST_SALE_STAGE_TERMINAL" };
  }
  if (trigger === "PRODUCT_SWITCHED") {
    if (requested === "DISCOVERY" || requested === "PRODUCT_MATCHED") {
      return { stage: requested, accepted: true, code: "SALES_STAGE_PRODUCT_SWITCH" };
    }
    return { stage: current, accepted: false, code: "INVALID_PRODUCT_SWITCH_STAGE" };
  }
  if (trigger === "NEW_OBJECTION") {
    if (requested === "OBJECTION_HANDLING") {
      return { stage: requested, accepted: true, code: "SALES_STAGE_NEW_OBJECTION" };
    }
    return { stage: current, accepted: false, code: "INVALID_NEW_OBJECTION_STAGE" };
  }
  if (FORWARD_TRANSITIONS[current].has(requested)) {
    return { stage: requested, accepted: true, code: "SALES_STAGE_FORWARD" };
  }
  return { stage: current, accepted: false, code: "SALES_STAGE_TRANSITION_REJECTED" };
}
