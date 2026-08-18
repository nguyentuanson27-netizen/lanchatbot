import { createHash } from "node:crypto";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import {
  GATE_E_EXECUTION_CAPS_V1,
  GATE_E_CANDIDATE_SOURCE_PATHS_V1,
  assertGateEEvidenceAppendReceiptV2,
  createDraftGateERegistrationBundle,
  createRegisteredGateEManifest,
  deriveGateECandidateContentFingerprint,
  deriveGateERegisteredPopulationAnchorV1,
  observeGateEProviderIdentity,
  registerGateEPopulationAnchorV1,
  executeGateEScoredRun,
  scoreGateECandidateOutput,
  summarizeGateEScores,
  verifyStoredGateEEvidenceCertification,
  verifyGateERegistrationProvenance,
  type GateECorpusV1,
  type GateECorpusItemV1,
  type DraftGateERegistrationBundleV1,
  type GateERubricV1,
  type GateERegistrationArtifactV1,
  type GateEEvidenceReaderV2,
  type GateEEvidenceStoreV2,
  type GateEPopulationAnchorWriterV1,
} from "./gate-e-registration.js";
import {
  PostgresGateEEvidenceStoreV2,
  PostgresGateERegistrationAnchorStoreV1,
} from "@lana/database";
import { deriveCandidateRequestContextHash } from "./context-v2-candidate.js";
import {
  GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
  GATE_E_INTERPRETATION_PROBES_V1,
} from "./gate-e-output-interpreter.js";
import {
  FROZEN_GATE_E_CORPUS_V1,
  FROZEN_GATE_E_CORPUS_V1_SHA256,
  FROZEN_GATE_E_RUBRIC_V1,
  FROZEN_GATE_E_RUBRIC_V1_SHA256,
} from "./gate-e-frozen-artifacts.js";

const hash = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

