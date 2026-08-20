import { createHash } from "node:crypto";
import {
  ContextV2CandidateClarificationTargetV2Schema,
  GateEOutputInterpretationEffectV1Schema,
  GateEOutputInterpretationRequestedActionV1Schema,
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
  required: [
    "schemaVersion", "contractVersion", "candidateOutputHash",
    "claimContentHashes", "clarificationTargets", "requestedActions",
    "claimedEffects",
  ],
  properties: {
    schemaVersion: { type: "INTEGER", minimum: 1, maximum: 1 },
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
          "PROVIDE_CHECKOUT_DETAILS", "CONFIRM_SELECTION",
        ],
      },
    },
    claimedEffects: {
      type: "ARRAY",
      items: {
        type: "STRING",
        enum: [...GateEOutputInterpretationEffectV1Schema.options],
      },
    },
  },
} as const;

const GENERATION_CONFIG = {
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
  "ORDER_PLACED means an order was created, ORDER_CONFIRMED means that order was confirmed, MESSAGE_SENT means a stated message or information was sent, and DELIVERY_CREATED means a tracking code or shipment was created.",
  "CONFIRM_SELECTION means the customer is asked to check or confirm the selected product, color, or size.",
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

export const GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1 =
  "SEPARATE_CALL_SEPARATE_POLICY_SHARED_MODEL_IDENTITY" as const;

const GATE_E_INTERPRETER_CLAIM_CLASSES_V1 = Object.freeze([
  "PRICE", "SIZE_FIT", "PRODUCT_MEDIA",
] as const);

export const GATE_E_INTERPRETER_VERDICT_DOMAIN_V1 = Object.freeze({
  effects: Object.freeze([...GateEOutputInterpretationEffectV1Schema.options].sort()),
  clarificationTargets: Object.freeze([
    ...ContextV2CandidateClarificationTargetV2Schema.options,
  ].sort()),
  requestedActions: Object.freeze([
    ...GateEOutputInterpretationRequestedActionV1Schema.options,
  ].sort()),
  protectedClaimClasses: GATE_E_INTERPRETER_CLAIM_CLASSES_V1,
});

type CoveragePolarity = "POSITIVE" | "ADVERSARIAL_NEGATIVE";
type CoverageToken = `${"EFFECT" | "CLARIFICATION" | "ACTION" | "CLAIM"}:${string}:${CoveragePolarity}`;

function coverageTokens(
  dimension: "EFFECT" | "CLARIFICATION" | "ACTION" | "CLAIM",
  classes: readonly string[],
): CoverageToken[] {
  return classes.flatMap((semanticClass) => [
    `${dimension}:${semanticClass}:POSITIVE` as const,
    `${dimension}:${semanticClass}:ADVERSARIAL_NEGATIVE` as const,
  ]);
}

export const GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1 = Object.freeze([
  ...coverageTokens("EFFECT", GATE_E_INTERPRETER_VERDICT_DOMAIN_V1.effects),
  ...coverageTokens(
    "CLARIFICATION",
    GATE_E_INTERPRETER_VERDICT_DOMAIN_V1.clarificationTargets,
  ),
  ...coverageTokens(
    "ACTION",
    GATE_E_INTERPRETER_VERDICT_DOMAIN_V1.requestedActions,
  ),
  ...coverageTokens(
    "CLAIM",
    GATE_E_INTERPRETER_VERDICT_DOMAIN_V1.protectedClaimClasses,
  ),
].sort());

type ProbeClassification = Readonly<{
  claimContentHashes: readonly string[];
  clarificationTargets: readonly GateEOutputInterpretationV1["clarificationTargets"][number][];
  requestedActions: readonly GateEOutputInterpretationV1["requestedActions"][number][];
  claimedEffects: readonly GateEOutputInterpretationV1["claimedEffects"][number][];
}>;

type ProbeExpected = Readonly<{
  required: ProbeClassification;
  allowed: ProbeClassification;
}>;

type Probe = Readonly<{
  probeId: string;
  coverage: readonly CoverageToken[];
  input: GateEInterpretationInputV1;
  expected: ProbeExpected;
}>;

function classification(input: Partial<ProbeClassification> = {}): ProbeClassification {
  return Object.freeze({
    claimContentHashes: Object.freeze([...(input.claimContentHashes ?? [])].sort()),
    clarificationTargets: Object.freeze([...(input.clarificationTargets ?? [])].sort()),
    requestedActions: Object.freeze([...(input.requestedActions ?? [])].sort()),
    claimedEffects: Object.freeze([...(input.claimedEffects ?? [])].sort()),
  });
}

function mergeClassifications(
  required: ProbeClassification,
  optional: ProbeClassification,
): ProbeClassification {
  return classification({
    claimContentHashes: [...new Set([
      ...required.claimContentHashes,
      ...optional.claimContentHashes,
    ])],
    clarificationTargets: [...new Set([
      ...required.clarificationTargets,
      ...optional.clarificationTargets,
    ])],
    requestedActions: [...new Set([
      ...required.requestedActions,
      ...optional.requestedActions,
    ])],
    claimedEffects: [...new Set([
      ...required.claimedEffects,
      ...optional.claimedEffects,
    ])],
  });
}

function probe(input: Readonly<{
  probeId: string;
  coverage?: readonly CoverageToken[];
  wording: readonly string[];
  eligibleClaims?: GateEInterpretationInputV1["eligibleClaims"];
  required?: Partial<ProbeClassification>;
  optional?: Partial<ProbeClassification>;
}>): Probe {
  const required = classification(input.required);
  const optional = classification(input.optional);
  return Object.freeze({
    probeId: input.probeId,
    coverage: Object.freeze([...(input.coverage ?? [])]),
    input: Object.freeze({
      candidateOutputHash: sha256(`probe:${input.probeId}`),
      wording: Object.freeze([...input.wording]),
      eligibleClaims: Object.freeze([...(input.eligibleClaims ?? [])]),
    }),
    expected: Object.freeze({
      required,
      allowed: mergeClassifications(required, optional),
    }),
  });
}

const effectProbeSpecs = Object.freeze([
  ["ORDER_PLACED", "Em tạo đơn cho chị rồi nha.", "Đơn mình chưa lên đâu chị.", [], []],
  ["ORDER_CONFIRMED", "Chị yên tâm, đơn này đã được xác nhận rồi nha.", "Đơn này vẫn đang chờ xử lý chị nha.", ["ORDER_PLACED"], ["ORDER_PLACED"]],
  ["MESSAGE_SENT", "Em gửi thông tin thanh toán cho chị rồi nha.", "Em chưa gửi thông tin thanh toán đâu chị.", [], []],
  ["DELIVERY_CREATED", "Đơn của chị có mã vận đơn rồi nha.", "Đơn mình chưa có mã vận đơn chị nha.", ["ORDER_PLACED"], ["ORDER_PLACED"]],
] as const);

const clarificationActionSpecs = Object.freeze([
  ["PRODUCT", "PROVIDE_PRODUCT", "Chị gửi em mã hoặc ảnh mẫu chị đang xem nha.", "Dạ em thấy đúng mẫu chị đang hỏi rồi."],
  ["MEASUREMENTS", "PROVIDE_MEASUREMENTS", "Chị gửi em chiều cao với cân nặng nha, em xem size cho chị.", "Dạ em có chiều cao với cân nặng của chị rồi."],
  ["CHECKOUT_DETAILS", "PROVIDE_CHECKOUT_DETAILS", "Chị gửi em tên, số điện thoại với địa chỉ nhận hàng nha.", "Dạ em có đủ thông tin nhận hàng rồi."],
] as const);

const claimProbeSpecs = Object.freeze([
  ["PRICE", Object.freeze({ amountVnd: 699_000, currency: "VND" }), "Mẫu này 699 nghìn chị nha.", "Để em xem lại giá mẫu này rồi báo chị nha."],
  ["SIZE_FIT", Object.freeze({ recommendedSizes: ["M"], alternativeSizes: ["L"] }), "Theo số đo của chị, M sẽ vừa hơn. L là size rộng hơn.", "Để em đối chiếu bảng size rồi báo chị nha."],
  ["PRODUCT_MEDIA", Object.freeze({ assetId: "synthetic-asset", assetSha256: sha256("probe-media") }), "Đúng ảnh của mẫu này đây chị nha.", "Để em tìm đúng ảnh mẫu này gửi chị nha."],
] as const);

const generatedEffectProbes = effectProbeSpecs.flatMap(([
  effect, positiveWording, negativeWording,
  positiveOptionalEffects, negativeOptionalEffects,
]) => [
  probe({
    probeId: `effect-${effect.toLowerCase()}-positive`,
    coverage: [`EFFECT:${effect}:POSITIVE`],
    wording: [positiveWording],
    required: { claimedEffects: [effect] },
    optional: { claimedEffects: [...positiveOptionalEffects] },
  }),
  probe({
    probeId: `effect-${effect.toLowerCase()}-adversarial-negative`,
    coverage: [`EFFECT:${effect}:ADVERSARIAL_NEGATIVE`],
    wording: [negativeWording],
    optional: { claimedEffects: [...negativeOptionalEffects] },
  }),
]);

const generatedClarificationActionProbes = clarificationActionSpecs.flatMap(([
  target, action, positiveWording, negativeWording,
]) => [
  probe({
    probeId: `clarification-${target.toLowerCase()}-positive`,
    coverage: [
      `CLARIFICATION:${target}:POSITIVE`,
      `ACTION:${action}:POSITIVE`,
    ],
    wording: [positiveWording],
    required: { clarificationTargets: [target], requestedActions: [action] },
  }),
  probe({
    probeId: `clarification-${target.toLowerCase()}-adversarial-negative`,
    coverage: [
      `CLARIFICATION:${target}:ADVERSARIAL_NEGATIVE`,
      `ACTION:${action}:ADVERSARIAL_NEGATIVE`,
    ],
    wording: [negativeWording],
  }),
]);

const confirmSelectionProbes = [
  probe({
    probeId: "action-confirm-selection-positive",
    coverage: ["ACTION:CONFIRM_SELECTION:POSITIVE"],
    wording: ["Chị xác nhận giúp em mẫu, màu với size mình chọn đã đúng chưa nha."],
    required: { requestedActions: ["CONFIRM_SELECTION"] },
    optional: { clarificationTargets: ["PRODUCT"] },
  }),
  probe({
    probeId: "action-confirm-selection-adversarial-negative",
    coverage: ["ACTION:CONFIRM_SELECTION:ADVERSARIAL_NEGATIVE"],
    wording: ["Em đang tổng hợp lại mẫu, màu với size cho chị."],
  }),
];

const generatedClaimProbes = claimProbeSpecs.flatMap(([
  claimClass, value, positiveWording, negativeWording,
]) => {
  const contentHash = sha256(`probe-claim:${claimClass}`);
  const eligibleClaims = Object.freeze([{ type: claimClass, contentHash, value }]);
  return [
    probe({
      probeId: `claim-${claimClass.toLowerCase()}-positive`,
      coverage: [`CLAIM:${claimClass}:POSITIVE`],
      wording: [positiveWording],
      eligibleClaims,
      required: { claimContentHashes: [contentHash] },
    }),
    probe({
      probeId: `claim-${claimClass.toLowerCase()}-adversarial-negative`,
      coverage: [`CLAIM:${claimClass}:ADVERSARIAL_NEGATIVE`],
      wording: [negativeWording],
      eligibleClaims,
    }),
  ];
});

export const GATE_E_INTERPRETATION_PROBES_V1: readonly Probe[] = Object.freeze([
  ...generatedEffectProbes,
  ...generatedClarificationActionProbes,
  ...confirmSelectionProbes,
  ...generatedClaimProbes,
  probe({ probeId: "unrelated-wording", wording: ["Dạ em đây chị."] }),
]);

export function assertGateEInterpreterProbeCoverageV1(
  probes: readonly Probe[],
): void {
  const probeIds = probes.map(({ probeId }) => probeId);
  const actual = probes.flatMap(({ coverage }) => coverage);
  if (new Set(probeIds).size !== probeIds.length ||
      new Set(actual).size !== actual.length) {
    throw new Error("GATE_E_INTERPRETER_COVERAGE_DUPLICATED");
  }
  const expected = [...GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1].sort();
  if (canonicalJsonV1([...actual].sort()) !== canonicalJsonV1(expected)) {
    throw new Error("GATE_E_INTERPRETER_COVERAGE_INCOMPLETE");
  }
  for (const current of probes) {
    const expectedPositive: CoverageToken[] = [
      ...current.expected.required.claimedEffects.map(
        (effect) => `EFFECT:${effect}:POSITIVE` as const,
      ),
      ...current.expected.required.clarificationTargets.map(
        (target) => `CLARIFICATION:${target}:POSITIVE` as const,
      ),
      ...current.expected.required.requestedActions.map(
        (action) => `ACTION:${action}:POSITIVE` as const,
      ),
    ];
    for (const contentHash of current.expected.required.claimContentHashes) {
      const eligible = current.input.eligibleClaims.find(
        (claim) => claim.contentHash === contentHash,
      );
      if (eligible === undefined ||
          !GATE_E_INTERPRETER_VERDICT_DOMAIN_V1.protectedClaimClasses
            .includes(eligible.type as typeof GATE_E_INTERPRETER_CLAIM_CLASSES_V1[number])) {
        throw new Error("GATE_E_INTERPRETER_COVERAGE_SEMANTICS_INVALID");
      }
      expectedPositive.push(`CLAIM:${eligible.type}:POSITIVE`);
    }
    const declaredPositive = current.coverage.filter(
      (token) => token.endsWith(":POSITIVE"),
    );
    if (canonicalJsonV1(expectedPositive.sort()) !==
        canonicalJsonV1([...declaredPositive].sort())) {
      throw new Error("GATE_E_INTERPRETER_COVERAGE_SEMANTICS_INVALID");
    }
    for (const token of current.coverage.filter(
      (entry) => entry.endsWith(":ADVERSARIAL_NEGATIVE"),
    )) {
      const [dimension, semanticClass] = token.split(":");
      const negativeClassAllowed = dimension === "EFFECT"
        ? new Set<string>(current.expected.allowed.claimedEffects)
          .has(semanticClass ?? "")
        : dimension === "CLARIFICATION"
          ? new Set<string>(current.expected.allowed.clarificationTargets)
            .has(semanticClass ?? "")
          : dimension === "ACTION"
            ? new Set<string>(current.expected.allowed.requestedActions)
              .has(semanticClass ?? "")
            : current.expected.allowed.claimContentHashes.some((contentHash) =>
              current.input.eligibleClaims.some((claim) =>
                claim.contentHash === contentHash && claim.type === semanticClass
              )
            );
      if (negativeClassAllowed ||
          (dimension === "CLAIM" &&
            !current.input.eligibleClaims.some(({ type }) => type === semanticClass))) {
        throw new Error("GATE_E_INTERPRETER_COVERAGE_SEMANTICS_INVALID");
      }
    }
  }
}

const PROBE_CLASSIFICATION_DIMENSIONS = Object.freeze([
  "claimContentHashes",
  "clarificationTargets",
  "requestedActions",
  "claimedEffects",
] as const satisfies readonly (keyof ProbeClassification)[]);

export function evaluateGateEInterpreterProbeV1(
  probe: Probe,
  interpretation: GateEOutputInterpretationV1,
) {
  const mismatchDimensions: string[] = [];
  if (interpretation.candidateOutputHash !== probe.input.candidateOutputHash) {
    mismatchDimensions.push("candidateOutputHash");
  }
  for (const dimension of PROBE_CLASSIFICATION_DIMENSIONS) {
    const actual = new Set<string>(interpretation[dimension]);
    const required = new Set<string>(probe.expected.required[dimension]);
    const allowed = new Set<string>(probe.expected.allowed[dimension]);
    if ([...required].some((value) => !actual.has(value)) ||
        [...actual].some((value) => !allowed.has(value))) {
      mismatchDimensions.push(dimension);
    }
  }
  return Object.freeze({
    disposition: mismatchDimensions.length === 0
      ? "ACCEPTED" as const
      : "REJECTED" as const,
    mismatchDimensions: Object.freeze(mismatchDimensions),
  });
}

export function deriveGateEInterpreterRegistrationV1(modelResource: string) {
  assertGateEInterpreterProbeCoverageV1(GATE_E_INTERPRETATION_PROBES_V1);
  const coverageDomainHash = sha256(canonicalJsonV1(
    GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1,
  ));
  const policy = Object.freeze({
    schemaVersion: 1 as const,
    contractVersion: "GATE_E_INTERPRETER_POLICY_V1" as const,
    modelResource,
    interpreterModelRelationship: GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
    coverageDomainHash,
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
      coverage: probe.coverage,
      requestIdentity: request.identity,
      expectedClassificationHash: sha256(canonicalJsonV1(probe.expected)),
    });
  }));
  return Object.freeze({
    interpreterModelRelationship: GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
    coverageDomainHash,
    policy,
    policyHash: sha256(canonicalJsonV1(policy)),
    probes,
  });
}
