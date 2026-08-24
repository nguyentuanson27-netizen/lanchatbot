import { canonicalJsonV1 } from "@lana/contracts";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GATE_E_PREPROD_V15_BINDING,
  prepareDf13ReleaseCandidateEvidence,
  validateDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidenceValidation,
  type Df13ReleaseCandidateSourceReader,
} from "./df13-release-candidate-evidence.js";
import { createGateEScoredRunGitReader } from "./gate-e-git-reader.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const GIT_OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;

export type Df13ReleaseCandidateEvidenceCliResult = Readonly<{
  schemaVersion: 1;
  contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_V1";
  status: Df13ReleaseCandidateEvidence["status"];
  sideEffects: Df13ReleaseCandidateEvidence["sideEffects"];
  evidence: Df13ReleaseCandidateEvidence;
  validation: Df13ReleaseCandidateEvidenceValidation;
}>;

export function parseDf13ReleaseCandidateEvidenceCliArgs(
  args: readonly string[],
): Readonly<{ activationReleaseRevision: string }> {
  const [option, activationReleaseRevision] = args;
  if (
    args.length !== 2 ||
    option !== "--revision" ||
    !activationReleaseRevision ||
    !COMMIT_PATTERN.test(activationReleaseRevision)
  ) {
    throw new Error("DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_ARGUMENTS_INVALID");
  }
  return Object.freeze({ activationReleaseRevision });
}

/**
 * Produces self-hashed source evidence only. The underlying fixed-ref reader
 * refreshes origin/main and rejects any requested revision that is not the
 * refreshed trusted head; this helper never creates release artifacts or
 * contacts a runtime host.
 */
export async function runDf13ReleaseCandidateEvidenceCli(input: Readonly<{
  activationReleaseRevision: string;
  git: Df13ReleaseCandidateSourceReader;
}>): Promise<Df13ReleaseCandidateEvidenceCliResult> {
  const evidence = await prepareDf13ReleaseCandidateEvidence(input);
  const validation = validateDf13ReleaseCandidateEvidence(evidence, {
    activationReleaseRevision: input.activationReleaseRevision,
    gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
    gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
  });
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_V1",
    status: evidence.status,
    sideEffects: evidence.sideEffects,
    evidence,
    validation,
  });
}

function createDf13ReleaseCandidateCliGitReader(cwd: string): Df13ReleaseCandidateSourceReader {
  const reader = createGateEScoredRunGitReader({ cwd });
  return Object.freeze({
    ...reader,
    resolveTreeOid: (commit: string) => new Promise<string>((resolveTree, rejectTree) => {
      if (!COMMIT_PATTERN.test(commit)) {
        rejectTree(new Error("DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_COMMIT_INVALID"));
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
          rejectTree(new Error("DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_TREE_UNAVAILABLE"));
          return;
        }
        resolveTree(treeOid);
      });
    }),
  });
}

async function main(): Promise<void> {
  const { activationReleaseRevision } = parseDf13ReleaseCandidateEvidenceCliArgs(
    process.argv.slice(2),
  );
  const result = await runDf13ReleaseCandidateEvidenceCli({
    activationReleaseRevision,
    git: createDf13ReleaseCandidateCliGitReader(process.cwd()),
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
      : "DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_FAILED";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
