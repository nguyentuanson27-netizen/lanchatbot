#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=common.sh
source "$script_dir/common.sh"

output="${1:?usage: capture-operational-state.sh <output> [baseline|-] [strict|rollback|report]}"
baseline="${2:--}"
validation_mode="${3:-strict}"
test ! -e "$output" || die "operational evidence path already exists"

inbox_active="$(database_query "SELECT count(*) FROM webhook_inbox WHERE status IN ('RECEIVED','VERIFIED','QUEUED','PROCESSING','FAILED_RETRYABLE')")"
inbox_failed="$(database_query "SELECT count(*) FROM webhook_inbox WHERE status='FAILED_PERMANENT'")"
inbox_duplicates="$(database_query "SELECT count(*) FROM (SELECT page_id,event_key FROM webhook_inbox GROUP BY page_id,event_key HAVING count(*)>1) d")"
outbox_active="$(database_query "SELECT count(*) FROM meta_outbox WHERE status IN ('PENDING','SENDING','AMBIGUOUS','RETRYABLE')")"
outbox_failed="$(database_query "SELECT count(*) FROM meta_outbox WHERE status='FAILED_PERMANENT'")"
outbox_duplicates="$(database_query "SELECT count(*) FROM (SELECT reply_plan_id,sequence_no FROM meta_outbox GROUP BY reply_plan_id,sequence_no HAVING count(*)>1) d")"
pancake_active="$(database_query "SELECT count(*) FROM pancake_tag_outbox WHERE status IN ('PENDING','APPLYING','RETRYABLE')")"
pancake_failed="$(database_query "SELECT count(*) FROM pancake_tag_outbox WHERE status='FAILED_PERMANENT'")"
pancake_duplicates="$(database_query "SELECT count(*) FROM (SELECT idempotency_key FROM pancake_tag_outbox GROUP BY idempotency_key HAVING count(*)>1) d")"
published_bundle_hex="$(database_query "SELECT encode(convert_to(COALESCE(jsonb_agg(jsonb_build_object('artifactKey', p.artifact_key, 'artifactKind', p.artifact_kind, 'pointerId', p.pointer_id, 'pointerRevision', p.revision, 'versionId', v.version_id, 'versionArtifactKey', v.artifact_key, 'versionArtifactKind', v.artifact_kind, 'versionNumber', v.version_number, 'versionRevision', v.revision, 'contentHash', v.content_hash, 'lifecycle', v.lifecycle) ORDER BY p.artifact_kind, p.artifact_key, p.pointer_id), '[]'::jsonb)::text, 'UTF8'), 'hex') FROM admin_active_pointers p JOIN admin_artifact_versions v ON v.version_id=p.version_id WHERE p.active AND p.page_id='$EXPECTED_PAGE_ID' AND p.channel='PUBLISHED'")"
closing="$(database_query "SELECT p.pointer_id, p.revision, v.version_id, v.version_number, v.revision, v.content_hash, COALESCE(v.content->>'replyReconciliationPolicy','OMITTED'), (v.content ? 'mediaPartialResolutionPolicy')::int, (v.content ? 'multiProductResolutionPolicy')::int, (v.content ? 'customerUrlPolicy')::int, (v.content ? 'correctionDialoguePolicy')::int FROM admin_active_pointers p JOIN admin_artifact_versions v ON v.version_id=p.version_id WHERE p.active AND p.page_id='$EXPECTED_PAGE_ID' AND p.channel='PUBLISHED' AND p.artifact_kind='CLOSING_STRATEGY'")"
test "$(printf '%s\n' "$closing" | wc -l | tr -d ' ')" = "1" || die "published closing strategy must be singular"
IFS='|' read -r closing_pointer_id closing_pointer_revision closing_version_id closing_version_number closing_version_revision closing_hash reply_policy media_policy multi_policy url_policy correction_policy <<<"$closing"
behavior="$(database_query "SELECT v.content_hash, v.confirmation_mode, v.sales_authority_mode, v.state_read_mode, p.pointer_revision FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id WHERE p.page_id='$EXPECTED_PAGE_ID' AND p.channel='MESSENGER'")"
test "$(printf '%s\n' "$behavior" | wc -l | tr -d ' ')" = "1" || die "runtime behavior pointer must be singular"
IFS='|' read -r behavior_hash behavior_confirmation behavior_sales behavior_state behavior_revision <<<"$behavior"
worker="$(database_query "SELECT worker_id, status, mode, send_enabled::int, (extract(epoch FROM last_seen_at) * 1000)::bigint, (extract(epoch FROM clock_timestamp()) * 1000)::bigint, (last_error_code IS NULL)::int FROM realtime_worker_status WHERE worker_id='$EXPECTED_REALTIME_WORKER_ID'")"
test "$(printf '%s\n' "$worker" | wc -l | tr -d ' ')" = "1" || die "realtime worker status must be singular"
IFS='|' read -r worker_id worker_status worker_mode worker_send_enabled worker_last_seen_ms worker_captured_at_ms worker_error_absent <<<"$worker"

