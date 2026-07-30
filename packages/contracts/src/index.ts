import { z } from "zod";

export const RoutingOwnerSchema = z.enum(["N8N", "APP"]);
export type RoutingOwner = z.infer<typeof RoutingOwnerSchema>;

export const ConversationOwnerSchema = z.enum(["BOT", "HUMAN"]);
export type ConversationOwner = z.infer<typeof ConversationOwnerSchema>;

export const InboxStatusSchema = z.enum([
  "RECEIVED",
  "VERIFIED",
  "QUEUED",
  "PROCESSING",
  "PROCESSED",
  "REJECTED",
  "FAILED_RETRYABLE",
  "FAILED_PERMANENT",
]);
export type InboxStatus = z.infer<typeof InboxStatusSchema>;

export const MetaOutboxStatusSchema = z.enum([
  "PENDING",
  "SENDING",
  "SENT_ACCEPTED",
  "DELIVERED",
  "READ",
  "AMBIGUOUS",
  "RETRYABLE",
  "FAILED_PERMANENT",
  "MANUAL_REVIEW",
]);
export type MetaOutboxStatus = z.infer<typeof MetaOutboxStatusSchema>;

export const PancakeTagOutboxStatusSchema = z.enum([
  "PENDING",
  "APPLYING",
  "APPLIED",
  "RETRYABLE",
  "FAILED_PERMANENT",
]);
export type PancakeTagOutboxStatus = z.infer<typeof PancakeTagOutboxStatusSchema>;

export const SenderTypeSchema = z.enum(["CUSTOMER", "BOT", "HUMAN", "SYSTEM"]);
export type SenderType = z.infer<typeof SenderTypeSchema>;

export const InboundAttachmentSchema = z.object({
  type: z.string().min(1).max(32),
  url: z.string().url().optional(),
  providerId: z.string().max(256).optional(),
});

export const MetaAdsContextV1Schema = z.object({
  source: z.string().max(64).nullable(),
  referralType: z.string().max(64).nullable().optional().default(null),
  adTitle: z.string().max(500).nullable(),
  postId: z.string().max(128).nullable(),
  adId: z.string().max(128).nullable(),
  ref: z.string().max(500).nullable(),
});
export type MetaAdsContextV1 = z.infer<typeof MetaAdsContextV1Schema>;

export const InboundMessageV1Schema = z.object({
  schemaVersion: z.literal(1),
  traceId: z.string().uuid(),
  eventKey: z.string().min(1).max(256),
  pageId: z.string().min(1).max(64),
  messageId: z.string().min(1).max(256).nullable(),
  senderId: z.string().min(1).max(256),
  conversationId: z.string().min(1).max(256),
  occurredAt: z.string().datetime(),
  isEcho: z.boolean(),
  appId: z.string().max(128).nullable(),
  text: z.string().max(8_000).nullable(),
  attachments: z.array(InboundAttachmentSchema).max(10),
  adsContext: MetaAdsContextV1Schema.nullable().optional(),
});
export type InboundMessageV1 = z.infer<typeof InboundMessageV1Schema>;

export const ConversationStateV1Schema = z.object({
  schemaVersion: z.literal(1),
  conversationId: z.string().min(1).max(256),
  routingOwner: RoutingOwnerSchema,
  conversationOwner: ConversationOwnerSchema,
  revision: z.number().int().nonnegative(),
  ownerLeaseUntil: z.string().datetime().nullable(),
  blockingTag: z
    .enum(["NHAN_VIEN", "VAN_DON", "DA_CHOT_DON", "KHONG_UP_SALE"])
    .nullable(),
  blockingTagVerifiedAt: z.string().datetime().nullable(),
  currentProductId: z.string().max(128).nullable(),
  consideredSize: z.string().max(16).nullable(),
  salesStage: z.string().max(64),
  unresolvedQuestions: z.array(z.string().max(256)).max(10),
  updatedAt: z.string().datetime(),
});
export type ConversationStateV1 = z.infer<typeof ConversationStateV1Schema>;

export const MetaOutboxPayloadV1Schema = z.object({
  schemaVersion: z.literal(1),
  pageId: z.string().min(1).max(64),
  recipientId: z.string().min(1).max(256),
  text: z.string().max(2_000),
  // 4 ảnh: đủ cho bộ ảnh feedback. Mỗi ảnh vẫn là một tin riêng khi gửi qua
  // Send API, giới hạn này chỉ nói một lượt trả lời được mang tối đa mấy ảnh.
  imageUrls: z.array(z.string().url()).max(4),
  sequence: z.number().int().nonnegative(),
});
export type MetaOutboxPayloadV1 = z.infer<typeof MetaOutboxPayloadV1Schema>;

