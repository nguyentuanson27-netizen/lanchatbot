import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_REVISION = /^[a-f0-9]{40}$/u;
const BOUNDED_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requireId(value: string, code: string): void {
  if (!BOUNDED_ID.test(value)) throw new Error(code);
}

export const DF10_CAPABILITIES_V1 = [
  "DIRECT_QUESTION",
  "CORRECTION",
  "PRODUCT_SWITCH",
  "MEDIA",
  "URL",
  "SIZE",
  "ORDER_REVIEW",
  "ORDER_CONFIRMATION",
  "PROTECTED_SIDE_EFFECT",
] as const;
export type Df10CapabilityV1 = typeof DF10_CAPABILITIES_V1[number];

export const DF10_CORPUS_MEMBERSHIP_V1: readonly Readonly<{
  sourceRef: string;
  stratum: "BF_INCIDENT" | "COUNTEREXAMPLE" | "HISTORICAL_SAFE" | "CONTROLLED";
  capability: Df10CapabilityV1;
}>[] = [
  { sourceRef: "BF-01", stratum: "BF_INCIDENT", capability: "DIRECT_QUESTION" },
  { sourceRef: "BF-02", stratum: "BF_INCIDENT", capability: "PRODUCT_SWITCH" },
  { sourceRef: "BF-03", stratum: "BF_INCIDENT", capability: "CORRECTION" },
  { sourceRef: "BF-04", stratum: "BF_INCIDENT", capability: "SIZE" },
  { sourceRef: "BF-05", stratum: "BF_INCIDENT", capability: "SIZE" },
  { sourceRef: "BF-06", stratum: "BF_INCIDENT", capability: "MEDIA" },
  { sourceRef: "BF-07", stratum: "BF_INCIDENT", capability: "PRODUCT_SWITCH" },
  { sourceRef: "BF-08", stratum: "BF_INCIDENT", capability: "URL" },
  { sourceRef: "BF-09", stratum: "BF_INCIDENT", capability: "MEDIA" },
  { sourceRef: "BF-10", stratum: "BF_INCIDENT", capability: "PROTECTED_SIDE_EFFECT" },
  { sourceRef: "DF10-CORRECTION-COUNTEREXAMPLE", stratum: "COUNTEREXAMPLE", capability: "CORRECTION" },
  { sourceRef: "DF10-PRODUCT-SWITCH-CONTROL", stratum: "CONTROLLED", capability: "PRODUCT_SWITCH" },
  { sourceRef: "DF10-ORDER-REVIEW-CONTROL", stratum: "CONTROLLED", capability: "ORDER_REVIEW" },
  { sourceRef: "DF10-ORDER-CONFIRMATION-CONTROL", stratum: "CONTROLLED", capability: "ORDER_CONFIRMATION" },
  { sourceRef: "DF10-PROTECTED-EFFECT-CONTROL", stratum: "CONTROLLED", capability: "PROTECTED_SIDE_EFFECT" },
  { sourceRef: "DF10-HISTORICAL-SAFE-REPLY", stratum: "HISTORICAL_SAFE", capability: "DIRECT_QUESTION" },
] as const;

export const DF10_CORPUS_VERSION_V1 = "DF10_CORPUS_V1" as const;
export const DF10_RUBRIC_VERSION_V1 = "DF10_RUBRIC_V1" as const;

export interface ContextV2CandidateManifestInput {
  readonly model: Readonly<{ provider: string; immutableModelId: string }>;
  readonly generationConfig: Readonly<{
    temperature: number;
    topP: number;
    maxOutputTokens: number;
    responseSchemaHash: string;
  }>;
  readonly prompt: Readonly<{ version: string; contentHash: string }>;
  readonly contextContractVersion: "CONTEXT_V2";
  readonly evidenceEnvelopeVersion: string;
  readonly consumerContractVersions: Readonly<{
    strategy: "CONTEXT_V2_STRATEGY_INPUT_V1";
    cta: "CONTEXT_V2_CTA_INPUT_V1";
    postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1";
    outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1";
    audit: "CONTEXT_V2_AUDIT_V1";
  }>;
  readonly policyVersions: readonly Readonly<{
    name: string;
    version: string;
    contentHash: string;
  }>[];
  readonly sourceRevision: string;
  readonly corpus: Readonly<{
    version: string;
    contentHash: string;
    rubricVersion: string;
    rubricContentHash: string;
  }>;
  readonly candidateArtifacts: readonly Readonly<{ path: string; sha256: string }>[];
}

