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

const OPTIONS_BY_COMMAND: Readonly<Record<Command, readonly string[]>> =
  Object.freeze({
    "emit-corpus": Object.freeze([]),
    "emit-rubric": Object.freeze([]),
    observe: Object.freeze(["--project-id", "--credential-file"]),
    "build-manifest": Object.freeze(["--project-id", "--observation-file"]),
    "build-registration": Object.freeze(["--artifact-directory"]),
    "register-anchor": Object.freeze(["--registration-path"]),
    score: Object.freeze(["--registration-path", "--credential-file"]),
  });

type Invocation = Readonly<{
  command: Command;
  options: ReadonlyMap<string, string>;
}>;

function option(
  options: ReadonlyMap<string, string>,
  name: string,
  required = true,
): string {
  const value = options.get(name)?.trim() ?? "";
  if (required && !value) throw new Error(`GATE_E_OPERATIONAL_OPTION_REQUIRED:${name}`);
  return value;
}

function projectId(options: ReadonlyMap<string, string>): string {
  return option(options, "--project-id", false) ||
    process.env.VERTEX_PROJECT_ID?.trim() || "";
}

function credentialFile(options: ReadonlyMap<string, string>): string {
  return option(options, "--credential-file", false) ||
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

export function parseGateEOperationalInvocation(
  argv: readonly string[],
): Invocation {
  const selectedCommand = command(argv[0]);
  const allowed = new Set(OPTIONS_BY_COMMAND[selectedCommand]);
  const options = new Map<string, string>();
  for (let index = 1; index < argv.length; index += 2) {
    const name = argv[index] ?? "";
    const value = argv[index + 1]?.trim() ?? "";
    if (!allowed.has(name)) {
      throw new Error(`GATE_E_OPERATIONAL_OPTION_INVALID:${name || "POSITIONAL"}`);
    }
    if (options.has(name)) {
      throw new Error(`GATE_E_OPERATIONAL_OPTION_DUPLICATE:${name}`);
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`GATE_E_OPERATIONAL_OPTION_VALUE_INVALID:${name}`);
    }
    options.set(name, value);
  }
  return Object.freeze({ command: selectedCommand, options });
}

async function jsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function executeGateEOperationalCommand(input: Readonly<{
  command: Command;
  cwd: string;
  options: ReadonlyMap<string, string>;
}>): Promise<unknown> {
  switch (input.command) {
    case "emit-corpus":
      return GATE_E_OPERATIONAL_FROZEN_ARTIFACTS.corpus;
    case "emit-rubric":
      return GATE_E_OPERATIONAL_FROZEN_ARTIFACTS.rubric;
    case "observe":
      return observeGateEOperationalCandidate({
        cwd: input.cwd,
        projectId: projectId(input.options),
        credentialFile: credentialFile(input.options),
      });
    case "build-manifest":
      return buildGateEOperationalManifest({
        cwd: input.cwd,
        projectId: projectId(input.options),
        observation: await jsonFile<RedactedGateEProviderObservationV1>(
          option(input.options, "--observation-file"),
        ),
      });
    case "build-registration":
      return buildGateEOperationalRegistration({
        cwd: input.cwd,
        artifactDirectory: option(input.options, "--artifact-directory"),
      });
    case "register-anchor": {
      const receipt = await registerGateEOperationalPopulation({
        cwd: input.cwd,
        registrationPath: option(input.options, "--registration-path"),
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
        registrationPath: option(input.options, "--registration-path"),
        databaseUrl: databaseUrl(),
        credentialFile: credentialFile(input.options),
      });
  }
}

async function main(): Promise<void> {
  const invocation = parseGateEOperationalInvocation(process.argv.slice(2));
  const result = await executeGateEOperationalCommand({
    ...invocation,
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
