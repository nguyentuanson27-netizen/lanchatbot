import type { AgentProposalV1 } from "@lana/contracts";

export type Wave2Need =
  | "NEED_OCCASION"
  | "NEED_STYLE"
  | "NEED_BUDGET"
  | "NOT_ENOUGH_CONTEXT";

export type Wave2Barrier =
  | "NONE"
  | "BARRIER_PRICE"
  | "BARRIER_FIT"
  | "BARRIER_MATERIAL"
  | "BARRIER_TRUST"
  | "BARRIER_DELIVERY"
  | "CHOICE_OVERLOAD";

export type Wave2DecisionFactor =
  | "OCCASION"
  | "STYLE"
  | "BUDGET"
  | "FIT"
  | "MATERIAL"
  | "TRUST"
  | "DELIVERY"
  | "PRODUCT"
  | "UNKNOWN";

export type Wave2Strategy =
  | "STRATEGY_RECOMMEND_PRODUCT"
  | "STRATEGY_SHOW_PROOF"
  | "STRATEGY_ANSWER_OBJECTION"
  | "STRATEGY_ASK_CLARIFY"
  | "STRATEGY_CLOSE";

export type Wave2CtaPolicy =
  | "ASK_OCCASION"
  | "ASK_STYLE"
  | "ASK_BUDGET"
  | "ASK_MEASUREMENTS"
  | "ASK_PROOF_PREFERENCE"
  | "REDUCE_TO_TWO"
  | "NO_ADDITIONAL_CTA";

export type Wave2EvidenceSignal =
  | "TEXT_OCCASION"
  | "TEXT_STYLE"
  | "TEXT_BUDGET"
  | "TEXT_PRICE_OBJECTION"
  | "TEXT_FIT_OBJECTION"
  | "TEXT_MATERIAL_OBJECTION"
  | "TEXT_TRUST_OBJECTION"
  | "TEXT_DELIVERY_OBJECTION"
  | "TEXT_CHOICE_OVERLOAD"
  | "STATE_OBJECTION"
  | "STATE_PRODUCT_MATCHED"
  | "STATE_BUYING_SIGNAL"
  | "STATE_MEASUREMENTS_PRESENT"
  | "MODEL_ANALYSIS_ACCEPTED"
  | "DETERMINISTIC_FALLBACK";

export interface Wave2ModelAnalysis {
  readonly need: Wave2Need;
  readonly barrier: Wave2Barrier;
  readonly decisionFactor: Wave2DecisionFactor;
  readonly recommendedStrategy: Wave2Strategy;
  readonly confidence: number;
  readonly evidence: readonly Wave2EvidenceSignal[];
}

export interface Wave2StrategyInput {
  readonly text: string;
  readonly salesStage:
    | "DISCOVERY"
    | "PRODUCT_MATCHED"
    | "FIT_CONSULTING"
    | "OBJECTION_HANDLING"
    | "READY_TO_BUY"
    | "ORDER_REVIEW"
    | "POST_SALE";
  readonly objectionType:
    | "NONE"
    | "PRICE"
    | "SIZE_FIT"
    | "MATERIAL"
    | "COLOR"
    | "DELIVERY"
    | "TRUST_POLICY"
    | "NEED_COMPARE"
    | "NOT_READY"
    | "PRODUCT_UNCLEAR";
  readonly buyingSignal: boolean;
  readonly hasVerifiedProduct: boolean;
  readonly resolvedProductCount: number;
  readonly hasMeasurements: boolean;
  readonly modelAnalysis?: Wave2ModelAnalysis | null;
}

export interface Wave2StagePlaybook {
  readonly goal: string;
  readonly allowedStrategies: readonly Wave2Strategy[];
  readonly forbiddenActions: readonly (
    | "REQUEST_PII"
    | "UNVERIFIED_FACT"
    | "UNVERIFIED_OFFER"
    | "UNVERIFIED_MEDIA"
    | "OPEN_NEW_CHECKOUT"
  )[];
  readonly maximumQuestions: 0 | 1;
  readonly exitCondition: string;
}