runtime_policy_enabled="$(container_env_value lana-chatbot-realtime-worker RUNTIME_POLICY_ENABLED)"
runtime_policy_channel="$(container_env_value lana-chatbot-realtime-worker RUNTIME_POLICY_CHANNEL)"
runtime_policy_published="$(container_env_value lana-chatbot-realtime-worker RUNTIME_POLICY_PUBLISHED_ENABLED)"
confirmation_mode="$(container_env_value lana-chatbot-realtime-worker REALTIME_CONFIRMATION_MODE)"
behavior_mode_enabled="$(container_env_value lana-chatbot-realtime-worker REALTIME_BEHAVIOR_MODE_ENABLED)"
app_send_enabled="$(container_env_value lana-chatbot-realtime-worker APP_SEND_ENABLED)"
chatbot_send_enabled="$(container_env_value lana-chatbot-realtime-worker CHATBOT_SEND_ENABLED)"
realtime_mode="$(container_env_value lana-chatbot-realtime-worker REALTIME_MODE)"
hourly_quota="$(container_env_value lana-chatbot-realtime-worker REALTIME_HOURLY_GENERATION_LIMIT)"
daily_quota="$(container_env_value lana-chatbot-realtime-worker REALTIME_DAILY_GENERATION_LIMIT)"

node - "$output" \
  "$inbox_active" "$inbox_failed" "$inbox_duplicates" \
  "$outbox_active" "$outbox_failed" "$outbox_duplicates" \
  "$pancake_active" "$pancake_failed" "$pancake_duplicates" \
  "$published_bundle_hex" \
  "$closing_pointer_id" "$closing_pointer_revision" "$closing_version_id" "$closing_version_number" "$closing_version_revision" \
  "$closing_hash" "$reply_policy" "$media_policy" "$multi_policy" "$url_policy" "$correction_policy" \
  "$behavior_hash" "$behavior_confirmation" "$behavior_sales" "$behavior_state" "$behavior_revision" \
  "$worker_id" "$worker_status" "$worker_mode" "$worker_send_enabled" "$worker_last_seen_ms" "$worker_captured_at_ms" "$worker_error_absent" \
  "$runtime_policy_enabled" "$runtime_policy_channel" "$runtime_policy_published" \
  "$confirmation_mode" "$behavior_mode_enabled" \
  "$app_send_enabled" "$chatbot_send_enabled" "$realtime_mode" "$hourly_quota" "$daily_quota" <<'NODE'
