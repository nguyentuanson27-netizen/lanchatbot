export const GATE_E_FULL_POPULATION_POLICY_V1 = Object.freeze({
  inclusion: "ALL_FROZEN_CORPUS_ITEMS" as const,
  eligibleCoverageMinimum: 1 as const,
});

export const GATE_E_FROZEN_REGISTRATION_POLICY_V1 = Object.freeze({
  schemaVersion: 1,
  contractVersion: "DF10_GATE_E_FROZEN_REGISTRATION_POLICY_V1",
  corpusVersion: "FROZEN_POST_GATE_BF_V1_CORPUS_V1",
  corpusCanonicalSha256:
    "e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd",
  rubricVersion: "DF10_GATE_E_RUBRIC_V1",
  rubricCanonicalSha256:
    "89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986",
  outputContractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
  populationPolicy: GATE_E_FULL_POPULATION_POLICY_V1,
} as const);
