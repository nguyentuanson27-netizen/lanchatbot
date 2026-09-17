import { describe, expect, it } from "vitest";
import {
  assertTrackCC3ResponsePlanControl,
  type TrackCResponsePlanControlV1,
} from "./track-c-c3-response-plan-control.js";

function control(
  overrides: Partial<TrackCResponsePlanControlV1> = {},
): TrackCResponsePlanControlV1 {
  return {
    answer: {
      protectedProposition: "PRICE",
      protectedResolution: "SUPPORTED",
    },
    nextMove: {
      decisionInputs: [],
    },
    effectIntent: "NONE",
    ...overrides,
  };
}

describe("Track C C3 response-plan control", () => {
  it("accepts a supported protected proposition only when selected evidence has that capability", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control(),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "NONE",
      terminal: false,
    })).not.toThrow();
  });

  it("rejects PRICE evidence being promoted into a supported promotion proposition", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        answer: {
          protectedProposition: "PROMOTION_OFFER",
          protectedResolution: "SUPPORTED",
        },
      }),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "NONE",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
  });

  it("allows unresolved promotion questions to carry PRICE only as bounded context", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        answer: {
          protectedProposition: "PROMOTION_OFFER",
          protectedResolution: "UNRESOLVED",
        },
      }),
      answerMode: "BOUNDED_UNCERTAINTY",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "NONE",
      terminal: false,
    })).not.toThrow();
  });

  it("keeps ordinary next-move cardinality structural rather than parsing target prose", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        answer: {
          protectedProposition: "NONE",
          protectedResolution: "NOT_APPLICABLE",
        },
        nextMove: {
          decisionInputs: ["size or color preference"],
        },
      }),
      answerMode: "ACKNOWLEDGE",
      selectedEvidenceCapabilities: [],
      nextMoveAction: "ASK",
      canonicalActionType: "NONE",
      terminal: false,
    })).not.toThrow();
  });

  it("rejects missing or extra structural decision inputs", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        nextMove: { decisionInputs: [] },
      }),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "ASK",
      canonicalActionType: "NONE",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");

    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        nextMove: { decisionInputs: ["size"] },
      }),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "NONE",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
  });

  it("does not let a response plan authorize effects", () => {
    const unsafe = {
      ...control(),
      effectIntent: "CONFIRM_ORDER",
    } as unknown as TrackCResponsePlanControlV1;
    expect(() => assertTrackCC3ResponsePlanControl({
      control: unsafe,
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "NONE",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
  });
});