export const PancakeTagCommandV1Schema = z.object({
  schemaVersion: z.literal(1),
  pageId: z.string().min(1).max(64),
  conversationId: z.string().min(1).max(256),
  desiredTag: z.enum(["NHAN_VIEN", "VAN_DON"]),
  operation: z.literal("ADD"),
});
export type PancakeTagCommandV1 = z.infer<typeof PancakeTagCommandV1Schema>;

export const TerminalMetaOutboxStatuses = new Set<MetaOutboxStatus>([
  "SENT_ACCEPTED",
  "DELIVERED",
  "READ",
  "FAILED_PERMANENT",
  "MANUAL_REVIEW",
]);

export const BusinessFactStatusSchema = z.enum([
  "OK",
  "STALE",
  "NOT_FOUND",
  "AMBIGUOUS",
  "ERROR",
]);
export type BusinessFactStatus = z.infer<typeof BusinessFactStatusSchema>;

export const BusinessFactSourceSchema = z.enum([
  "POS_LIVE",
  "POS_SNAPSHOT",
  "GOOGLE_SHEETS_POLICY",
  "QDRANT_STABLE",
]);
export type BusinessFactSource = z.infer<typeof BusinessFactSourceSchema>;

export const StockStatusSchema = z.enum([
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PRE_ORDER",
  "COMING_SOON",
  "UNKNOWN",
]);
export type StockStatus = z.infer<typeof StockStatusSchema>;

export const DeliveryEtaSchema = z
  .object({
    minDays: z.number().int().nonnegative(),
    maxDays: z.number().int().nonnegative(),
  })
  .refine((value) => value.maxDays >= value.minDays, {
    message: "delivery ETA maxDays must be greater than or equal to minDays",
  });

export const ProductFactsV1Schema = z.object({
  schemaVersion: z.literal(1),
  productId: z.string().min(1).max(128),
  parentProductId: z.string().min(1).max(128),
  offerType: z.string().min(1).max(64),
  listPriceVnd: z.number().int().nonnegative().nullable(),
  salePriceVnd: z.number().int().nonnegative().nullable(),
  sizes: z.array(z.string().min(1).max(16)).max(32),
  stockStatus: StockStatusSchema,
  stockQuantity: z.number().int().nonnegative().nullable(),
  deliveryEta: DeliveryEtaSchema.nullable(),
  fulfillmentPolicy: z.string().min(1).max(64).nullable(),
  imageUrls: z.array(z.string().url()).max(6),
});
export type ProductFactsV1 = z.infer<typeof ProductFactsV1Schema>;

export const BusinessFactEnvelopeV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    status: BusinessFactStatusSchema,
    source: BusinessFactSourceSchema,
    observedAt: z.string().datetime(),
    expiresAt: z.string().datetime().nullable(),
    productId: z.string().min(1).max(128),
    facts: ProductFactsV1Schema.nullable(),
    reasonCode: z.string().min(1).max(128).nullable(),
    policyContext: z.object({
      fulfillmentPolicy: z.string().min(1).max(64).nullable(),
      canOrderWhenZero: z.boolean().nullable(),
    }).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "OK" && value.facts === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facts"],
        message: "OK business facts require a facts payload",
      });
    }
    if (value.facts !== null && value.facts.productId !== value.productId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facts", "productId"],
        message: "business fact product IDs must match",
      });
    }
  });
export type BusinessFactEnvelopeV1 = z.infer<typeof BusinessFactEnvelopeV1Schema>;

export const ReplyActionSchema = z.enum([
  "REPLY",
  "ASK_PRODUCT_SELECTION",
  "HANDOFF",
  "NO_REPLY",
]);
export type ReplyAction = z.infer<typeof ReplyActionSchema>;

export const AgentBusinessFactIntentSchema = z.enum(["NONE", "PRICE", "STOCK", "SIZE", "ETA"]);
export const AgentBusinessFactQueryV1Schema = z.object({
  intent: AgentBusinessFactIntentSchema,
  offerType: z.string().max(64).nullable(),
  color: z.string().max(64).nullable(),
  size: z.string().max(16).nullable(),
  deliveryRegion: z.string().max(64).nullable(),
});
export type AgentBusinessFactQueryV1 = z.infer<typeof AgentBusinessFactQueryV1Schema>;

