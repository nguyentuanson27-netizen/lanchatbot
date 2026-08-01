import { readFileSync } from "node:fs";
import {
  LocalEnvelopeCipher,
  PostgresRealtimeRuntimeStore,
} from "@lana/database";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function secretOrFile(directName: string, fileName: string): string {
  const direct = process.env[directName]?.trim();
  return direct || readFileSync(required(fileName), "utf8").trim();
}

if ((process.env.META_OUTBOX_OPERATOR_ACTION ?? "").trim() !== "CANCEL") {
  throw new Error("META_OUTBOX_OPERATOR_ACTION_CANCEL_ONLY");
}
const responseGroupId = required("META_OUTBOX_RESPONSE_GROUP_ID");
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(responseGroupId)) {
  throw new Error("META_OUTBOX_RESPONSE_GROUP_ID_INVALID");
}
const store = new PostgresRealtimeRuntimeStore(
  required("DATABASE_URL"),
  new LocalEnvelopeCipher(
    secretOrFile("REALTIME_DATA_KEY", "REALTIME_DATA_KEY_FILE"),
    process.env.REALTIME_DATA_KEY_REF?.trim() || "local-kek-v1",
  ),
);
try {
  const result = await store.cancelMetaResponseGroup(
    responseGroupId,
    required("META_OUTBOX_OPERATOR_REF"),
    required("META_OUTBOX_OPERATOR_REASON_CODE"),
  );
  if (!result) throw new Error("META_OUTBOX_RESPONSE_GROUP_NOT_FOUND");
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await store.close();
}