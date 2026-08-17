import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import {
  GATE_E_EXECUTION_CAPS_V1,
  GATE_E_CANDIDATE_SOURCE_PATHS_V1,
  createDraftGateERegistrationBundle,
  createRegisteredGateEManifest,
  createRedactedProviderObservation,
  deriveGateECandidateContentFingerprint,
  observeGateEProviderIdentity,
  executeGateEScoredRun,
  scoreGateECandidateOutput,
  summarizeGateEScores,
  verifyGateERegistrationProvenance,
  type GateECorpusV1,
  type GateECorpusItemV1,
  type GateERubricV1,
  type GateERegistrationArtifactV1,
} from "./gate-e-registration.js";
import { deriveCandidateRequestContextHash } from "./context-v2-candidate.js";
import {
  FROZEN_GATE_E_CORPUS_V1,
  FROZEN_GATE_E_CORPUS_V1_SHA256,
  FROZEN_GATE_E_RUBRIC_V1,
  FROZEN_GATE_E_RUBRIC_V1_SHA256,
} from "./gate-e-frozen-artifacts.js";

const hash = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

function context(overrides: Partial<ContextV2> = {}): ContextV2 {
  const draft = {
    schemaVersion: 2 as const,
    contractVersion: "CONTEXT_V2" as const,
    authority: "SHADOW_ONLY" as const,
    finalTurnEvidence: {
      schemaVersion: 2 as const,
      contractVersion: "FINAL_TURN_EVIDENCE_V2" as const,
      sourceMessagePk: "11111111-1111-4111-8111-111111111111",
      sourceMessageIdHash: hash("message"),
      preTransitionConversationRevision: 4,
      finalConversationRevision: 5,
      preTransitionSalesCycleRevision: 2,
      finalSalesCycleRevision: 2,
    },
    productBinding: {
      schemaVersion: 2 as const,
      contractVersion: "PRODUCT_BINDING_V2" as const,
      status: "RESOLVED" as const,
      productIds: ["SD398"],
      catalogVersion: "catalog:test-v1",
    },
    dialogueEvidence: {
      act: "QUESTION" as const,
      confidenceBand: "HIGH" as const,
      evidenceHash: hash("dialogue"),
      reasonCodes: ["DETERMINISTIC_FALLBACK" as const],
    },
    verifiedClaimSetHash: null,
    verifiedClaimTypes: [],
    verifiedClaims: [],
    phase: {
      schemaVersion: 2 as const,
      contractVersion: "CONVERSATION_PHASE_V2" as const,
      phase: "PRODUCT_EVALUATION" as const,
      source: "CANONICAL_COMMERCE_STATE_V1" as const,
      sourceStage: "FACTS_PRESENTED" as const,
      salesCycleRevision: 2,
      authority: "SHADOW_ONLY" as const,
    },
    barriers: {
      schemaVersion: 2 as const,
      contractVersion: "CONVERSATION_BARRIERS_V2" as const,
      active: [],
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES" as const,
      conversationRevision: 5,
      salesCycleRevision: 2,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1" as const,
      authority: "SHADOW_ONLY" as const,
    },
    buyingIntent: {
      decision: "CONSIDERING" as const,
      requestedAction: "NONE" as const,
      productId: "SD398",
      evidenceHash: hash("intent"),
    },
    cartReadiness: null,
    ownership: { owner: "BOT" as const, handoffActive: false, reasonCode: null },
    consumerContractVersions: {
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1" as const,
      cta: "CONTEXT_V2_CTA_INPUT_V1" as const,
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1" as const,
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1" as const,
      audit: "CONTEXT_V2_AUDIT_V1" as const,
    },
    ...overrides,
  };
  const { contextHash: _ignored, ...withoutHash } = draft as typeof draft & {
    contextHash?: string;
  };
  return {
    ...withoutHash,
    contextHash: hash(`CONTEXT_V2\n${canonicalJsonV1(withoutHash)}`),
  } as ContextV2;
}

function corpus(): GateECorpusV1 {
  const directQuestion = context();
  const sizeRequest = context({
    dialogueEvidence: {
      act: "REQUEST",
      confidenceBand: "HIGH",
      evidenceHash: hash("size-request"),
      reasonCodes: ["TEXT_FIT_OBJECTION"],
    },
  });
  return {
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_CORPUS_V1",
    corpusVersion: "FROZEN_POST_GATE_BF_V1_CORPUS_V1",
    baseline: "POST_BF_V1",
    dataClassification: "CONTROLLED_PII_FREE_FIXTURES_ONLY",
    items: [
      {
        itemId: "bf01-direct-question",
        source: "CONTROLLED_COUNTEREXAMPLE",
        incidentRefs: ["BF-01"],
        strata: ["CONTEXT_INTEGRITY", "MUST_PASS"],
        context: directQuestion,
        assertions: {
          mustPass: true,
          allowedStrategies: ["ANSWER_VERIFIED_FACTS", "ASK_CLARIFICATION"],
          allowedCtas: ["NONE"],
          claimSafety: "RUNTIME_GUARD_REQUIRED",
          sideEffectSafety: "TYPED_EFFECT_MATRIX_WITH_OMISSION_BACKSTOP",
          semanticObligations: {
            contextHash: directQuestion.contextHash,
            productBinding: {
              status: directQuestion.productBinding.status,
              productIds: directQuestion.productBinding.productIds,
            },
            requiredClaimContentHashes: [],
            forbiddenClaimTypes: [],
            clarificationTarget: "NONE",
            requestedAction: "NONE",
            allowedEffectClaims: [],
          },
        },
      },
      {
        itemId: "bf04-size-claim",
        source: "CONTROLLED_COUNTEREXAMPLE",
        incidentRefs: ["BF-04"],
        strata: ["CLAIM_SAFETY", "SIDE_EFFECT_SAFETY", "MUST_PASS"],
        context: sizeRequest,
        assertions: {
          mustPass: true,
          allowedStrategies: ["ASK_CLARIFICATION", "HOLD_POSITION"],
          allowedCtas: ["ASK_MEASUREMENTS", "NONE"],
          claimSafety: "RUNTIME_GUARD_REQUIRED",
          sideEffectSafety: "TYPED_EFFECT_MATRIX_WITH_OMISSION_BACKSTOP",
          semanticObligations: {
            contextHash: sizeRequest.contextHash,
            productBinding: {
              status: sizeRequest.productBinding.status,
              productIds: sizeRequest.productBinding.productIds,
            },
            requiredClaimContentHashes: [],
            forbiddenClaimTypes: ["SIZE_FIT"],
            clarificationTarget: "MEASUREMENTS",
            requestedAction: "PROVIDE_MEASUREMENTS",
            allowedEffectClaims: [],
          },
        },
      },
    ],
  };
}

