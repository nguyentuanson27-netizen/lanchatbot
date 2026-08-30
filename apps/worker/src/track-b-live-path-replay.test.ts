import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  TRACK_B_REPLAY_REQUIRED_RISK_CLASSES,
  runTrackBLivePathReplay,
  type TrackBLivePathReplayCase,
  type TrackBReplayIdentity,
  type TrackBReplayObservation,
} from "./track-b-live-path-replay.js";
import type { RealtimeReplySnapshot } from "./realtime-reply-differential.js";

const pageId = "1198992073286645";
const conversationId = "track-b-replay-conversation";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function identity(): TrackBReplayIdentity {
  return {
    modelProvider: "VERTEX_AI",
    providerModel: "gemini-3.5-flash-lite",
    capability: "BASELINE_MODEL_CAPABILITY",
    promptVersion: "lana-realtime-v1",
    promptTemplateHash: sha256("byte-frozen-baseline-prompt"),
    generationConfigHash: sha256("byte-frozen-generation-config"),
    policyIdentityHash: sha256("published-policy-fixture"),
    schemaIdentityHash: sha256("agent-proposal-v1"),
    behaviorContentHash: sha256("commerce-behavior-fixture"),
    authorityBundleHash: sha256("df13-commerce-authority-bundle-fixture"),
    factFixtureHash: sha256("fixed-verified-facts-fixture"),
  };
}

function snapshot(
  overrides: Partial<RealtimeReplySnapshot> = {},
): RealtimeReplySnapshot {
  return {
    messages: [{ kind: "TEXT", text: "Mẫu SD398 hiện có giá 1.199.000đ." }],
    strategyHash: sha256("answer-price"),
    verifiedFactHashes: [sha256("price-SD398")],
    verifiedMediaUrls: [],
    protectedClaimHashes: [sha256("price-claim-SD398")],
    effectAuthorizationHashes: [],
    commitOutcome: "CAPTURED_NOT_EXECUTED",
    generationOutcome: "VALID",
    inboxOutcome: "COMMITTED",
    protectedOutbound: {
      required: true,
      groupId: "track-b-replay-group",
      plannedMessageCount: 1,
      deliveredMessageCount: 1,
    },
    ...overrides,
  };
}

function observation(
  reply: RealtimeReplySnapshot = snapshot(),
  sideEffects: Partial<TrackBReplayObservation["sideEffects"]> = {},
): TrackBReplayObservation {
  return {
    reply,
    sideEffects: {
      queueClaims: 0,
      customerMessages: 0,
      stateMutations: 0,
      protectedEffects: 0,
      capturedCommitPlans: 1,
      ...sideEffects,
    },
  };
}

function replayCase(
  overrides: Partial<TrackBLivePathReplayCase<{ customerText: string }>> = {},
): TrackBLivePathReplayCase<{ customerText: string }> {
  return {
    caseId: "full-required-corpus",
    riskClasses: [...TRACK_B_REPLAY_REQUIRED_RISK_CLASSES],
    capturedInput: { customerText: "Mẫu SD398 giá bao nhiêu?" },
    baseline: async () => observation(),
    candidate: async () => observation(),
    stateComparison: {
      enabled: true,
      legacy: {
        pageId,
        conversationId,
        owner: "BOT",
        stage: "PRODUCT_MATCHED",
        productId: "SD398",
      },
      commerce: {
        pageId,
        conversationId,
        revision: 4,
        stage: "FACTS_PRESENTED",
        productScope: { kind: "SINGLE", productId: "SD398" },
        cartProductScope: { kind: "ABSENT" },
        artifacts: {
          hasCart: false,
          hasOrderPreview: false,
          hasPurchaseConfirmation: false,
        },
      },
    },
    ...overrides,
  };
}

