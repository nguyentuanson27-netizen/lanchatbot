import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CUSTOMER_PREFIX } from "./parse.js";
import {
  validateWave1BenchmarkBundle,
  type Wave1BenchmarkConversation,
} from "./benchmark-bundle.js";
import { assignBenchmarkSplits } from "./benchmark-split.js";
import {
  evaluateSemanticPromotion,
  scoreSemanticBenchmark,
} from "./semantic-benchmark.js";
import { scoreRuntimePolicyBenchmark } from "./runtime-policy-benchmark.js";
import { scoreReplyQualityBenchmark } from "./reply-quality-benchmark.js";
import { buildWave1CurrentBaseline } from "./current-deterministic-baseline.js";
import type { Wave1BenchmarkRunManifest } from "./wave1-benchmark-foundation.js";

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          canonicalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function syntheticBundle() {
  const goldRecord = {
    n: 1,
    key: "history:1",
    startTruncated: false,
    ann: [{ t: 0, l: "BUYING_COMMITTED", ev: "Chốt mẫu đen" }],
    conv: [],
  };
  const gold = {
    schemaVersion: "gold-v2",
    unit: "MESSAGE",
    range: { from: 1, to: 1 },
    conversations: [goldRecord],
  };
  const historyRecord = {
    value: `${CUSTOMER_PREFIX} Chốt mẫu đen`,
    key: "history:1",
    ttl: 86_400,
  };
  const history = [historyRecord];
  const goldBytes = Buffer.from(JSON.stringify(gold), "utf8");
  const historyBytes = Buffer.from(JSON.stringify(history), "utf8");
  const transcriptBytes = Buffer.from(historyRecord.value, "utf8");
  const goldRecordSha256 = sha256(Buffer.from(canonicalJson(goldRecord), "utf8"));
  const historyRecordSha256 = sha256(
    Buffer.from(canonicalJson(historyRecord), "utf8"),
  );
  const transcriptSha256 = sha256(transcriptBytes);
  const bindingSha256 = sha256(
    Buffer.concat([
      Buffer.from(historyRecord.key, "utf8"),
      Buffer.from([0]),
      Buffer.from(goldRecordSha256, "ascii"),
      Buffer.from([0]),
      Buffer.from(transcriptSha256, "ascii"),
    ]),
  );
  const manifest = {
    schemaVersion: "gold-v2-transcript-manifest-v1",
    sources: {
      gold: { sizeBytes: goldBytes.length, sha256: sha256(goldBytes) },
      historyExport: {
        sizeBytes: historyBytes.length,
        sha256: sha256(historyBytes),
      },
    },
    entries: [{
      n: 1,
      key: historyRecord.key,
      goldIndex: 0,
      historyIndex: 0,
      ttl: historyRecord.ttl,
      transcriptBytesUtf8: transcriptBytes.length,
      transcriptSha256,
      goldRecordSha256,
      historyRecordSha256,
      bindingSha256,
    }],
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
  return { goldBytes, historyBytes, manifestBytes };
}

describe("Wave 1 locked benchmark bundle", () => {
  it("validates binding checksums and returns only redacted projections", () => {
    const fixture = syntheticBundle();
    const bundle = validateWave1BenchmarkBundle({
      ...fixture,
      expectedManifestSha256: sha256(fixture.manifestBytes),
      enforceOfficialCounts: false,
    });
    expect(bundle.summary).toMatchObject({
      boundCount: 1,
      includedCount: 1,
      excludedCount: 0,
      annotationCount: 1,
      bindingMismatchCount: 0,
    });
    expect(bundle.conversations[0]?.messages[0]).toMatchObject({
      role: "CUSTOMER",
      redactedText: "Chốt mẫu đen",
    });
    expect(bundle.conversations[0]?.annotations[0]).toMatchObject({
      labelCode: "BUYING_COMMITTED",
      confidence: "NOT_RECORDED",
      source: "ADJUDICATOR",
    });
    expect(JSON.stringify(bundle)).not.toContain("history:1");
  });

  it("rejects a tampered outer manifest", () => {
    const fixture = syntheticBundle();
    expect(() =>
      validateWave1BenchmarkBundle({
        ...fixture,
        expectedManifestSha256: "0".repeat(64),
        enforceOfficialCounts: false,
      })
    ).toThrow("WAVE1_MANIFEST_CHECKSUM_MISMATCH");
  });
});

describe("Wave 1 group-aware split", () => {
  it("keeps rare safety as an overlay and meets constrained holdout support", () => {
    const items = Array.from({ length: 30 }, (_unused, index) => ({
      conversationId: `conversation-${index}`,
      duplicateGroupId: index < 2 ? "shared" : null,
      labelCodes: new Set(index < 12 ? ["BUYING_NEGATED"] : []),
    }));
    const plan = assignBenchmarkSplits({
      items,
      targets: { DEVELOPMENT: 18, VALIDATION: 6, HOLDOUT: 6 },
      seed: "test-seed",
      minimumHoldoutSupport: { BUYING_NEGATED: 5 },
      rareSafetyLabels: new Set(["BUYING_NEGATED"]),
    });
    expect(plan.assignments.size).toBe(30);
    expect(plan.leakageGroupCount).toBe(0);
    expect(plan.rareSafetyConversationIds.size).toBe(12);
    expect(plan.labelSupport.BUYING_NEGATED?.holdout).toBeGreaterThanOrEqual(5);
    expect(plan.labelSupport.BUYING_NEGATED?.status).toBe("ELIGIBLE");
    expect(new Set(items.slice(0, 2).map(({ conversationId }) =>
      plan.assignments.get(conversationId)
    )).size).toBe(1);
  });
});

function conversation(): Wave1BenchmarkConversation {
  return {
    conversationId: "c".repeat(64),
    sourceOrdinal: 1,
    duplicateGroupId: "d".repeat(64),
    qualityFlags: [],
    startTruncated: false,
    messages: [{ turnIndex: 0, role: "CUSTOMER", redactedText: "Chốt size M" }],
    annotations: [{
      labelCode: "BUYING_COMMITTED",
      scope: "CUSTOMER_MESSAGE",
      turnIndex: 0,
      evidenceText: "Chốt size M",
      evidenceStart: 0,
      evidenceEnd: 11,
      derived: false,
      confidence: "NOT_RECORDED",
      source: "ADJUDICATOR",
      sourceVersion: "gold-v2",
      derivationVersion: null,
    }],
    labelCodes: new Set(["BUYING_COMMITTED"]),
  };
}

describe("Wave 1 semantic benchmark", () => {
  it("scores multilabel predictions, evidence and promotion deltas separately", () => {
    const fixture = conversation();
    const perfect = scoreSemanticBenchmark([fixture], [{
      conversationId: fixture.conversationId,
      labelCode: "BUYING_COMMITTED",
      scope: "CUSTOMER_MESSAGE",
      turnIndex: 0,
      evidenceText: "Chốt size M",
      confidence: "HIGH",
    }]);
    expect(perfect.labels.BUYING_COMMITTED?.f1).toBe(1);
    expect(perfect.evidenceValidityRate).toBe(1);

    const empty = scoreSemanticBenchmark([fixture], []);
    const gate = evaluateSemanticPromotion(empty, perfect, {
      safetyCriticalLabels: new Set(["BUYING_COMMITTED"]),
      targetedLabels: new Set(["BUYING_COMMITTED"]),
      minimumSupport: 1,
      defaultPrecision: 0.95,
      defaultRecall: 0.95,
      buyingNegatedPrecision: 0.98,
      maximumSafetyF1Regression: 0.01,
      minimumTargetF1Improvement: 0.03,
    });
    expect(gate.passed).toBe(true);
  });

  it("counts supported labels with no predictions as zero F1", () => {
    const fixture = conversation();
    const withMissedLabel: Wave1BenchmarkConversation = {
      ...fixture,
      annotations: [
        ...fixture.annotations,
        {
          ...fixture.annotations[0]!,
          labelCode: "PRICE_QUESTION",
        },
      ],
      labelCodes: new Set(["BUYING_COMMITTED", "PRICE_QUESTION"]),
    };
    const report = scoreSemanticBenchmark([withMissedLabel], [{
      conversationId: fixture.conversationId,
      labelCode: "BUYING_COMMITTED",
      scope: "CUSTOMER_MESSAGE",
      turnIndex: 0,
      evidenceText: "Chốt size M",
      confidence: "HIGH",
    }]);
    expect(report.labels.PRICE_QUESTION?.f1).toBe(0);
    expect(report.macroF1).toBe(0.5);
  });
});

describe("Wave 1 current deterministic baseline", () => {
  it("scores development without opening locked holdout", () => {
    const fixture = syntheticBundle();
    const bundle = validateWave1BenchmarkBundle({
      ...fixture,
      expectedManifestSha256: sha256(fixture.manifestBytes),
      enforceOfficialCounts: false,
    });
    const conversationId = bundle.conversations[0]!.conversationId;
    const split = {
      schemaVersion: 1 as const,
      seed: "test",
      assignments: new Map([[conversationId, "DEVELOPMENT" as const]]),
      rareSafetyConversationIds: new Set<string>(),
      counts: { DEVELOPMENT: 1, VALIDATION: 0, HOLDOUT: 0 },
      labelSupport: {},
      leakageGroupCount: 0 as const,
      splitChecksum: "test-checksum",
    };
    const runManifest = {
      schemaVersion: 1,
      benchmarkVersion: "wave1-benchmark-v1",
      dataset: {
        manifestSha256: bundle.summary.manifestSha256,
        goldSha256: bundle.summary.goldSha256,
        historySha256: bundle.summary.historySha256,
        includedCount: 1,
        excludedCount: 0,
        splitChecksum: "test-checksum",
      },
      versions: {
        parser: "redis-transcript-v1",
        normalization: "test",
        redaction: "test",
        labelSchema: "test",
        semanticScorer: "wave1-semantic-scorer-v1",
        runtimePolicyScorer: "wave1-runtime-policy-scorer-v1",
        replyQualityScorer: "wave1-reply-quality-scorer-v1",
      },
      splitSeed: "test",
      runFingerprint: "test-fingerprint",
    } satisfies Wave1BenchmarkRunManifest;
    const report = buildWave1CurrentBaseline({ bundle, split, runManifest });
    expect(report.layers.semantic.development.labels.BUYING_COMMITTED?.f1).toBe(1);
    expect(report.layers.semantic.validation.conversationCount).toBe(0);
    expect(report.layers.runtimePolicy.status).toBe("PENDING_RECORDED_FIXTURES");
  });
});

describe("Wave 1 runtime policy benchmark", () => {
  it("reports hard safety independently for oracle and model modes", () => {
    const report = scoreRuntimePolicyBenchmark([{
      fixtureId: "committed-no-reply",
      mode: "ORACLE_SEMANTICS",
      effectiveLabels: ["BUYING_COMMITTED"],
      prerequisitesSatisfied: true,
      expectation: { allowedActions: ["REPLY"] },
      observation: {
        action: "NO_REPLY",
        nextStage: "READY_TO_BUY",
        requestedPii: false,
        checkoutStarted: false,
        orderIntentCount: 0,
        outboundCount: 0,
        sideEffectCount: 0,
        sideEffectsAuthorized: false,
        ownershipAuthorized: true,
        handoffReason: null,
        factEnvelopeId: null,
        factClaims: [],
      },
    }], "ORACLE_SEMANTICS");
    expect(report.hardSafetyViolationCount).toBe(1);
    expect(report.violations.map(({ code }) => code)).toContain(
      "BUYING_COMMITTED_NO_REPLY",
    );
  });
});

describe("Wave 1 reply quality benchmark", () => {
  it("separates deterministic hard safety from quality failures", () => {
    const report = scoreReplyQualityBenchmark([{
      fixtureId: "reply-1",
      redactedReply: "Chị cho em xin số điện thoại nhé",
      previousShopReplies: [],
      answersQuestion: false,
      ctaAppropriate: false,
      requestedPii: true,
      piiRequestAllowed: false,
      objectionPresent: true,
      objectionResolved: false,
      actionAllowed: true,
      factEnvelopeId: null,
      factClaims: [],
    }]);
    expect(report.hardSafetyViolationCount).toBe(1);
    expect(report.qualityViolationCount).toBe(3);
    expect(report.violations.map(({ code }) => code)).toContain(
      "PREMATURE_PII_REQUEST",
    );
  });
});
