import {
  LabelSchemaV1Schema,
  type AnnotationScopeV1,
  type LabelDefinitionV1,
  type LabelSchemaV1,
} from "@lana/contracts";

// Seed label schema "wave1-conversation-recovery-v1" (§9). This is data, not
// hard-coded UI: it is stored in dataset_label_schemas and the frontend renders
// from it. Adjust or add versions without touching frontend code.

export const WAVE1_SCHEMA_NAME = "wave1-conversation-recovery";
export const WAVE1_SCHEMA_VERSION = "wave1-conversation-recovery-v1";
export const WAVE1_GUIDELINE_VERSION = "wave1-guidelines-v1";

interface LabelSeed {
  readonly code: string;
  readonly name: string;
  readonly scope: AnnotationScopeV1;
  readonly evidenceRequired?: boolean;
  readonly mutuallyExclusiveGroup?: string;
  readonly isSafetyCritical?: boolean;
  readonly description?: string;
}

const SEEDS: readonly LabelSeed[] = [
  // Customer semantic — only labelled on CUSTOMER messages.
  { code: "PRICE_QUESTION", name: "Price question", scope: "CUSTOMER_MESSAGE" },
  { code: "PRODUCT_INFO_QUESTION", name: "Product info question", scope: "CUSTOMER_MESSAGE" },
  { code: "IMAGE_REQUEST", name: "Image request", scope: "CUSTOMER_MESSAGE" },
  { code: "SIZE_QUESTION", name: "Size question", scope: "CUSTOMER_MESSAGE" },
  { code: "MEASUREMENTS_PROVIDED", name: "Measurements provided", scope: "CUSTOMER_MESSAGE" },
  { code: "VARIANT_SELECTION", name: "Variant selection", scope: "CUSTOMER_MESSAGE" },
  { code: "BUYING_CANDIDATE", name: "Buying candidate", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "BUYING_STATE" },
  { code: "BUYING_COMMITTED", name: "Buying committed", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "BUYING_STATE", isSafetyCritical: true },
  { code: "BUYING_NEGATED", name: "Buying negated", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "BUYING_STATE" },
  { code: "BUYING_RETRACTED", name: "Buying retracted", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "BUYING_STATE" },
  { code: "ORDER_CANCELLATION", name: "Order cancellation", scope: "CUSTOMER_MESSAGE" },
  { code: "CONTINUATION", name: "Continuation", scope: "CUSTOMER_MESSAGE" },
  { code: "MULTI_PRODUCT_COMPARISON", name: "Multi-product comparison", scope: "CUSTOMER_MESSAGE" },

  // Objections — CUSTOMER messages.
  { code: "PRICE_OBJECTION", name: "Price objection", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "OBJECTION" },
  { code: "FIT_OBJECTION", name: "Fit objection", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "OBJECTION" },
  { code: "STYLE_OBJECTION", name: "Style objection", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "OBJECTION" },
  { code: "MATERIAL_OBJECTION", name: "Material objection", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "OBJECTION" },
  { code: "DELIVERY_OBJECTION", name: "Delivery objection", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "OBJECTION" },
  { code: "TRUST_OBJECTION", name: "Trust objection", scope: "CUSTOMER_MESSAGE", mutuallyExclusiveGroup: "OBJECTION" },
  { code: "CHOICE_OVERLOAD", name: "Choice overload", scope: "CUSTOMER_MESSAGE" },

  // Journey.
  { code: "PRE_SALE_RETURN_POLICY_QUESTION", name: "Pre-sale return policy question", scope: "CUSTOMER_MESSAGE" },
  { code: "CHECKOUT_DETAILS_PROVIDED", name: "Checkout details provided", scope: "CUSTOMER_MESSAGE" },
  { code: "ORDER_CONFIRMATION_TEXT_OBSERVED", name: "Order confirmation text observed", scope: "SHOP_MESSAGE" },
  { code: "ORDER_TRACKING_QUESTION", name: "Order tracking question", scope: "CUSTOMER_MESSAGE" },
  { code: "DELIVERY_DELAY_COMPLAINT", name: "Delivery delay complaint", scope: "CUSTOMER_MESSAGE" },
  { code: "EXCHANGE_REQUEST", name: "Exchange request", scope: "CUSTOMER_MESSAGE" },
  { code: "RETURN_REQUEST", name: "Return request", scope: "CUSTOMER_MESSAGE" },
  { code: "PRODUCT_COMPLAINT", name: "Product complaint", scope: "CUSTOMER_MESSAGE" },
  { code: "POST_EXCHANGE_CONFIRMATION", name: "Post-exchange confirmation", scope: "CUSTOMER_MESSAGE" },
  { code: "EXPLICIT_DELIVERED_MESSAGE", name: "Explicit delivered message", scope: "SHOP_MESSAGE" },
  {
    code: "NO_EXPLICIT_CHECKOUT_OBSERVED",
    name: "No explicit checkout observed",
    scope: "CONVERSATION",
    evidenceRequired: false,
    description: "Observed state from transcript only; not a real abandonment outcome.",
  },

  // Conversation quality — mostly SHOP messages or whole-conversation.
  { code: "REPEATED_SHOP_MESSAGE", name: "Repeated shop message", scope: "SHOP_MESSAGE" },
  { code: "REPEATED_SHOP_QUESTION", name: "Repeated shop question", scope: "SHOP_MESSAGE" },
  { code: "IRRELEVANT_SHOP_REPLY", name: "Irrelevant shop reply", scope: "SHOP_MESSAGE" },
  {
    code: "PRODUCT_CONTEXT_LOST",
    name: "Product context lost",
    scope: "CONVERSATION",
    evidenceRequired: false,
  },
  { code: "SIZE_RECOMMENDATION_CONFLICT", name: "Size recommendation conflict", scope: "SHOP_MESSAGE", isSafetyCritical: true },
  { code: "PREMATURE_PII_REQUEST", name: "Premature PII request", scope: "SHOP_MESSAGE", isSafetyCritical: true },
  { code: "FOLLOW_UP_SPAM", name: "Follow-up spam", scope: "SHOP_MESSAGE" },
  { code: "POSSIBLE_HANDOFF_LANGUAGE", name: "Possible handoff language", scope: "SHOP_MESSAGE", isSafetyCritical: true },
];

function build(): LabelSchemaV1 {
  const labels: LabelDefinitionV1[] = SEEDS.map((seed, index) => ({
    code: seed.code,
    name: seed.name,
    description: seed.description ?? "",
    scope: seed.scope,
    evidenceRequired: seed.evidenceRequired ?? true,
    confidenceRequired: true,
    mutuallyExclusiveGroup: seed.mutuallyExclusiveGroup ?? null,
    parentCode: null,
    isSafetyCritical: seed.isSafetyCritical ?? false,
    isActive: true,
    displayOrder: index,
  }));
  // Validate at module load so the seed can never drift out of contract.
  return LabelSchemaV1Schema.parse({
    schemaVersion: 1,
    name: WAVE1_SCHEMA_NAME,
    version: WAVE1_SCHEMA_VERSION,
    guidelineVersion: WAVE1_GUIDELINE_VERSION,
    labels,
  });
}

export const WAVE1_LABEL_SCHEMA: LabelSchemaV1 = build();
