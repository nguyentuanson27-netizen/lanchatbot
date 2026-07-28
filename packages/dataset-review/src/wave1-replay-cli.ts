import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildWave1ReplayReport,
  parseWave1ReplayFixtureSet,
} from "./wave1-replay.js";

function option(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (required && (!value || value.startsWith("--"))) {
    throw new Error(`CLI_OPTION_REQUIRED:${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const fixturePath = resolve(option("--fixtures")!);
  const outputPath = option("--output", false);
  const fixtureSet = parseWave1ReplayFixtureSet(
    JSON.parse(await readFile(fixturePath, "utf8")) as unknown,
  );
  const report = buildWave1ReplayReport(fixtureSet);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await writeFile(resolve(outputPath), serialized, "utf8");
  } else {
    process.stdout.write(serialized);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  process.stderr.write(`wave1-replay failed: ${message}\n`);
  process.exitCode = 1;
});
