import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { PostgresRuntimeBehaviorModeStore } from "@lana/database";
import {
  assessDf13FirstPreprodBehaviorPointerOperation,
  executeDf13FirstPreprodBehaviorPointerOperation,
  type Df13FirstPreprodBehaviorPointerOperation,
  type Df13FirstPreprodBehaviorPointerIdentity,
  type Df13FirstPreprodBehaviorVersionIdentity,
  type Df13FirstPreprodOperationProof,
} from "./df13-first-preprod-behavior-writer.js";
import { createDf13FirstPreprodBehaviorPointerWriterPort } from "./df13-first-preprod-behavior-writer-port.js";

type Command = "activate-commerce" | "rollback-legacy";

function asRecord(value: unknown, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  if (
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key))
  ) throw new Error(code);
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function nullableText(value: unknown, code: string): string | null {
  if (value === null) return null;
  return text(value, code);
}

function numberValue(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(code);
  return value;
}

function versionIdentity(
  value: unknown,
  pointer: boolean,
): Df13FirstPreprodBehaviorVersionIdentity | Df13FirstPreprodBehaviorPointerIdentity {
  const record = asRecord(value, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID");
  const keys = [
    "pageId",
    "channel",
    "modeVersionId",
    "confirmationMode",
    "salesAuthorityMode",
    "stateReadMode",
    "authorityBundleHash",
    "contentHash",
    ...(pointer ? ["pointerRevision"] : []),
  ];
  exactKeys(record, keys, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID");
  const identity = {
    pageId: text(record.pageId, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    channel: text(record.channel, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    modeVersionId: text(record.modeVersionId, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    confirmationMode: text(record.confirmationMode, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    salesAuthorityMode: text(record.salesAuthorityMode, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    stateReadMode: text(record.stateReadMode, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    authorityBundleHash: nullableText(record.authorityBundleHash, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
    contentHash: text(record.contentHash, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
  };
  if (!pointer) return identity as Df13FirstPreprodBehaviorVersionIdentity;
  return {
    ...identity,
    pointerRevision: numberValue(record.pointerRevision, "DF13_FIRST_PREPROD_WRITER_IDENTITY_INVALID"),
  } as Df13FirstPreprodBehaviorPointerIdentity;
}

function proof(value: unknown): Df13FirstPreprodOperationProof {
  const record = asRecord(value, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID");
  exactKeys(record, [
    "schemaVersion",
    "operationId",
    "pageId",
    "channel",
    "authorityConsumerServiceIds",
    "admission",
    "queuedEligibleWork",
    "inFlightEligibleWork",
    "unreconciledEligibleWork",
    "processState",
    "verifiedAt",
    "proofHash",
  ], "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID");
  if (!Array.isArray(record.authorityConsumerServiceIds) ||
      !record.authorityConsumerServiceIds.every((item) => typeof item === "string")) {
    throw new Error("DF13_FIRST_PREPROD_WRITER_PROOF_INVALID");
  }
  return {
    schemaVersion: numberValue(record.schemaVersion, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID") as 1,
    operationId: text(record.operationId, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    pageId: text(record.pageId, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    channel: text(record.channel, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    authorityConsumerServiceIds: [...record.authorityConsumerServiceIds] as ["realtime-worker"],
    admission: text(record.admission, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID") as "SEALED",
    queuedEligibleWork: numberValue(record.queuedEligibleWork, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    inFlightEligibleWork: numberValue(record.inFlightEligibleWork, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    unreconciledEligibleWork: numberValue(record.unreconciledEligibleWork, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    processState: text(record.processState, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID") as "STOPPED",
    verifiedAt: text(record.verifiedAt, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
    proofHash: text(record.proofHash, "DF13_FIRST_PREPROD_WRITER_PROOF_INVALID"),
  };
}

/** Parses one narrow operation document; no generic operator shape is accepted. */
export function parseDf13FirstPreprodBehaviorPointerOperationJson(
  value: unknown,
  expectedKind: Df13FirstPreprodBehaviorPointerOperation["kind"],
): Df13FirstPreprodBehaviorPointerOperation {
  const record = asRecord(value, "DF13_FIRST_PREPROD_WRITER_OPERATION_INVALID");
  exactKeys(record, ["kind", "proof", "expectedCurrent", "target"], "DF13_FIRST_PREPROD_WRITER_OPERATION_INVALID");
  const kind = text(record.kind, "DF13_FIRST_PREPROD_WRITER_OPERATION_KIND_INVALID");
  if (kind !== expectedKind) throw new Error("DF13_FIRST_PREPROD_WRITER_OPERATION_KIND_INVALID");
  const operation = {
    kind,
    proof: proof(record.proof),
    expectedCurrent: versionIdentity(record.expectedCurrent, true),
    target: versionIdentity(record.target, false),
  } as Df13FirstPreprodBehaviorPointerOperation;
  const assessment = assessDf13FirstPreprodBehaviorPointerOperation(operation);
  if (assessment.status === "BLOCKED") throw new Error(assessment.reasonCode);
  return Object.freeze(operation);
}

function operationFile(): string {
  const index = process.argv.indexOf("--operation-file");
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error("DF13_FIRST_PREPROD_WRITER_OPERATION_FILE_REQUIRED");
  return value;
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

function commandKind(command: string | undefined): Df13FirstPreprodBehaviorPointerOperation["kind"] {
  if (command === "activate-commerce") return "ACTIVATE_COMMERCE";
  if (command === "rollback-legacy") return "ROLLBACK_LEGACY";
  throw new Error("DF13_FIRST_PREPROD_WRITER_COMMAND_INVALID");
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  const kind = commandKind(command);
  const raw = JSON.parse(await readFile(operationFile(), "utf8")) as unknown;
  const operation = parseDf13FirstPreprodBehaviorPointerOperationJson(raw, kind);
  const store = new PostgresRuntimeBehaviorModeStore(await controlDatabaseUrl(), 1);
  try {
    const result = await executeDf13FirstPreprodBehaviorPointerOperation({
      operation,
      port: createDf13FirstPreprodBehaviorPointerWriterPort(store),
    });
    if (result.status === "BLOCKED") throw new Error(result.reasonCode);
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      operation: operation.kind,
      operationId: operation.proof.operationId,
      status: result.status,
      pointer: {
        modeVersionId: result.pointer.modeVersionId,
        contentHash: result.pointer.contentHash,
        pointerRevision: result.pointer.pointerRevision,
        salesAuthorityMode: result.pointer.salesAuthorityMode,
        stateReadMode: result.pointer.stateReadMode,
      },
    })}\n`);
  } finally {
    await store.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    const code = error instanceof Error && error.message.trim()
      ? error.message.trim().slice(0, 160)
      : "DF13_FIRST_PREPROD_WRITER_FAILED";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}
