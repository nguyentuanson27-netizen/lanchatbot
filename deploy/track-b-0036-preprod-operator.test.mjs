import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = (name) => readFileSync(join(root, name), "utf8");
const requireText = (name, pattern, message) => {
  if (!pattern.test(source(name))) throw new Error(message);
};

requireText("track-b-0036-preprod-common.sh", /EXPECTED_PAGE_ID="1198992073286645"/u,
  "PREPROD page identity is not pinned");
requireText("track-b-0036-preprod-common.sh", /EXPECTED_UP_SHA256="d709617e10554a0186b9233a404ef7faadfdf3576ba3c133efe51a56c2214425"/u,
  "0036 up checksum is not pinned");
requireText("track-b-0036-preprod-common.sh", /EXPECTED_DOWN_SHA256="c8e2f56ba2f384cc49f3c9d9a2d76da3a4b4165e90b21726ce723d893a09f1e0"/u,
  "0036 down checksum is not pinned");
requireText("track-b-0036-preprod-common.sh", /EXPECTED_POINTER_REVISION="6"/u,
  "pre-migration pointer revision is not pinned");
requireText("track-b-0036-preprod-common.sh", /flock -n 9/u,
  "global mutation lock is missing");
requireText("track-b-0036-preprod-common.sh", /readonly EVIDENCE_DIR="\$APP_ROOT\/backups\/20260831-track-b-0036-preprod"/u,
  "evidence path is not fixed to the approved backup scope");
requireText("track-b-0036-preprod-common.sh", /verify_0036_schema_named/u,
  "reusable exact schema readback is missing");
requireText("track-b-0036-preprod-backup-rehearse.sh", /pg_dump[\s\S]*pg_restore --exit-on-error/u,
  "backup is not restore-tested");
requireText("track-b-0036-preprod-backup-rehearse.sh", /apply_up[\s\S]*apply_down[\s\S]*apply_up/u,
  "up/down/up rehearsal is missing");
requireText("track-b-0036-preprod-backup-rehearse.sh", /apply_up\s*\nverify_0036_schema_named[\s\S]*apply_down[\s\S]*apply_up[\s\S]*verify_0036_schema_named/u,
  "full schema readback is not performed during rehearsal");
requireText("track-b-0036-preprod-backup-rehearse.sh", /DF13_COMMERCE_FENCE_ROLLBACK_BLOCKED/u,
  "rollback refusal with durable evidence is not rehearsed");
requireText("track-b-0036-preprod-backup-rehearse.sh", /df13 commerce cutover fence identity is immutable/u,
  "immutable cutover identity refusal is not rehearsed");
requireText("track-b-0036-preprod-backup-rehearse.sh", /concurrent_pid[\s\S]*df13_commerce_cutover_fences_live_scope_uk/u,
  "live-scope concurrency is not rehearsed");
requireText("track-b-0036-preprod-apply.sh", /MIGRATION_AUTHORIZED.*YES_I_AM_AUTHORIZED/u,
  "explicit migration authorization guard is missing");
requireText("track-b-0036-preprod-apply.sh", /BEGIN;[\s\S]*INSERT INTO schema_migrations[\s\S]*COMMIT;/u,
  "migration and ledger write are not atomic");
requireText("track-b-0036-preprod-common.sh", /df13_commerce_cutover_fences_live_scope_uk/u,
  "exact index readback is missing");
requireText("track-b-0036-preprod-common.sh", /guard_df13_commerce_cutover_fence_insert_identity/u,
  "exact function readback is missing");
requireText("track-b-0036-preprod-verify.sh", /verify_0036_schema_named "\$EXPECTED_DATABASE"/u,
  "post-apply exact schema readback is missing");

for (const name of [
  "track-b-0036-preprod-common.sh",
  "track-b-0036-preprod-backup-rehearse.sh",
  "track-b-0036-preprod-apply.sh",
  "track-b-0036-preprod-verify.sh",
]) {
  if (/DATABASE_URL\s*=|postgres(?:ql)?:\/\/|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/iu.test(source(name))) {
    throw new Error(`${name} contains a credential-shaped literal`);
  }
}

console.log("Track B 0036 PREPROD operator source test: PASS");
