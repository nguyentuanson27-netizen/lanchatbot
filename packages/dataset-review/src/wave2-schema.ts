import {
  LabelSchemaV1Schema,
  type AnnotationScopeV1,
  type LabelDefinitionV1,
  type LabelSchemaV1,
} from "@lana/contracts";

export const WAVE2_SCHEMA_NAME = "wave2-sales-strategy";
export const WAVE2_SCHEMA_VERSION = "wave2-sales-strategy-v1";
export const WAVE2_GUIDELINE_VERSION = "wave2-guidelines-v1";

interface LabelSeed {
  readonly code: string;
  readonly name: string;
  readonly scope: AnnotationScopeV1;
  readonly mutuallyExclusiveGroup?: string;
  readonly evidenceRequired?: boolean;
}

const SEEDS: readonly LabelSeed[] = [
  { code: "NEED_OCCASION", name: "Need: occasion", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_NEED" },
  { code: "NEED_STYLE", name: "Need: style", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_NEED" },
  { code: "NEED_BUDGET", name: "Need: budget", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_NEED" },
  { code: "BARRIER_PRICE", name: "Barrier: price", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_BARRIER" },
  { code: "BARRIER_FIT", name: "Barrier: fit", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_BARRIER" },
  { code: "BARRIER_MATERIAL", name: "Barrier: material", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_BARRIER" },
  { code: "BARRIER_TRUST", name: "Barrier: trust", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_BARRIER" },
  { code: "BARRIER_DELIVERY", name: "Barrier: delivery", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_BARRIER" },
  { code: "CHOICE_OVERLOAD", name: "Choice overload", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_BARRIER" },
  { code: "STRATEGY_RECOMMEND_PRODUCT", name: "Strategy: recommend product", scope: "SHOP_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_STRATEGY" },
  { code: "STRATEGY_SHOW_PROOF", name: "Strategy: show proof", scope: "SHOP_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_STRATEGY" },
  { code: "STRATEGY_ANSWER_OBJECTION", name: "Strategy: answer objection", scope: "SHOP_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_STRATEGY" },
  { code: "STRATEGY_ASK_CLARIFY", name: "Strategy: clarify", scope: "SHOP_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_STRATEGY" },
  { code: "STRATEGY_CLOSE", name: "Strategy: close", scope: "SHOP_MESSAGE", mutuallyExclusiveGroup: "PRIMARY_STRATEGY" },
  { code: "BARRIER_RESOLVED", name: "Barrier resolved", scope: "CONVERSATION", evidenceRequired: true, mutuallyExclusiveGroup: "BARRIER_OUTCOME" },
  { code: "BARRIER_NOT_RESOLVED", name: "Barrier not resolved", scope: "CONVERSATION", evidenceRequired: true, mutuallyExclusiveGroup: "BARRIER_OUTCOME" },
  { code: "READY_TO_CLOSE", name: "Ready to close", scope: "CUSTOMER_MESSAGE" },
  { code: "NOT_ENOUGH_CONTEXT", name: "Not enough context", scope: "CONVERSATION", evidenceRequired: false },
];

function build(): LabelSchemaV1 {
  const labels: LabelDefinitionV1[] = SEEDS.map((seed, index) => ({
    code: seed.code,
    name: seed.name,
    description: "",
    scope: seed.scope,
    evidenceRequired: seed.evidenceRequired ?? true,
    confidenceRequired: true,
    mutuallyExclusiveGroup: seed.mutuallyExclusiveGroup ?? null,
    parentCode: null,
    isSafetyCritical: false,
    isActive: true,
    displayOrder: index,
  }));
  return LabelSchemaV1Schema.parse({
    schemaVersion: 1,
    name: WAVE2_SCHEMA_NAME,
    version: WAVE2_SCHEMA_VERSION,
    guidelineVersion: WAVE2_GUIDELINE_VERSION,
    labels,
  });
}

export const WAVE2_LABEL_SCHEMA: LabelSchemaV1 = build();