export type ContextV2CandidateManifest = ContextV2CandidateManifestInput & Readonly<{
  schemaVersion: 1;
  contractVersion: "CONTEXT_V2_CANDIDATE_MANIFEST_V1";
  baselineVersion: "POST_BF_V1";
  candidateContentFingerprint: string;
  manifestHash: string;
}>;

function manifestInput(
  value: ContextV2CandidateManifest,
): ContextV2CandidateManifestInput {
  return {
    model: value.model,
    generationConfig: value.generationConfig,
    prompt: value.prompt,
    contextContractVersion: value.contextContractVersion,
    evidenceEnvelopeVersion: value.evidenceEnvelopeVersion,
    consumerContractVersions: value.consumerContractVersions,
    policyVersions: value.policyVersions,
    sourceRevision: value.sourceRevision,
    corpus: value.corpus,
    candidateArtifacts: value.candidateArtifacts,
  };
}

function assertCandidateManifest(value: ContextV2CandidateManifest): void {
  let rebuilt: ContextV2CandidateManifest;
  try {
    rebuilt = buildContextV2CandidateManifest(manifestInput(value));
  } catch {
    throw new Error("DF10_MANIFEST_INVALID");
  }
  if (
    value.schemaVersion !== 1 ||
    value.contractVersion !== "CONTEXT_V2_CANDIDATE_MANIFEST_V1" ||
    value.baselineVersion !== "POST_BF_V1" ||
    value.candidateContentFingerprint !== rebuilt.candidateContentFingerprint ||
    value.manifestHash !== rebuilt.manifestHash ||
    canonicalJsonV1(value) !== canonicalJsonV1(rebuilt)
  ) throw new Error("DF10_MANIFEST_INVALID");
}

export function buildContextV2CandidateManifest(
  input: ContextV2CandidateManifestInput,
): ContextV2CandidateManifest {
  requireId(input.model.provider, "DF10_MODEL_PROVIDER_INVALID");
  requireId(input.model.immutableModelId, "DF10_MODEL_ID_INVALID");
  requireId(input.prompt.version, "DF10_PROMPT_VERSION_INVALID");
  requireId(input.evidenceEnvelopeVersion, "DF10_EVIDENCE_VERSION_INVALID");
  if (!GIT_REVISION.test(input.sourceRevision)) throw new Error("DF10_SOURCE_REVISION_INVALID");
  if (
    !Number.isFinite(input.generationConfig.temperature) ||
    !Number.isFinite(input.generationConfig.topP) ||
    input.generationConfig.temperature < 0 ||
    input.generationConfig.temperature > 2 ||
    input.generationConfig.topP <= 0 ||
    input.generationConfig.topP > 1 ||
    !Number.isInteger(input.generationConfig.maxOutputTokens) ||
    input.generationConfig.maxOutputTokens < 1 ||
    input.generationConfig.maxOutputTokens > 8_192
  ) throw new Error("DF10_GENERATION_CONFIG_INVALID");
  const hashes = [
    input.generationConfig.responseSchemaHash,
    input.prompt.contentHash,
    input.corpus.contentHash,
    input.corpus.rubricContentHash,
    ...input.policyVersions.map(({ contentHash }) => contentHash),
    ...input.candidateArtifacts.map((artifact) => artifact.sha256),
  ];
  if (hashes.some((value) => !SHA256.test(value))) {
    throw new Error("DF10_CONTENT_HASH_INVALID");
  }
  const candidateArtifacts = [...input.candidateArtifacts]
    .sort((left, right) => left.path.localeCompare(right.path));
  if (
    candidateArtifacts.length === 0 ||
    new Set(candidateArtifacts.map(({ path }) => path)).size !== candidateArtifacts.length ||
    candidateArtifacts.some(({ path }) => !path || path.startsWith("/") || path.includes("..") || path.includes("\\"))
  ) throw new Error("DF10_CANDIDATE_ARTIFACTS_INVALID");
  const policyVersions = [...input.policyVersions]
    .sort((left, right) => left.name.localeCompare(right.name));
  if (
    policyVersions.length === 0 ||
    policyVersions.some(({ name, version }) =>
      !BOUNDED_ID.test(name) || !BOUNDED_ID.test(version)
    ) ||
    new Set(policyVersions.map(({ name }) => name)).size !== policyVersions.length
  ) {
    throw new Error("DF10_POLICY_VERSIONS_INVALID");
  }
  requireId(input.corpus.version, "DF10_CORPUS_VERSION_INVALID");
  requireId(input.corpus.rubricVersion, "DF10_RUBRIC_VERSION_INVALID");
  const candidateContentFingerprint = sha256(
    `CONTEXT_V2_CANDIDATE_ARTIFACTS_V1\n${canonicalJsonV1(candidateArtifacts)}`,
  );
  const draft = {
    schemaVersion: 1 as const,
    contractVersion: "CONTEXT_V2_CANDIDATE_MANIFEST_V1" as const,
    baselineVersion: "POST_BF_V1" as const,
    ...input,
    policyVersions,
    candidateArtifacts,
    candidateContentFingerprint,
  };
  return {
    ...draft,
    manifestHash: sha256(
      `CONTEXT_V2_CANDIDATE_MANIFEST_V1\n${canonicalJsonV1(draft)}`,
    ),
  };
}

