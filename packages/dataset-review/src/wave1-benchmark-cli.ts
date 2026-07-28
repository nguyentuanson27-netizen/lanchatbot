import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  OFFICIAL_WAVE1_MANIFEST_SHA256,
  validateWave1BenchmarkBundle,
} from "./benchmark-bundle.js";
import {
  buildWave1BenchmarkFoundation,
  WAVE1_BENCHMARK_SPLIT_SEED,
} from "./wave1-benchmark-foundation.js";

interface Arguments {
  readonly gold: string;
  readonly history: string;
  readonly manifest: string;
  readonly expectedManifestSha256: string;
  readonly seed: string;
  readonly output: string | null;
}

function argumentsFrom(values: readonly string[]): Arguments {
  const parsed = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error("WAVE1_BENCHMARK_ARGUMENTS_INVALID");
    }
    parsed.set(key, value);
  }
  const gold = parsed.get("--gold");
  const history = parsed.get("--history");
  const manifest = parsed.get("--manifest");
  if (!gold || !history || !manifest) {
    throw new Error(
      "USAGE: wave1-benchmark --gold <file> --history <file> --manifest <file> " +
      "[--manifest-sha256 <hash>] [--seed <seed>] [--output <json>]",
    );
  }
  return {
    gold,
    history,
    manifest,
    expectedManifestSha256:
      parsed.get("--manifest-sha256") ?? OFFICIAL_WAVE1_MANIFEST_SHA256,
    seed: parsed.get("--seed") ?? WAVE1_BENCHMARK_SPLIT_SEED,
    output: parsed.get("--output") ?? null,
  };
}

export async function runWave1BenchmarkCli(values: readonly string[]): Promise<void> {
  const args = argumentsFrom(values);
  const [goldBytes, historyBytes, manifestBytes] = await Promise.all([
    readFile(args.gold),
    readFile(args.history),
    readFile(args.manifest),
  ]);
  const bundle = validateWave1BenchmarkBundle({
    goldBytes,
    historyBytes,
    manifestBytes,
    expectedManifestSha256: args.expectedManifestSha256,
    enforceOfficialCounts: true,
  });
  const { report } = buildWave1BenchmarkFoundation(bundle, args.seed);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.output) await writeFile(args.output, serialized, { encoding: "utf8", flag: "wx" });
  process.stdout.write(serialized);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  runWave1BenchmarkCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "WAVE1_BENCHMARK_FAILED"}\n`,
    );
    process.exitCode = 1;
  });
}
