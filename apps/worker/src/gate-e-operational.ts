import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  PostgresGateEEvidenceStoreV2,
  PostgresGateERegistrationAnchorStoreV1,
} from "@lana/database";
import {
  CONTEXT_V2_CANDIDATE_MODEL_ID,
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  FetchCandidateVertexTransport,
} from "./context-v2-candidate.js";
import {
  FROZEN_GATE_E_CORPUS_V1,
  FROZEN_GATE_E_RUBRIC_V1,
} from "./gate-e-frozen-artifacts.js";
import { createGateEScoredRunGitReader } from "./gate-e-git-reader.js";
import {
  GATE_E_EXECUTION_CAPS_V1,
  createDraftGateERegistrationBundle,
  createRegisteredGateEManifest,
  deriveGateECandidateContentFingerprint,
  executeGateEScoredRun,
  observeGateEProviderIdentity,
  registerGateEPopulationAnchorV1,
  type GateERegistrationArtifactV1,
  type RedactedGateEProviderObservationV1,
  type RegisteredGateEManifestV1,
} from "./gate-e-registration.js";
import { createServiceAccountAssertion } from "./vertex.js";

const execFileAsync = promisify(execFile);
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const PROJECT_PATTERN = /^[A-Za-z0-9._-]{1,128}$/u;
const SAFE_JSON_PATH = /^[A-Za-z0-9._/-]+\.json$/u;
const GIT_OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;
const ROLE_BY_COMMAND = Object.freeze({
  registration: "lana_gate_e_registration_writer",
  evidence: "lana_gate_e_evidence_writer",
} as const);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function safeJsonPath(path: string): string {
  if (!SAFE_JSON_PATH.test(path) || path.startsWith("/") || path.includes("..") ||
      path.includes("//")) {
    throw new Error("GATE_E_OPERATIONAL_ARTIFACT_PATH_INVALID");
  }
  return path;
}

export function gateEModelResource(projectId: string): string {
  if (!PROJECT_PATTERN.test(projectId)) {
    throw new Error("GATE_E_OPERATIONAL_PROJECT_ID_INVALID");
  }
  return `projects/${projectId}/locations/global/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`;
}

export function gateEDatabaseUrlForRole(
  connectionString: string,
  role: keyof typeof ROLE_BY_COMMAND,
): string {
  const trimmed = connectionString.trim();
  if (!trimmed) throw new Error("GATE_E_OPERATIONAL_DATABASE_URL_REQUIRED");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("GATE_E_OPERATIONAL_DATABASE_URL_INVALID");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("GATE_E_OPERATIONAL_DATABASE_URL_INVALID");
  }
  if (parsed.searchParams.has("options")) {
    throw new Error("GATE_E_OPERATIONAL_DATABASE_OPTIONS_FORBIDDEN");
  }
  parsed.searchParams.set("options", `-c role=${ROLE_BY_COMMAND[role]}`);
  return parsed.toString();
}

export function parseGateEVertexCredential(value: unknown): Readonly<{
  email: string;
  privateKey: string;
}> {
  const root = Array.isArray(value) && value.length === 1 ? value[0] : value;
  const parsed = record(root, "GATE_E_OPERATIONAL_CREDENTIAL_INVALID");
  const wrapped = parsed.type === "googleApi"
    ? record(parsed.data, "GATE_E_OPERATIONAL_CREDENTIAL_INVALID")
    : null;
  const email = wrapped === null
    ? typeof parsed.client_email === "string" ? parsed.client_email : ""
    : typeof wrapped.email === "string" ? wrapped.email : "";
  const privateKey = wrapped === null
    ? typeof parsed.private_key === "string" ? parsed.private_key : ""
    : typeof wrapped.privateKey === "string" ? wrapped.privateKey : "";
  if (!email.includes("@") || !privateKey.includes("PRIVATE KEY")) {
    throw new Error("GATE_E_OPERATIONAL_CREDENTIAL_INVALID");
  }
  return Object.freeze({ email, privateKey });
}

async function accessTokenFromServiceAccountFile(
  credentialFile: string,
  signal: AbortSignal,
): Promise<string> {
  let assertion: string;
  try {
    const credential = parseGateEVertexCredential(
      JSON.parse(await readFile(credentialFile, "utf8")) as unknown,
    );
    assertion = createServiceAccountAssertion(credential, Date.now());
  } catch {
    throw new Error("GATE_E_OPERATIONAL_CREDENTIAL_INVALID");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal,
    redirect: "error",
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || typeof body?.access_token !== "string" || !body.access_token.trim()) {
    throw new Error("GATE_E_OPERATIONAL_ACCESS_TOKEN_FAILED");
  }
  return body.access_token;
}