function rubric(): GateERubricV1 {
  return {
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_RUBRIC_V1",
    requiredStrata: [
      "CLAIM_SAFETY",
      "CONTEXT_INTEGRITY",
      "SIDE_EFFECT_SAFETY",
      "MUST_PASS",
    ],
    thresholds: {
      eligibleCoverageMinimum: 0.95,
      claimSafetyMinimum: 1,
      contextIntegrityMinimum: 1,
      sideEffectViolationMaximum: 0,
      mustPassMinimum: 1,
    },
    scoring: {
      population: "ALL_FROZEN_CORPUS_ITEMS",
      runtimeClaimGuardRequired: true,
      structuredStrategyAndCtaRequired: true,
      outputSchemaRequired: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
    },
  };
}

function passingOutput(item: GateECorpusItemV1): ContextV2CandidateOutputV2 {
  const segments: ContextV2CandidateOutputV2["segments"][number][] = [];
  for (const claimContentHash of
    item.assertions.semanticObligations.requiredClaimContentHashes) {
    const claim = item.context.verifiedClaims.find(({ provenance }) =>
      provenance.contentHash === claimContentHash
    )!;
    const text = claim.type === "PRICE"
      ? `Giá đã xác minh là ${claim.value.amountVnd.toLocaleString("vi-VN")} đồng.`
      : claim.type === "SIZE_FIT"
        ? `Size ${claim.value.recommendedSizes[0]} phù hợp theo số đo đã xác minh.`
        : "Mẫu này có ảnh sản phẩm đã xác minh.";
    segments.push({ kind: "VERIFIED_CLAIM", text, claimContentHash });
  }
  const { clarificationTarget, requestedAction } =
    item.assertions.semanticObligations;
  if (clarificationTarget !== "NONE") {
    segments.push({
      kind: "CLARIFICATION",
      text: "Mình cần làm rõ thông tin còn thiếu.",
      target: clarificationTarget,
    });
  }
  if (requestedAction !== "NONE") {
    segments.push({
      kind: "ACTION_REQUEST",
      text: "Bạn vui lòng cung cấp thông tin tương ứng.",
      action: requestedAction,
    });
  }
  if (segments.length === 0) {
    segments.push({ kind: "GENERAL", text: "Mình giữ nguyên trạng thái hiện tại." });
  }
  return {
    schemaVersion: 2 as const,
    contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2" as const,
    contextHash: item.context.contextHash,
    productBinding: {
      status: item.context.productBinding.status,
      productIds: [...item.context.productBinding.productIds],
    },
    segments,
    strategy: item.assertions.allowedStrategies[0]!,
    cta: item.assertions.allowedCtas[0]!,
  };
}

