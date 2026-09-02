import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(root, "track-b-0038-preprod-operator.sh"), "utf8");
const requireText = (pattern, message) => {
  if (!pattern.test(source)) throw new Error(message);
};

requireText(/T38_UP_SHA256="9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140"/u, "0038 up hash is not pinned");
requireText(/T38_DOWN_SHA256="5dd292a169a5ecce5f21896bf8e11f1d7727a34a55758c92b8abc98f3de64d9a"/u, "0038 down hash is not pinned");
requireText(/T38_PREVIOUS_MIGRATION="0037_track_b_commerce_authority_replacement"/u, "0037 dependency is not pinned");
requireText(/T38_PREVIOUS_SHA256="40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20"/u, "0037 dependency hash is not pinned");
requireText(/SOURCE_REVISION[\s\S]*refs\/remotes\/origin\/main[\s\S]*status --porcelain/u, "exact clean source identity is missing");
requireText(/EXPECTED_PAGE_ID[\s\S]*EXPECTED_CHANNEL[\s\S]*t38_require_preflight/u, "page/channel target preflight is missing");
requireText(/pg_dump[\s\S]*pg_restore --exit-on-error/u, "backup and isolated restore are missing");
requireText(/t38_apply_up_named[\s\S]*t38_apply_down_named[\s\S]*t38_apply_up_named/u, "up/down/up rehearsal is missing");
requireText(/webhook_inbox[\s\S]*PROCESSING[\s\S]*meta_outbox[\s\S]*SENDING[\s\S]*pancake_tag_outbox[\s\S]*APPLYING/u, "all authority-dependent claims are not rehearsed");
requireText(/expired[\s\S]*unreleased[\s\S]*release[\s\S]*unblock/iu, "expired-unreleased and release-unblock evidence is missing");
for (const evidence of [/in-flight/iu, /queued/iu, /page isolation/iu, /concurr/iu]) {
  requireText(evidence, "drain, queued hold, isolation, or concurrency evidence is missing");
}
requireText(/down accepted an unreleased fence/u, "down refusal with an unreleased fence is not rehearsed");
requireText(/RELATION_ACL[\s\S]*FUNCTION_ACL[\s\S]*role attributes[\s\S]*role memberships/u, "ACL/owner/role verification is missing");
requireText(/trigger identity[\s\S]*ENABLE ALWAYS[\s\S]*catalog/u, "exact trigger/catalog readback is missing");
requireText(/MIGRATION_AUTHORIZED[\s\S]*YES_I_AM_AUTHORIZED/u, "explicit migration authorization guard is missing");
requireText(/BEGIN;[\s\S]*INSERT INTO schema_migrations[\s\S]*COMMIT;/u, "migration and ledger are not atomic");
requireText(/VERIFIED_PRE_0038/u, "safe pre-0038 recovery state is missing");
requireText(/BLOCKED_MANUAL_RESTORE_REQUIRED/u, "manual restore hard stop is missing");
requireText(/lana_track_b_0038_rehearsal_\[0-9\]\+[\s\S]*refusing ambiguous 0038 rehearsal database cleanup/u, "cleanup target is not narrow");
requireText(/TRACK_B_0038_BACKUP_REHEARSAL_PASS[\s\S]*TRACK_B_0038_PREPROD_APPLY_PASS/u, "success boundaries are missing");
requireText(/POLICY_STORE_TEST_DATABASE_URL="\$database_url"/u, "PostgreSQL acceptance does not use scoped environment injection");
requireText(/ambiguous PostgreSQL container network identity/u, "ambiguous PostgreSQL network identity is not rejected");
requireText(/restored extensions mismatch[\s\S]*up changed extensions[\s\S]*live extensions drift/u, "extension parity is incomplete");
if (/postgres(?:ql)?:\/\/(?!placeholder)|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/iu.test(source)) {
  throw new Error("0038 operator contains credential-shaped material");
}

console.log("Track B 0038 PREPROD operator source test: PASS");