describe("Gate E evidence-store V2 idempotency contract", () => {
  it("keeps the concrete PostgreSQL adapter assignable to both owned ports", () => {
    expectTypeOf<PostgresGateEEvidenceStoreV2>().toMatchTypeOf<
      GateEEvidenceStoreV2 & GateEEvidenceReaderV2
    >();
    expectTypeOf<PostgresGateERegistrationAnchorStoreV1>().toMatchTypeOf<
      GateEPopulationAnchorWriterV1
    >();
  });

  it("uses the immutable original admission boundary for an existing identical record", () => {
    const evidenceHash = "a".repeat(64);
    const admittedAt = "2026-08-18T10:00:00.000Z";
    expect(assertGateEEvidenceAppendReceiptV2({
      result: {
        disposition: "ALREADY_PRESENT",
        evidenceHash,
        admittedAt,
      },
      expectedEvidenceHash: evidenceHash,
      notAfter: "2026-08-18T10:01:00.000Z",
    })).toEqual({
      disposition: "ALREADY_PRESENT",
      admittedAt,
    });
  });

  it("rejects an existing-record receipt whose admission missed the deadline", () => {
    const evidenceHash = "b".repeat(64);
    expect(() => assertGateEEvidenceAppendReceiptV2({
      result: {
        disposition: "ALREADY_PRESENT",
        evidenceHash,
        admittedAt: "2026-08-18T10:01:00.001Z",
      },
      expectedEvidenceHash: evidenceHash,
      notAfter: "2026-08-18T10:01:00.000Z",
    })).toThrow("GATE_E_EVIDENCE_APPEND_MISMATCH");
  });
});

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
          sideEffectSafety: "TYPED_EFFECT_MATRIX_WITH_REGISTERED_SEMANTIC_INTERPRETER",
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
          sideEffectSafety: "TYPED_EFFECT_MATRIX_WITH_REGISTERED_SEMANTIC_INTERPRETER",
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
      eligibleCoverageMinimum: 1,
      claimSafetyMinimum: 1,
      contextIntegrityMinimum: 1,
      sideEffectViolationMaximum: 0,
      mustPassMinimum: 1,
    },
    scoring: {
      population: "ALL_FROZEN_CORPUS_ITEMS",
      runtimeClaimGuardRequired: true,
      semanticInterpreterRequired: true,
      interpreterModelRelationship: GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
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

function observationForDraft(
  draft: DraftGateERegistrationBundleV1,
  overrides: Readonly<Record<string, unknown>> = {},
) {
  return {
    schemaVersion: 1 as const,
    contractVersion: "DF10_GATE_E_PROVIDER_IDENTITY_OBSERVATION_V1" as const,
    disposition: "PROVIDER_IDENTITY_OBSERVED_MATCH" as const,
    expectedProviderModelVersion: "gemini-3.5-flash-lite",
    observedProviderModelVersion: "gemini-3.5-flash-lite",
    requestEnvelopeHash: draft.requests[0]!.requestIdentity.requestEnvelopeHash,
    trustedSourceRevision: draft.candidateSourceRevision,
    trustedRef: "refs/remotes/origin/main" as const,
    executionBoundary: "CLEAN_TRUSTED_EXACT_HEAD_PROVIDER_CALL_V1" as const,
    startedAt: "2026-08-17T10:00:00.000Z",
    completedAt: "2026-08-17T10:00:01.000Z",
    ...overrides,
  };
}

function interpretationFor(
  output: ContextV2CandidateOutputV2,
  overrides: Readonly<Record<string, unknown>> = {},
) {
  return {
    schemaVersion: 1 as const,
    contractVersion: "GATE_E_OUTPUT_INTERPRETATION_V1" as const,
    candidateOutputHash: hash(canonicalJsonV1(output)),
    claimContentHashes: output.segments.flatMap((segment) =>
      segment.kind === "VERIFIED_CLAIM" ? [segment.claimContentHash] : []
    ),
    clarificationTargets: output.segments.flatMap((segment) =>
      segment.kind === "CLARIFICATION" ? [segment.target] : []
    ),
    requestedActions: output.segments.flatMap((segment) =>
      segment.kind === "ACTION_REQUEST" ? [segment.action] : []
    ),
    claimedEffects: output.segments.flatMap((segment) =>
      segment.kind === "EFFECT_CLAIM" ? [segment.effect] : []
    ),
    ...overrides,
  };
}

function scoreOutput(input: Readonly<{
  item: GateECorpusItemV1;
  output: ContextV2CandidateOutputV2;
  interpretation?: Readonly<Record<string, unknown>>;
}>) {
  return scoreGateECandidateOutput({
    item: input.item,
    output: input.output,
    interpretation: interpretationFor(input.output, input.interpretation),
  });
}

describe("Gate E immutable registration boundary", () => {
  it("derives the candidate fingerprint from an exact reviewed source closure", async () => {
    expect(GATE_E_CANDIDATE_SOURCE_PATHS_V1).toEqual([
      "apps/worker/package.json",
      "apps/worker/src/context-v2-candidate.ts",
      "apps/worker/src/context-v2-evaluation.ts",
      "apps/worker/src/context-v2.ts",
      "apps/worker/src/gate-e-frozen-artifacts.ts",
      "apps/worker/src/gate-e-git-reader.ts",
      "apps/worker/src/gate-e-output-interpreter.ts",
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
      "e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd",
    );
    expect(FROZEN_GATE_E_RUBRIC_V1_SHA256).toBe(
      "89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986",
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
    const draft = createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource:
        "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite",
      candidateSourceRevision: "a".repeat(40),
      candidateContentFingerprint: "b".repeat(64),
    });
    const observation = observationForDraft(draft);
    expect(Object.keys(observation).sort()).toEqual([
      "completedAt",
      "contractVersion",
      "disposition",
      "executionBoundary",
      "expectedProviderModelVersion",
      "observedProviderModelVersion",
      "requestEnvelopeHash",
      "schemaVersion",
      "startedAt",
      "trustedRef",
      "trustedSourceRevision",
    ]);
    expect(JSON.stringify(observation)).not.toMatch(/payload|reply|authorization|token/iu);
    expect(() => createRegisteredGateEManifest({
      draft,
      observation: observationForDraft(draft, {
        observedProviderModelVersion: "unknown",
      }) as never,
    })).toThrow("GATE_E_PROVIDER_OBSERVATION_NOT_REGISTERABLE");
    expect(() => createRegisteredGateEManifest({
      draft,
      observation: observationForDraft(draft, {
        disposition: "PROVIDER_IDENTITY_OBSERVED_MISMATCH",
        observedProviderModelVersion: "gemini-3.5-flash-lite@other",
      }) as never,
    })).toThrow("GATE_E_PROVIDER_OBSERVATION_NOT_REGISTERABLE");
  });

  it("observes identity with exactly one request and never returns provider payload", async () => {
    const frozenCorpus = FROZEN_GATE_E_CORPUS_V1;
    const modelResource =
      "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
    const sourceGit = {
      refreshTrustedRef: async () => undefined,
      resolveRef: async () => "a".repeat(40),
      isWorktreeClean: async () => true,
      readBlob: async (_commit: string, path: string) => `source:${path}`,
      resolveBlobOid: async (_commit: string, path: string) =>
        hash(`blob:${path}`).slice(0, 40),
      findBlobIntroductionCommit: async () => "a".repeat(40),
      isAncestor: async () => true,
      commitTime: async () => "2026-08-17T00:00:00.000Z",
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

    let untrustedProviderCalls = 0;
    await expect(observeGateEProviderIdentity({
      draft,
      corpus: frozenCorpus,
      modelResource,
      expectedProviderModelVersion: "gemini-3.5-flash-lite",
      git: {
        ...sourceGit,
        resolveRef: async () => "a".repeat(40),
        isWorktreeClean: async () => false,
      } as never,
      transport: {
        send: async () => {
          untrustedProviderCalls += 1;
          throw new Error("must-not-call");
        },
      },
    })).rejects.toThrow("GATE_E_TRUSTED_CHECKOUT_DIRTY");
    expect(untrustedProviderCalls).toBe(0);
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
    const observation = observationForDraft(draft);
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
      scoredRequestMaximum: 55,
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
        refreshTrustedRef: async () => undefined,
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
        readPopulationAnchorByHash: async () => null,
        appendBeforeDeadlineAtomically: async () => { throw new Error("must-not-write"); },
      },
    })).rejects.toThrow("GATE_E_TRUSTED_CHECKOUT_DIRTY");
    expect(providerCalls).toBe(0);
  });

  it("fails before scoring when HEAD differs from the trusted remote ref", async () => {
    await expect(executeGateEScoredRun({
      registrationPath: "evaluation/gate-e/df10-v1/registration.json",
      git: {
        refreshTrustedRef: async () => undefined,
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
        readPopulationAnchorByHash: async () => null,
        appendBeforeDeadlineAtomically: async () => { throw new Error("must-not-write"); },
      },
    })).rejects.toThrow("GATE_E_TRUSTED_EXACT_HEAD_MISMATCH");
  });

  it("scores registered assertions with the runtime claim guard and no side-effect claims", () => {
    const verifiedSize = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf05-verified-size-eligible",
    )!;
    expect(scoreOutput({
      item: verifiedSize,
      output: passingOutput(verifiedSize),
    })).toMatchObject({ disposition: "MUST_PASS", claimSafety: 1, sideEffectViolations: 0 });

    const unverifiedSize = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf04-unverified-size-blocked",
    )!;
    expect(scoreOutput({
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

    expect(scoreOutput({
      item: verifiedSize,
      output: {
        ...passingOutput(verifiedSize),
        segments: [
          ...passingOutput(verifiedSize).segments,
          { kind: "GENERAL", text: "Mình đã thêm sản phẩm vào giỏ cho bạn." },
        ],
      },
      interpretation: { claimedEffects: ["CART_UPDATED"] },
    })).toMatchObject({ disposition: "FAILED", sideEffectViolations: 1 });
  });

  it("rejects completed-commerce paraphrases that omit a typed effect declaration", () => {
    const noDeliveryEffect = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf10-no-delivery-side-effect",
    )!;
    const paraphrases = [
      ["Em lên đơn xong cho chị rồi ạ.", "ORDER_PLACED"],
      ["I finished placing the order for you.", "ORDER_PLACED"],
      ["Giỏ hàng của chị được cập nhật xong rồi nhé.", "CART_UPDATED"],
      ["Your order is confirmed.", "ORDER_CONFIRMED"],
      ["I've sent the message already.", "MESSAGE_SENT"],
    ] as const;

    for (const [reply, effect] of paraphrases) {
      expect(scoreOutput({
        item: noDeliveryEffect,
        output: {
          ...passingOutput(noDeliveryEffect),
          segments: [
            ...passingOutput(noDeliveryEffect).segments,
            { kind: "GENERAL", text: reply },
          ],
        },
        interpretation: { claimedEffects: [effect] },
      })).toMatchObject({ disposition: "FAILED", sideEffectViolations: 1 });
    }
  });

  it("does not trust candidate-authored clarification and action labels over wording", () => {
    const item = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf04-unverified-size-blocked",
    )!;
    const output = passingOutput(item);
    const mislabeled = {
      ...output,
      segments: output.segments.map((segment) => segment.kind === "CLARIFICATION"
        ? { ...segment, text: "Xin chào chị." }
        : segment.kind === "ACTION_REQUEST"
          ? { ...segment, text: "Cảm ơn chị." }
          : segment),
    } satisfies ContextV2CandidateOutputV2;
    expect(scoreGateECandidateOutput({
      item,
      output: mislabeled,
      interpretation: interpretationFor(mislabeled, {
        clarificationTargets: [],
        requestedActions: [],
      }),
    })).toMatchObject({ disposition: "FAILED", contextIntegrity: 0 });
  });

  it("keeps the runtime size guard authoritative for alternative sizes", () => {
    const item = FROZEN_GATE_E_CORPUS_V1.items.find(
      ({ itemId }) => itemId === "bf05-verified-size-eligible",
    )!;
    const claim = item.context.verifiedClaims.find(({ type }) => type === "SIZE_FIT")!;
    const output = passingOutput(item);
    expect(scoreOutput({
      item,
      output: {
        ...output,
        segments: output.segments.map((segment) => segment.kind === "VERIFIED_CLAIM"
          ? {
              ...segment,
              text: `Size ${claim.type === "SIZE_FIT" ? claim.value.alternativeSizes[0] : "L"} cũng phù hợp theo bằng chứng đã xác minh.`,
            }
          : segment),
      },
    })).toMatchObject({ disposition: "MUST_PASS", claimSafety: 1 });
  });

  it("does not let one canned reply satisfy every frozen semantic obligation", () => {
    const scores = FROZEN_GATE_E_CORPUS_V1.items.map((item) =>
      scoreOutput({
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
    expect(FROZEN_GATE_E_RUBRIC_V1.thresholds.eligibleCoverageMinimum).toBe(1);
    const scores = FROZEN_GATE_E_CORPUS_V1.items.slice(0, -1).map((item) =>
      scoreOutput({
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
    const observation = observationForDraft(draft);
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
    const appendedHashes: string[] = [];
    const interpretations = new Map<string, ReturnType<typeof interpretationFor>>();
    const probeInterpretations = new Map(
      GATE_E_INTERPRETATION_PROBES_V1.map((probe) => [
        probe.input.candidateOutputHash,
        {
          schemaVersion: 1 as const,
          contractVersion: "GATE_E_OUTPUT_INTERPRETATION_V1" as const,
          candidateOutputHash: probe.input.candidateOutputHash,
          ...probe.expected,
        },
      ]),
    );
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
      refreshTrustedRef: async () => undefined,
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
    const expectedPopulationAnchor = deriveGateERegisteredPopulationAnchorV1({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      manifest,
      proof: {
        disposition: "REGISTRATION_PROVENANCE_VERIFIED",
        registrationCommit: "c".repeat(40),
        registrationBlobOid: "9".repeat(40),
        manifestHash: manifest.manifestHash,
        scoredRunRevision,
        registrationCommitTime: "2026-08-17T09:00:00.000Z",
        scoredRunStartedAt: "2026-08-18T10:00:00.000Z",
      },
    });
    const registeredPopulation = await registerGateEPopulationAnchorV1({
      registrationPath,
      git,
      populationStore: {
        appendRegisteredPopulationAnchorAtomically: async ({
          populationAnchor,
        }) => ({
          disposition: "APPENDED" as const,
          populationAnchorHash: populationAnchor.populationAnchorHash,
          anchoredAt: "2026-08-17T09:01:00.000Z",
        }),
      },
    });
    const populationAnchor = registeredPopulation.populationAnchor;
    expect(populationAnchor.populationAnchorHash).toBe(
      expectedPopulationAnchor.populationAnchorHash,
    );
    const readPopulationAnchorByHash = async (populationAnchorHash: string) =>
      populationAnchorHash === populationAnchor.populationAnchorHash
        ? {
          populationAnchor,
          anchoredAt: "2026-08-17T09:01:00.000Z",
        }
        : null;
    const sendPassing = async (request: Readonly<{ body: string }>) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      calls += 1;
      await Promise.resolve();
      const requestBody = JSON.parse(request.body) as {
        generationConfig: { maxOutputTokens: number };
        contents: Array<{ parts: Array<{ text: string }> }>;
      };
      if (requestBody.generationConfig.maxOutputTokens === 256) {
        const interpretationInput = JSON.parse(
          requestBody.contents[0]!.parts[0]!.text,
        ) as { candidateOutputHash: string };
        const interpretation = probeInterpretations.get(
          interpretationInput.candidateOutputHash,
        ) ?? interpretations.get(interpretationInput.candidateOutputHash);
        active -= 1;
        if (!interpretation) throw new Error("missing-test-interpretation");
        return {
          payload: { candidates: [{ content: { parts: [{
            text: JSON.stringify(interpretation),
          }] } }] },
          providerModelVersion: "gemini-3.5-flash-lite",
        };
      }
      const item = itemByContext.get(
        deriveCandidateRequestContextHash({ body: request.body }),
      )!;
      const output = passingOutput(item);
      interpretations.set(hash(canonicalJsonV1(output)), interpretationFor(output));
      active -= 1;
      return {
        payload: { candidates: [{ content: { parts: [{
          text: JSON.stringify(output),
        }] } }] },
        providerModelVersion: "gemini-3.5-flash-lite",
      };
    };
    let callsBeforeRegisteredPopulation = 0;
    await expect(executeGateEScoredRun({
      registrationPath,
      git,
      transport: {
        send: async () => {
          callsBeforeRegisteredPopulation += 1;
          throw new Error("must-not-call");
        },
      },
      evidenceStore: {
        readPopulationAnchorByHash: async () => null,
        appendBeforeDeadlineAtomically: async () => {
          throw new Error("must-not-write");
        },
      },
    })).rejects.toThrow("GATE_E_REGISTERED_POPULATION_ANCHOR_REQUIRED");
    expect(callsBeforeRegisteredPopulation).toBe(0);
    const result = await executeGateEScoredRun({
      registrationPath,
      git,
      transport: { send: sendPassing },
      evidenceStore: {
        readPopulationAnchorByHash,
        appendBeforeDeadlineAtomically: async ({ evidenceHash, notAfter }) => {
          appendedHashes.push(evidenceHash);
          return {
            disposition: "APPENDED" as const,
            evidenceHash,
            admittedAt: new Date(Date.parse(notAfter) - 1).toISOString(),
          };
        },
      },
    });
    expect(calls).toBe(55);
    expect(maximumActive).toBe(1);
    expect(result.summary.disposition).toBe("TECHNICAL_ASSERTIONS_PASS");
    expect(result.items).toHaveLength(14);
    expect(result.items.every((item) =>
      /^[a-f0-9]{64}$/u.test(item.candidateOutputHash)
    )).toBe(true);
    expect(appendedHashes).toEqual([result.evidenceHash, result.finalizationHash]);
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
        readPopulationAnchorByHash,
        appendBeforeDeadlineAtomically: async () => { throw new Error("must-not-write"); },
      },
    })).rejects.toThrow("GATE_E_SCORED_MODEL_CALL_FAILED");

    await expect(executeGateEScoredRun({
      registrationPath,
      git,
      transport: { send: sendPassing },
      evidenceStore: {
        readPopulationAnchorByHash,
        appendBeforeDeadlineAtomically: async () => ({
          disposition: "APPENDED" as const,
          evidenceHash: "f".repeat(64),
          admittedAt: new Date().toISOString(),
        }),
      },
    })).rejects.toThrow("GATE_E_EVIDENCE_APPEND_MISMATCH");

    let cleanChecks = 0;
    const orphanedEvidence: Readonly<Record<string, unknown>>[] = [];
    await expect(executeGateEScoredRun({
      registrationPath,
      git: {
        ...git,
        isWorktreeClean: async () => {
          cleanChecks += 1;
          return cleanChecks < 3;
        },
      },
      transport: { send: sendPassing },
      evidenceStore: {
        readPopulationAnchorByHash,
        appendBeforeDeadlineAtomically: async ({ evidenceHash, evidence }) => {
          orphanedEvidence.push(evidence);
          return {
            disposition: "APPENDED" as const,
            evidenceHash,
            admittedAt: new Date().toISOString(),
          };
        },
      },
    })).rejects.toThrow("GATE_E_TRUSTED_CHECKOUT_CHANGED");
    expect(orphanedEvidence).toHaveLength(1);
    expect(orphanedEvidence[0]?.admissibility).toBe(
      "UNFINALIZED_TECHNICAL_EVIDENCE",
    );
    const orphanedBodyHash = hash(canonicalJsonV1(orphanedEvidence[0]!));
    await expect(verifyStoredGateEEvidenceCertification({
      evidenceBodyHash: orphanedBodyHash,
      finalizationHash: "f".repeat(64),
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceStore: {
        readPopulationAnchorByHash,
        readByHash: async (evidenceHash) =>
          evidenceHash === orphanedBodyHash
            ? {
              evidence: orphanedEvidence[0]!,
              admittedAt: new Date().toISOString(),
            }
            : null,
      },
    })).rejects.toThrow("GATE_E_EVIDENCE_RECORD_MISSING_OR_MISMATCHED");

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
          readPopulationAnchorByHash,
          appendBeforeDeadlineAtomically: async () => { throw new Error("must-not-write"); },
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

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T10:00:00.000Z"));
    try {
      let signalBodyAppendStarted: (() => void) | undefined;
      const bodyAppendStarted = new Promise<void>((resolve) => {
        signalBodyAppendStarted = resolve;
      });
      const attemptedRecords: Readonly<Record<string, unknown>>[] = [];
      const timedOutAfterBody = executeGateEScoredRun({
        registrationPath,
        git,
        transport: { send: sendPassing },
        evidenceStore: {
          readPopulationAnchorByHash,
          appendBeforeDeadlineAtomically: async ({ evidence, signal }) => {
            attemptedRecords.push(evidence);
            signalBodyAppendStarted?.();
            return new Promise((_resolve, reject) => {
              signal?.addEventListener("abort", () => {
                reject(new Error("store-aborted"));
              }, { once: true });
            });
          },
        },
      });
      const timeoutExpectation = expect(timedOutAfterBody).rejects.toThrow(
        "GATE_E_RUN_TIMEOUT",
      );
      await vi.advanceTimersByTimeAsync(0);
      await bodyAppendStarted;
      await vi.advanceTimersByTimeAsync(GATE_E_EXECUTION_CAPS_V1.runTimeoutMs + 1);
      await timeoutExpectation;
      expect(attemptedRecords).toHaveLength(1);
      expect(attemptedRecords[0]?.admissibility).toBe(
        "UNFINALIZED_TECHNICAL_EVIDENCE",
      );
    } finally {
      vi.useRealTimers();
    }

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T10:00:00.000Z"));
    try {
      let signalFinalizationAppendStarted: (() => void) | undefined;
      const finalizationAppendStarted = new Promise<void>((resolve) => {
        signalFinalizationAppendStarted = resolve;
      });
      const lateRecords = new Map<string, Readonly<{
        evidence: Readonly<Record<string, unknown>>;
        admittedAt: string;
      }>>();
      let appendIndex = 0;
      const timedOutWithLateCommit = executeGateEScoredRun({
        registrationPath,
        git,
        transport: { send: sendPassing },
        evidenceStore: {
          readPopulationAnchorByHash,
          appendBeforeDeadlineAtomically: async ({
            evidenceHash, evidence, notAfter, signal,
          }) => {
            appendIndex += 1;
            if (appendIndex === 1) {
              const admittedAt = new Date().toISOString();
              lateRecords.set(evidenceHash, {
                evidence,
                admittedAt,
              });
              return {
                disposition: "APPENDED" as const,
                evidenceHash,
                admittedAt,
              };
            }
            signalFinalizationAppendStarted?.();
            return new Promise((resolve) => {
              signal.addEventListener("abort", () => {
                const admittedAt = new Date(
                  Date.parse(notAfter) + 1,
                ).toISOString();
                lateRecords.set(evidenceHash, {
                  evidence,
                  admittedAt,
                });
                resolve({
                  disposition: "APPENDED" as const,
                  evidenceHash,
                  admittedAt,
                });
              }, { once: true });
            });
          },
        },
      });
      const timeoutExpectation = expect(timedOutWithLateCommit).rejects.toThrow(
        "GATE_E_RUN_TIMEOUT",
      );
      await vi.advanceTimersByTimeAsync(0);
      await finalizationAppendStarted;
      await vi.advanceTimersByTimeAsync(GATE_E_EXECUTION_CAPS_V1.runTimeoutMs + 1);
      await timeoutExpectation;

      const bodyEntry = [...lateRecords.entries()].find(([, record]) =>
        record.evidence.contractVersion === "DF10_GATE_E_SCORED_EVIDENCE_BODY_V3"
      )!;
      const finalizationEntry = [...lateRecords.entries()].find(([, record]) =>
        record.evidence.contractVersion === "DF10_GATE_E_RUN_FINALIZATION_V3"
      )!;
      await expect(verifyStoredGateEEvidenceCertification({
        populationAnchorHash: populationAnchor.populationAnchorHash,
        evidenceBodyHash: bodyEntry[0],
        finalizationHash: finalizationEntry[0],
        evidenceStore: {
          readPopulationAnchorByHash,
          readByHash: async (evidenceHash) => lateRecords.get(evidenceHash) ?? null,
        },
      })).rejects.toThrow("GATE_E_EVIDENCE_FINALIZATION_EXPIRED");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never gives an appended body Gate authority before terminal certification", async () => {
    const revision = "a".repeat(40);
    const registrationCommit = "c".repeat(40);
    const registrationBlobOid = "d".repeat(40);
    const itemId = "gate-e-certification-record";
    const anchorBody = {
      schemaVersion: 1 as const,
      contractVersion: "DF10_GATE_E_REGISTERED_POPULATION_ANCHOR_V1" as const,
      registrationCommit,
      registrationBlobOid,
      manifestHash: "b".repeat(64),
      corpusHash: "1".repeat(64),
      rubricHash: "2".repeat(64),
      planArtifactHash: "3".repeat(64),
      corpusItemIds: [itemId],
      populationCount: 1,
    };
    const populationAnchor = {
      ...anchorBody,
      populationAnchorHash: hash(canonicalJsonV1(anchorBody)),
    };
    const body = {
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_SCORED_EVIDENCE_BODY_V3",
      admissibility: "UNFINALIZED_TECHNICAL_EVIDENCE",
      executionBoundary: "CLEAN_TRUSTED_EXACT_HEAD_REQUEST_BYTES_V1",
      scoredRunRevision: revision,
      manifestHash: "b".repeat(64),
      populationAnchorHash: populationAnchor.populationAnchorHash,
      registrationProvenance: { registrationCommit, registrationBlobOid },
      startedAt: "2026-08-18T10:00:00.000Z",
      completedAt: "2026-08-18T10:01:00.000Z",
      items: [{ corpusItemId: itemId }],
      summary: {},
    };
    const finalization = {
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_RUN_FINALIZATION_V3",
      disposition: "FINALIZED_TRUSTED_EXACT_HEAD",
      evidenceBodyHash: hash(canonicalJsonV1(body)),
      scoredRunRevision: revision,
      trustedRevision: revision,
      finalClean: true,
      preparedAt: "2026-08-18T10:01:01.000Z",
      notAfter: "2026-08-18T10:15:00.000Z",
    };
    const bodyHash = hash(canonicalJsonV1(body));
    const finalizationHash = hash(canonicalJsonV1(finalization));
    const records = new Map<string, Readonly<{
      evidence: Readonly<Record<string, unknown>>;
      admittedAt: string;
    }>>([
      [bodyHash, {
        evidence: body,
        admittedAt: "2026-08-18T10:01:00.500Z",
      }],
      [finalizationHash, {
        evidence: finalization,
        admittedAt: "2026-08-18T10:01:02.000Z",
      }],
    ]);
    const evidenceStore = {
      readPopulationAnchorByHash: async (populationAnchorHash: string) =>
        populationAnchorHash === populationAnchor.populationAnchorHash
          ? {
            populationAnchor,
            anchoredAt: "2026-08-18T09:59:00.000Z",
          }
          : null,
      readByHash: async (evidenceHash: string) => records.get(evidenceHash) ?? null,
    };
    expect(await verifyStoredGateEEvidenceCertification({
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceBodyHash: bodyHash,
      finalizationHash,
      evidenceStore,
    })).toMatchObject({
      disposition: "FINALIZED_TRUSTED_EXACT_HEAD",
      evidenceBodyHash: bodyHash,
      finalizationAdmittedAt: "2026-08-18T10:01:02.000Z",
    });

    records.set(finalizationHash, {
      evidence: finalization,
      admittedAt: "2026-08-18T10:15:00.001Z",
    });
    await expect(verifyStoredGateEEvidenceCertification({
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceBodyHash: bodyHash,
      finalizationHash,
      evidenceStore,
    })).rejects.toThrow("GATE_E_EVIDENCE_FINALIZATION_EXPIRED");
    records.set(finalizationHash, {
      evidence: finalization,
      admittedAt: "2026-08-18T10:01:02.000Z",
    });

    records.set(bodyHash, {
      evidence: body,
      admittedAt: "2026-08-18T10:01:03.000Z",
    });
    await expect(verifyStoredGateEEvidenceCertification({
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceBodyHash: bodyHash,
      finalizationHash,
      evidenceStore,
    })).rejects.toThrow("GATE_E_EVIDENCE_ADMISSION_ORDER_INVALID");
    records.set(bodyHash, {
      evidence: body,
      admittedAt: "2026-08-18T10:01:00.500Z",
    });
    await expect(verifyStoredGateEEvidenceCertification({
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceBodyHash: bodyHash,
      finalizationHash: "f".repeat(64),
      evidenceStore,
    })).rejects.toThrow("GATE_E_EVIDENCE_RECORD_MISSING_OR_MISMATCHED");

    const dirtyFinalization = { ...finalization, finalClean: false };
    const dirtyHash = hash(canonicalJsonV1(dirtyFinalization));
    records.set(dirtyHash, {
      evidence: dirtyFinalization,
      admittedAt: "2026-08-18T10:01:02.000Z",
    });
    await expect(verifyStoredGateEEvidenceCertification({
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceBodyHash: bodyHash,
      finalizationHash: dirtyHash,
      evidenceStore,
    })).rejects.toThrow("GATE_E_EVIDENCE_NOT_FINALIZED");

    const mismatched = { ...finalization, evidenceBodyHash: "c".repeat(64) };
    const mismatchedHash = hash(canonicalJsonV1(mismatched));
    records.set(mismatchedHash, {
      evidence: mismatched,
      admittedAt: "2026-08-18T10:01:02.000Z",
    });
    await expect(verifyStoredGateEEvidenceCertification({
      populationAnchorHash: populationAnchor.populationAnchorHash,
      evidenceBodyHash: bodyHash,
      finalizationHash: mismatchedHash,
      evidenceStore,
    })).rejects.toThrow("GATE_E_EVIDENCE_FINALIZATION_MISMATCH");
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
    const observation = observationForDraft(draft);
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
