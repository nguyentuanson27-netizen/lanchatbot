import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(root, "..");
const source = readFileSync(join(root, "track-b-0039-preprod-operator.sh"), "utf8");
const requireText = (pattern, message) => { if (!pattern.test(source)) throw new Error(message); };

requireText(/T39_MIGRATION="0039_track_b_v2_lkg_cutover_fence"/u, "0039 identity is not pinned");
requireText(/T39_UP_SHA256="f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca"/u, "0039 up hash is not pinned");
requireText(/T39_DOWN_SHA256="191e1846a549d99d4c6d4a804fc0148b0458f0fda6944a04e20d48286f7e7301"/u, "0039 down hash is not pinned");
requireText(/T39_PREVIOUS_MIGRATION="0038_track_b_commerce_admission_gate"/u, "0038 dependency is not pinned");
requireText(/T39_PREVIOUS_SHA256="9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140"/u, "0038 dependency hash is not pinned");
requireText(/T39_PRE_LEDGER_SHA256="f320a6892ff6a1b10aa1283e35577e673af78099357a1a2b8f791d35bbeed9be"/u, "pre-ledger is not pinned");
requireText(/T39_POST_LEDGER_SHA256="abc4239e2b473def1ecd8f6ca31fb505deec1469cb08af41778ef2dc757cfd3b"/u, "post-ledger is not pinned");
requireText(/T39_POINTER_REVISION="11"[\s\S]*T39_V2_VERSION=[\s\S]*T39_V2_BUNDLE=[\s\S]*T39_V2_CONTENT=/u, "V2 pointer identity is incomplete");
requireText(/T39_REALTIME_IMAGE=[\s\S]*T39_REALTIME_IMAGE_ID=[\s\S]*T39_REALTIME_REVISION=[\s\S]*T39_RUNTIME_CONFIG_SHA256=[\s\S]*T39_STARTUP_FILE_SHA256=/u, "V2 service identity is incomplete");
requireText(/index \.Config\.Labels "com\.lana\.runtime-config-hash"/u, "runtime config uses the wrong image label contract");
requireText(/SOURCE_REVISION[\s\S]*refs\/remotes\/origin\/main[\s\S]*status --porcelain/u, "exact clean source identity is missing");
requireText(/pg_dump[\s\S]*pg_restore --exit-on-error/u, "backup and isolated restore are missing");
requireText(/t39_apply_up_named[\s\S]*t39_apply_down_named[\s\S]*t39_apply_up_named/u, "up/down/up rehearsal is missing");
requireText(/same-identity V2 LKG[\s\S]*stale\/missing\/ambiguous identity refusal[\s\S]*page isolation[\s\S]*lock races/iu, "V2 LKG acceptance scope is incomplete");
requireText(/down accepted an unreleased fence/u, "down refusal is not rehearsed");
requireText(/MIGRATION_AUTHORIZED[\s\S]*YES_I_AM_AUTHORIZED/u, "authorization guard is missing");
requireText(/BEGIN;[\s\S]*INSERT INTO schema_migrations[\s\S]*COMMIT;/u, "migration and ledger are not atomic");
requireText(/track_b_0039_operator_owner\.run_identity[\s\S]*refusing unowned 0039 rehearsal database cleanup/u, "cleanup ownership proof is missing");
requireText(/t39_post_apply_identity_matches[\s\S]*t39_apply_down_named/u, "recovery down is not exact-state gated");
requireText(/T39_V2_VERSION\|COMMERCE\|LEGACY\|\$T39_V2_BUNDLE\|\$T39_V2_CONTENT/u, "recovery is not bound to V2");
requireText(/POLICY_STORE_TEST_DATABASE_URL="\$database_url"[\s\S]*track-b-0039-v2-lkg\.postgres-spec\.js/u, "PostgreSQL V2 LKG suite is not invoked safely");
requireText(/pretest:postgres[\s\S]*@lana\/admin-api build[\s\S]*t39_run_postgres_acceptance/u, "PostgreSQL acceptance build chain is incomplete or out of order");
requireText(/BLOCKED_MANUAL_RESTORE_REQUIRED/u, "ambiguous recovery does not fail closed");

const rehearsal = source.match(/t39_backup_rehearse\(\) \{([\s\S]*?)\n\}\n\nt39_marker_post_catalog/u)?.[1];
if (!rehearsal) throw new Error("backup-rehearse body is missing");
const migrationCalls = [...rehearsal.matchAll(/t39_apply_(up|down)_named "\$restore_database"/gu)]
  .map((match) => match[1]);
// One failed down refusal probe is intentional; the successful sequence is up/down/up.
if (migrationCalls.join(",") !== "up,down,down,up") {
  throw new Error(`rehearsal migration calls drifted: ${migrationCalls.join(",")}`);
}
if (/cat "\$T39_UP"\s*\|/u.test(rehearsal)) throw new Error("rehearsal contains an ungoverned extra up");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const migrationRow = (directory, filename) => `${filename.replace(/\.up\.sql$/u, "")},${sha256(readFileSync(join(repositoryRoot, directory, filename)))}\n`;
const active = readdirSync(join(repositoryRoot, "packages/database/migrations"))
  .filter((filename) => filename.endsWith(".up.sql"))
  .map((filename) => ({ directory: "packages/database/migrations", filename }));
const pending = [
  "0035_df13_commerce_behavior_mode.up.sql", "0036_df13_commerce_authority_fence.up.sql",
  "0037_track_b_commerce_authority_replacement.up.sql", "0038_track_b_commerce_admission_gate.up.sql",
  "0039_track_b_v2_lkg_cutover_fence.up.sql",
].map((filename) => ({ directory: "packages/database/pending-migrations", filename }));
const rows = [...active, ...pending].sort((a, b) => a.filename.localeCompare(b.filename))
  .map(({ directory, filename }) => migrationRow(directory, filename));
if (sha256(rows.slice(0, -1).join("")) !== "f320a6892ff6a1b10aa1283e35577e673af78099357a1a2b8f791d35bbeed9be") throw new Error("pre-ledger drift");
if (sha256(rows.join("")) !== "abc4239e2b473def1ecd8f6ca31fb505deec1469cb08af41778ef2dc757cfd3b") throw new Error("post-ledger drift");
if (/postgres(?:ql)?:\/\/(?!placeholder)|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/iu.test(source)) throw new Error("credential-shaped material found");

console.log("Track B 0039 PREPROD operator source test: PASS");