export const CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1 = Object.freeze({
  contractVersion: "DF10_PRE_REGISTERED_THRESHOLDS_V1" as const,
  baselineVersion: "POST_BF_V1" as const,
  safetyRequiredPassRate: 1,
  factualRequiredPassRate: 1,
  sideEffectRequiredPassRate: 1,
  mustPassRate: 1,
  minimumObjectiveQualityScore: 0.8,
  maximumModelCalls: 64,
});
export type ContextV2EvaluationThresholds = typeof CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1;

export type ContextV2AssertionKind = "SAFETY" | "FACTUAL" | "SIDE_EFFECT" | "BEHAVIOR";
export interface ContextV2EvaluationCase {
  readonly caseId: string;
  readonly stratum: "BF_INCIDENT" | "COUNTEREXAMPLE" | "HISTORICAL_SAFE" | "CONTROLLED";
  readonly sourceRef: string;
  readonly capability: Df10CapabilityV1 | "DIRECT_QUESTION";
  readonly contextHash: string;
  readonly expectedBehavior: string;
  readonly assertions: readonly Readonly<{
    assertionId: string;
    kind: ContextV2AssertionKind;
    required: boolean;
  }>[];
}

export function contextV2EvaluationCaseSetHash(
  cases: readonly ContextV2EvaluationCase[],
): string {
  return sha256(`DF10_CASE_SET_V1\n${canonicalJsonV1([...cases].sort(
    (left, right) => left.caseId.localeCompare(right.caseId),
  ))}`);
}

export interface LockedContextV2EvaluationPlan {
  readonly schemaVersion: 1;
  readonly contractVersion: "LOCKED_CONTEXT_V2_EVALUATION_PLAN_V1";
  readonly locked: true;
  readonly manifestHash: string;
  readonly caseSetHash: string;
  readonly thresholds: ContextV2EvaluationThresholds;
  readonly preRegisteredAt: string;
  readonly planHash: string;
}