export interface Wave2StrategyDecision {
  readonly schemaVersion: 1;
  readonly rulesetVersion: "wave2-strategy-v1";
  readonly need: Wave2Need;
  readonly barrier: Wave2Barrier;
  readonly decisionFactor: Wave2DecisionFactor;
  readonly recommendedStrategy: Wave2Strategy;
  readonly ctaPolicy: Wave2CtaPolicy;
  readonly confidence: number;
  readonly evidence: readonly Wave2EvidenceSignal[];
  readonly playbook: Wave2StagePlaybook;
  readonly experiment: {
    readonly experimentId: "wave2-stage-playbook-v1";
    readonly variant: "LIVE_100";
  };
}

function normalizedVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function includesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const NEED_PATTERNS = {
  occasion: [
    /\b(di lam|cong so|di choi|du tiec|di tiec|dam cuoi|chup anh|du lich|mac hang ngay)\b/u,
  ],
  style: [
    /\b(phong cach|nhe nhang|thanh lich|sang|tre trung|nu tinh|ca tinh|toi gian|kin dao|quyen ru)\b/u,
  ],
  budget: [
    /\b(ngan sach|tam gia|khoang gia|duoi \d|tren \d|re hon|gia mem|binh dan)\b/u,
  ],
} as const;

const BARRIER_PATTERNS = {
  price: [
    /\b(dat|mac|gia cao|bot|giam them|re hon|vuot ngan sach|khong du tien)\b/u,
  ],
  fit: [
    /\b(so chat|so rong|so ngan|so dai|khong vua|khong hop dang|beo|map|gay|bung to|bap tay)\b/u,
  ],
  material: [
    /\b(so nong|so nhan|co bi xu|co bi nha|vai mong|vai day|chat lieu on khong|vai co tot)\b/u,
  ],
  trust: [
    /\b(co giong hinh|anh that|hang that|uy tin|lua dao|chat luong khong|co dep nhu anh)\b/u,
  ],
  delivery: [
    /\b(kip khong|giao kip|giao cham|bao lau|ngay mai can|can gap)\b/u,
  ],
  choice: [
    /\b(nhieu qua|roi qua|khong biet chon|phan van|mau nao hop hon|chon mau nao|so sanh)\b/u,
  ],
} as const;

function detectedNeed(
  text: string,
): { need: Wave2Need; factor: Wave2DecisionFactor; evidence?: Wave2EvidenceSignal } {
  if (includesAny(text, NEED_PATTERNS.occasion)) {
    return { need: "NEED_OCCASION", factor: "OCCASION", evidence: "TEXT_OCCASION" };
  }
  if (includesAny(text, NEED_PATTERNS.style)) {
    return { need: "NEED_STYLE", factor: "STYLE", evidence: "TEXT_STYLE" };
  }
  if (includesAny(text, NEED_PATTERNS.budget)) {
    return { need: "NEED_BUDGET", factor: "BUDGET", evidence: "TEXT_BUDGET" };
  }
  return { need: "NOT_ENOUGH_CONTEXT", factor: "UNKNOWN" };
}

function stateBarrier(
  objectionType: Wave2StrategyInput["objectionType"],
): { barrier: Wave2Barrier; factor: Wave2DecisionFactor } | null {
  switch (objectionType) {
    case "PRICE":
      return { barrier: "BARRIER_PRICE", factor: "BUDGET" };
    case "SIZE_FIT":
      return { barrier: "BARRIER_FIT", factor: "FIT" };
    case "MATERIAL":
      return { barrier: "BARRIER_MATERIAL", factor: "MATERIAL" };
    case "TRUST_POLICY":
      return { barrier: "BARRIER_TRUST", factor: "TRUST" };
    case "DELIVERY":
      return { barrier: "BARRIER_DELIVERY", factor: "DELIVERY" };
    case "NEED_COMPARE":
      return { barrier: "CHOICE_OVERLOAD", factor: "PRODUCT" };
    default:
      return null;
  }
}

