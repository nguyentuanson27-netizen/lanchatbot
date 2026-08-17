import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  GATE_E_INTERPRETATION_PROBES_V1,
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
        expectedClassificationHash: hash(canonicalJsonV1(probe.expected)),
      });
    }
    expect(registration.policyHash).toBe(hash(canonicalJsonV1(registration.policy)));
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
