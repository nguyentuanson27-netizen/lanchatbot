import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lana/contracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lana/contracts")>();
  return {
    ...actual,
    isSalesStageTransitionAllowedV1: vi.fn(() => false),
  };
});

import {
  applySalesCycleCommand,
  createSalesCycleRuntimeState,
} from "./sales-cycle-runtime.js";

describe("sales-cycle stage-contract mismatch boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a controlled rejection instead of throwing into message retries", () => {
    const now = new Date("2026-08-16T00:00:00.000Z");
    const state = createSalesCycleRuntimeState(
      "conversation-hash",
      { pageId: "page-1", conversationId: "conversation-1" },
      now,
    );

    expect(() => applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command: { kind: "FACTS_PRESENTED", commandId: "facts-contract-drift" },
      now,
    })).not.toThrow();
    expect(applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command: { kind: "FACTS_PRESENTED", commandId: "facts-contract-drift" },
      now,
    })).toEqual({
      status: "REJECTED",
      state,
      reasonCode: "SALES_STAGE_TRANSITION_CONTRACT_MISMATCH",
    });
  });

  it("does not hide unrelated runtime exceptions", () => {
    const now = new Date("2026-08-16T00:00:00.000Z");
    const state = createSalesCycleRuntimeState(
      "conversation-hash",
      { pageId: "page-1", conversationId: "conversation-1" },
      now,
    );
    const unexpected = new Error("UNEXPECTED_STATE_READ_FAILURE");
    const unreadableState = new Proxy(state, {
      get(target, property, receiver) {
        if (property === "processedCommandIds") throw unexpected;
        return Reflect.get(target, property, receiver);
      },
    });

    expect(() => applySalesCycleCommand({
      state: unreadableState,
      expectedRevision: state.revision,
      command: { kind: "FACTS_PRESENTED", commandId: "facts-unexpected-error" },
      now,
    })).toThrow(unexpected);
  });
});
