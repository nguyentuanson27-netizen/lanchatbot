import { canonicalJsonV1 } from "@lana/contracts";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGateEScoredRunGitReader } from "./gate-e-git-reader.js";
import {
  prepareTrackBReleaseCandidateEvidence,
  validateTrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidenceValidation,
  type TrackBReleaseCandidateSourceReader,
} from "./track-b-release-candidate-evidence.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const GIT_OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;

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

export async function runTrackBReleaseCandidateEvidenceCli(input: Readonly<{
  activationReleaseRevision: string;
  git: TrackBReleaseCandidateSourceReader;
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
  const result = await runTrackBReleaseCandidateEvidenceCli({
    activationReleaseRevision,
    git: createTrackBReleaseCandidateCliGitReader(process.cwd()),
  });
  process.stdout.write(`${canonicalJsonV1(result)}\n`);
  if (result.status !== "SOURCE_READY_NO_ACTIVATION" || result.validation.status !== "MATCHED") {
    process.exitCode = 1;
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
