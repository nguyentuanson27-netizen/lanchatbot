import { canonicalJsonV1 } from "@lana/contracts";
import { PostgresGateEEvidenceStoreV2 } from "@lana/database";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createGateEScoredRunGitReader } from "./gate-e-git-reader.js";
import { gateEDatabaseUrlForRole } from "./gate-e-operational.js";
import {
  resolveTrackBPreprodDatabaseUrl,
  TRACK_B_PREPROD_POSTGRES_CONTAINER,
} from "./track-b-preprod-database-endpoint.js";
import type { GateEEvidenceReaderV2 } from "./gate-e-registration.js";
import {
  prepareTrackBReleaseCandidateEvidence,
  validateTrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidenceValidation,
  type TrackBReleaseCandidateSourceReader,
} from "./track-b-release-candidate-evidence.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const GIT_OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;
const execFileAsync = promisify(execFile);

export type TrackBReleaseCandidateEvidenceCliResult = Readonly<{
  schemaVersion: 1;
  contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_V1";
  status: TrackBReleaseCandidateEvidence["status"];
  sideEffects: TrackBReleaseCandidateEvidence["sideEffects"];
  evidence: TrackBReleaseCandidateEvidence;
  validation: TrackBReleaseCandidateEvidenceValidation;
}>;

export function parseTrackBReleaseCandidateEvidenceCliArgs(
  args: readonly string[],
): Readonly<{ activationReleaseRevision: string }> {
  const [option, activationReleaseRevision] = args;
  if (
    args.length !== 2 ||
    option !== "--revision" ||
    !activationReleaseRevision ||
    !COMMIT_PATTERN.test(activationReleaseRevision)
  ) throw new Error("TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_ARGUMENTS_INVALID");
  return Object.freeze({ activationReleaseRevision });
}

export function resolveTrackBReleaseCandidateEvidenceDatabaseUrl(
  databaseUrl: string,
  inspection: unknown,
): string {
  try {
    return resolveTrackBPreprodDatabaseUrl(databaseUrl, inspection);
  } catch {
    throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_ENDPOINT_UNPROVEN");
  }
}

async function resolveGateEEvidenceDatabaseUrl(databaseUrl: string): Promise<string> {
  let inspection: unknown;
  try {
    const inspected = await execFileAsync("docker", ["inspect", TRACK_B_PREPROD_POSTGRES_CONTAINER], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    [inspection] = JSON.parse(inspected.stdout) as unknown[];
  } catch {
    throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_ENDPOINT_UNPROVEN");
  }
  return resolveTrackBReleaseCandidateEvidenceDatabaseUrl(databaseUrl, inspection);
}

export async function runTrackBReleaseCandidateEvidenceCli(input: Readonly<{
  activationReleaseRevision: string;
  git: TrackBReleaseCandidateSourceReader;
  evidenceStore: GateEEvidenceReaderV2;
}>): Promise<TrackBReleaseCandidateEvidenceCliResult> {
  const evidence = await prepareTrackBReleaseCandidateEvidence(input);
  const validation = validateTrackBReleaseCandidateEvidence(evidence, {
    activationReleaseRevision: input.activationReleaseRevision,
  });
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_V1",
    status: evidence.status,
    sideEffects: evidence.sideEffects,
    evidence,
    validation,
  });
}

function createTrackBReleaseCandidateCliGitReader(
  cwd: string,
): TrackBReleaseCandidateSourceReader {
  const reader = createGateEScoredRunGitReader({ cwd });
  return Object.freeze({
    ...reader,
    resolveTreeOid: (commit: string) => new Promise<string>((resolveTree, rejectTree) => {
      if (!COMMIT_PATTERN.test(commit)) {
        rejectTree(new Error("TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_COMMIT_INVALID"));
        return;
      }
      execFile("git", ["rev-parse", "--verify", `${commit}^{tree}`], {
        cwd,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      }, (error, stdout) => {
        const treeOid = stdout.trim();
        if (error || !GIT_OBJECT_PATTERN.test(treeOid)) {
          rejectTree(new Error("TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_TREE_UNAVAILABLE"));
          return;
        }
        resolveTree(treeOid);
      });
    }),
  });
}

async function main(): Promise<void> {
  const { activationReleaseRevision } = parseTrackBReleaseCandidateEvidenceCliArgs(
    process.argv.slice(2),
  );
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl) throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_URL_REQUIRED");
  const resolvedDatabaseUrl = await resolveGateEEvidenceDatabaseUrl(databaseUrl);
  const evidenceStore = new PostgresGateEEvidenceStoreV2(
    gateEDatabaseUrlForRole(resolvedDatabaseUrl, "evidence"),
  );
  try {
    const result = await runTrackBReleaseCandidateEvidenceCli({
      activationReleaseRevision,
      git: createTrackBReleaseCandidateCliGitReader(process.cwd()),
      evidenceStore,
    });
    process.stdout.write(`${canonicalJsonV1(result)}\n`);
    if (result.status !== "SOURCE_READY_NO_ACTIVATION" || result.validation.status !== "MATCHED") {
      process.exitCode = 1;
    }
  } finally {
    await evidenceStore.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error
      ? error.message
      : "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_FAILED";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
