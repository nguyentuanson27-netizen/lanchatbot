import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { canonicalJsonV1 } from "@lana/contracts";
import { PostgresRuntimeBehaviorModeStore, runtimeBehaviorModeContentHash } from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { createDf13CommercePreprodStartupAuthority, type Df13ReleaseSourcePointer } from "./df13-commerce-preprod-startup-authority.js";
import { createDf13FirstPreprodCommerceVersionPreparerPort } from "./df13-first-preprod-commerce-version-preparer-port.js";
import {
  executeDf13FirstPreprodCommerceVersionPreparation,
  type Df13FirstPreprodCommerceVersionPreparerPort,
} from "./df13-first-preprod-commerce-version-preparer.js";
import type {
  Df13FirstPreprodBehaviorPointerIdentity,
  Df13FirstPreprodOperationProof,
} from "./df13-first-preprod-behavior-writer.js";
import type { Df13ReleaseCandidateEvidence } from "./df13-release-candidate-evidence.js";

const SENTINEL_VERSION_ID = "00000000-0000-4000-8000-000000000001";
const SAFE_REASON_CODE = /^(?:DF13|RUNTIME_BEHAVIOR)_[A-Z0-9_]+$/u;
const RELEASE_TAG_NAME = /^[a-z0-9][a-z0-9._-]{2,127}$/iu;
const execFile = promisify(execFileCallback);

type RawPreparationOperation = Readonly<{
  kind: "PREPARE_COMMERCE";
  proof: unknown;
  expectedCurrent: unknown;
  releaseEvidence: unknown;
  releaseSource: unknown;
}>;

function asRecord(value: unknown, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) {
    throw new Error(code);
  }
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function nullableText(value: unknown, code: string): string | null {
  return value === null ? null : text(value, code);
}

function numberValue(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(code);
  return value;
}

/** The raw document is deliberately not a generic behavior-mode operator. */
export function parseDf13FirstPreprodCommerceVersionPreparationJson(
  value: unknown,
): RawPreparationOperation {
  const record = asRecord(value, "DF13_FIRST_PREPROD_PREPARER_OPERATION_INVALID");
  exactKeys(record, ["kind", "proof", "expectedCurrent", "releaseEvidence", "releaseSource"],
    "DF13_FIRST_PREPROD_PREPARER_OPERATION_INVALID");
  if (record.kind !== "PREPARE_COMMERCE") {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_OPERATION_KIND_INVALID");
  }
  return Object.freeze({
    kind: "PREPARE_COMMERCE" as const,
    proof: record.proof,
    expectedCurrent: record.expectedCurrent,
    releaseEvidence: record.releaseEvidence,
    releaseSource: record.releaseSource,
  });
}

