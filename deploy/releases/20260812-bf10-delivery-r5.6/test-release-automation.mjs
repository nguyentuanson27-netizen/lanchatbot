import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = (name) => readFileSync(join(root, name), 'utf8');
const requireText = (source, token, code) => {
  if (!source.includes(token)) throw new Error(code);
};
const forbid = (source, pattern, code) => {
  if (pattern.test(source)) throw new Error(code);
};

const common = read('common.sh');
const preflight = read('preflight.sh');
const cutover = read('cutover.sh');
const rollback = read('rollback.sh');
const postcheck = read('postcheck.sh');
const boundary = read('capture-deployment-boundary.mjs');
const prospective = read('validate-prospective-delivery-env.mjs');
const target = read('validate-target-evidence.mjs');
const smoke = read('artifact-smoke.sh');

requireText(common, 'EXPECTED_ROLLBACK_DELIVERY_IMAGE="lana-chatbot-app:realtime-compatibility-first-r32.2"', 'ROLLBACK_REF_NOT_PINNED');
requireText(common, 'EXPECTED_ROLLBACK_DELIVERY_IMAGE_ID="sha256:44ecb2fd9f7d6a5aa769938f738a3c6ba42b470db5a9bce3d30fdc364de2a0b7"', 'ROLLBACK_ID_NOT_PINNED');
requireText(common, 'EXPECTED_ROLLBACK_DELIVERY_REVISION="1c004eacca7cce309a0a05643d1aa751b897d41c"', 'ROLLBACK_REVISION_NOT_PINNED');
requireText(common, 'require_no_inherited_compose_overrides', 'INHERITED_ENV_GUARD_MISSING');
requireText(common, 'verify_prospective_delivery_env_parity', 'PROSPECTIVE_ENV_GUARD_MISSING');
requireText(cutover, 'acquire_deployment_lock', 'GLOBAL_LOCK_MISSING');
requireText(cutover, 'arm_automatic_rollback', 'AUTOMATIC_ROLLBACK_MISSING');
requireText(cutover, 'upsert_env_pin DELIVERY_IMAGE "$TARGET_DELIVERY_IMAGE"', 'DELIVERY_IMAGE_PIN_MISSING');
requireText(cutover, 'compose up -d --no-deps delivery-worker', 'DELIVERY_ONLY_CUTOVER_MISSING');
requireText(rollback, 'rollback_compose up -d --no-deps delivery-worker', 'DELIVERY_ONLY_ROLLBACK_MISSING');
forbid(`${common}\n${preflight}\n${cutover}\n${rollback}\n${postcheck}`, /DELIVERY_RELEASE_ID/u, 'INVENTED_DELIVERY_RELEASE_ID');
forbid(cutover, /compose up[^\n]*(realtime-worker|admin-api|admin-web|admin-simulation-worker)/u, 'NON_TARGET_CUTOVER');
forbid(rollback, /rollback_compose up[^\n]*(realtime-worker|admin-api|admin-web|admin-simulation-worker)/u, 'NON_TARGET_ROLLBACK');
requireText(boundary, "new Set(['DELIVERY_IMAGE'])", 'ONLY_DELIVERY_SELECTOR_MUST_BE_MUTABLE');
requireText(boundary, 'normalizedContainerEntries', 'FULL_CONFIG_ENV_DIGEST_MISSING');
requireText(boundary, 'lana-chatbot-delivery-worker', 'DELIVERY_BOUNDARY_TARGET_MISSING');
requireText(prospective, "compose.services?.['delivery-worker']?.environment", 'PROSPECTIVE_DELIVERY_TARGET_MISSING');
requireText(target, "deployment.services['delivery-worker']", 'DELIVERY_SERVICE_EVIDENCE_MISSING');
requireText(smoke, 'apps/worker/dist/delivery-server.js', 'DELIVERY_ARTIFACT_SMOKE_MISSING');
requireText(smoke, 'packages/database/dist/realtime-runtime.js', 'BF10_DATABASE_ARTIFACT_SMOKE_MISSING');
for (const source of [common, preflight, cutover, rollback, postcheck]) {
  forbid(source, /\beval\b/u, 'EVAL_FORBIDDEN');
  forbid(source, /docker compose down|docker compose restart|docker system prune|rm -rf/u, 'DESTRUCTIVE_COMMAND_FORBIDDEN');
}
console.log('BF10 delivery release automation self-test: PASS');