const [
  output,
  inboxActive, inboxFailed, inboxDuplicates,
  outboxActive, outboxFailed, outboxDuplicates,
  pancakeActive, pancakeFailed, pancakeDuplicates,
  publishedBundleHex,
  closingPointerId, closingPointerRevision, closingVersionId, closingVersionNumber, closingVersionRevision,
  closingHash, replyPolicy, mediaPolicy, multiPolicy, urlPolicy, correctionPolicy,
  behaviorHash, behaviorConfirmation, behaviorSales, behaviorState, behaviorRevision,
  workerId, workerStatus, workerMode, workerSendEnabled, workerLastSeenMs, workerCapturedAtMs, workerErrorAbsent,
  runtimePolicyEnabled, runtimePolicyChannel, runtimePolicyPublished,
  confirmationMode, behaviorModeEnabled,
  appSendEnabled, chatbotSendEnabled, realtimeMode, hourlyQuota, dailyQuota,
] = process.argv.slice(2);
const integer = (value) => {
  if (!/^\d+$/u.test(value ?? '')) throw new Error('OPERATIONAL_COUNT_INVALID');
  return Number(value);
};
const absent = (value) => value === '0';
if (!/^(?:[a-f0-9]{2})+$/u.test(publishedBundleHex ?? '')) throw new Error('OPERATIONAL_PUBLISHED_BUNDLE_ENCODING_INVALID');
const publishedBundle = JSON.parse(Buffer.from(publishedBundleHex, 'hex').toString('utf8'));
const state = {
  schemaVersion: 1,
  queues: {
    inbox: { active: integer(inboxActive), failedPermanent: integer(inboxFailed), duplicates: integer(inboxDuplicates) },
    metaOutbox: { active: integer(outboxActive), failedPermanent: integer(outboxFailed), duplicates: integer(outboxDuplicates) },
    pancakeOutbox: { active: integer(pancakeActive), failedPermanent: integer(pancakeFailed), duplicates: integer(pancakeDuplicates) },
  },
  policy: {
    channel: runtimePolicyChannel,
    enabled: runtimePolicyEnabled,
    publishedEnabled: runtimePolicyPublished,
    publishedBundle,
    closingContentHash: closingHash,
    closingPointerId,
    closingPointerRevision: integer(closingPointerRevision),
    closingVersionId,
    closingVersionNumber: integer(closingVersionNumber),
    closingVersionRevision: integer(closingVersionRevision),
    replyReconciliationPolicy: replyPolicy,
    waveCFieldsAbsent: absent(mediaPolicy) && absent(multiPolicy) && absent(urlPolicy),
    correctionDialogueFieldAbsent: absent(correctionPolicy),
    effectiveDefaults: { mediaPartialResolutionPolicy: 'LEGACY', multiProductResolutionPolicy: 'LEGACY', customerUrlPolicy: 'STRICT_BLOCK_ALL' },
  },
  behaviorMode: {
    enabled: behaviorModeEnabled,
    startupConfirmationMode: confirmationMode,
    contentHash: behaviorHash,
    confirmationMode: behaviorConfirmation,
    salesAuthorityMode: behaviorSales,
    stateReadMode: behaviorState,
    pointerRevision: integer(behaviorRevision),
  },
  runtime: {
    mode: realtimeMode,
    appSendEnabled,
    chatbotSendEnabled,
    hourlyGenerationLimit: integer(hourlyQuota),
    dailyGenerationLimit: integer(dailyQuota),
  },
  realtimeWorker: {
    workerId,
    status: workerStatus,
    mode: workerMode,
    sendEnabled: workerSendEnabled === '1',
    lastSeenEpochMs: integer(workerLastSeenMs),
    capturedAtEpochMs: integer(workerCapturedAtMs),
    lastErrorCodeAbsent: workerErrorAbsent === '1',
  },
};
await import('node:fs/promises').then(({ writeFile }) => writeFile(output, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx', mode: 0o600 }));
NODE

node "$script_dir/validate-operational-state.mjs" "$output" "$baseline" "$validation_mode"
printf '%s\n' "OPERATIONAL_STATE_CAPTURE_PASS output=$output"