function detectedBarrier(
  text: string,
): {
  barrier: Wave2Barrier;
  factor: Wave2DecisionFactor;
  evidence?: Wave2EvidenceSignal;
} {
  if (includesAny(text, BARRIER_PATTERNS.price)) {
    return {
      barrier: "BARRIER_PRICE",
      factor: "BUDGET",
      evidence: "TEXT_PRICE_OBJECTION",
    };
  }
  if (includesAny(text, BARRIER_PATTERNS.fit)) {
    return {
      barrier: "BARRIER_FIT",
      factor: "FIT",
      evidence: "TEXT_FIT_OBJECTION",
    };
  }
  if (includesAny(text, BARRIER_PATTERNS.material)) {
    return {
      barrier: "BARRIER_MATERIAL",
      factor: "MATERIAL",
      evidence: "TEXT_MATERIAL_OBJECTION",
    };
  }
  if (includesAny(text, BARRIER_PATTERNS.trust)) {
    return {
      barrier: "BARRIER_TRUST",
      factor: "TRUST",
      evidence: "TEXT_TRUST_OBJECTION",
    };
  }
  if (includesAny(text, BARRIER_PATTERNS.delivery)) {
    return {
      barrier: "BARRIER_DELIVERY",
      factor: "DELIVERY",
      evidence: "TEXT_DELIVERY_OBJECTION",
    };
  }
  if (includesAny(text, BARRIER_PATTERNS.choice)) {
    return {
      barrier: "CHOICE_OVERLOAD",
      factor: "PRODUCT",
      evidence: "TEXT_CHOICE_OVERLOAD",
    };
  }
  return { barrier: "NONE", factor: "UNKNOWN" };
}

function playbook(
  stage: Wave2StrategyInput["salesStage"],
): Wave2StagePlaybook {
  switch (stage) {
    case "DISCOVERY":
      return {
        goal: "Understand one high-value decision factor",
        allowedStrategies: [
          "STRATEGY_ASK_CLARIFY",
          "STRATEGY_RECOMMEND_PRODUCT",
        ],
        forbiddenActions: [
          "REQUEST_PII",
          "UNVERIFIED_FACT",
          "UNVERIFIED_OFFER",
          "UNVERIFIED_MEDIA",
          "OPEN_NEW_CHECKOUT",
        ],
        maximumQuestions: 1,
        exitCondition: "Need or verified product is known",
      };
    case "PRODUCT_MATCHED":
      return {
        goal: "Resolve fit or the strongest remaining decision factor",
        allowedStrategies: [
          "STRATEGY_SHOW_PROOF",
          "STRATEGY_ASK_CLARIFY",
          "STRATEGY_ANSWER_OBJECTION",
          "STRATEGY_CLOSE",
        ],
        forbiddenActions: [
          "REQUEST_PII",
          "UNVERIFIED_FACT",
          "UNVERIFIED_OFFER",
          "UNVERIFIED_MEDIA",
        ],
        maximumQuestions: 1,
        exitCondition: "Customer commits or raises an objection",
      };
    case "FIT_CONSULTING":
      return {
        goal: "Reach a verified size recommendation without guessing",
        allowedStrategies: [
          "STRATEGY_ASK_CLARIFY",
          "STRATEGY_SHOW_PROOF",
          "STRATEGY_CLOSE",
        ],
        forbiddenActions: [
          "REQUEST_PII",
          "UNVERIFIED_FACT",
          "UNVERIFIED_OFFER",
          "UNVERIFIED_MEDIA",
        ],
        maximumQuestions: 1,
        exitCondition: "Verified size or explicit uncertainty is recorded",
      };
    case "OBJECTION_HANDLING":
      return {
        goal: "Resolve the active barrier with verified evidence",
        allowedStrategies: [
          "STRATEGY_ANSWER_OBJECTION",
          "STRATEGY_SHOW_PROOF",
          "STRATEGY_ASK_CLARIFY",
          "STRATEGY_CLOSE",
        ],
        forbiddenActions: [
          "REQUEST_PII",
          "UNVERIFIED_FACT",
          "UNVERIFIED_OFFER",
          "UNVERIFIED_MEDIA",
        ],
        maximumQuestions: 1,
        exitCondition: "Barrier resolved, customer pauses, or human help is required",
      };
    case "READY_TO_BUY":
    case "ORDER_REVIEW":
      return {
        goal: "Advance only the verified checkout state",
        allowedStrategies: ["STRATEGY_CLOSE", "STRATEGY_ASK_CLARIFY"],
        forbiddenActions: [
          "UNVERIFIED_FACT",
          "UNVERIFIED_OFFER",
          "UNVERIFIED_MEDIA",
          "OPEN_NEW_CHECKOUT",
        ],
        maximumQuestions: 1,
        exitCondition: "Purchase confirmed, customer retracts, or handoff is required",
      };
    case "POST_SALE":
      return {
        goal: "Preserve post-sale ownership and avoid a new checkout",
        allowedStrategies: [],
        forbiddenActions: [
          "REQUEST_PII",
          "UNVERIFIED_FACT",
          "UNVERIFIED_OFFER",
          "UNVERIFIED_MEDIA",
          "OPEN_NEW_CHECKOUT",
        ],
        maximumQuestions: 0,
        exitCondition: "Transferred to the verified post-sale owner",
      };
  }
}