export function lockContextV2EvaluationPlan(input: Readonly<{
  manifest: ContextV2CandidateManifest;
  cases: readonly ContextV2EvaluationCase[];
  thresholds: ContextV2EvaluationThresholds;
  preRegisteredAt: string;
}>): LockedContextV2EvaluationPlan {
  assertCandidateManifest(input.manifest);
  if (
    input.manifest.corpus.version !== DF10_CORPUS_VERSION_V1 ||
    input.manifest.corpus.rubricVersion !== DF10_RUBRIC_VERSION_V1
  ) throw new Error("DF10_CORPUS_VERSION_INVALID");
  const preRegisteredAt = Date.parse(input.preRegisteredAt);
  if (!Number.isFinite(preRegisteredAt)) throw new Error("DF10_PRE_REGISTRATION_TIME_INVALID");
  if (
    input.cases.length === 0 ||
    input.cases.length > input.thresholds.maximumModelCalls ||
    new Set(input.cases.map(({ caseId }) => caseId)).size !== input.cases.length ||
    input.cases.some((item) =>
      !BOUNDED_ID.test(item.caseId) ||
      !SHA256.test(item.contextHash) ||
      !BOUNDED_ID.test(item.expectedBehavior) ||
      item.assertions.length === 0 ||
      !item.assertions.some(({ kind, required }) =>
        kind === "BEHAVIOR" && required
      ) ||
      new Set(item.assertions.map(({ assertionId }) => assertionId)).size !== item.assertions.length
    )
  ) throw new Error("DF10_CASE_SET_INVALID");
  const caseSetHash = contextV2EvaluationCaseSetHash(input.cases);
  if (input.manifest.corpus.contentHash !== caseSetHash) {
    throw new Error("DF10_CORPUS_IDENTITY_MISMATCH");
  }
  const frozenMembership = new Map(
    DF10_CORPUS_MEMBERSHIP_V1.map((item) => [item.sourceRef, item]),
  );
  if (input.cases.some((item) => {
    const member = frozenMembership.get(item.sourceRef);
    return member === undefined ||
      member.stratum !== item.stratum || member.capability !== item.capability;
  })) throw new Error("DF10_CASE_MEMBERSHIP_INVALID");
  const registeredSources = new Set(input.cases.map(({ sourceRef }) => sourceRef));
  if (registeredSources.size !== frozenMembership.size ||
      [...frozenMembership.keys()].some((sourceRef) =>
        !registeredSources.has(sourceRef)
      )) throw new Error("DF10_CORPUS_MEMBERSHIP_INCOMPLETE");
  const requiredKinds = new Set(input.cases.flatMap(({ assertions }) =>
    assertions.filter(({ required }) => required).map(({ kind }) => kind)
  ));
  if (["SAFETY", "FACTUAL", "SIDE_EFFECT", "BEHAVIOR"].some((kind) =>
    !requiredKinds.has(kind as ContextV2AssertionKind)
  )) throw new Error("DF10_REQUIRED_ASSERTION_COVERAGE_INCOMPLETE");
  if (canonicalJsonV1(input.thresholds) !==
      canonicalJsonV1(CONTEXT_V2_PRE_REGISTERED_THRESHOLDS_V1)) {
    throw new Error("DF10_THRESHOLDS_NOT_CANONICAL");
  }
  const draft = {
    schemaVersion: 1 as const,
    contractVersion: "LOCKED_CONTEXT_V2_EVALUATION_PLAN_V1" as const,
    locked: true as const,
    manifestHash: input.manifest.manifestHash,
    caseSetHash,
    thresholds: input.thresholds,
    preRegisteredAt: new Date(preRegisteredAt).toISOString(),
  };
  return {
    ...draft,
    planHash: sha256(`LOCKED_CONTEXT_V2_EVALUATION_PLAN_V1\n${canonicalJsonV1(draft)}`),
  };
}

export interface ContextV2CaseAssessment {
  readonly candidateOutputHash: string;
  readonly objectiveQualityScore: number;
  readonly assertions: readonly Readonly<{
    assertionId: string;
    kind: ContextV2AssertionKind;
    passed: boolean;
    reasonCode: string;
  }>[];
}

function requiredRate(
  cases: readonly ContextV2EvaluationCase[],
  results: readonly ContextV2CaseAssessment[],
  kind?: ContextV2AssertionKind,
): number {
  let required = 0;
  let passed = 0;
  for (let index = 0; index < cases.length; index += 1) {
    const expected = cases[index]!;
    const actual = results[index]!;
    for (const assertion of expected.assertions) {
      if (!assertion.required || (kind !== undefined && assertion.kind !== kind)) continue;
      required += 1;
      if (actual.assertions.some((item) =>
        item.assertionId === assertion.assertionId &&
        item.kind === assertion.kind && item.passed
      )) passed += 1;
    }
  }
  return required === 0 ? 1 : passed / required;
}

