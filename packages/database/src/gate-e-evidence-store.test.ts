import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  assertGateEBodyMatchesRegisteredPopulationV1,
  classifyGateEEvidenceRecordV3,
  type GateERegisteredPopulationAnchorV1,
  type GateEEvidenceRecordBindingV3,
} from "./gate-e-evidence-store.js";

const sha256 = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

function body(): Readonly<Record<string, unknown>> {
  const revision = "a".repeat(40);
  const item = Object.freeze({
    corpusItemId: "gate-e-case-01",
    contextHash: "b".repeat(64),
    requestEnvelopeHash: "c".repeat(64),
    providerModelVersion: "gemini-3.5-flash-lite",
    candidateOutputHash: "d".repeat(64),
    interpretationRequestEnvelopeHash: "e".repeat(64),
    interpretationOutputHash: "f".repeat(64),
    score: Object.freeze({
      corpusItemId: "gate-e-case-01",
      disposition: "MUST_PASS",
      claimSafety: 1,
      contextIntegrity: 1,
      sideEffectViolations: 0,
      heuristicEffectSuspicion: 0,
      reasonCodes: Object.freeze([]),
    }),
  });
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_SCORED_EVIDENCE_BODY_V3",
    admissibility: "UNFINALIZED_TECHNICAL_EVIDENCE",
    executionBoundary: "CLEAN_TRUSTED_EXACT_HEAD_REQUEST_BYTES_V1",
    scoredRunRevision: revision,
    manifestHash: "1".repeat(64),
    populationAnchorHash: registeredPopulation([
      "gate-e-case-01",
    ]).populationAnchorHash,
    registrationProvenance: Object.freeze({
      disposition: "REGISTRATION_PROVENANCE_VERIFIED",
      registrationCommit: "2".repeat(40),
      registrationBlobOid: "3".repeat(40),
      manifestHash: "1".repeat(64),
      scoredRunRevision: revision,
      registrationCommitTime: "2026-08-18T09:59:00.000Z",
      scoredRunStartedAt: "2026-08-18T10:00:00.000Z",
    }),
    startedAt: "2026-08-18T10:00:00.000Z",
    completedAt: "2026-08-18T10:00:10.000Z",
    items: Object.freeze([item]),
    summary: Object.freeze({
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_TECHNICAL_SCORE_SUMMARY_V1",
      disposition: "TECHNICAL_ASSERTIONS_PASS",
      population: 1,
      scored: 1,
      eligibleCoverage: 1,
      claimSafety: 1,
      contextIntegrity: 1,
      sideEffectViolations: 0,
      mustPass: 1,
      reasonCodes: Object.freeze([]),
    }),
  });
}

function registeredPopulation(
  itemIds: readonly string[],
): GateERegisteredPopulationAnchorV1 {
  const anchor = {
    schemaVersion: 1 as const,
    contractVersion: "DF10_GATE_E_REGISTERED_POPULATION_ANCHOR_V1" as const,
    registrationCommit: "2".repeat(40),
    registrationBlobOid: "3".repeat(40),
    manifestHash: "1".repeat(64),
    corpusHash: "4".repeat(64),
    rubricHash: "5".repeat(64),
    planArtifactHash: "6".repeat(64),
    corpusItemIds: Object.freeze([...itemIds].sort()),
    populationCount: itemIds.length,
  };
  return Object.freeze({
    ...anchor,
    populationAnchorHash: sha256(canonicalJsonV1(anchor)),
  });
}

