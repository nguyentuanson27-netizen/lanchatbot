import { describe, expect, it } from "vitest";
import {
  assertTrackCC3ResponsePlanControl,
  TrackCResponsePlanSemanticError,
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
      target: "NONE",
      purpose: "NONE",
      decisionInput: "NONE",
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

  it("returns a safe semantic reason without exposing plan text", () => {
    let caught: unknown;
    try {
      assertTrackCC3ResponsePlanControl({
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
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TrackCResponsePlanSemanticError);
    expect(caught).toMatchObject({
      message: "TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC",
      stage: "SEMANTIC",
      reason: "UNSUPPORTED_PROTECTED_PROPOSITION",
    });
    expect(JSON.stringify(caught)).not.toContain("target");
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

  it("uses one typed atomic decision input rather than parsing target prose", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        answer: {
          protectedProposition: "NONE",
          protectedResolution: "NOT_APPLICABLE",
        },
        nextMove: {
          target: "SIZE_PREFERENCE",
          purpose: "NARROW_CHOICE",
          decisionInput: "SIZE",
        },
      }),
      answerMode: "ACKNOWLEDGE",
      selectedEvidenceCapabilities: [],
      nextMoveAction: "ASK",
      canonicalActionType: "NONE",
      terminal: false,
    })).not.toThrow();
  });

  it("rejects a missing, NONE, or competing ordinary decision input", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        nextMove: {
          target: "SIZE_PREFERENCE",
          purpose: "NARROW_CHOICE",
          decisionInput: "NONE",
        },
      }),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "ASK",
      canonicalActionType: "NONE",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");

    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        nextMove: {
          target: "NONE",
          purpose: "NONE",
          decisionInput: "SIZE",
        },
      }),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "NONE",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");

    expect(() => assertTrackCC3ResponsePlanControl({
      control: control({
        nextMove: {
          target: "SIZE_PREFERENCE",
          purpose: "NARROW_CHOICE",
          decisionInput: "SIZE",
        },
      }),
      answerMode: "DIRECT",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "ASK",
      canonicalActionType: "ASK_PRODUCT",
      terminal: false,
    })).toThrow("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
  });

  it("preserves HOLD_POSITION as a terminal canonical action", () => {
    expect(() => assertTrackCC3ResponsePlanControl({
      control: control(),
      answerMode: "HOLD",
      selectedEvidenceCapabilities: ["PRICE"],
      nextMoveAction: "NONE",
      canonicalActionType: "HOLD_POSITION",
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