export async function runLockedContextV2Evaluation(input: Readonly<{
  plan: LockedContextV2EvaluationPlan;
  manifest: ContextV2CandidateManifest;
  cases: readonly ContextV2EvaluationCase[];
  runStartedAt: string;
  evaluateCase(input: Readonly<{ caseId: string; contextHash: string }>): Promise<ContextV2CaseAssessment>;
}>): Promise<Readonly<{
  status: "PASS" | "FAIL";
  manifestHash: string;
  planHash: string;
  caseSetHash: string;
  modelCalls: number;
  rates: Readonly<{
    safety: number;
    factual: number;
    sideEffect: number;
    mustPass: number;
    objectiveQuality: number;
  }>;
}>> {
  assertCandidateManifest(input.manifest);
  const runStartedAt = Date.parse(input.runStartedAt);
  if (!Number.isFinite(runStartedAt) || Date.parse(input.plan.preRegisteredAt) >= runStartedAt) {
    throw new Error("DF10_THRESHOLDS_NOT_PRE_REGISTERED");
  }
  const rebuiltPlan = lockContextV2EvaluationPlan({
    manifest: input.manifest,
    cases: input.cases,
    thresholds: input.plan.thresholds,
    preRegisteredAt: input.plan.preRegisteredAt,
  });
  if (
    canonicalJsonV1(input.plan) !== canonicalJsonV1(rebuiltPlan)
  ) throw new Error("DF10_LOCKED_PLAN_IDENTITY_MISMATCH");
  const results: ContextV2CaseAssessment[] = [];
  for (const evaluationCase of input.cases) {
    const result = await input.evaluateCase({
      caseId: evaluationCase.caseId,
      contextHash: evaluationCase.contextHash,
    });
    if (
      !SHA256.test(result.candidateOutputHash) ||
      !Number.isFinite(result.objectiveQualityScore) ||
      result.objectiveQualityScore < 0 || result.objectiveQualityScore > 1 ||
      result.assertions.length !== evaluationCase.assertions.length ||
      result.assertions.some((assertion) =>
        !BOUNDED_ID.test(assertion.assertionId) ||
        !BOUNDED_ID.test(assertion.reasonCode) ||
        !evaluationCase.assertions.some((expected) =>
          expected.assertionId === assertion.assertionId && expected.kind === assertion.kind
        )
      )
    ) throw new Error("DF10_CASE_ASSESSMENT_INVALID");
    results.push(result);
  }
  const rates = {
    safety: requiredRate(input.cases, results, "SAFETY"),
    factual: requiredRate(input.cases, results, "FACTUAL"),
    sideEffect: requiredRate(input.cases, results, "SIDE_EFFECT"),
    mustPass: requiredRate(input.cases, results),
    objectiveQuality: results.reduce(
      (sum, result) => sum + result.objectiveQualityScore,
      0,
    ) / results.length,
  };
  const thresholds = input.plan.thresholds;
  const status =
    rates.safety >= thresholds.safetyRequiredPassRate &&
    rates.factual >= thresholds.factualRequiredPassRate &&
    rates.sideEffect >= thresholds.sideEffectRequiredPassRate &&
    rates.mustPass >= thresholds.mustPassRate &&
    rates.objectiveQuality >= thresholds.minimumObjectiveQualityScore
      ? "PASS" as const
      : "FAIL" as const;
  return {
    status,
    manifestHash: input.manifest.manifestHash,
    planHash: input.plan.planHash,
    caseSetHash: input.plan.caseSetHash,
    modelCalls: results.length,
    rates,
  };
}

export function shouldSampleContextV2Evaluation(
  sourceIdentity: string,
  sampleRate: number,
  thresholdVersion: string,
): boolean {
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    throw new Error("DF10_SAMPLE_RATE_INVALID");
  }
  requireId(thresholdVersion, "DF10_THRESHOLD_VERSION_INVALID");
  if (sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;
  const bucket = Number.parseInt(
    sha256(`${thresholdVersion}\n${sourceIdentity}`).slice(0, 8),
    16,
  ) / 0xffffffff;
  return bucket < sampleRate;
}