export const AgentExtractedTextFieldV1Schema = z.object({
  value: z.string().trim().min(1).max(1_000).nullable(),
  evidenceText: z.string().trim().min(1).max(1_000).nullable(),
  confidence: z.number().min(0).max(1),
}).strict().superRefine((field, context) => {
  if ((field.value === null) !== (field.evidenceText === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "value and evidenceText must both be null or both be present",
    });
  }
});
export type AgentExtractedTextFieldV1 = z.infer<typeof AgentExtractedTextFieldV1Schema>;

export const AgentExtractedPaymentFieldV1Schema = z.object({
  value: z.enum(["COD", "BANK_TRANSFER"]).nullable(),
  evidenceText: z.string().trim().min(1).max(256).nullable(),
  confidence: z.number().min(0).max(1),
}).strict().superRefine((field, context) => {
  if ((field.value === null) !== (field.evidenceText === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "value and evidenceText must both be null or both be present",
    });
  }
});
export type AgentExtractedPaymentFieldV1 = z.infer<typeof AgentExtractedPaymentFieldV1Schema>;

export const AgentBuyingIntentV1Schema = z.object({
  decision: z.enum(["NONE", "CONSIDERING", "COMMITTED", "NEGATED"]),
  requestedAction: z.enum([
    "NONE",
    "OPEN_CART",
    "ADD_TO_CART",
    "SET_QUANTITY",
    "PROCEED_TO_PAYMENT",
  ]),
  quantity: z.number().int().min(1).max(20).nullable(),
  evidenceText: z.string().trim().min(1).max(1_000).nullable(),
  confidence: z.number().min(0).max(1),
}).strict().superRefine((signal, context) => {
  if (signal.decision === "NONE") {
    if (
      signal.requestedAction !== "NONE" ||
      signal.quantity !== null ||
      signal.evidenceText !== null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NONE buying intent cannot contain action, quantity or evidence",
      });
    }
    return;
  }
  if (signal.evidenceText === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidenceText"],
      message: "non-NONE buying intent requires exact evidence",
    });
  }
  if (
    signal.decision !== "COMMITTED" &&
    (signal.requestedAction !== "NONE" || signal.quantity !== null)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "only COMMITTED buying intent may request a cart action or quantity",
    });
  }
  if (
    signal.decision === "COMMITTED" &&
    signal.requestedAction === "NONE"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["requestedAction"],
      message: "COMMITTED buying intent requires a requested action",
    });
  }
});
export type AgentBuyingIntentV1 = z.infer<typeof AgentBuyingIntentV1Schema>;

export const AgentSalesSignalsV1Schema = z.object({
  checkoutExtraction: z.object({
    fullName: AgentExtractedTextFieldV1Schema,
    phone: AgentExtractedTextFieldV1Schema,
    address: AgentExtractedTextFieldV1Schema,
    paymentMethod: AgentExtractedPaymentFieldV1Schema,
  }).strict(),
  purchaseConfirmation: z.object({
    decision: z.enum(["CONFIRM", "REJECT", "UNCLEAR"]),
    evidenceText: z.string().trim().min(1).max(1_000).nullable(),
    confidence: z.number().min(0).max(1),
  }).strict(),
  // Optional keeps persisted/replay proposals from earlier releases readable.
  // The current Vertex response schema requires this field for new generations.
  buyingIntent: AgentBuyingIntentV1Schema.optional(),
}).strict();
export type AgentSalesSignalsV1 = z.infer<typeof AgentSalesSignalsV1Schema>;

export const AgentStrategyAnalysisV1Schema = z.object({
  need: z.enum([
    "NEED_OCCASION",
    "NEED_STYLE",
    "NEED_BUDGET",
    "NOT_ENOUGH_CONTEXT",
  ]),
  barrier: z.enum([
    "NONE",
    "BARRIER_PRICE",
    "BARRIER_FIT",
    "BARRIER_MATERIAL",
    "BARRIER_TRUST",
    "BARRIER_DELIVERY",
    "CHOICE_OVERLOAD",
  ]),
  decisionFactor: z.enum([
    "OCCASION",
    "STYLE",
    "BUDGET",
    "FIT",
    "MATERIAL",
    "TRUST",
    "DELIVERY",
    "PRODUCT",
    "UNKNOWN",
  ]),
  recommendedStrategy: z.enum([
    "STRATEGY_RECOMMEND_PRODUCT",
    "STRATEGY_SHOW_PROOF",
    "STRATEGY_ANSWER_OBJECTION",
    "STRATEGY_ASK_CLARIFY",
    "STRATEGY_CLOSE",
  ]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.enum([
    "TEXT_OCCASION",
    "TEXT_STYLE",
    "TEXT_BUDGET",
    "TEXT_PRICE_OBJECTION",
    "TEXT_FIT_OBJECTION",
    "TEXT_MATERIAL_OBJECTION",
    "TEXT_TRUST_OBJECTION",
    "TEXT_DELIVERY_OBJECTION",
    "TEXT_CHOICE_OVERLOAD",
    "STATE_OBJECTION",
    "STATE_PRODUCT_MATCHED",
    "STATE_BUYING_SIGNAL",
    "STATE_MEASUREMENTS_PRESENT",
    "DETERMINISTIC_FALLBACK",
  ])).min(1).max(8),
}).strict();
export type AgentStrategyAnalysisV1 = z.infer<
  typeof AgentStrategyAnalysisV1Schema
