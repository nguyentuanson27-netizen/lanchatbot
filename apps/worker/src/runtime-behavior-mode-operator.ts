import { readFile } from "node:fs/promises";
import { PostgresRuntimeBehaviorModeStore } from "@lana/database";
import type { RuntimeConfirmationMode } from "@lana/database";

type Command = "read" | "create" | "activate";

function flag(name: string, required = true): string | null {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (value) return value;
  if (required) throw new Error(`MISSING_FLAG_${name.replaceAll("-", "_").toUpperCase()}`);
  return null;
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

function confirmationMode(value: string | null): RuntimeConfirmationMode {
  if (!value || !["LEGACY", "V2_SHADOW", "V2_ACTIVE", "CLARIFY_ONLY"].includes(value)) {
    throw new Error("RUNTIME_BEHAVIOR_CONFIRMATION_MODE_INVALID");
  }
  return value as RuntimeConfirmationMode;
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  if (!command || !["read", "create", "activate"].includes(command)) {
    throw new Error("RUNTIME_BEHAVIOR_OPERATOR_COMMAND_INVALID");
  }
  const pageId = flag("page-id")!;
  const channel = (flag("channel", false) ?? "MESSENGER").toUpperCase();
  const store = new PostgresRuntimeBehaviorModeStore(await controlDatabaseUrl(), 1);
  try {
    if (command === "read") {
      const pointer = await store.loadActiveMode({ pageId, channel });
      process.stdout.write(`${JSON.stringify({ source: "DATABASE", pointer }, null, 2)}\n`);
      return;
    }
    const actor = flag("actor")!;
    const reason = flag("reason")!;
    if (command === "create") {
      const version = await store.createVersion({
        pageId,
        channel,
        payload: {
          confirmationMode: confirmationMode(flag("confirmation-mode")?.toUpperCase() ?? null),
          salesAuthorityMode: "LEGACY",
          stateReadMode: "LEGACY",
        },
        actor,
        reason,
      });
      process.stdout.write(`${JSON.stringify({ source: "DATABASE", version }, null, 2)}\n`);
      return;
    }
    const expectedRevisionRaw = flag("expected-revision")!;
    if (!/^\d+$/u.test(expectedRevisionRaw)) throw new Error("RUNTIME_BEHAVIOR_POINTER_REVISION_INVALID");
    const pointer = await store.activateVersion({
      pageId,
      channel,
      targetVersionId: flag("version-id")!,
      expectedPointerRevision: Number(expectedRevisionRaw),
      actor,
      reason,
    });
    process.stdout.write(`${JSON.stringify({ source: "DATABASE", pointer }, null, 2)}\n`);
  } finally {
    await store.close();
  }
}

await main();