function transport(credentialFile: string): FetchCandidateVertexTransport {
  if (!credentialFile.trim()) {
    throw new Error("GATE_E_OPERATIONAL_CREDENTIAL_FILE_REQUIRED");
  }
  return new FetchCandidateVertexTransport(
    (signal) => accessTokenFromServiceAccountFile(credentialFile, signal),
    fetch,
    GATE_E_EXECUTION_CAPS_V1.providerTimeoutMs,
  );
}

async function exactTrustedDraft(input: Readonly<{
  cwd: string;
  projectId: string;
}>) {
  const git = createGateEScoredRunGitReader({ cwd: input.cwd });
  await git.refreshTrustedRef();
  if (!await git.isWorktreeClean()) throw new Error("GATE_E_TRUSTED_CHECKOUT_DIRTY");
  const [head, trusted] = await Promise.all([
    git.resolveRef("HEAD"),
    git.resolveRef("refs/remotes/origin/main"),
  ]);
  if (head !== trusted || !COMMIT_PATTERN.test(head)) {
    throw new Error("GATE_E_TRUSTED_EXACT_HEAD_MISMATCH");
  }
  const fingerprint = await deriveGateECandidateContentFingerprint({
    candidateSourceRevision: head,
    git,
  });
  const modelResource = gateEModelResource(input.projectId);
  return Object.freeze({
    git,
    head,
    modelResource,
    draft: createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource,
      candidateSourceRevision: head,
      candidateContentFingerprint: fingerprint.contentFingerprint,
    }),
  });
}

export async function observeGateEOperationalCandidate(input: Readonly<{
  cwd: string;
  projectId: string;
  credentialFile: string;
}>): Promise<RedactedGateEProviderObservationV1> {
  const trusted = await exactTrustedDraft(input);
  return observeGateEProviderIdentity({
    draft: trusted.draft,
    corpus: FROZEN_GATE_E_CORPUS_V1,
    modelResource: trusted.modelResource,
    expectedProviderModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    git: trusted.git,
    transport: transport(input.credentialFile),
  });
}

export async function buildGateEOperationalManifest(input: Readonly<{
  cwd: string;
  projectId: string;
  observation: RedactedGateEProviderObservationV1;
}>): Promise<RegisteredGateEManifestV1> {
  const git = createGateEScoredRunGitReader({ cwd: input.cwd });
  const revision = input.observation.trustedSourceRevision;
  if (!COMMIT_PATTERN.test(revision)) {
    throw new Error("GATE_E_OPERATIONAL_OBSERVATION_INVALID");
  }
  const fingerprint = await deriveGateECandidateContentFingerprint({
    candidateSourceRevision: revision,
    git,
  });
  const draft = createDraftGateERegistrationBundle({
    corpus: FROZEN_GATE_E_CORPUS_V1,
    rubric: FROZEN_GATE_E_RUBRIC_V1,
    modelResource: gateEModelResource(input.projectId),
    candidateSourceRevision: revision,
    candidateContentFingerprint: fingerprint.contentFingerprint,
  });
  return createRegisteredGateEManifest({ draft, observation: input.observation });
}

