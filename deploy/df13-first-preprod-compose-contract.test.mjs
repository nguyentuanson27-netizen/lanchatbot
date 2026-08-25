import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertDf13FirstPreprodComposeContract } from "./df13-first-preprod-compose-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const compose = readFileSync(resolve(root, "deploy/docker-compose.vps.yml"), "utf8");

assertDf13FirstPreprodComposeContract(compose);

const defaultOffMode = 'DF13_COMMERCE_PREPROD_STARTUP_MODE: "${DF13_COMMERCE_PREPROD_STARTUP_MODE:-LEGACY}"';
const hardCodedCommerceWithCommentDecoy = compose.replace(
  defaultOffMode,
  'DF13_COMMERCE_PREPROD_STARTUP_MODE: "COMMERCE"',
) + `\n# ${defaultOffMode}\n`;
assert.throws(
  () => assertDf13FirstPreprodComposeContract(hardCodedCommerceWithCommentDecoy),
  /DF13_COMMERCE_STARTUP_MODE_DEFAULT_OFF_MISSING/u,
);

const modeMovedOutsideRealtimeWorker = compose.replace(
  defaultOffMode,
  "# mode intentionally removed from realtime-worker",
) + `\n  another-service:\n    environment:\n      ${defaultOffMode}\n`;
assert.throws(
  () => assertDf13FirstPreprodComposeContract(modeMovedOutsideRealtimeWorker),
  /DF13_COMMERCE_STARTUP_MODE_DEFAULT_OFF_MISSING/u,
);

const startupFile = "DF13_COMMERCE_PREPROD_STARTUP_FILE: /run/df13/commerce-startup.json";
const startupFileMovedOutsideRealtimeWorker = compose.replace(
  startupFile,
  "# startup file intentionally removed from realtime-worker",
) + `\n  another-service:\n    environment:\n      ${startupFile}\n`;
assert.throws(
  () => assertDf13FirstPreprodComposeContract(startupFileMovedOutsideRealtimeWorker),
  /DF13_COMMERCE_STARTUP_FILE_PATH_MISSING/u,
);

assert.throws(
  () => assertDf13FirstPreprodComposeContract(compose.replace(":/run/df13/commerce-startup.json:ro", ":/run/df13/commerce-startup.json:rw")),
  /DF13_COMMERCE_STARTUP_PACKAGE_READONLY_MOUNT_MISSING/u,
);

const startupMount = "- ${DF13_COMMERCE_PREPROD_STARTUP_HOST_FILE:-/dev/null}:/run/df13/commerce-startup.json:ro";
const startupMountMovedOutsideRealtimeWorker = compose.replace(
  startupMount,
  "# startup mount intentionally removed from realtime-worker",
) + `\n  another-service:\n    volumes:\n      ${startupMount}\n`;
assert.throws(
  () => assertDf13FirstPreprodComposeContract(startupMountMovedOutsideRealtimeWorker),
  /DF13_COMMERCE_STARTUP_PACKAGE_READONLY_MOUNT_MISSING/u,
);

console.log("DF13 first-preprod Compose startup contract: PASS");
