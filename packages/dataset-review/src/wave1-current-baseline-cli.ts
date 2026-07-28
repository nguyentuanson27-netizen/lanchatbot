import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  OFFICIAL_WAVE1_MANIFEST_SHA256,
  validateWave1BenchmarkBundle,
} from "./benchmark-bundle.js";
import { buildWave1CurrentBaseline } from "./current-deterministic-baseline.js";
import { buildWave1BenchmarkFoundation } from "./wave1-benchmark-foundation.js";

function option(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (required && (!value || value.startsWith("--"))) {
    throw new Error(`CLI_OPTION_REQUIRED:${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const goldPath = resolve(option("--gold")!);
  const historyPath = resolve(option("--history")!);
  const manifestPath = resolve(option("--manifest")!);
  const outputPath = option("--output", false);
  const bundle = validateWave1BenchmarkBundle({
    goldBytes: await readFile(goldPath),
    historyBytes: await readFile(historyPath),
    manifestBytes: await readFile(manifestPath),
    expectedManifestSha256:
      option("--manifest-sha256", false) ?? OFFICIAL_WAVE1_MANIFEST_SHA256,
  });
  const foundation = buildWave1BenchmarkFoundation(bundle);
  const report = buildWave1CurrentBaseline({
    bundle,
    split: foundation.plan,
    runManifest: foundation.report.runManifest,
  });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await writeFile(resolve(outputPath), serialized, "utf8");
  } else {
    process.stdout.write(serialized);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  process.stderr.write(`wave1-current-baseline failed: ${message}\n`);
  process.exitCode = 1;
});
