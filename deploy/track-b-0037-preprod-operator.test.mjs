import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(root, "track-b-0037-preprod-operator.sh"), "utf8");
const requireText = (pattern, message) => { if (!pattern.test(source)) throw new Error(message); };

requireText(/T37_UP_SHA256="40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20"/u, "0037 up hash is not pinned");
requireText(/T37_DOWN_SHA256="c5b2ea232bf586aeaf1e034c017dbf1d002fda904c4c4e3ebd9daace4ae73ce3"/u, "0037 down hash is not pinned");
requireText(/T37_POINTER_REVISION="6"/u, "pre-mutation pointer is not pinned");
requireText(/REALTIME_IMAGE[\s\S]*REALTIME_HEALTH/u, "affected service identity and health are not pinned");
requireText(
  /docker inspect --format '\{\{range \.Mounts\}\}\{\{if eq \.Destination "\/var\/lib\/postgresql\/data"\}\}\{\{\.Name\}\}\|\{\{\.Type\}\}\|\{\{\.RW\}\}\{\{end\}\}\{\{end\}\}'/u,
  "PostgreSQL volume inspect template is not passed to Docker verbatim",
);
if (/\.Destination \\"\/var\/lib\/postgresql\/data\\"/u.test(source)) {
  throw new Error("PostgreSQL volume inspect template contains shell-literal escapes");
}
requireText(/t37_require_preflight[\s\S]*exact ENGINEERING_PREPROD pre-0037 target mismatch/u, "exact target preflight is missing");
requireText(/pg_dump[\s\S]*pg_restore --exit-on-error/u, "backup restore test is missing");
requireText(/t37_apply_up_named[\s\S]*t37_apply_down_named[\s\S]*t37_apply_up_named/u, "up/down/up rehearsal is missing");
requireText(/0037 down accepted active V2/u, "active-V2 down refusal is not rehearsed");
requireText(/0037 down erased a live fence/u, "live-fence down refusal is not rehearsed");
requireText(/concurrent_pid[\s\S]*df13_commerce_cutover_fences_live_scope_uk/u, "concurrent live-scope conflict is not rehearsed");
requireText(/ambiguous authority transition succeeded[\s\S]*authority transition is invalid/u, "unknown authority transition is not rejected");
requireText(/database_sql_file_sha256_named[\s\S]*RELATION_ACL[\s\S]*FUNCTION_ACL/u, "ACL/owner verification is missing");
requireText(/base tables missing[\s\S]*base indexes missing[\s\S]*base triggers missing[\s\S]*base constraints missing/u, "exact base-schema readback is missing");
requireText(/role attributes drift[\s\S]*role memberships drift[\s\S]*extensions drift/u, "role and extension parity are not verified");
requireText(/MIGRATION_AUTHORIZED[\s\S]*YES_I_AM_AUTHORIZED/u, "explicit migration authorization guard is missing");
requireText(/BEGIN;[\s\S]*INSERT INTO schema_migrations[\s\S]*COMMIT;/u, "migration and ledger are not atomic");
requireText(/VERIFIED_PRE_0037/u, "verified pre-0037 recovery state is missing");
requireText(/BLOCKED_MANUAL_RESTORE_REQUIRED/u, "blocked manual-restore recovery state is missing");
requireText(/VERIFIED_TRANSACTION_NOT_COMMITTED/u, "definitely uncommitted recovery is not distinguished");
requireText(/T37_PRE_CATALOG_SHA256="[a-f0-9]{64}"[\s\S]*POST_CATALOG_SHA256/u, "canonical pre/post catalog identity is not bound");
requireText(/REALTIME_IMAGE_ID/u, "immutable realtime image identity is not pinned");
requireText(/BASH_SOURCE\[0\][\s\S]*TRACK_B_0037_OPERATOR_TEST_MODE/u, "test evidence seam is not source-only");
if (/T37_EVIDENCE_DIR_OVERRIDE/u.test(source)) throw new Error("executable evidence directory override remains reachable");
requireText(/TRACK_B_0037_RECOVERY_EVIDENCE_WRITE_FAILED/u, "recovery evidence write failure is not surfaced");
requireText(/SOURCE_REVISION[\s\S]*refs\/remotes\/origin\/main[\s\S]*status --porcelain/u, "exact clean source identity is missing");
if (/DATABASE_URL\s*=|postgres(?:ql)?:\/\/|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/iu.test(source)) {
  throw new Error("0037 operator contains credential-shaped material");
}
console.log("Track B 0037 PREPROD operator source test: PASS");