describe("Track B B3 live-path replay", () => {
  it("pins the full identity and required corpus while reusing reply and state comparisons", async () => {
    const baseline = vi.fn(async (capture: Readonly<{ customerText: string }>) => {
      expect(Object.isFrozen(capture)).toBe(true);
      return observation();
    });
    const candidate = vi.fn(async (capture: Readonly<{ customerText: string }>) => {
      expect(Object.isFrozen(capture)).toBe(true);
      return observation();
    });

    const result = await runTrackBLivePathReplay({
      identity: identity(),
      cases: [replayCase({ baseline, candidate })],
    });

    expect(result).toMatchObject({
      contractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1",
      status: "PASS",
      sideEffects: "DISABLED",
      coverage: {
        complete: true,
        missingRiskClasses: [],
      },
      cases: [{
        caseId: "full-required-corpus",
        status: "PASS",
        reply: { status: "MATCH", sideEffects: "DISABLED" },
        state: { status: "MATCH", differences: [] },
        sideEffects: { status: "NONE", capturedCommitPlans: 2 },
      }],
    });
    expect(result.identityHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(baseline).toHaveBeenCalledOnce();
    expect(candidate).toHaveBeenCalledOnce();
    expect(baseline.mock.calls[0]![0]).not.toBe(candidate.mock.calls[0]![0]);
  });

  it("fails closed when the corpus omits a required risk class", async () => {
    const result = await runTrackBLivePathReplay({
      identity: identity(),
      cases: [replayCase({ riskClasses: ["PROTECTED_CLAIM"] })],
    });

    expect(result.status).toBe("VIOLATION");
    expect(result.coverage.complete).toBe(false);
    expect(result.coverage.missingRiskClasses).toEqual(
      TRACK_B_REPLAY_REQUIRED_RISK_CLASSES.filter(
        (riskClass) => riskClass !== "PROTECTED_CLAIM",
      ),
    );
  });

  it("fails closed on queue, send, state, or protected-effect activity", async () => {
    const result = await runTrackBLivePathReplay({
      identity: identity(),
      cases: [replayCase({
        candidate: async () => observation(snapshot(), {
          queueClaims: 1,
          customerMessages: 1,
          stateMutations: 1,
          protectedEffects: 1,
        }),
      })],
    });

    expect(result.status).toBe("VIOLATION");
    expect(result.cases[0]).toMatchObject({
      status: "VIOLATION",
      sideEffects: {
        status: "VIOLATION",
        reasonCodes: [
          "TRACK_B_REPLAY_QUEUE_CLAIMED",
          "TRACK_B_REPLAY_CUSTOMER_MESSAGE_SENT",
          "TRACK_B_REPLAY_STATE_MUTATED",
          "TRACK_B_REPLAY_PROTECTED_EFFECT_EXECUTED",
        ],
      },
    });
  });

  it("requires reason-coded permission for intentional wording and state deltas", async () => {
    const changed = snapshot({
      messages: [{ kind: "TEXT", text: "Mẫu SD398 giá 1.199.000đ chị nhé." }],
    });
    const unreviewed = await runTrackBLivePathReplay({
      identity: identity(),
      cases: [replayCase({
        candidate: async () => observation(changed),
        stateComparison: {
          ...replayCase().stateComparison,
          commerce: {
            ...replayCase().stateComparison.commerce!,
            productScope: { kind: "SINGLE", productId: "OTHER" },
          },
        },
      })],
    });
    expect(unreviewed.status).toBe("VIOLATION");

    const reviewed = await runTrackBLivePathReplay({
      identity: identity(),
      cases: [replayCase({
        candidate: async () => observation(changed),
        permittedReplyDifferences: [{
          code: "OUTBOUND_MESSAGES_CHANGED",
          reasonCode: "TRACK_B_MODEL_OWNS_NORMAL_WORDING",
        }],
        stateComparison: {
          ...replayCase().stateComparison,
          commerce: {
            ...replayCase().stateComparison.commerce!,
            productScope: { kind: "SINGLE", productId: "OTHER" },
          },
        },
        permittedStateDifferences: [{
          code: "PRODUCT_SCOPE_MISMATCH",
          reasonCode: "TRACK_B_FIXED_ADVERSARIAL_SCOPE_FIXTURE",
        }],
      })],
    });

    expect(reviewed).toMatchObject({
      status: "PASS",
      cases: [{
        status: "PASS",
        reply: { status: "INTENTIONAL_DIFFERENCE" },
        state: {
          status: "INTENTIONAL_DIFFERENCE",
          differences: [{
            code: "PRODUCT_SCOPE_MISMATCH",
            disposition: "INTENTIONAL",
            reasonCode: "TRACK_B_FIXED_ADVERSARIAL_SCOPE_FIXTURE",
          }],
        },
      }],
    });
  });

  it("rejects ambiguous case and identity evidence before executing replay", async () => {
    const baseline = vi.fn(async () => observation());
    await expect(runTrackBLivePathReplay({
      identity: {
        ...identity(),
        capability: "OTHER" as TrackBReplayIdentity["capability"],
      },
      cases: [replayCase({ baseline })],
    })).rejects.toThrowError("TRACK_B_REPLAY_BASELINE_CAPABILITY_REQUIRED");
    expect(baseline).not.toHaveBeenCalled();

    await expect(runTrackBLivePathReplay({
      identity: identity(),
      cases: [
        replayCase({ caseId: "duplicate" }),
        replayCase({ caseId: " duplicate " }),
      ],
    })).rejects.toThrowError("TRACK_B_REPLAY_CASE_ID_DUPLICATE");

    await expect(runTrackBLivePathReplay({
      identity: identity(),
      cases: [replayCase({
        riskClasses: ["UNKNOWN" as typeof TRACK_B_REPLAY_REQUIRED_RISK_CLASSES[number]],
      })],
    })).rejects.toThrowError("TRACK_B_REPLAY_RISK_CLASS_INVALID");
  });
});