describe("Gate E durable evidence record classification", () => {
  it("rejects a self-consistent subset of the registered frozen population", () => {
    const registeredIds = [
      "gate-e-case-01",
      ...Array.from({ length: 13 }, (_, index) => `gate-e-case-${index + 2}`),
    ];
    const populationAnchor = registeredPopulation(registeredIds);
    const evidence = Object.freeze({
      ...body(),
      populationAnchorHash: populationAnchor.populationAnchorHash,
    });
    expect(() => assertGateEBodyMatchesRegisteredPopulationV1({
      evidence,
      populationAnchor,
    })).toThrow("GATE_E_EVIDENCE_REGISTERED_POPULATION_MISMATCH");
  });

  it("rejects the right population count with the wrong registered item identity", () => {
    const populationAnchor = registeredPopulation(["gate-e-case-02"]);
    const evidence = Object.freeze({
      ...body(),
      populationAnchorHash: populationAnchor.populationAnchorHash,
    });
    expect(() => assertGateEBodyMatchesRegisteredPopulationV1({
      evidence,
      populationAnchor,
    })).toThrow("GATE_E_EVIDENCE_REGISTERED_POPULATION_MISMATCH");
  });

  it("derives immutable BODY cross-binding and preserves the full denominator", () => {
    const evidence = body();
    const binding = classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(evidence)),
      evidence,
      notAfter: "2026-08-18T10:15:00.000Z",
      populationAnchor: registeredPopulation(["gate-e-case-01"]),
    });
    expect(binding).toEqual<GateEEvidenceRecordBindingV3>({
      recordKind: "BODY",
      contractVersion: "DF10_GATE_E_SCORED_EVIDENCE_BODY_V3",
      registrationCommit: "2".repeat(40),
      manifestHash: "1".repeat(64),
      populationAnchorHash: registeredPopulation([
        "gate-e-case-01",
      ]).populationAnchorHash,
      scoredRunRevision: "a".repeat(40),
      evidenceBodyHash: null,
    });
  });

  it("rejects partial denominators and sensitive/raw provider fields", () => {
    const partial = structuredClone(body());
    (partial.summary as Record<string, unknown>).scored = 0;
    expect(() => classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(partial)),
      evidence: partial,
      notAfter: "2026-08-18T10:15:00.000Z",
      populationAnchor: registeredPopulation(["gate-e-case-01"]),
    })).toThrow("GATE_E_EVIDENCE_POPULATION_INCOMPLETE");

    const sensitive = structuredClone(body());
    (sensitive as Record<string, unknown>).rawProviderPayload = "forbidden";
    expect(() => classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(sensitive)),
      evidence: sensitive,
      notAfter: "2026-08-18T10:15:00.000Z",
      populationAnchor: registeredPopulation(["gate-e-case-01"]),
    })).toThrow("GATE_E_EVIDENCE_SENSITIVE_FIELD_FORBIDDEN");

    const extraOutput = structuredClone(body());
    const firstItem = (extraOutput.items as Array<Record<string, unknown>>)[0]!;
    firstItem.candidateText = "must never be persisted";
    expect(() => classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(extraOutput)),
      evidence: extraOutput,
      notAfter: "2026-08-18T10:15:00.000Z",
      populationAnchor: registeredPopulation(["gate-e-case-01"]),
    })).toThrow("GATE_E_EVIDENCE_ITEM_INVALID");

    const typeConfused = structuredClone(body());
    const typeConfusedScore = (
      typeConfused.items as Array<{ score: Record<string, unknown> }>
    )[0]!.score;
    typeConfusedScore.claimSafety = "1";
    expect(() => classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(typeConfused)),
      evidence: typeConfused,
      notAfter: "2026-08-18T10:15:00.000Z",
      populationAnchor: registeredPopulation(["gate-e-case-01"]),
    })).toThrow("GATE_E_EVIDENCE_ITEM_INVALID");
  });

  it("requires the registration commit to strictly predate the scored run", () => {
    const equalBoundary = structuredClone(body());
    const provenance = equalBoundary.registrationProvenance as Record<string, unknown>;
    provenance.registrationCommitTime = provenance.scoredRunStartedAt;
    expect(() => classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(equalBoundary)),
      evidence: equalBoundary,
      notAfter: "2026-08-18T10:15:00.000Z",
      populationAnchor: registeredPopulation(["gate-e-case-01"]),
    })).toThrow("GATE_E_EVIDENCE_BODY_BINDING_INVALID");
  });

  it("binds FINALIZATION to its body hash and exact run revision", () => {
    const evidenceBody = body();
    const evidenceBodyHash = sha256(canonicalJsonV1(evidenceBody));
    const finalization = Object.freeze({
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_RUN_FINALIZATION_V3",
      disposition: "FINALIZED_TRUSTED_EXACT_HEAD",
      evidenceBodyHash,
      scoredRunRevision: "a".repeat(40),
      trustedRevision: "a".repeat(40),
      finalClean: true,
      preparedAt: "2026-08-18T10:00:11.000Z",
      notAfter: "2026-08-18T10:15:00.000Z",
    });
    expect(classifyGateEEvidenceRecordV3({
      evidenceHash: sha256(canonicalJsonV1(finalization)),
      evidence: finalization,
      notAfter: "2026-08-18T10:15:00.000Z",
    })).toMatchObject({
      recordKind: "FINALIZATION",
      scoredRunRevision: "a".repeat(40),
      evidenceBodyHash,
    });
  });
});