>;

export const AgentProposalV1Schema = z.object({
  schemaVersion: z.literal(1),
  intent: z.string().min(1).max(64),
  conversationStage: z.string().min(1).max(64),
  productId: z.string().min(1).max(128).nullable(),
  action: ReplyActionSchema,
  reply: z.string().max(2_000),
  attachments: z.array(z.string().url()).max(4),
  handoffReason: z.string().min(1).max(128).nullable(),
  businessFactQuery: AgentBusinessFactQueryV1Schema.default({
    intent: "NONE",
    offerType: null,
    color: null,
    size: null,
    deliveryRegion: null,
  }),
  salesSignals: AgentSalesSignalsV1Schema.optional(),
  strategyAnalysis: AgentStrategyAnalysisV1Schema.optional(),
}).superRefine((value, context) => {
  if (value.action === "HANDOFF") {
    if (value.handoffReason === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["handoffReason"], message: "HANDOFF requires a reason" });
    }
    if (value.reply.trim().length > 0 || value.attachments.length > 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["reply"], message: "HANDOFF must remain silent" });
    }
  }
  if (value.action === "NO_REPLY" && (value.reply.trim().length > 0 || value.attachments.length > 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["reply"], message: "NO_REPLY cannot contain customer content" });
  }
  if ((value.action === "REPLY" || value.action === "ASK_PRODUCT_SELECTION") && value.reply.trim().length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["reply"], message: "reply action requires text" });
  }
});
export type AgentProposalV1 = z.infer<typeof AgentProposalV1Schema>;

export const GuardedReplyPlanV1Schema = z.object({
  schemaVersion: z.literal(1),
  action: ReplyActionSchema,
  textUnits: z.array(z.string().min(1).max(2_000)).max(3),
  imageUrls: z.array(z.string().url()).max(4),
  productId: z.string().min(1).max(128).nullable(),
  handoffReason: z.string().min(1).max(128).nullable(),
  blockedReasonCodes: z.array(z.string().min(1).max(128)).max(20),
  sendAuthorized: z.literal(false),
});
export type GuardedReplyPlanV1 = z.infer<typeof GuardedReplyPlanV1Schema>;

export const MetaSendAttemptResultV1Schema = z.discriminatedUnion("result", [
  z.object({
    schemaVersion: z.literal(1),
    result: z.literal("ACCEPTED"),
    providerMessageId: z.string().min(1).max(256),
    recipientId: z.string().min(1).max(256),
  }),
  z.object({
    schemaVersion: z.literal(1),
    result: z.literal("AMBIGUOUS"),
    reasonCode: z.string().min(1).max(128),
  }),
  z.object({
    schemaVersion: z.literal(1),
    result: z.literal("RETRYABLE"),
    reasonCode: z.string().min(1).max(128),
    knownNotTransmitted: z.literal(true),
  }),
  z.object({
    schemaVersion: z.literal(1),
    result: z.literal("FAILED_PERMANENT"),
    reasonCode: z.string().min(1).max(128),
  }),
]);
export type MetaSendAttemptResultV1 = z.infer<typeof MetaSendAttemptResultV1Schema>;

export const PancakeTagObservationV1Schema = z.object({
  schemaVersion: z.literal(1),
  verified: z.boolean(),
  blockingTag: z
    .enum(["NHAN_VIEN", "VAN_DON", "DA_CHOT_DON", "KHONG_UP_SALE"])
    .nullable(),
  observedTagIds: z.array(z.string().min(1).max(128)).max(100),
  observedAt: z.string().datetime(),
  reasonCode: z.string().min(1).max(128).nullable(),
  customerName: z.string().trim().min(1).max(160).nullable().optional(),
});
export type PancakeTagObservationV1 = z.infer<typeof PancakeTagObservationV1Schema>;

// Phase 1 additive contracts. V1 runtime contracts above remain exported so
// existing workers can migrate one adapter at a time without a flag day.
export * from "./v2/index.js";
export * from "./v3/index.js";
export * from "./v4/index.js";
export * from "./v5/index.js";
