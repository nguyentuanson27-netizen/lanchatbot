import { describe, expect, it } from "vitest";
import {
  GroundedReplyDraftV1Schema,
  SalesRubricAssessmentV2Schema,
} from "./grounded-reply.js";

describe("GroundedReplyDraftV1", () => {
  const valid = {
    schemaVersion: 1,
    advisoryText: "Thiết kế thanh lịch, chuẩn form công sở.",
    objectionResponse: "",
    suggestedQuestion: "Chị thích màu be hay đen hơn ạ?",
    suggestedNextStep: "",
    attachmentImageIndices: [0, 2],
  } as const;

  it("accepts advisory-only structured output", () => {
    expect(GroundedReplyDraftV1Schema.parse(valid)).toEqual(valid);
  });

  it.each(["action", "productId", "intent", "businessFactQuery", "imageUrl"])(
    "rejects forbidden decision field %s",
    (field) => {
      expect(() => GroundedReplyDraftV1Schema.parse({ ...valid, [field]: "REPLY" })).toThrow();
    },
  );
});

describe("SalesRubricAssessmentV2", () => {
  it("requires the four grounding and sales-progression scores", () => {
    expect(SalesRubricAssessmentV2Schema.parse({
      schemaVersion: 2,
      intent: "hoi_gia",
      conversationStage: "consulting",
      scores: {
        relevance: 5,
        questionResolution: 5,
        nextStepQuality: 4,
        naturalness: 4,
        concision: 5,
        factGrounding: 5,
        objectionResolution: 4,
        salesProgression: 4,
        ctaStageFit: 5,
        overall: 5,
      },
      strengths: [],
      weaknesses: [],
      improvedReply: "",
      recommendationAction: "KEEP",
    }).schemaVersion).toBe(2);
  });
});