function strategyFor(
  input: Wave2StrategyInput,
  barrier: Wave2Barrier,
  need: Wave2Need,
): Wave2Strategy {
  if (input.buyingSignal || input.salesStage === "READY_TO_BUY" || input.salesStage === "ORDER_REVIEW") {
    return "STRATEGY_CLOSE";
  }
  if (barrier === "BARRIER_TRUST" || barrier === "BARRIER_MATERIAL") {
    return "STRATEGY_SHOW_PROOF";
  }
  if (
    barrier === "BARRIER_PRICE" ||
    barrier === "BARRIER_FIT" ||
    barrier === "BARRIER_DELIVERY"
  ) {
    return "STRATEGY_ANSWER_OBJECTION";
  }
  if (barrier === "CHOICE_OVERLOAD" || input.resolvedProductCount > 2) {
    return "STRATEGY_ASK_CLARIFY";
  }
  if (!input.hasVerifiedProduct && need !== "NOT_ENOUGH_CONTEXT") {
    return "STRATEGY_RECOMMEND_PRODUCT";
  }
  return "STRATEGY_ASK_CLARIFY";
}

function ctaFor(
  input: Wave2StrategyInput,
  need: Wave2Need,
  barrier: Wave2Barrier,
  strategy: Wave2Strategy,
): Wave2CtaPolicy {
  if (strategy === "STRATEGY_CLOSE" || input.salesStage === "POST_SALE") {
    return "NO_ADDITIONAL_CTA";
  }
  if (barrier === "CHOICE_OVERLOAD" || input.resolvedProductCount > 2) {
    return "REDUCE_TO_TWO";
  }
  if (barrier === "BARRIER_TRUST" || barrier === "BARRIER_MATERIAL") {
    return "ASK_PROOF_PREFERENCE";
  }
  if (
    (barrier === "BARRIER_FIT" || input.salesStage === "FIT_CONSULTING") &&
    !input.hasMeasurements
  ) {
    return "ASK_MEASUREMENTS";
  }
  if (need === "NEED_OCCASION") return "ASK_STYLE";
  if (need === "NEED_STYLE") return "ASK_OCCASION";
  if (need === "NEED_BUDGET") return "ASK_STYLE";
  if (!input.hasVerifiedProduct) return "ASK_OCCASION";
  return "ASK_MEASUREMENTS";
}

function modelAnalysisUsable(
  model: Wave2ModelAnalysis | null | undefined,
): model is Wave2ModelAnalysis {
  if (!model || model.confidence < 0.8 || model.confidence > 1) return false;
  if (model.evidence.length === 0 || model.evidence.length > 8) return false;
  return model.evidence.every((value) => value !== "MODEL_ANALYSIS_ACCEPTED");
}

