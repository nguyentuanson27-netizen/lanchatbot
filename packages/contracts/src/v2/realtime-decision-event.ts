import { z } from "zod";

export const RealtimeDecisionEventTypeSchema = z.enum([
  "PRODUCT_RESOLVED",
  "PRICE_CARD_SENT",
  "SIZE_CONSULT_STARTED",
  "BUYING_SIGNAL_DETECTED",
  "ORDER_INFO_REQUESTED",
  "ORDER_INTENT_CREATED",
  "HANDOFF",
  "GUARD_BLOCKED",
  "NO_REPLY",
]);

const BuyingSignalReasonSchema = z.enum([
  "DIRECT_PURCHASE_VERB",
  "CONFIRMED_SIZE",
  "CONFIRMED_COLOR",
  "SHIP_REQUEST",
  "COMPONENT_SELECTION",
]);

export const RealtimeDecisionEventV1Schema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string().uuid(),
  conversationHash: z.string().min(16).max(128),
  eventKeyHash: z.string().regex(/^[a-f0-9]{64}$/u),
  eventType: RealtimeDecisionEventTypeSchema,
  origin: z.string().max(64).nullable(),
  reasonCodes: z.array(z.string().min(1).max(128)).max(20),
  releaseId: z.string().min(1).max(128),
  promptVersion: z.string().min(1).max(128),
  modelVersion: z.string().max(128).nullable(),
  policyVersion: z.string().max(256).nullable(),
  catalogVersion: z.string().max(128).nullable(),
  mode: z.enum(["DRY_RUN", "LIVE"]),
  productId: z.string().max(128).nullable(),
  intent: z.string().max(64).nullable(),
  stage: z.string().max(64).nullable(),
  action: z.string().max(64).nullable(),
  occurredAt: z.string().datetime(),
  details: z.object({
    productResolutionOrigin: z.string().max(64).nullable(),
    buyingSignalReasons: z.array(BuyingSignalReasonSchema).max(5),
    guardReasonCodes: z.array(z.string().min(1).max(128)).max(20),
    factsStatus: z.enum(["OK", "STALE", "AMBIGUOUS", "NOT_FOUND", "ERROR"]).nullable(),
    factsReasonCode: z.string().max(128).nullable(),
    salesCycleStageBefore: z.string().max(64).nullable(),
    salesCycleStageAfter: z.string().max(64).nullable(),
    outboundMessageCount: z.number().int().nonnegative().max(20),
    modelCalled: z.boolean(),
    modelLatencyMs: z.number().int().nonnegative().nullable(),
    modelTokenUsage: z.object({
      prompt: z.number().int().nonnegative().nullable(),
      output: z.number().int().nonnegative().nullable(),
      total: z.number().int().nonnegative().nullable(),
    }).strict(),
    buyingSignalOverride: z.boolean(),
  }).strict(),
}).strict();

export type RealtimeDecisionEventType = z.infer<typeof RealtimeDecisionEventTypeSchema>;
export type RealtimeDecisionEventV1 = z.infer<typeof RealtimeDecisionEventV1Schema>;