function proof(value: unknown): Df13FirstPreprodOperationProof {
  const record = asRecord(value, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID");
  exactKeys(record, [
    "schemaVersion", "operationId", "pageId", "channel", "authorityConsumerServiceIds", "admission",
    "queuedEligibleWork", "inFlightEligibleWork", "unreconciledEligibleWork", "processState", "verifiedAt", "proofHash",
  ], "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID");
  if (!Array.isArray(record.authorityConsumerServiceIds) ||
      !record.authorityConsumerServiceIds.every((item) => typeof item === "string")) {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID");
  }
  return Object.freeze({
    schemaVersion: numberValue(record.schemaVersion, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID") as 1,
    operationId: text(record.operationId, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    pageId: text(record.pageId, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    channel: text(record.channel, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    authorityConsumerServiceIds: [...record.authorityConsumerServiceIds] as ["realtime-worker"],
    admission: text(record.admission, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID") as "SEALED",
    queuedEligibleWork: numberValue(record.queuedEligibleWork, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    inFlightEligibleWork: numberValue(record.inFlightEligibleWork, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    unreconciledEligibleWork: numberValue(record.unreconciledEligibleWork, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    processState: text(record.processState, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID") as "STOPPED",
    verifiedAt: text(record.verifiedAt, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
    proofHash: text(record.proofHash, "DF13_FIRST_PREPROD_PREPARER_PROOF_INVALID"),
  });
}

function pointer(value: unknown): Df13FirstPreprodBehaviorPointerIdentity {
  const record = asRecord(value, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID");
  exactKeys(record, [
    "pageId", "channel", "modeVersionId", "confirmationMode", "salesAuthorityMode", "stateReadMode",
    "authorityBundleHash", "contentHash", "pointerRevision",
  ], "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID");
  return Object.freeze({
    pageId: text(record.pageId, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID"),
    channel: text(record.channel, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID"),
    modeVersionId: text(record.modeVersionId, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID"),
    confirmationMode: text(record.confirmationMode, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID") as Df13FirstPreprodBehaviorPointerIdentity["confirmationMode"],
    salesAuthorityMode: text(record.salesAuthorityMode, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID") as "LEGACY" | "COMMERCE",
    stateReadMode: text(record.stateReadMode, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID") as "LEGACY",
    authorityBundleHash: nullableText(record.authorityBundleHash, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID"),
    contentHash: text(record.contentHash, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID"),
    pointerRevision: numberValue(record.pointerRevision, "DF13_FIRST_PREPROD_PREPARER_POINTER_INVALID"),
  });
}

type PreparedReleaseSource = Df13ReleaseSourcePointer & Readonly<{ treeOid: string }>;
type Df13FirstPreprodImmutableReleaseTagVerifier = (source: PreparedReleaseSource) => Promise<void>;

function releaseSource(value: unknown): PreparedReleaseSource {
  const record = asRecord(value, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID");
  exactKeys(record, ["schemaVersion", "release", "repository", "tag", "commit", "treeOid", "createdAt"],
    "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID");
  return Object.freeze({
    schemaVersion: numberValue(record.schemaVersion, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID") as 1,
    release: text(record.release, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID"),
    repository: text(record.repository, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID") as Df13ReleaseSourcePointer["repository"],
    tag: text(record.tag, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID"),
    commit: text(record.commit, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID"),
    treeOid: text(record.treeOid, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID"),
    createdAt: text(record.createdAt, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_INVALID"),
  });
}

function immutableReleaseSource(value: unknown, evidence: Df13ReleaseCandidateEvidence): PreparedReleaseSource {
  const source = releaseSource(value);
  if (source.release !== source.tag ||
      source.commit !== evidence.activationReleaseRevision ||
      evidence.releaseSource.resolvedRevision !== source.commit ||
      evidence.releaseSource.treeOid === null || source.treeOid !== evidence.releaseSource.treeOid) {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
  }
  return source;
}

function operationFile(): string {
  const index = process.argv.indexOf("--operation-file");
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error("DF13_FIRST_PREPROD_PREPARER_OPERATION_FILE_REQUIRED");
  return value;
}

function releaseSourceFile(): string {
  const index = process.argv.indexOf("--release-source-file");
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_FILE_REQUIRED");
  return value;
}

function releaseGitDirectory(): string {
  const index = process.argv.indexOf("--release-git-dir");
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_GIT_DIR_REQUIRED");
  return value;
}

export async function assertDf13FirstPreprodImmutableTag(
  source: PreparedReleaseSource,
  gitDir: string,
  run: (args: readonly string[]) => Promise<string> = async (args) =>
    (await execFile("git", ["-C", gitDir, ...args], { encoding: "utf8" })).stdout.trim(),
): Promise<void> {
  if (!RELEASE_TAG_NAME.test(source.tag)) throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_INVALID");
  const ref = `refs/tags/${source.tag}`;
  try {
    const [kind, commit, tree] = await Promise.all([
      run(["cat-file", "-t", ref]),
      run(["rev-parse", `${ref}^{}`]),
      run(["rev-parse", `${ref}^{tree}`]),
    ]);
    if (kind !== "tag" || commit !== source.commit || tree !== source.treeOid) {
      throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH") throw error;
    throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");
  }
}

export function assertDf13FirstPreprodReleaseSourceAttestation(
  operationSource: unknown,
  releaseSourceFile: unknown,
): void {
  const operation = asRecord(operationSource, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
  const attested = asRecord(releaseSourceFile, "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
  exactKeys(operation, ["schemaVersion", "release", "repository", "tag", "commit", "treeOid", "createdAt"], "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
  exactKeys(attested, ["schemaVersion", "release", "repository", "tag", "commit", "createdAt"], "DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
  for (const key of ["schemaVersion", "release", "repository", "tag", "commit", "createdAt"] as const) {
    if (operation[key] !== attested[key]) throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
  }
}

export async function resolveDf13FirstPreprodStartupOutputFile(value: string, root: string): Promise<string> {
  const outputValue = value.trim();
  if (!outputValue) throw new Error("DF13_FIRST_PREPROD_PREPARER_STARTUP_OUTPUT_REQUIRED");
  const rootValue = root.trim();
  if (!rootValue) throw new Error("DF13_FIRST_PREPROD_PREPARER_STARTUP_OUTPUT_DIR_REQUIRED");
  const resolvedRoot = resolve(rootValue);
  const rootStat = await lstat(resolvedRoot).catch(() => { throw new Error("DF13_FIRST_PREPROD_PREPARER_OUTPUT_DIR_INVALID"); });
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error("DF13_FIRST_PREPROD_PREPARER_OUTPUT_DIR_INVALID");
  const canonicalRoot = await realpath(resolvedRoot).catch(() => { throw new Error("DF13_FIRST_PREPROD_PREPARER_OUTPUT_DIR_INVALID"); });
  const output = resolve(outputValue);
  if (dirname(output) !== canonicalRoot || basename(output) !== outputValue.split(/[\\/]/u).at(-1)) {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_OUTPUT_PATH_FORBIDDEN");
  }
  const parentStat = await lstat(dirname(output));
  if (parentStat.isSymbolicLink() || await realpath(dirname(output)) !== canonicalRoot) {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_OUTPUT_PATH_FORBIDDEN");
  }
  return output;
}

async function startupOutputFile(): Promise<string> {
  const index = process.argv.indexOf("--startup-output");
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  const root = process.env.DF13_FIRST_PREPROD_STARTUP_OUTPUT_DIR?.trim();
  return resolveDf13FirstPreprodStartupOutputFile(value ?? "", root ?? "");
}

async function controlDatabaseUrl(): Promise<string> {
  const direct = process.env.REALTIME_BEHAVIOR_MODE_CONTROL_DATABASE_URL?.trim();
  if (direct) return direct;
  const path = process.env.REALTIME_BEHAVIOR_MODE_CONTROL_DATABASE_URL_FILE?.trim()
    || process.env.ADMIN_CONTROL_DATABASE_URL_FILE?.trim();
  if (!path) throw new Error("RUNTIME_BEHAVIOR_CONTROL_DATABASE_URL_REQUIRED");
  const value = (await readFile(path, "utf8")).trim();
  if (!value) throw new Error("RUNTIME_BEHAVIOR_CONTROL_DATABASE_URL_EMPTY");
  return value;
}

function startupAuthorityInput(input: Readonly<{
  releaseEvidence: Df13ReleaseCandidateEvidence;
  expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
  releaseSource: Df13ReleaseSourcePointer;
}>) {
  const contentHash = runtimeBehaviorModeContentHash({
    confirmationMode: input.expectedCurrent.confirmationMode,
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
  });
  return {
    pageId: input.expectedCurrent.pageId,
    channel: input.expectedCurrent.channel,
    modeVersionId: SENTINEL_VERSION_ID,
    contentHash,
    pointerRevision: input.expectedCurrent.pointerRevision + 1,
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    source: "DATABASE" as const,
  };
}

async function assertReleaseStartupBinding(input: Readonly<{
  releaseEvidence: Df13ReleaseCandidateEvidence;
  expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
  releaseSource: Df13ReleaseSourcePointer;
}>): Promise<void> {
  const expectedAuthority = startupAuthorityInput(input);
  const authority = createDf13CommercePreprodStartupAuthority({
    mode: "COMMERCE",
    releaseEvidence: input.releaseEvidence,
    expectedAuthority,
    releaseSource: input.releaseSource,
  });
  const decision = await authority.authorizeExactCommerceIdentity(expectedAuthority);
  if (decision.status !== "ADMITTED") {
    throw new Error(decision.status === "BLOCKED" ? decision.reasonCode : "DF13_FIRST_PREPROD_PREPARER_SOURCE_DISABLED");
  }
}

function startupPackage(input: Readonly<{
  releaseEvidence: Df13ReleaseCandidateEvidence;
  releaseSource: Df13ReleaseSourcePointer;
  expectedCurrent: Df13FirstPreprodBehaviorPointerIdentity;
  prepared: Readonly<{ modeVersionId: string; contentHash: string }>;
}>) {
  return Object.freeze({
    mode: "COMMERCE" as const,
    releaseEvidence: input.releaseEvidence,
    expectedAuthority: {
      pageId: input.expectedCurrent.pageId,
      channel: input.expectedCurrent.channel,
      modeVersionId: input.prepared.modeVersionId,
      contentHash: input.prepared.contentHash,
      pointerRevision: input.expectedCurrent.pointerRevision + 1,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      source: "DATABASE" as const,
    },
    releaseSource: input.releaseSource,
  });
}

export async function executeDf13FirstPreprodCommerceVersionPreparationCli(input: Readonly<{
  operation: RawPreparationOperation;
  port: Df13FirstPreprodCommerceVersionPreparerPort;
  verifyImmutableReleaseTag: Df13FirstPreprodImmutableReleaseTagVerifier;
}>) {
  const operation = parseDf13FirstPreprodCommerceVersionPreparationJson(input.operation);
  const expectedCurrent = pointer(operation.expectedCurrent);
  const releaseEvidence = operation.releaseEvidence as Df13ReleaseCandidateEvidence;
  const source = immutableReleaseSource(operation.releaseSource, releaseEvidence);
  await input.verifyImmutableReleaseTag(source);
  await assertReleaseStartupBinding({ releaseEvidence, expectedCurrent, releaseSource: source });
  const result = await executeDf13FirstPreprodCommerceVersionPreparation({
    proof: proof(operation.proof),
    expectedCurrent,
    port: input.port,
  });
  if (result.status === "BLOCKED") throw new Error(result.reasonCode);
  const startup = startupPackage({
    releaseEvidence,
    releaseSource: source,
    expectedCurrent,
    prepared: result.version,
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    operation: operation.kind,
    status: "PREPARED_POINTER_UNCHANGED" as const,
    preparedVersion: Object.freeze({
      modeVersionId: result.version.modeVersionId,
      contentHash: result.version.contentHash,
      salesAuthorityMode: result.version.salesAuthorityMode,
      stateReadMode: result.version.stateReadMode,
      authorityBundleHash: result.version.authorityBundleHash,
    }),
    expectedActivationPointerRevision: expectedCurrent.pointerRevision + 1,
    startup,
  });
}

export async function writeDf13FirstPreprodStartupPackage(output: string, startup: unknown): Promise<void> {
  await writeFile(output, `${canonicalJsonV1(startup)}\n`, { encoding: "utf8", flag: "wx", mode: 0o400 });
}

export function redactedDf13FirstPreprodPreparationSummary(result: Awaited<ReturnType<typeof executeDf13FirstPreprodCommerceVersionPreparationCli>>): string {
  const { startup: _startup, ...summary } = result;
  return canonicalJsonV1(summary);
}

export function safeDf13FirstPreprodPreparationErrorCode(error: unknown): string {
  return error instanceof Error && SAFE_REASON_CODE.test(error.message)
    ? error.message
    : "DF13_FIRST_PREPROD_PREPARER_FAILED";
}

async function main(): Promise<void> {
  if (process.argv[2] !== "prepare-commerce") {
    throw new Error("DF13_FIRST_PREPROD_PREPARER_COMMAND_INVALID");
  }
  const raw = JSON.parse(await readFile(operationFile(), "utf8")) as unknown;
  const operation = parseDf13FirstPreprodCommerceVersionPreparationJson(raw);
  const gitDir = releaseGitDirectory();
  assertDf13FirstPreprodReleaseSourceAttestation(
    operation.releaseSource,
    JSON.parse(await readFile(releaseSourceFile(), "utf8")) as unknown,
  );
  const store = new PostgresRuntimeBehaviorModeStore(await controlDatabaseUrl(), 1);
  try {
    const result = await executeDf13FirstPreprodCommerceVersionPreparationCli({
      operation,
      port: createDf13FirstPreprodCommerceVersionPreparerPort(store),
      verifyImmutableReleaseTag: async (source) => assertDf13FirstPreprodImmutableTag(source, gitDir),
    });
    await writeDf13FirstPreprodStartupPackage(await startupOutputFile(), result.startup);
    process.stdout.write(`${redactedDf13FirstPreprodPreparationSummary(result)}\n`);
  } finally {
    await store.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    process.stderr.write(`${safeDf13FirstPreprodPreparationErrorCode(error)}\n`);
    process.exitCode = 1;
  });
}