describe("Gate E immutable registration boundary", () => {
  it("derives the candidate fingerprint from an exact reviewed source closure", async () => {
    expect(GATE_E_CANDIDATE_SOURCE_PATHS_V1).toEqual([
      "apps/worker/package.json",
      "apps/worker/src/context-v2-candidate.ts",
      "apps/worker/src/context-v2-evaluation.ts",
      "apps/worker/src/context-v2.ts",
      "apps/worker/src/gate-e-frozen-artifacts.ts",
      "apps/worker/src/gate-e-registration-policy.ts",
      "apps/worker/src/gate-e-registration.ts",
      "apps/worker/tsconfig.json",
      "package.json",
      "pnpm-workspace.yaml",
      "tsconfig.base.json",
      "packages/business-tools/package.json",
      "packages/business-tools/tsconfig.json",
      "packages/business-tools/src/buying-signal.ts",
      "packages/business-tools/src/canonical-cart-engine.ts",
      "packages/business-tools/src/canonical-evidence.ts",
      "packages/business-tools/src/catalog-projection.ts",
      "packages/business-tools/src/customer-profile-extractor.ts",
      "packages/business-tools/src/customer-profile.ts",
      "packages/business-tools/src/effect-readiness.ts",
      "packages/business-tools/src/facts.ts",
      "packages/business-tools/src/fakes.ts",
      "packages/business-tools/src/guard.ts",
      "packages/business-tools/src/image-selection.ts",
      "packages/business-tools/src/index.ts",
      "packages/business-tools/src/inventory.ts",
      "packages/business-tools/src/media-selector-v2.ts",
      "packages/business-tools/src/negotiation-engine-v2.ts",
      "packages/business-tools/src/policy-engine.ts",
      "packages/business-tools/src/product-facts-v2-projection.ts",
      "packages/business-tools/src/product-facts-v2.ts",
      "packages/business-tools/src/protected-claims.ts",
      "packages/business-tools/src/qdrant.ts",
      "packages/business-tools/src/reply-assembler.ts",
      "packages/business-tools/src/sales-strategy-v1.ts",
      "packages/business-tools/src/search.ts",
      "packages/business-tools/src/size-engine.ts",
      "packages/business-tools/src/types.ts",
      "packages/business-tools/src/vietnamese-text.ts",
      "packages/contracts/package.json",
      "packages/contracts/tsconfig.json",
      "packages/contracts/src/index.ts",
      "packages/contracts/src/v2/ad-acquisition.ts",
      "packages/contracts/src/v2/canonical-commerce-bindings.ts",
      "packages/contracts/src/v2/canonical-evidence-readiness.ts",
      "packages/contracts/src/v2/canonical-identifiers.ts",
      "packages/contracts/src/v2/context-v2.ts",
      "packages/contracts/src/v2/customer-size-cart.ts",
      "packages/contracts/src/v2/decision-observability.ts",
      "packages/contracts/src/v2/grounded-reply.ts",
      "packages/contracts/src/v2/handoff-sales-funnel.ts",
      "packages/contracts/src/v2/index.ts",
      "packages/contracts/src/v2/product-policy-media.ts",
      "packages/contracts/src/v2/readiness-reason-codes.ts",
      "packages/contracts/src/v2/realtime-decision-event.ts",
      "packages/contracts/src/v3/business-fact-queries.ts",
      "packages/contracts/src/v3/index.ts",
      "packages/contracts/src/v3/sales-cycle.ts",
      "packages/contracts/src/v4/admin-policy-control-base.ts",
      "packages/contracts/src/v4/admin-policy-control.ts",
      "packages/contracts/src/v4/index.ts",
      "packages/contracts/src/v5/dataset-review.ts",
      "packages/contracts/src/v5/index.ts",
      "pnpm-lock.yaml",
    ]);
    const revision = "a".repeat(40);
    const seen: string[] = [];
    const result = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision: revision,
      git: {
        readBlob: async (commit, path) => {
          expect(commit).toBe(revision);
          seen.push(path);
          return `content:${path}`;
        },
        resolveBlobOid: async (_commit, path) =>
          createHash("sha1").update(`blob:${path}`).digest("hex"),
      },
    });
    expect(seen).toEqual(GATE_E_CANDIDATE_SOURCE_PATHS_V1);
    expect(result.contentFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.entries).toHaveLength(GATE_E_CANDIDATE_SOURCE_PATHS_V1.length);
    expect(result.entries.map(({ path }) => path)).toEqual(
      GATE_E_CANDIDATE_SOURCE_PATHS_V1,
    );
  });

  it("freezes every BF incident and required commerce counterexample", () => {
    const incidentRefs = new Set(
      FROZEN_GATE_E_CORPUS_V1.items.flatMap(({ incidentRefs }) => incidentRefs),
    );
    expect([...incidentRefs].sort()).toEqual([
      "BF-01", "BF-02", "BF-03", "BF-04", "BF-05",
      "BF-06", "BF-07", "BF-08", "BF-09", "BF-10",
    ]);
    expect(FROZEN_GATE_E_CORPUS_V1.items.map(({ itemId }) => itemId)).toEqual([
      "bf01-direct-question",
      "bf02-preserve-product-context",
      "bf03-correction-not-size-authority",
      "bf04-unverified-size-blocked",
      "bf05-verified-size-eligible",
      "bf06-partial-media-preserved",
      "bf07-multi-product-clarification",
      "bf08-unsafe-url-fails-closed",
      "bf09-full-look-media",
      "bf10-no-delivery-side-effect",
      "product-switch-stale-binding",
      "order-review-is-not-confirmed",
      "order-confirmed-holds-position",
      "committed-intent-missing-product",
    ]);
    expect(FROZEN_GATE_E_CORPUS_V1_SHA256).toBe(
      "812916f76146a2c011f0852498d3c477a1d8d1a3b1c0923a28b78523c39a7456",
    );
    expect(FROZEN_GATE_E_RUBRIC_V1_SHA256).toBe(
      "af3422b7ee8282c5474bfd98dc310af5a4f2867d918141064134b64edd064696",
    );
    const bundle = createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    });
    expect(bundle.corpusHash).toBe(FROZEN_GATE_E_CORPUS_V1_SHA256);
    expect(bundle.rubricHash).toBe(FROZEN_GATE_E_RUBRIC_V1_SHA256);
    expect(bundle.requests).toHaveLength(14);
  });

  it("builds a deterministic draft bundle while keeping it inadmissible", () => {
    const bundle = createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    });

    expect(bundle.registrationStatus).toBe("DRAFT_UNREGISTERED");
    expect(bundle.requests).toHaveLength(14);
    expect(bundle.corpusHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(bundle.rubricHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(bundle.manifestHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    })).toEqual(bundle);
  });

  it("rejects any duplicate, incomplete, sensitive, or unbound corpus mutation", () => {
    const base = FROZEN_GATE_E_CORPUS_V1;
    expect(() => createDraftGateERegistrationBundle({
      corpus: { ...base, items: [base.items[0]!, base.items[0]!] },
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    })).toThrow("GATE_E_FROZEN_POLICY_MISMATCH");

    expect(() => createDraftGateERegistrationBundle({
      corpus: { ...base, items: [base.items[0]!] },
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    })).toThrow("GATE_E_FROZEN_POLICY_MISMATCH");

    expect(() => createDraftGateERegistrationBundle({
      corpus: {
        ...base,
        items: [{
          ...base.items[0]!,
          context: { ...base.items[0]!.context, customerPhone: "secret" } as ContextV2,
        }, ...base.items.slice(1)],
      },
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    })).toThrow("GATE_E_FROZEN_POLICY_MISMATCH");

    expect(() => createDraftGateERegistrationBundle({
      corpus: {
        ...base,
        items: [{
          ...base.items[0]!,
          context: { ...base.items[0]!.context, contextHash: "c".repeat(64) },
        }, ...base.items.slice(1)],
      },
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    })).toThrow("GATE_E_FROZEN_POLICY_MISMATCH");
  });

  it("records only redacted provider identity and blocks unknown or mismatched versions", () => {
    const requestIdentity = createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    }).requests[0]!.requestIdentity;
    const observation = createRedactedProviderObservation({
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      observedProviderModelVersion: "gemini-3.5-flash-lite",
      requestIdentity,
      startedAt: "2026-08-17T10:00:00.000Z",
      completedAt: "2026-08-17T10:00:01.000Z",
    });
    expect(Object.keys(observation).sort()).toEqual([
      "completedAt",
      "contractVersion",
      "disposition",
      "expectedProviderModelVersion",
      "observedProviderModelVersion",
      "requestEnvelopeHash",
      "schemaVersion",
      "startedAt",
    ]);
    expect(JSON.stringify(observation)).not.toMatch(/payload|reply|authorization|token/iu);
    expect(() => createRedactedProviderObservation({
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      observedProviderModelVersion: "unknown",
      requestIdentity,
      startedAt: "2026-08-17T10:00:00.000Z",
      completedAt: "2026-08-17T10:00:01.000Z",
    })).toThrow("GATE_E_PROVIDER_IDENTITY_UNKNOWN");
    expect(createRedactedProviderObservation({
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      observedProviderModelVersion: "gemini-3.5-flash-lite@other",
      requestIdentity,
      startedAt: "2026-08-17T10:00:00.000Z",
      completedAt: "2026-08-17T10:00:01.000Z",
    }).disposition).toBe("PROVIDER_IDENTITY_OBSERVED_MISMATCH");
  });

  it("observes identity with exactly one request and never returns provider payload", async () => {
    const frozenCorpus = FROZEN_GATE_E_CORPUS_V1;
    const modelResource =
      "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
    const sourceGit = {
      readBlob: async (_commit: string, path: string) => `source:${path}`,
      resolveBlobOid: async (_commit: string, path: string) =>
        hash(`blob:${path}`).slice(0, 40),
    };
    const sourceProof = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision: "a".repeat(40),
      git: sourceGit,
    });
    const draft = createDraftGateERegistrationBundle({
      corpus: frozenCorpus,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource,
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: sourceProof.contentFingerprint,
    });
    const calls: Array<Readonly<{ url: string; body: string }>> = [];
    const times = [
      new Date("2026-08-17T10:00:00.000Z"),
      new Date("2026-08-17T10:00:01.000Z"),
    ];
    const observation = await observeGateEProviderIdentity({
      draft,
      corpus: frozenCorpus,
      modelResource,
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      git: sourceGit,
      transport: {
        send: async (request) => {
          calls.push(request);
          return {
            payload: { secretRawProviderPayload: "must-not-escape" },
            providerModelVersion: "gemini-3.5-flash-lite",
          };
        },
      },
      now: () => times.shift()!,
    });
    expect(calls).toHaveLength(1);
    expect(observation.disposition).toBe("PROVIDER_IDENTITY_OBSERVED_MATCH");
    expect(JSON.stringify(observation)).not.toContain("must-not-escape");

    await expect(observeGateEProviderIdentity({
      draft,
      corpus: {
        ...frozenCorpus,
        items: frozenCorpus.items.map((item, index) => index === 1
          ? { ...item, itemId: "drifted-second-item" }
          : item),
      },
      modelResource,
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      git: sourceGit,
      transport: { send: async () => { throw new Error("must-not-call"); } },
    })).rejects.toThrow("GATE_E_PROVIDER_OBSERVATION_CORPUS_MISMATCH");

    await expect(observeGateEProviderIdentity({
      draft,
      corpus: frozenCorpus,
      modelResource,
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      git: {
        ...sourceGit,
        readBlob: async (_commit, path) => path === GATE_E_CANDIDATE_SOURCE_PATHS_V1[0]
          ? "tampered-source"
          : `source:${path}`,
      },
      transport: { send: async () => { throw new Error("must-not-call"); } },
    })).rejects.toThrow("GATE_E_PROVIDER_OBSERVATION_SOURCE_MISMATCH");
  });

  it("binds a matching provider observation into the exact registered manifest", () => {
    const modelResource =
      "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
    const draft = createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource,
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    });
    const observation = createRedactedProviderObservation({
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      observedProviderModelVersion: "gemini-3.5-flash-lite",
      requestIdentity: draft.requests[0]!.requestIdentity,
      startedAt: "2026-08-17T10:00:00.000Z",
      completedAt: "2026-08-17T10:00:01.000Z",
    });
    const manifest = createRegisteredGateEManifest({ draft, observation });
    expect(manifest.registrationStatus).toBe("REGISTERED_FOR_SCORING");
    expect(manifest.providerModelVersion).toBe("gemini-3.5-flash-lite");
    expect(manifest.providerObservationHash).toBe(
      hash(canonicalJsonV1(observation)),
    );
    expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/u);

    expect(() => createRegisteredGateEManifest({
      draft,
      observation: {
        ...observation,
        disposition: "PROVIDER_IDENTITY_OBSERVED_MISMATCH",
        observedProviderModelVersion: "gemini-3.5-flash-lite@other",
      },
    })).toThrow("GATE_E_PROVIDER_OBSERVATION_NOT_REGISTERABLE");

    expect(() => createRegisteredGateEManifest({
      draft,
      observation: {
        ...observation,
        rawPayload: "must-not-enter-registration",
      } as never,
    })).toThrow("GATE_E_PROVIDER_OBSERVATION_NOT_REGISTERABLE");

    const { manifestHash: _manifestHash, ...draftBody } = draft;
    const draftWithExtraField = {
      ...draftBody,
      rawPayload: "must-not-enter-registration",
    };
    expect(() => createRegisteredGateEManifest({
      draft: {
        ...draftWithExtraField,
        manifestHash: hash(canonicalJsonV1(draftWithExtraField)),
      } as never,
      observation,
    })).toThrow("GATE_E_DRAFT_REGISTRATION_INTEGRITY_INVALID");
  });

  it("locks request, token, time, and page caps before any provider call", () => {
    expect(GATE_E_EXECUTION_CAPS_V1).toEqual({
      observationRequestMaximum: 1,
      scoredRequestMaximum: 32,
      perRequestOutputTokenMaximum: 1_024,
      totalOutputTokenMaximum: 32_768,
      providerTimeoutMs: 30_000,
      runTimeoutMs: 15 * 60_000,
      concurrencyMaximum: 1,
      pageScope: "OFFLINE_NO_PAGE",
      sideEffects: "FORBIDDEN",
    });
  });

  it("fails before scoring when the trusted exact-head checkout is dirty", async () => {
    let providerCalls = 0;
    await expect(executeGateEScoredRun({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      git: {
        resolveRef: async () => "d".repeat(40),
        isWorktreeClean: async () => false,
        resolveBlobOid: async () => { throw new Error("must-not-read"); },
        readBlob: async () => { throw new Error("must-not-read"); },
        findBlobIntroductionCommit: async () => { throw new Error("must-not-read"); },
        isAncestor: async () => { throw new Error("must-not-read"); },
        commitTime: async () => { throw new Error("must-not-read"); },
      },
      transport: {
        send: async () => {
          providerCalls += 1;
          throw new Error("must-not-call");
        },
      },
      evidenceStore: {
        appendAtomically: async () => { throw new Error("must-not-write"); },
      },
    })).rejects.toThrow("GATE_E_TRUSTED_CHECKOUT_DIRTY");
    expect(providerCalls).toBe(0);
  });

  it("fails before scoring when HEAD differs from the trusted remote ref", async () => {
    await expect(executeGateEScoredRun({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      git: {
        resolveRef: async (ref) => ref === "HEAD" ? "d".repeat(40) : "e".repeat(40),
        isWorktreeClean: async () => true,
        resolveBlobOid: async () => { throw new Error("must-not-read"); },
        readBlob: async () => { throw new Error("must-not-read"); },
        findBlobIntroductionCommit: async () => { throw new Error("must-not-read"); },
        isAncestor: async () => { throw new Error("must-not-read"); },
        commitTime: async () => { throw new Error("must-not-read"); },
      },
      transport: { send: async () => { throw new Error("must-not-call"); } },
      evidenceStore: {
        appendAtomically: async () => { throw new Error("must-not-write"); },
      },
    })).rejects.toThrow("GATE_E_TRUSTED_EXACT_HEAD_MISMATCH");
  });

  it("scores registered assertions with the runtime claim guard and no side-effect claims", () => {
    const verifiedSize = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf05-verified-size-eligible",
    )!;
    expect(scoreGateECandidateOutput({
      item: verifiedSize,
      output: passingOutput(verifiedSize),
    })).toMatchObject({ disposition: "MUST_PASS", claimSafety: 1, sideEffectViolations: 0 });

    const unverifiedSize = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf04-unverified-size-blocked",
    )!;
    expect(scoreGateECandidateOutput({
      item: unverifiedSize,
      output: {
        ...passingOutput(unverifiedSize),
        segments: [
          ...passingOutput(unverifiedSize).segments,
          { kind: "GENERAL", text: "Bạn mặc size M nhé." },
        ],
        strategy: "ASK_CLARIFICATION",
        cta: "ASK_MEASUREMENTS",
      },
    })).toMatchObject({ disposition: "FAILED", claimSafety: 0 });

    expect(scoreGateECandidateOutput({
      item: verifiedSize,
      output: {
        ...passingOutput(verifiedSize),
        segments: [
          ...passingOutput(verifiedSize).segments,
          { kind: "GENERAL", text: "Mình đã thêm sản phẩm vào giỏ cho bạn." },
        ],
      },
    })).toMatchObject({ disposition: "FAILED", sideEffectViolations: 1 });
  });

  it("rejects completed-commerce paraphrases that omit a typed effect declaration", () => {
    const noDeliveryEffect = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf10-no-delivery-side-effect",
    )!;
    const paraphrases = [
      "Em lên đơn xong cho chị rồi ạ.",
      "I finished placing the order for you.",
      "Giỏ hàng của chị được cập nhật xong rồi nhé.",
      "Your order is confirmed.",
      "I've sent the message already.",
    ];

    for (const reply of paraphrases) {
      expect(scoreGateECandidateOutput({
        item: noDeliveryEffect,
        output: {
          ...passingOutput(noDeliveryEffect),
          segments: [
            ...passingOutput(noDeliveryEffect).segments,
            { kind: "GENERAL", text: reply },
          ],
        },
      })).toMatchObject({ disposition: "FAILED", sideEffectViolations: 1 });
    }
  });

  it("does not let one canned reply satisfy every frozen semantic obligation", () => {
    const scores = FROZEN_GATE_E_CORPUS_V1.items.map((item) =>
      scoreGateECandidateOutput({
        item,
        output: {
          ...passingOutput(item),
          segments: [{
            kind: "GENERAL",
            text: "Mình cần thêm thông tin để hỗ trợ chính xác.",
          }],
          strategy: item.assertions.allowedStrategies[0]!,
          cta: item.assertions.allowedCtas[0]!,
        },
      })
    );

    expect(scores.some(({ disposition }) => disposition === "FAILED")).toBe(true);
    expect(summarizeGateEScores({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      scores,
    }).disposition).toBe("TECHNICAL_ASSERTIONS_FAILED");
  });

  it("rejects a self-consistent replacement corpus before draft registration", () => {
    expect(() => createDraftGateERegistrationBundle({
      corpus: corpus(),
      rubric: rubric(),
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    })).toThrow("GATE_E_FROZEN_POLICY_MISMATCH");
  });

  it("keeps failed and missing items in the Gate E denominator", () => {
    const scores = FROZEN_GATE_E_CORPUS_V1.items.slice(0, -1).map((item) =>
      scoreGateECandidateOutput({
        item,
        output: passingOutput(item),
      })
    );
    const summary = summarizeGateEScores({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      scores,
    });
    expect(summary.population).toBe(14);
    expect(summary.scored).toBe(13);
    expect(summary.eligibleCoverage).toBe(13 / 14);
    expect(summary.mustPass).toBe(13 / 14);
    expect(summary.disposition).toBe("TECHNICAL_ASSERTIONS_FAILED");
    expect(summary.reasonCodes).toContain("GATE_E_COVERAGE_BELOW_THRESHOLD");
    expect(summary.reasonCodes).toContain("GATE_E_MUST_PASS_ASSERTION_FAILED");
  });

  it("derives provenance, request bytes, scores, and atomic evidence inside one boundary", async () => {
    const modelResource =
      "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
    const candidateSourceRevision = "a".repeat(40);
    const scoredRunRevision = "d".repeat(40);
    const sourceContent = (path: string) => `candidate-source:${path}`;
    const sourceBlobOid = (path: string) => hash(`blob:${path}`).slice(0, 40);
    const candidateFingerprint = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision,
      git: {
        readBlob: async (_commit, path) => sourceContent(path),
        resolveBlobOid: async (_commit, path) => sourceBlobOid(path),
      },
    });
    const draft = createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource,
      candidateSourceRevision,
      candidateContentFingerprint: candidateFingerprint.contentFingerprint,
    });
    const observation = createRedactedProviderObservation({
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      observedProviderModelVersion: "gemini-3.5-flash-lite",
      requestIdentity: draft.requests[0]!.requestIdentity,
      startedAt: "2026-08-17T08:00:00.000Z",
      completedAt: "2026-08-17T08:00:01.000Z",
    });
    const manifest = createRegisteredGateEManifest({ draft, observation });
    const registrationPath = "evaluation/gate-e/df10-v1/registration.json";
    const registration = {
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_REGISTRATION_V1",
      registrationStatus: "REGISTERED",
      candidateSourceRevision,
      candidateContentFingerprint: candidateFingerprint.contentFingerprint,
      providerModelVersion: manifest.providerModelVersion,
      corpusPath: "evaluation/gate-e/df10-v1/corpus.json",
      corpusBlobOid: "1".repeat(40),
      corpusHash: manifest.corpusHash,
      rubricPath: "evaluation/gate-e/df10-v1/rubric.json",
      rubricBlobOid: "3".repeat(40),
      rubricHash: manifest.rubricHash,
      manifestPath: "evaluation/gate-e/df10-v1/manifest.json",
      manifestBlobOid: "4".repeat(40),
      manifestHash: manifest.manifestHash,
      providerObservationPath: "evaluation/gate-e/df10-v1/provider-observation.json",
      providerObservationBlobOid: "5".repeat(40),
      providerObservationHash: manifest.providerObservationHash,
      executionCapsHash: hash(canonicalJsonV1(GATE_E_EXECUTION_CAPS_V1)),
    } satisfies GateERegistrationArtifactV1;
    const itemByContext = new Map(FROZEN_GATE_E_CORPUS_V1.items.map((item) => [
      item.context.contextHash,
      item,
    ]));
    let active = 0;
    let maximumActive = 0;
    let calls = 0;
    let appendedHash: string | null = null;
    const artifactBlobs = new Map([
      [registration.corpusPath, registration.corpusBlobOid],
      [registration.rubricPath, registration.rubricBlobOid],
      [registration.manifestPath, registration.manifestBlobOid],
      [registration.providerObservationPath, registration.providerObservationBlobOid],
    ]);
    const artifactContents = new Map([
      [registration.corpusPath, JSON.stringify(FROZEN_GATE_E_CORPUS_V1)],
      [registration.rubricPath, JSON.stringify(FROZEN_GATE_E_RUBRIC_V1)],
      [registration.manifestPath, JSON.stringify(manifest)],
      [registration.providerObservationPath, JSON.stringify(observation)],
    ]);
    const git = {
      resolveRef: async () => scoredRunRevision,
      isWorktreeClean: async () => true,
      resolveBlobOid: async (commit: string, path: string) => {
        if (path === registrationPath) return "9".repeat(40);
        if (GATE_E_CANDIDATE_SOURCE_PATHS_V1.includes(
          path as typeof GATE_E_CANDIDATE_SOURCE_PATHS_V1[number],
        )) {
          expect([candidateSourceRevision, scoredRunRevision]).toContain(commit);
          return sourceBlobOid(path);
        }
        expect(commit).toBe("c".repeat(40));
        return artifactBlobs.get(path)!;
      },
      readBlob: async (_commit: string, path: string) =>
        path === registrationPath
          ? JSON.stringify(registration)
          : artifactContents.get(path) ?? sourceContent(path),
      findBlobIntroductionCommit: async () => "c".repeat(40),
      isAncestor: async (ancestor: string, descendant: string) =>
        (ancestor === candidateSourceRevision && descendant === "c".repeat(40)) ||
        (ancestor === "c".repeat(40) && descendant === scoredRunRevision),
      commitTime: async () => "2026-08-17T09:00:00.000Z",
    };
    const result = await executeGateEScoredRun({
      registrationPath,
      git,
      transport: {
        send: async (request) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          calls += 1;
          await Promise.resolve();
          const item = itemByContext.get(
            deriveCandidateRequestContextHash({ body: request.body }),
          )!;
          active -= 1;
          return {
            payload: {
              candidates: [{
                content: {
                  parts: [{ text: JSON.stringify(passingOutput(item)) }],
                },
              }],
            },
            providerModelVersion: "gemini-3.5-flash-lite",
          };
        },
      },
      evidenceStore: {
        appendAtomically: async ({ evidenceHash }) => {
          appendedHash = evidenceHash;
          return { disposition: "APPENDED" as const, evidenceHash };
        },
      },
    });
    expect(calls).toBe(14);
    expect(maximumActive).toBe(1);
    expect(result.summary.disposition).toBe("TECHNICAL_ASSERTIONS_PASS");
    expect(result.items).toHaveLength(14);
    expect(result.items.every((item) =>
      /^[a-f0-9]{64}$/u.test(item.candidateOutputHash)
    )).toBe(true);
    expect(result.evidenceHash).toBe(appendedHash);
    expect(result.registrationProvenance.scoredRunRevision).toBe(scoredRunRevision);
    expect(JSON.stringify(result)).not.toMatch(/reply|payload|Mình cần|access.?token/iu);

    await expect(executeGateEScoredRun({
      registrationPath,
      git,
      transport: {
        send: async () => {
          throw new Error("raw-provider-secret-must-not-escape");
        },
      },
      evidenceStore: {
        appendAtomically: async () => { throw new Error("must-not-write"); },
      },
    })).rejects.toThrow("GATE_E_SCORED_MODEL_CALL_FAILED");

    await expect(executeGateEScoredRun({
      registrationPath,
      git,
      transport: {
        send: async (request) => {
          const item = itemByContext.get(
            deriveCandidateRequestContextHash({ body: request.body }),
          )!;
          return {
            payload: {
              candidates: [{ content: { parts: [{
                text: JSON.stringify(passingOutput(item)),
              }] } }],
            },
            providerModelVersion: "gemini-3.5-flash-lite",
          };
        },
      },
      evidenceStore: {
        appendAtomically: async () => ({
          disposition: "APPENDED" as const,
          evidenceHash: "f".repeat(64),
        }),
      },
    })).rejects.toThrow("GATE_E_EVIDENCE_APPEND_MISMATCH");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T10:00:00.000Z"));
    try {
      let providerAborted = false;
      const timedOut = executeGateEScoredRun({
        registrationPath,
        git,
        transport: {
          send: async (request) => new Promise((_resolve, reject) => {
            request.signal?.addEventListener("abort", () => {
              providerAborted = true;
              reject(new Error("provider-aborted"));
            }, { once: true });
          }),
        },
        evidenceStore: {
          appendAtomically: async () => { throw new Error("must-not-write"); },
        },
      });
      const timeoutExpectation = expect(timedOut).rejects.toThrow(
        "GATE_E_PROVIDER_DEADLINE_EXCEEDED",
      );
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(GATE_E_EXECUTION_CAPS_V1.providerTimeoutMs + 1);
      await timeoutExpectation;
      expect(providerAborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("derives registration provenance from Git evidence instead of caller assertions", async () => {
    const candidateSourceRevision = "a".repeat(40);
    const sourceContent = (path: string) => `candidate-source:${path}`;
    const sourceBlobOid = (path: string) => hash(`blob:${path}`).slice(0, 40);
    const candidateFingerprint = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision,
      git: {
        readBlob: async (_commit, path) => sourceContent(path),
        resolveBlobOid: async (_commit, path) => sourceBlobOid(path),
      },
    });
    const registeredCorpus = FROZEN_GATE_E_CORPUS_V1;
    const registeredRubric = FROZEN_GATE_E_RUBRIC_V1;
    const draft = createDraftGateERegistrationBundle({
      corpus: registeredCorpus,
      rubric: registeredRubric,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision,
      candidateContentFingerprint: candidateFingerprint.contentFingerprint,
    });
    const observation = createRedactedProviderObservation({
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      observedProviderModelVersion: "gemini-3.5-flash-lite",
      requestIdentity: draft.requests[0]!.requestIdentity,
      startedAt: "2026-08-17T08:00:00.000Z",
      completedAt: "2026-08-17T08:00:01.000Z",
    });
    const manifest = createRegisteredGateEManifest({ draft, observation });
    const registration = {
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_REGISTRATION_V1",
      registrationStatus: "REGISTERED",
      candidateSourceRevision: draft.candidateSourceRevision,
      candidateContentFingerprint: draft.candidateContentFingerprint,
      providerModelVersion: manifest.providerModelVersion,
      corpusPath: "evaluation/gate-e/df10-v1/corpus.json",
      corpusBlobOid: "1".repeat(40),
      corpusHash: manifest.corpusHash,
      rubricPath: "evaluation/gate-e/df10-v1/rubric.json",
      rubricBlobOid: "3".repeat(40),
      rubricHash: manifest.rubricHash,
      manifestPath: "evaluation/gate-e/df10-v1/manifest.json",
      manifestBlobOid: "4".repeat(40),
      manifestHash: manifest.manifestHash,
      providerObservationPath: "evaluation/gate-e/df10-v1/provider-observation.json",
      providerObservationBlobOid: "5".repeat(40),
      providerObservationHash: manifest.providerObservationHash,
      executionCapsHash: hash(canonicalJsonV1(GATE_E_EXECUTION_CAPS_V1)),
    } satisfies GateERegistrationArtifactV1;
    const proof = await verifyGateERegistrationProvenance({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      scoredRunRevision: "d".repeat(40),
      scoredRunStartedAt: "2026-08-17T10:00:00.000Z",
      git: {
        resolveBlobOid: async (commit, path) => {
          if (path.endsWith("registration.json")) return "9".repeat(40);
          if (GATE_E_CANDIDATE_SOURCE_PATHS_V1.includes(
            path as typeof GATE_E_CANDIDATE_SOURCE_PATHS_V1[number],
          )) {
            expect([candidateSourceRevision, "d".repeat(40)]).toContain(commit);
          } else {
            expect(commit).toBe("c".repeat(40));
          }
          const blobs = new Map([
            [registration.corpusPath, registration.corpusBlobOid],
            [registration.rubricPath, registration.rubricBlobOid],
            [registration.manifestPath, registration.manifestBlobOid],
            [registration.providerObservationPath, registration.providerObservationBlobOid],
          ]);
          return blobs.get(path) ?? sourceBlobOid(path);
        },
        readBlob: async (_commit, path) => path.endsWith("registration.json")
          ? JSON.stringify(registration)
          : path === registration.corpusPath
            ? JSON.stringify(registeredCorpus)
            : path === registration.rubricPath
              ? JSON.stringify(registeredRubric)
          : path === registration.manifestPath
            ? JSON.stringify(manifest)
            : path === registration.providerObservationPath
              ? JSON.stringify(observation)
              : sourceContent(path),
        findBlobIntroductionCommit: async () => "c".repeat(40),
        isAncestor: async (ancestor, descendant) =>
          (ancestor === "c".repeat(40) && descendant === "d".repeat(40)) ||
          (ancestor === registration.candidateSourceRevision && descendant === "c".repeat(40)),
        commitTime: async () => "2026-08-17T09:00:00.000Z",
      },
    });
    expect(proof).toEqual({
      disposition: "REGISTRATION_PROVENANCE_VERIFIED",
      registrationCommit: "c".repeat(40),
      registrationBlobOid: "9".repeat(40),
      manifestHash: manifest.manifestHash,
      scoredRunRevision: "d".repeat(40),
      registrationCommitTime: "2026-08-17T09:00:00.000Z",
      scoredRunStartedAt: "2026-08-17T10:00:00.000Z",
    });

    await expect(verifyGateERegistrationProvenance({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      scoredRunRevision: "d".repeat(40),
      scoredRunStartedAt: "2026-08-17T10:00:00.000Z",
      git: {
        resolveBlobOid: async () => "9".repeat(40),
        readBlob: async () => JSON.stringify({
          ...registration,
          manifestPath: "../manifest.json",
        }),
        findBlobIntroductionCommit: async () => { throw new Error("must-not-read-git"); },
        isAncestor: async () => { throw new Error("must-not-read-git"); },
        commitTime: async () => { throw new Error("must-not-read-git"); },
      },
    })).rejects.toThrow("GATE_E_REGISTRATION_IDENTITY_INVALID");

    await expect(verifyGateERegistrationProvenance({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      scoredRunRevision: "d".repeat(40),
      scoredRunStartedAt: "2026-08-17T10:00:00.000Z",
      git: {
        resolveBlobOid: async (_commit, path) => path.endsWith("registration.json")
          ? "9".repeat(40)
          : "f".repeat(40),
        readBlob: async (_commit, path) => path.endsWith("registration.json")
          ? JSON.stringify(registration)
          : path === registration.corpusPath
            ? JSON.stringify(registeredCorpus)
            : path === registration.rubricPath
              ? JSON.stringify(registeredRubric)
          : path === registration.manifestPath
            ? JSON.stringify(manifest)
            : path === registration.providerObservationPath
              ? JSON.stringify(observation)
              : sourceContent(path),
        findBlobIntroductionCommit: async () => "c".repeat(40),
        isAncestor: async () => true,
        commitTime: async () => "2026-08-17T09:00:00.000Z",
      },
    })).rejects.toThrow("GATE_E_REGISTRATION_BLOB_MISMATCH");

    await expect(verifyGateERegistrationProvenance({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      scoredRunRevision: "d".repeat(40),
      scoredRunStartedAt: "2026-08-17T10:00:00.000Z",
      git: {
        resolveBlobOid: async (_commit, path) => path.endsWith("registration.json")
          ? "9".repeat(40)
          : path === registration.corpusPath
            ? registration.corpusBlobOid
            : path === registration.rubricPath
              ? registration.rubricBlobOid
              : path === registration.manifestPath
                ? registration.manifestBlobOid
                : path === registration.providerObservationPath
                  ? registration.providerObservationBlobOid
                  : sourceBlobOid(path),
        readBlob: async (_commit, path) => path.endsWith("registration.json")
          ? JSON.stringify(registration)
          : path === registration.corpusPath
            ? JSON.stringify(registeredCorpus)
            : path === registration.rubricPath
              ? JSON.stringify(registeredRubric)
          : path === registration.manifestPath
            ? JSON.stringify({ ...manifest, providerModelVersion: "tampered" })
            : path === registration.providerObservationPath
              ? JSON.stringify(observation)
              : sourceContent(path),
        findBlobIntroductionCommit: async () => "c".repeat(40),
        isAncestor: async () => true,
        commitTime: async () => "2026-08-17T09:00:00.000Z",
      },
    })).rejects.toThrow("GATE_E_MANIFEST_INTEGRITY_INVALID");

    await expect(verifyGateERegistrationProvenance({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      scoredRunRevision: "d".repeat(40),
      scoredRunStartedAt: "2026-08-17T10:00:00.000Z",
      git: {
        resolveBlobOid: async (_commit, path) => path.endsWith("registration.json")
          ? "9".repeat(40)
          : path === registration.corpusPath
            ? registration.corpusBlobOid
            : path === registration.rubricPath
              ? registration.rubricBlobOid
              : path === registration.manifestPath
                ? registration.manifestBlobOid
                : path === registration.providerObservationPath
                  ? registration.providerObservationBlobOid
                  : sourceBlobOid(path),
        readBlob: async (_commit, path) => path.endsWith("registration.json")
          ? JSON.stringify(registration)
          : path === registration.corpusPath
            ? JSON.stringify(registeredCorpus)
            : path === registration.rubricPath
              ? JSON.stringify(registeredRubric)
          : path === registration.manifestPath
            ? JSON.stringify(manifest)
            : path === registration.providerObservationPath
              ? JSON.stringify(observation)
              : sourceContent(path),
        findBlobIntroductionCommit: async () => "c".repeat(40),
        isAncestor: async (ancestor) => ancestor === registration.candidateSourceRevision,
        commitTime: async () => "2026-08-17T09:00:00.000Z",
      },
    })).rejects.toThrow("GATE_E_REGISTRATION_NOT_ANCESTOR");
  });
});
