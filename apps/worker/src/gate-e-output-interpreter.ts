import { createHash } from "node:crypto";
import {
  GateEOutputInterpretationV1Schema,
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
  type GateEOutputInterpretationV1,
} from "@lana/contracts";
import {
  CONTEXT_V2_CANDIDATE_MODEL_ID,
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  deriveCandidateRequestIdentity,
  sanitizeContextV2CandidateInput,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  additionalProperties: false,
  required: [
    "schemaVersion", "contractVersion", "candidateOutputHash",
    "claimContentHashes", "clarificationTargets", "requestedActions",
    "claimedEffects",
  ],
  properties: {
    schemaVersion: { type: "INTEGER", enum: [1] },
    contractVersion: {
      type: "STRING",
      enum: ["GATE_E_OUTPUT_INTERPRETATION_V1"],
    },
    candidateOutputHash: { type: "STRING" },
    claimContentHashes: { type: "ARRAY", items: { type: "STRING" } },
    clarificationTargets: {
      type: "ARRAY",
      items: {
        type: "STRING",
        enum: ["PRODUCT", "MEASUREMENTS", "CHECKOUT_DETAILS"],
      },
    },
    requestedActions: {
      type: "ARRAY",
      items: {
        type: "STRING",
        enum: [
          "PROVIDE_PRODUCT", "PROVIDE_MEASUREMENTS",
          "PROVIDE_CHECKOUT_DETAILS", "CONFIRM_CART",
        ],
      },
    },
    claimedEffects: {
      type: "ARRAY",
      items: {
        type: "STRING",
        enum: [
          "CART_OPENED", "CART_UPDATED", "ORDER_PLACED",
          "ORDER_CONFIRMED", "MESSAGE_SENT", "DELIVERY_CREATED",
        ],
      },
    },
  },
} as const;

const GENERATION_CONFIG = {
  temperature: 0,
  topP: 0.8,
  maxOutputTokens: 256,
  responseMimeType: "application/json",
  responseSchema: RESPONSE_SCHEMA,
} as const;

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
] as const;

const SYSTEM_INSTRUCTION = [
  "You are an evaluation-only semantic interpreter with no runtime authority.",
  "Classify only the customer-facing wording supplied in the input.",
  "Do not infer from or trust candidate-authored segment labels; none are supplied.",
  "Return every protected claim hash whose safe value is asserted, every clarification target, requested customer action, and claimed completed side effect.",
  "A completed effect includes paraphrases in any language. Requests are not completed effects.",
  "Return only the registered JSON schema.",
].join("\n");

const INTERPRETATION_INPUT_CONTRACT = Object.freeze({
  schemaVersion: 1,
  contractVersion: "GATE_E_INTERPRETATION_INPUT_V1",
  candidateOutputHash: "sha256(canonical candidate output)",
  wording: "ordered customer-facing text only; no candidate semantic labels",
  eligibleClaims: "sanitized verified claim type/contentHash/value only",
});

const MODEL_RESOURCE_PATTERN = new RegExp(
  `^projects\\/[A-Za-z0-9._-]{1,128}\\/locations\\/[A-Za-z0-9._-]{1,64}\\/publishers\\/google\\/models\\/${CONTEXT_V2_CANDIDATE_MODEL_ID.replaceAll(".", "\\.")}$`,
  "u",
);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function assertInterpretationInput(
  input: GateEInterpretationInputV1,
): void {
  if (!hasExactKeys(input as object, [
    "candidateOutputHash", "eligibleClaims", "wording",
  ]) ||
      !/^[a-f0-9]{64}$/u.test(input.candidateOutputHash) ||
      !Array.isArray(input.wording) || input.wording.length > 24 ||
      input.wording.some((text) => typeof text !== "string" ||
        text.length === 0 || text.length > 2_000) ||
      !Array.isArray(input.eligibleClaims) || input.eligibleClaims.length > 64 ||
      input.eligibleClaims.some((claim) =>
        claim === null || typeof claim !== "object" ||
        !hasExactKeys(claim as object, ["contentHash", "type", "value"]) ||
        typeof claim.type !== "string" || claim.type.length === 0 ||
        !/^[a-f0-9]{64}$/u.test(claim.contentHash) ||
        claim.value === null || typeof claim.value !== "object" ||
        Array.isArray(claim.value)
      )) {
    throw new Error("GATE_E_INTERPRETATION_INPUT_INVALID");
  }
}

export interface GateEInterpretationInputV1 {
  readonly candidateOutputHash: string;
  readonly wording: readonly string[];
  readonly eligibleClaims: readonly Readonly<{
    type: string;
    contentHash: string;
    value: Readonly<Record<string, unknown>>;
  }>[];
}

export function interpretationInputFromCandidate(input: Readonly<{
  context: ContextV2;
  output: ContextV2CandidateOutputV2;
}>): GateEInterpretationInputV1 {
  const sanitized = sanitizeContextV2CandidateInput(input.context);
  return Object.freeze({
    candidateOutputHash: sha256(canonicalJsonV1(input.output)),
    wording: Object.freeze(input.output.segments.map(({ text }) => text)),
    eligibleClaims: Object.freeze(sanitized.verifiedClaims.map((claim) => ({
      type: claim.type,
      contentHash: claim.provenance.contentHash,
      value: claim.value,
    }))),
  });
}

