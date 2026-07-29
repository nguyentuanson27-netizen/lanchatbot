import { z } from "zod";

export const AcquisitionEntrySourceV1Schema = z.enum([
  "META_ADS_CONFIRMED",
  "OTHER_REFERRAL",
  "UNKNOWN",
]);
export type AcquisitionEntrySourceV1 = z.infer<typeof AcquisitionEntrySourceV1Schema>;

export const AcquisitionMessageRoleV1Schema = z.enum([
  "AD_ENTRY_MESSAGE",
  "CUSTOMER_FOLLOW_UP",
  "BOT_INITIAL_REPLY",
]);
export type AcquisitionMessageRoleV1 = z.infer<typeof AcquisitionMessageRoleV1Schema>;

export const AcquisitionEvidenceStrengthV1Schema = z.enum([
  "WEAK_ENTRY",
  "DETERMINISTIC_SIGNAL",
  "RUNTIME_CONFIRMED",
  "POS_CONFIRMED",
]);
export type AcquisitionEvidenceStrengthV1 = z.infer<typeof AcquisitionEvidenceStrengthV1Schema>;

export const LeadQualificationStageV1Schema = z.enum([
  "UNQUALIFIED_ENTRY",
  "REENGAGED",
  "QUALIFIED_INTEREST",
  "BUYING_CANDIDATE",
  "BUYING_COMMITTED",
  "PURCHASE_CONFIRMED",
  "CONVERTED",
]);
export type LeadQualificationStageV1 = z.infer<typeof LeadQualificationStageV1Schema>;

export const LeadDispositionV1Schema = z.enum([
  "ACTIVE",
  "NEGATED",
  "RETRACTED",
  "STALE",
  "PURCHASE_CONFIRMED",
  "CONVERTED",
]);
export type LeadDispositionV1 = z.infer<typeof LeadDispositionV1Schema>;

export const AcquisitionEventTypeV1Schema = z.enum([
  "AD_ENTRY_RECEIVED",
  "BOT_INITIAL_AD_REPLY_LINKED",
  "BOT_INITIAL_AD_REPLY_ACCEPTED",
  "BOT_INITIAL_AD_REPLY_SEND_FAILED",
  "BOT_INITIAL_AD_REPLY_DELIVERED",
  "BOT_INITIAL_AD_REPLY_READ",
  "CUSTOMER_REENGAGED",
  "CUSTOMER_MEANINGFUL_REPLY",
  "CUSTOMER_AMBIGUOUS_ACK",
  "LEAD_QUALIFICATION_STAGE_CHANGED",
  "LEAD_DISPOSITION_CHANGED",
  "ACQUISITION_ATTRIBUTION_AMBIGUOUS",
]);
export type AcquisitionEventTypeV1 = z.infer<typeof AcquisitionEventTypeV1Schema>;

const NullableUuidSchema = z.string().uuid().nullable();

export const AcquisitionEventV1Schema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string().uuid(),
  eventType: AcquisitionEventTypeV1Schema,
  acquisitionSessionId: z.string().uuid(),
  entryMessagePk: z.string().uuid(),
  triggerMessagePk: NullableUuidSchema,
  replyPlanId: NullableUuidSchema,
  outboxId: NullableUuidSchema,
  salesCycleId: NullableUuidSchema,
  previousStage: LeadQualificationStageV1Schema.nullable(),
  nextStage: LeadQualificationStageV1Schema.nullable(),
  previousDisposition: LeadDispositionV1Schema.nullable(),
  nextDisposition: LeadDispositionV1Schema.nullable(),
  qualifyingLabels: z.array(z.string().trim().min(1).max(64)).max(20),
  derivationVersion: z.string().trim().min(1).max(64),
  occurredAt: z.string().datetime(),
});
export type AcquisitionEventV1 = z.infer<typeof AcquisitionEventV1Schema>;

export const AcquisitionSessionV1Schema = z.object({
  schemaVersion: z.literal(1),
  acquisitionSessionId: z.string().uuid(),
  pageId: z.string().trim().min(1).max(64),
  conversationId: z.string().uuid(),
  entryMessagePk: z.string().uuid(),
  entryMessageOccurredAt: z.string().datetime(),
  entrySource: AcquisitionEntrySourceV1Schema,
  evidenceStrength: AcquisitionEvidenceStrengthV1Schema,
  attributionExpiresAt: z.string().datetime(),
  initialReplyPlanId: NullableUuidSchema,
  initialOutboxId: NullableUuidSchema,
  initialReplyAcceptedAt: z.string().datetime().nullable(),
  initialReplyTerminalStatus: z.enum(["FAILED_PERMANENT", "AMBIGUOUS"]).nullable(),
  initialReplyFailedAt: z.string().datetime().nullable(),
  initialReplyDeliveredAt: z.string().datetime().nullable(),
  initialReplyReadAt: z.string().datetime().nullable(),
  reengagedAt: z.string().datetime().nullable(),
  meaningfulAt: z.string().datetime().nullable(),
  qualifiedAt: z.string().datetime().nullable(),
  buyingCandidateAt: z.string().datetime().nullable(),
  committedAt: z.string().datetime().nullable(),
  purchaseConfirmedAt: z.string().datetime().nullable(),
  orderCreatedAt: z.string().datetime().nullable(),
  maxStageReached: LeadQualificationStageV1Schema,
  currentDisposition: LeadDispositionV1Schema,
  firstMeaningfulLabel: z.string().trim().min(1).max(64).nullable(),
  firstBarrier: z.string().trim().min(1).max(64).nullable(),
  firstPlaybook: z.string().trim().min(1).max(64).nullable(),
  derivationVersion: z.string().trim().min(1).max(64),
});
export type AcquisitionSessionV1 = z.infer<typeof AcquisitionSessionV1Schema>;
