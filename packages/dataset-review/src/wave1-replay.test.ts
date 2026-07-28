import { describe, expect, it } from "vitest";
import {
  buildWave1ReplayReport,
  parseWave1ReplayFixtureSet,
  replayWave1RuntimeFixture,
} from "./wave1-replay.js";

const HASH = `sha256:${"a".repeat(64)}`;

function fixtureSet() {
  return parseWave1ReplayFixtureSet({
    schemaVersion: "wave1-replay-fixtures-v1",
    fixtureSetId: "test-v1",
    fixtureSourcePolicy: "Synthetic test only.",
    fixtures: [
      {
        fixtureId: "committed-ready",
        source: "SYNTHETIC_FIXED",
        priorStage: "PRE_SALE",
        semantic: {
          oracle: ["BUYING_COMMITTED"],
          model: ["BUYING_COMMITTED"],
        },
        prerequisitesSatisfied: true,
        missingFields: [],
        authorization: {
          ownershipAuthorized: true,
          pageAllowed: true,
          terminal: false,
          duplicateEvent: false,
        },
        factEnvelope: {
          envelopeId: HASH,
          productId: "TEST-001",
          priceVnd: 399000,
        },
        replyFactKinds: ["PRICE"],
        expectation: {
          allowedActions: ["REPLY"],
          allowedNextStages: ["READY_TO_BUY"],
        },
        replyExpectation: {
          mustIncludeAny: ["sẵn sàng", "bản xem trước"],
          mustNotInclude: ["nhân viên"],
          piiRequestAllowed: false,
          objectionPresent: false,
          objectionResolvedByAny: [],
        },
      },
      {
        fixtureId: "ownership-blocked",
        source: "SYNTHETIC_FIXED",
        priorStage: "PRE_SALE",
        semantic: {
          oracle: ["BUYING_COMMITTED"],
          model: ["BUYING_COMMITTED"],
        },
        prerequisitesSatisfied: true,
        missingFields: [],
        authorization: {
          ownershipAuthorized: false,
          pageAllowed: true,
          terminal: false,
          duplicateEvent: false,
        },
        factEnvelope: null,
        replyFactKinds: [],
        expectation: {
          allowedActions: ["NO_REPLY"],
          allowedNextStages: ["PRE_SALE"],
        },
        replyExpectation: {
          mustIncludeAny: [],
          mustNotInclude: [],
          piiRequestAllowed: false,
          objectionPresent: false,
          objectionResolvedByAny: [],
        },
      },
    ],
  });
}

describe("Wave 1 fixed replay", () => {
  it("runs oracle/model modes without side effects or holdout", () => {
    const report = buildWave1ReplayReport(fixtureSet());
    expect(report.scope).toBe("SYNTHETIC_REFERENCE_CONFORMANCE");
    expect(report.productionReplayStatus).toBe("PENDING_RECORDED_FIXTURES");
    expect(report.notProductionBaseline).toBe(true);
    expect(report.runtimePolicy.oracle.evaluatedCases).toBe(2);
    expect(report.runtimePolicy.model.evaluatedCases).toBe(2);
    expect(report.runtimePolicy.oracle.hardSafetyViolationCount).toBe(0);
    expect(report.replyQuality.evaluatedCases).toBe(1);
    expect(report.replyQuality.hardSafetyViolationCount).toBe(0);
    expect(report.sideEffects).toBe("DISABLED");
    expect(report.holdoutOpened).toBe(false);
  });

  it("does not emit outbound when ownership is unavailable", () => {
    const fixture = fixtureSet().fixtures[1]!;
    const replay = replayWave1RuntimeFixture(fixture, "ORACLE_SEMANTICS");
    expect(replay.observation).toMatchObject({
      action: "NO_REPLY",
      outboundCount: 0,
      sideEffectCount: 0,
      ownershipAuthorized: false,
    });
  });

  it("rejects duplicate fixture IDs", () => {
    const fixture = fixtureSet().fixtures[0]!;
    expect(() =>
      parseWave1ReplayFixtureSet({
        schemaVersion: "wave1-replay-fixtures-v1",
        fixtureSetId: "bad",
        fixtureSourcePolicy: "Synthetic.",
        fixtures: [fixture, fixture],
      })
    ).toThrow("WAVE1_REPLAY_FIXTURE_ID_DUPLICATED");
  });
});
