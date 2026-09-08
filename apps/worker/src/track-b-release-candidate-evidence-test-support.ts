import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GATE_E_CANDIDATE_SOURCE_PATHS_V1 } from "./gate-e-registration.js";
import {
  TRACK_B_GATE_E_V22_MANIFEST_PATH,
  TRACK_B_REQUIRED_MIGRATION_ARTIFACTS,
} from "./track-b-release-candidate-evidence.js";

/** Accepted v22 source; distinct from the earlier Gate E scoring revision. */
export const TRACK_B_V22_ACCEPTED_RELEASE_SOURCE_REVISION =
  "b0aeb8907dae4ae2d9051b409ba25fa3f17fd188";

const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const HISTORICAL_PATHS = Object.freeze([
  ...new Set([
    ...GATE_E_CANDIDATE_SOURCE_PATHS_V1,
    TRACK_B_GATE_E_V22_MANIFEST_PATH,
    ...TRACK_B_REQUIRED_MIGRATION_ARTIFACTS.map((artifact) => artifact.path),
  ]),
]);

interface HistoricalBlob {
  readonly blobOid: string;
  readonly content: string;
}

function gitText(args: readonly string[]): Promise<string> {
  return new Promise((resolveOutput, rejectOutput) => {
    execFile("git", args, {
      cwd: sourceRoot,
      encoding: "utf8",
      windowsHide: true,
    }, (error, stdout) => {
      if (error) {
        rejectOutput(error);
        return;
      }
      resolveOutput(stdout);
    });
  });
}

function gitBatch(input: string): Promise<Buffer> {
  return new Promise((resolveOutput, rejectOutput) => {
    const child = spawn("git", ["cat-file", "--batch"], {
      cwd: sourceRoot,
      windowsHide: true,
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.once("error", rejectOutput);
    child.once("close", (code) => {
      if (code !== 0) {
        rejectOutput(new Error("TRACK_B_TEST_HISTORICAL_BLOB_READ_FAILED"));
        return;
      }
      resolveOutput(Buffer.concat(chunks));
    });
    child.stdin.end(input, "utf8");
  });
}

let historicalBlobs: Promise<ReadonlyMap<string, HistoricalBlob>> | undefined;

function loadHistoricalBlobs(): Promise<ReadonlyMap<string, HistoricalBlob>> {
  historicalBlobs ??= (async () => {
    const tree = await gitText([
      "ls-tree",
      "-r",
      "--full-tree",
      "-z",
      TRACK_B_V22_ACCEPTED_RELEASE_SOURCE_REVISION,
      "--",
      ...HISTORICAL_PATHS,
    ]);
    const entries = tree.split("\0").filter(Boolean).map((line) => {
      const match = /^(?:[0-7]{6}) blob ([a-f0-9]{40})\t(.+)$/u.exec(line);
      if (!match?.[1] || !match[2]) {
        throw new Error("TRACK_B_TEST_HISTORICAL_TREE_INVALID");
      }
      return { blobOid: match[1], path: match[2] };
    });
    if (entries.length !== HISTORICAL_PATHS.length ||
        HISTORICAL_PATHS.some((path) => !entries.some((entry) => entry.path === path))) {
      throw new Error("TRACK_B_TEST_HISTORICAL_PATH_SET_INVALID");
    }

    const batch = await gitBatch(`${entries.map((entry) => entry.blobOid).join("\n")}\n`);
    const blobs = new Map<string, HistoricalBlob>();
    let offset = 0;
    for (const entry of entries) {
      const headerEnd = batch.indexOf(0x0a, offset);
      if (headerEnd < 0) throw new Error("TRACK_B_TEST_HISTORICAL_BLOB_HEADER_INVALID");
      const [blobOid, type, sizeText] = batch.subarray(offset, headerEnd).toString("utf8").split(" ");
      const size = Number(sizeText);
      const contentStart = headerEnd + 1;
      const contentEnd = contentStart + size;
      if (blobOid !== entry.blobOid || type !== "blob" || !Number.isSafeInteger(size) ||
          contentEnd >= batch.length || batch[contentEnd] !== 0x0a) {
        throw new Error("TRACK_B_TEST_HISTORICAL_BLOB_INVALID");
      }
      blobs.set(entry.path, Object.freeze({
        blobOid: entry.blobOid,
        content: batch.subarray(contentStart, contentEnd).toString("utf8"),
      }));
      offset = contentEnd + 1;
    }
    if (offset !== batch.length) throw new Error("TRACK_B_TEST_HISTORICAL_BLOB_TRAILING_DATA");
    return blobs;
  })();
  return historicalBlobs;
}

async function historicalBlob(revision: string, path: string): Promise<HistoricalBlob> {
  if (revision !== TRACK_B_V22_ACCEPTED_RELEASE_SOURCE_REVISION) {
    throw new Error("TRACK_B_TEST_HISTORICAL_REVISION_INVALID");
  }
  const blob = (await loadHistoricalBlobs()).get(path);
  if (!blob) throw new Error("TRACK_B_TEST_HISTORICAL_BLOB_MISSING");
  return blob;
}

export const TRACK_B_V22_HISTORICAL_BLOB_READER = Object.freeze({
  readBlob: async (revision: string, path: string) => (await historicalBlob(revision, path)).content,
  resolveBlobOid: async (revision: string, path: string) => (await historicalBlob(revision, path)).blobOid,
});
