import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  GATE_E_OPERATIONAL_FROZEN_ARTIFACTS,
  buildGateEOperationalManifest,
  buildGateEOperationalRegistration,
  observeGateEOperationalCandidate,
  registerGateEOperationalPopulation,
  scoreGateEOperationalCandidate,
} from "./gate-e-operational.js";
import type { RedactedGateEProviderObservationV1 } from "./gate-e-registration.js";

type Command =
  | "emit-corpus"
  | "emit-rubric"
  | "observe"
  | "build-manifest"
  | "build-registration"
  | "register-anchor"
  | "score";

function option(name: string, required = true): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() ?? "" : "";
  if (required && !value) throw new Error(`GATE_E_OPERATIONAL_OPTION_REQUIRED:${name}`);
  return value;
}

function projectId(): string {
  return option("--project-id", false) || process.env.VERTEX_PROJECT_ID?.trim() || "";
}

function credentialFile(): string {
  return option("--credential-file", false) ||
    process.env.VERTEX_CREDENTIAL_FILE?.trim() || "";
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim() ?? "";
  if (!value) throw new Error("GATE_E_OPERATIONAL_DATABASE_URL_REQUIRED");
  return value;
}

function command(value: string | undefined): Command {
  const allowed: readonly Command[] = [
    "emit-corpus",
    "emit-rubric",
    "observe",
    "build-manifest",
    "build-registration",
    "register-anchor",
    "score",
  ];
  if (!allowed.includes(value as Command)) {
    throw new Error("GATE_E_OPERATIONAL_COMMAND_INVALID");
  }
  return value as Command;
}

async function jsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function executeGateEOperationalCommand(input: Readonly<{
  command: Command;
  cwd: string;
}>): Promise<unknown> {
  switch (input.command) {
    case "emit-corpus":
      return GATE_E_OPERATIONAL_FROZEN_ARTIFACTS.corpus;
    case "emit-rubric":
      return GATE_E_OPERATIONAL_FROZEN_ARTIFACTS.rubric;
    case "observe":
      return observeGateEOperationalCandidate({
        cwd: input.cwd,
        projectId: projectId(),
        credentialFile: credentialFile(),
      });
    case "build-manifest":
      return buildGateEOperationalManifest({
        cwd: input.cwd,
        projectId: projectId(),
        observation: await jsonFile<RedactedGateEProviderObservationV1>(
          option("--observation-file"),
        ),
      });
    case "build-registration":
      return buildGateEOperationalRegistration({
        cwd: input.cwd,
        artifactDirectory: option("--artifact-directory"),
      });
    case "register-anchor": {
      const receipt = await registerGateEOperationalPopulation({
        cwd: input.cwd,
        registrationPath: option("--registration-path"),
        databaseUrl: databaseUrl(),
      });
      return {
        schemaVersion: 1,
        contractVersion: "TRACK_B_GATE_E_POPULATION_REGISTRATION_RESULT_V1",
        disposition: receipt.receipt.disposition,
        populationAnchorHash: receipt.receipt.populationAnchorHash,
        anchoredAt: receipt.receipt.anchoredAt,
      };
    }
    case "score":
      return scoreGateEOperationalCandidate({
        cwd: input.cwd,
        registrationPath: option("--registration-path"),
        databaseUrl: databaseUrl(),
        credentialFile: credentialFile(),
      });
  }
}

async function main(): Promise<void> {
  const result = await executeGateEOperationalCommand({
    command: command(process.argv[2]),
    cwd: process.cwd(),
  });
  process.stdout.write(`${canonicalJsonV1(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    const code = error instanceof Error && error.message.trim()
      ? error.message.trim().slice(0, 180)
      : "GATE_E_OPERATIONAL_FAILED";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}
