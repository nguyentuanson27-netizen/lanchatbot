import { z } from "zod";

export const GroundedReplyDraftV1Schema = z.object({
  schemaVersion: z.literal(1),
  advisoryText: z.string().max(800),
  objectionResponse: z.string().max(500),
  suggestedQuestion: z.string().max(300),
  suggestedNextStep: z.string().max(300),
  attachmentImageIndices: z.array(z.number().int().nonnegative().max(20)).max(4),
}).strict();

export type GroundedReplyDraftV1 = z.infer<typeof GroundedReplyDraftV1Schema>;

export const SalesRubricAssessmentV2Schema = z.object({
  schemaVersion: z.literal(2),
  intent: z.string().min(1).max(64),
  conversationStage: z.string().min(1).max(64),
  scores: z.object({
    relevance: z.number().min(0).max(5),
    questionResolution: z.number().min(0).max(5),
    nextStepQuality: z.number().min(0).max(5),
    naturalness: z.number().min(0).max(5),
    concision: z.number().min(0).max(5),
    factGrounding: z.number().min(0).max(5),
    objectionResolution: z.number().min(0).max(5),
    salesProgression: z.number().min(0).max(5),
    ctaStageFit: z.number().min(0).max(5),
    overall: z.number().min(0).max(5),
  }).strict(),
  strengths: z.array(z.string().max(256)).max(10),
  weaknesses: z.array(z.string().max(256)).max(10),
  improvedReply: z.string().max(2_000),
  recommendationAction: z.enum(["KEEP", "REWRITE", "HANDOFF_REVIEW"]),
}).strict();

export type SalesRubricAssessmentV2 = z.infer<typeof SalesRubricAssessmentV2Schema>;