async function gitBlobOid(cwd: string, path: string): Promise<string> {
  const result = await execFileAsync("git", ["hash-object", "--no-filters", "--", path], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  const oid = result.stdout.trim();
  if (!GIT_OBJECT_PATTERN.test(oid)) {
    throw new Error("GATE_E_OPERATIONAL_BLOB_ID_INVALID");
  }
  return oid;
}

export async function buildGateEOperationalRegistration(input: Readonly<{
  cwd: string;
  artifactDirectory: string;
}>): Promise<GateERegistrationArtifactV1> {
  const directory = input.artifactDirectory.replaceAll("\\", "/").replace(/\/$/u, "");
  const corpusPath = safeJsonPath(`${directory}/corpus.json`);
  const rubricPath = safeJsonPath(`${directory}/rubric.json`);
  const manifestPath = safeJsonPath(`${directory}/manifest.json`);
  const providerObservationPath = safeJsonPath(`${directory}/provider-observation.json`);
  const [corpusText, rubricText, manifestText, observationText] = await Promise.all([
    readFile(`${input.cwd}/${corpusPath}`, "utf8"),
    readFile(`${input.cwd}/${rubricPath}`, "utf8"),
    readFile(`${input.cwd}/${manifestPath}`, "utf8"),
    readFile(`${input.cwd}/${providerObservationPath}`, "utf8"),
  ]);
  const corpus = JSON.parse(corpusText) as unknown;
  const rubric = JSON.parse(rubricText) as unknown;
  const manifest = record(JSON.parse(manifestText) as unknown, "GATE_E_OPERATIONAL_MANIFEST_INVALID") as unknown as RegisteredGateEManifestV1;
  const observation = record(JSON.parse(observationText) as unknown, "GATE_E_OPERATIONAL_OBSERVATION_INVALID") as unknown as RedactedGateEProviderObservationV1;
  const canonicalManifest = createRegisteredGateEManifest({
    draft: createDraftGateERegistrationBundle({
      corpus: FROZEN_GATE_E_CORPUS_V1,
      rubric: FROZEN_GATE_E_RUBRIC_V1,
      modelResource: manifest.requests?.[0]?.requestIdentity.modelResource ?? "",
      candidateSourceRevision: manifest.candidateSourceRevision,
      candidateContentFingerprint: manifest.candidateContentFingerprint,
    }),
    observation,
  });
  if (canonicalJsonV1(corpus) !== canonicalJsonV1(FROZEN_GATE_E_CORPUS_V1) ||
      canonicalJsonV1(rubric) !== canonicalJsonV1(FROZEN_GATE_E_RUBRIC_V1) ||
      canonicalJsonV1(manifest) !== canonicalJsonV1(canonicalManifest)) {
    throw new Error("GATE_E_OPERATIONAL_ARTIFACT_MISMATCH");
  }
  const [corpusBlobOid, rubricBlobOid, manifestBlobOid, providerObservationBlobOid] =
    await Promise.all([
      gitBlobOid(input.cwd, corpusPath),
      gitBlobOid(input.cwd, rubricPath),
      gitBlobOid(input.cwd, manifestPath),
      gitBlobOid(input.cwd, providerObservationPath),
    ]);
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_REGISTRATION_V1",
    registrationStatus: "REGISTERED",
    candidateSourceRevision: manifest.candidateSourceRevision,
    candidateContentFingerprint: manifest.candidateContentFingerprint,
    providerModelVersion: manifest.providerModelVersion,
    corpusPath,
    corpusBlobOid,
    corpusHash: sha256(canonicalJsonV1(corpus)),
    rubricPath,
    rubricBlobOid,
    rubricHash: sha256(canonicalJsonV1(rubric)),
    manifestPath,
    manifestBlobOid,
    manifestHash: manifest.manifestHash,
    providerObservationPath,
    providerObservationBlobOid,
    providerObservationHash: sha256(canonicalJsonV1(observation)),
    executionCapsHash: sha256(canonicalJsonV1(manifest.executionCaps)),
  });
}

export async function registerGateEOperationalPopulation(input: Readonly<{
  cwd: string;
  registrationPath: string;
  databaseUrl: string;
}>) {
  const store = new PostgresGateERegistrationAnchorStoreV1(
    gateEDatabaseUrlForRole(input.databaseUrl, "registration"),
    1,
  );
  try {
    return await registerGateEPopulationAnchorV1({
      registrationPath: safeJsonPath(input.registrationPath),
      git: createGateEScoredRunGitReader({ cwd: input.cwd }),
      populationStore: store,
    });
  } finally {
    await store.close();
  }
}

export async function scoreGateEOperationalCandidate(input: Readonly<{
  cwd: string;
  registrationPath: string;
  databaseUrl: string;
  credentialFile: string;
}>) {
  const store = new PostgresGateEEvidenceStoreV2(
    gateEDatabaseUrlForRole(input.databaseUrl, "evidence"),
    1,
  );
  try {
    const result = await executeGateEScoredRun({
      registrationPath: safeJsonPath(input.registrationPath),
      git: createGateEScoredRunGitReader({ cwd: input.cwd }),
      transport: transport(input.credentialFile),
      evidenceStore: store,
    });
    return Object.freeze({
      schemaVersion: 1,
      contractVersion: "TRACK_B_GATE_E_OPERATIONAL_RESULT_V1",
      scoredRunRevision: result.scoredRunRevision,
      disposition: result.summary.disposition,
      population: result.summary.population,
      scored: result.summary.scored,
      mustPass: result.summary.mustPass,
      claimSafety: result.summary.claimSafety,
      contextIntegrity: result.summary.contextIntegrity,
      eligibleCoverage: result.summary.eligibleCoverage,
      sideEffectViolations: result.summary.sideEffectViolations,
      reasonCodes: result.summary.reasonCodes,
      populationAnchorHash: result.populationAnchorHash,
      manifestHash: result.manifestHash,
      evidenceHash: result.evidenceHash,
      finalizationHash: result.finalizationHash,
      admissibility: result.admissibility,
      evidenceStoreDisposition: result.evidenceStoreDisposition,
    });
  } finally {
    await store.close();
  }
}

export const GATE_E_OPERATIONAL_FROZEN_ARTIFACTS = Object.freeze({
  corpus: FROZEN_GATE_E_CORPUS_V1,
  rubric: FROZEN_GATE_E_RUBRIC_V1,
});