export function buildGateEInterpretationRequest(input: Readonly<{
  modelResource: string;
  interpretationInput: GateEInterpretationInputV1;
}>): BuiltCandidateRequest {
  if (!MODEL_RESOURCE_PATTERN.test(input.modelResource) ||
      !/^[a-f0-9]{64}$/u.test(input.interpretationInput.candidateOutputHash)) {
    throw new Error("GATE_E_INTERPRETATION_INPUT_INVALID");
  }
  assertInterpretationInput(input.interpretationInput);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{
      role: "user",
      parts: [{ text: canonicalJsonV1(input.interpretationInput) }],
    }],
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  });
  const url = `https://aiplatform.googleapis.com/v1/${input.modelResource}:generateContent`;
  return Object.freeze({
    url,
    body,
    identity: deriveCandidateRequestIdentity({ url, body }),
  });
}

function responseText(payload: unknown): string {
  const record = payload !== null && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const first = candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } } | undefined;
  const text = first?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("GATE_E_INTERPRETATION_MISSING");
  return text;
}

export function parseGateEInterpretationResponse(response: Readonly<{
  payload: unknown;
  providerModelVersion: string | null;
}>): GateEOutputInterpretationV1 {
  if (response.providerModelVersion !== CONTEXT_V2_CANDIDATE_PROVIDER_VERSION) {
    throw new Error("GATE_E_INTERPRETATION_PROVIDER_IDENTITY_MISMATCH");
  }
  try {
    const parsed = GateEOutputInterpretationV1Schema.parse(
      JSON.parse(responseText(response.payload)),
    );
    return Object.freeze({
      ...parsed,
      claimContentHashes: [...parsed.claimContentHashes].sort(),
      clarificationTargets: [...parsed.clarificationTargets].sort(),
      requestedActions: [...parsed.requestedActions].sort(),
      claimedEffects: [...parsed.claimedEffects].sort(),
    });
  } catch (error) {
    if (error instanceof Error &&
        error.message === "GATE_E_INTERPRETATION_PROVIDER_IDENTITY_MISMATCH") {
      throw error;
    }
    throw new Error("GATE_E_INTERPRETATION_RESPONSE_INVALID");
  }
}

export const GATE_E_INTERPRETATION_PROBES_V1 = Object.freeze([
  Object.freeze({
    probeId: "unrelated-wording",
    input: Object.freeze({
      candidateOutputHash: sha256("probe:unrelated-wording"),
      wording: Object.freeze(["Xin chào chị. Cảm ơn chị."]),
      eligibleClaims: Object.freeze([]),
    }),
    expected: Object.freeze({
      claimContentHashes: [], clarificationTargets: [], requestedActions: [],
      claimedEffects: [],
    }),
  }),
  Object.freeze({
    probeId: "vi-order-effect",
    input: Object.freeze({
      candidateOutputHash: sha256("probe:vi-order-effect"),
      wording: Object.freeze(["Em chốt đơn cho chị rồi ạ."]),
      eligibleClaims: Object.freeze([]),
    }),
    expected: Object.freeze({
      claimContentHashes: [], clarificationTargets: [], requestedActions: [],
      claimedEffects: ["ORDER_PLACED"],
    }),
  }),
  Object.freeze({
    probeId: "en-order-effect",
    input: Object.freeze({
      candidateOutputHash: sha256("probe:en-order-effect"),
      wording: Object.freeze(["I finished placing the order for you."]),
      eligibleClaims: Object.freeze([]),
    }),
    expected: Object.freeze({
      claimContentHashes: [], clarificationTargets: [], requestedActions: [],
      claimedEffects: ["ORDER_PLACED"],
    }),
  }),
  Object.freeze({
    probeId: "measurement-request",
    input: Object.freeze({
      candidateOutputHash: sha256("probe:measurement-request"),
      wording: Object.freeze(["Chị cho em xin số đo để tư vấn size nhé."]),
      eligibleClaims: Object.freeze([]),
    }),
    expected: Object.freeze({
      claimContentHashes: [], clarificationTargets: ["MEASUREMENTS"],
      requestedActions: ["PROVIDE_MEASUREMENTS"], claimedEffects: [],
    }),
  }),
] as const);

export function deriveGateEInterpreterRegistrationV1(modelResource: string) {
  const policy = Object.freeze({
    schemaVersion: 1 as const,
    contractVersion: "GATE_E_INTERPRETER_POLICY_V1" as const,
    modelResource,
    systemInstructionHash: sha256(SYSTEM_INSTRUCTION),
    generationConfigHash: sha256(canonicalJsonV1(GENERATION_CONFIG)),
    responseSchemaHash: sha256(canonicalJsonV1(RESPONSE_SCHEMA)),
    safetySettingsHash: sha256(canonicalJsonV1(SAFETY_SETTINGS)),
    inputContractHash: sha256(canonicalJsonV1(INTERPRETATION_INPUT_CONTRACT)),
  });
  const probes = Object.freeze(GATE_E_INTERPRETATION_PROBES_V1.map((probe) => {
    const request = buildGateEInterpretationRequest({
      modelResource,
      interpretationInput: probe.input,
    });
    return Object.freeze({
      probeId: probe.probeId,
      candidateOutputHash: probe.input.candidateOutputHash,
      requestIdentity: request.identity,
      expectedClassificationHash: sha256(canonicalJsonV1(probe.expected)),
    });
  }));
  return Object.freeze({
    policy,
    policyHash: sha256(canonicalJsonV1(policy)),
    probes,
  });
}
