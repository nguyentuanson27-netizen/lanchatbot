import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
  GATE_E_INTERPRETATION_PROBES_V1,
  GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1,
  assertGateEInterpreterProbeCoverageV1,
  buildGateEInterpretationRequest,
  deriveGateEInterpreterRegistrationV1,
  parseGateEInterpretationResponse,
} from "./gate-e-output-interpreter.js";

const modelResource =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const hash = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

describe("Gate E semantic interpreter capability boundary", () => {
  it("registers the static policy and exact calibration requests", () => {
    const registration = deriveGateEInterpreterRegistrationV1(modelResource);
    expect(registration.interpreterModelRelationship).toBe(
      GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
    );
    expect(registration.coverageDomainHash).toBe(
      hash(canonicalJsonV1(GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1)),
    );
    expect(registration.probes).toHaveLength(GATE_E_INTERPRETATION_PROBES_V1.length);
    for (const [index, probe] of GATE_E_INTERPRETATION_PROBES_V1.entries()) {
      const request = buildGateEInterpretationRequest({
        modelResource,
        interpretationInput: probe.input,
      });
      expect(registration.probes[index]).toMatchObject({
        probeId: probe.probeId,
        candidateOutputHash: probe.input.candidateOutputHash,
        requestIdentity: request.identity,
        coverage: probe.coverage,
        expectedClassificationHash: hash(canonicalJsonV1(probe.expected)),
      });
    }
    expect(registration.policyHash).toBe(hash(canonicalJsonV1(registration.policy)));
  });

  it("uses only Gemini 3.5 Flash-Lite compatible schema controls", () => {
    const request = buildGateEInterpretationRequest({
      modelResource,
      interpretationInput: GATE_E_INTERPRETATION_PROBES_V1[0]!.input,
    });
    const body = JSON.parse(request.body) as {
      generationConfig: {
        responseSchema: {
          additionalProperties?: unknown;
          properties: { schemaVersion: Record<string, unknown> };
        };
        temperature?: unknown;
        topP?: unknown;
      };
    };
    expect(body.generationConfig.responseSchema.properties.schemaVersion).toEqual({
      type: "INTEGER",
      minimum: 1,
      maximum: 1,
    });
    expect(body.generationConfig.responseSchema)
      .not.toHaveProperty("additionalProperties");
    expect(body.generationConfig).not.toHaveProperty("temperature");
    expect(body.generationConfig).not.toHaveProperty("topP");
  });

  it("closes the positive and adversarial-negative matrix for every verdict class", () => {
    expect(() => assertGateEInterpreterProbeCoverageV1(
      GATE_E_INTERPRETATION_PROBES_V1,
    )).not.toThrow();
    expect(GATE_E_INTERPRETATION_PROBES_V1.flatMap(({ coverage }) => coverage).sort())
      .toEqual([...GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1].sort());

    const missingOne = GATE_E_INTERPRETATION_PROBES_V1.map((probe, index) =>
      index === 0
        ? { ...probe, coverage: probe.coverage.slice(1) }
        : probe
    );
    expect(() => assertGateEInterpreterProbeCoverageV1(missingOne))
      .toThrow("GATE_E_INTERPRETER_COVERAGE_INCOMPLETE");

    const duplicated = [
      ...GATE_E_INTERPRETATION_PROBES_V1,
      GATE_E_INTERPRETATION_PROBES_V1[0]!,
    ];
    expect(() => assertGateEInterpreterProbeCoverageV1(duplicated))
      .toThrow("GATE_E_INTERPRETER_COVERAGE_DUPLICATED");

    const coverageSwappedBetweenOppositeExpectations =
      GATE_E_INTERPRETATION_PROBES_V1.map((probe, index) => {
        if (index === 0) {
          return { ...probe, coverage: GATE_E_INTERPRETATION_PROBES_V1[1]!.coverage };
        }
        if (index === 1) {
          return { ...probe, coverage: GATE_E_INTERPRETATION_PROBES_V1[0]!.coverage };
        }
        return probe;
      });
    expect(() => assertGateEInterpreterProbeCoverageV1(
      coverageSwappedBetweenOppositeExpectations,
    )).toThrow("GATE_E_INTERPRETER_COVERAGE_SEMANTICS_INVALID");
  });

  it("rejects candidate-authored semantic labels at the interpreter input boundary", () => {
    const input = {
      candidateOutputHash: hash("candidate"),
      wording: ["Xin chào chị."],
      eligibleClaims: [],
      claimedEffects: ["ORDER_PLACED"],
    };
    expect(() => buildGateEInterpretationRequest({
      modelResource,
      interpretationInput: input,
    })).toThrow("GATE_E_INTERPRETATION_INPUT_INVALID");
  });

  it("accepts only exact-hash, typed provider interpretations", () => {
    const candidateOutputHash = hash("candidate");
    expect(parseGateEInterpretationResponse({
      providerModelVersion: "gemini-3.5-flash-lite",
      payload: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        schemaVersion: 1,
        contractVersion: "GATE_E_OUTPUT_INTERPRETATION_V1",
        candidateOutputHash,
        claimContentHashes: [],
        clarificationTargets: [],
        requestedActions: [],
        claimedEffects: ["ORDER_PLACED", "CART_UPDATED"],
      }) }] } }] },
    })).toMatchObject({
      candidateOutputHash,
      claimedEffects: ["CART_UPDATED", "ORDER_PLACED"],
    });

    expect(() => parseGateEInterpretationResponse({
      providerModelVersion: "unknown",
      payload: {},
    })).toThrow("GATE_E_INTERPRETATION_PROVIDER_IDENTITY_MISMATCH");
  });
});