export function decideWave2SalesStrategy(
  input: Wave2StrategyInput,
): Wave2StrategyDecision {
  const text = normalizedVietnamese(input.text);
  const needDetection = detectedNeed(text);
  const textBarrier = detectedBarrier(text);
  const objectionBarrier = stateBarrier(input.objectionType);
  const barrierDetection = objectionBarrier ?? textBarrier;
  const evidence = new Set<Wave2EvidenceSignal>();
  if (needDetection.evidence) evidence.add(needDetection.evidence);
  if (textBarrier.evidence) evidence.add(textBarrier.evidence);
  if (objectionBarrier) evidence.add("STATE_OBJECTION");
  if (input.hasVerifiedProduct) evidence.add("STATE_PRODUCT_MATCHED");
  if (input.buyingSignal) evidence.add("STATE_BUYING_SIGNAL");
  if (input.hasMeasurements) evidence.add("STATE_MEASUREMENTS_PRESENT");

  let need = needDetection.need;
  let barrier = barrierDetection.barrier;
  let decisionFactor =
    barrierDetection.factor !== "UNKNOWN"
      ? barrierDetection.factor
      : needDetection.factor;
  let confidence = evidence.size > 0 ? 0.9 : 0.55;
  if (
    modelAnalysisUsable(input.modelAnalysis) &&
    need === "NOT_ENOUGH_CONTEXT" &&
    barrier === "NONE"
  ) {
    need = input.modelAnalysis.need;
    barrier = input.modelAnalysis.barrier;
    decisionFactor = input.modelAnalysis.decisionFactor;
    confidence = Math.min(0.95, input.modelAnalysis.confidence);
    evidence.add("MODEL_ANALYSIS_ACCEPTED");
  }
  if (evidence.size === 0) evidence.add("DETERMINISTIC_FALLBACK");

  const recommendedStrategy = strategyFor(input, barrier, need);
  const currentPlaybook = playbook(input.salesStage);
  const safeStrategy = currentPlaybook.allowedStrategies.includes(
      recommendedStrategy,
    )
    ? recommendedStrategy
    : currentPlaybook.allowedStrategies[0] ?? "STRATEGY_ASK_CLARIFY";

  return {
    schemaVersion: 1,
    rulesetVersion: "wave2-strategy-v1",
    need,
    barrier,
    decisionFactor,
    recommendedStrategy: safeStrategy,
    ctaPolicy: ctaFor(input, need, barrier, safeStrategy),
    confidence,
    evidence: [...evidence],
    playbook: currentPlaybook,
    experiment: {
      experimentId: "wave2-stage-playbook-v1",
      variant: "LIVE_100",
    },
  };
}

function ctaText(policy: Wave2CtaPolicy): string | null {
  switch (policy) {
    case "ASK_OCCASION":
      return "C mặc đi làm, đi chơi hay dự tiệc để em lọc đúng form nha?";
    case "ASK_STYLE":
      return "C thích thanh lịch, nhẹ nhàng hay trẻ trung để em lọc sát gu nha?";
    case "ASK_BUDGET":
      return "C muốn em lọc trong khoảng giá nào nha?";
    case "ASK_MEASUREMENTS":
      return "C cho em xin chiều cao, cân nặng hoặc số đo để tư vấn size nha?";
    case "ASK_PROOF_PREFERENCE":
      return "C muốn xem ảnh mặc thực tế hay ảnh cận chất nha?";
    case "REDUCE_TO_TWO":
      return "C ưu tiên form hay chất liệu để em rút còn hai mẫu nha?";
    case "NO_ADDITIONAL_CTA":
      return null;
  }
}

function questionCount(text: string): number {
  return (text.match(/\?/gu) ?? []).length;
}

function limitQuestions(text: string, maximumQuestions: 0 | 1): string {
  if (maximumQuestions === 1 || questionCount(text) === 0) {
    if (questionCount(text) <= maximumQuestions) return text;
  }
  const units = text
    .split(/(?<=[.!?])\s+|\n+/gu)
    .map((value) => value.trim())
    .filter(Boolean);
  let keptQuestions = 0;
  return units
    .filter((unit) => {
      const count = questionCount(unit);
      if (count === 0) return true;
      if (keptQuestions >= maximumQuestions) return false;
      keptQuestions += 1;
      return true;
    })
    .join("\n");
}

export function applyWave2ReplyPolicy(
  proposal: AgentProposalV1,
  decision: Wave2StrategyDecision,
): AgentProposalV1 {
  if (
    (proposal.action !== "REPLY" &&
      proposal.action !== "ASK_PRODUCT_SELECTION") ||
    proposal.reply.trim() === ""
  ) {
    return proposal;
  }
  const limited = limitQuestions(
    proposal.reply.trim(),
    decision.playbook.maximumQuestions,
  );
  const additionalCta =
    questionCount(limited) === 0 ? ctaText(decision.ctaPolicy) : null;
  const reply = [limited, additionalCta].filter(Boolean).join("\n");
  return { ...proposal, reply };
}
