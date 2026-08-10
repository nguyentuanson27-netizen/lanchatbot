import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const [, , currentPath, baselineArgument = '-', validationMode = 'strict'] = process.argv;
if (!currentPath || !['strict', 'rollback', 'report'].includes(validationMode)) {
  throw new Error('USAGE: validate-operational-state.mjs <current> [baseline|-] [strict|rollback|report]');
}
const baselinePath = baselineArgument === '-' ? undefined : baselineArgument;
const current = JSON.parse(readFileSync(resolve(currentPath), 'utf8'));
if (current.schemaVersion !== 1) throw new Error('OPERATIONAL_STATE_SCHEMA_INVALID');
for (const [name, queue] of Object.entries(current.queues ?? {})) {
  if (!Number.isInteger(queue.active) || queue.active < 0 ||
      !Number.isInteger(queue.failedPermanent) || queue.failedPermanent < 0 ||
      !Number.isInteger(queue.duplicates) || queue.duplicates < 0) {
    throw new Error(`OPERATIONAL_STATE_QUEUE_INVALID:${name}`);
  }
  if (validationMode === 'strict' && queue.active !== 0) throw new Error(`OPERATIONAL_STATE_QUEUE_ACTIVE:${name}`);
  // Emergency rollback records queue deltas without mutating them. A duplicate
  // stop condition must not prevent exact BF-01 source/runtime-state restoration.
  if (validationMode === 'strict' && queue.duplicates !== 0) throw new Error(`OPERATIONAL_STATE_DUPLICATE:${name}`);
}
if (validationMode === 'report') {
  console.log('operational state validation: REPORT_ONLY');
  process.exit(0);
}
if (current.policy?.channel !== 'PUBLISHED' || current.policy?.enabled !== 'true' || current.policy?.publishedEnabled !== 'true') {
  throw new Error('OPERATIONAL_STATE_POLICY_CHANNEL_INVALID');
}
if (current.policy?.waveCFieldsAbsent !== true || current.policy?.correctionDialogueFieldAbsent !== true) {
  throw new Error('OPERATIONAL_STATE_POLICY_DEFAULTS_NOT_OFF');
}
if (!['OMITTED', 'LEGACY', 'CLARIFY_RECONCILED_V1'].includes(current.policy?.replyReconciliationPolicy)) {
  throw new Error('OPERATIONAL_STATE_REPLY_RECONCILIATION_INVALID');
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
if (!/^sha256:[a-f0-9]{64}$/u.test(current.policy?.closingContentHash ?? '') ||
    !uuid.test(current.policy?.closingPointerId ?? '') ||
    !uuid.test(current.policy?.closingVersionId ?? '') ||
    !Number.isInteger(current.policy?.closingPointerRevision) || current.policy.closingPointerRevision < 0 ||
    !Number.isInteger(current.policy?.closingVersionNumber) || current.policy.closingVersionNumber < 1 ||
    !Number.isInteger(current.policy?.closingVersionRevision) || current.policy.closingVersionRevision < 0) {
  throw new Error('OPERATIONAL_STATE_POLICY_IDENTITY_INVALID');
}
if (current.policy?.effectiveDefaults?.mediaPartialResolutionPolicy !== 'LEGACY' ||
    current.policy?.effectiveDefaults?.multiProductResolutionPolicy !== 'LEGACY' ||
    current.policy?.effectiveDefaults?.customerUrlPolicy !== 'STRICT_BLOCK_ALL') {
  throw new Error('OPERATIONAL_STATE_POLICY_DEFAULTS_INVALID');
}
if (current.behaviorMode?.enabled !== 'true' ||
    current.behaviorMode?.confirmationMode !== 'V2_ACTIVE' ||
    current.behaviorMode?.salesAuthorityMode !== 'LEGACY' ||
    current.behaviorMode?.stateReadMode !== 'LEGACY' ||
    !Number.isInteger(current.behaviorMode?.pointerRevision) || current.behaviorMode.pointerRevision < 1 ||
    !/^sha256:[a-f0-9]{64}$/u.test(current.behaviorMode?.contentHash ?? '')) {
  throw new Error('OPERATIONAL_STATE_BEHAVIOR_MODE_INVALID');
}
if (current.runtime?.mode !== 'LIVE' || current.runtime?.appSendEnabled !== 'true' ||
    current.runtime?.chatbotSendEnabled !== 'true' ||
    current.runtime?.hourlyGenerationLimit !== 500 || current.runtime?.dailyGenerationLimit !== 2000) {
  throw new Error('OPERATIONAL_STATE_RUNTIME_READBACK_INVALID');
}
const worker = current.realtimeWorker;
if (worker?.workerId !== 'realtime-worker-1' || !['IDLE', 'PROCESSING'].includes(worker?.status) ||
    worker?.mode !== 'LIVE' || worker?.sendEnabled !== true || worker?.lastErrorCodeAbsent !== true ||
    !Number.isInteger(worker?.lastSeenEpochMs) || !Number.isInteger(worker?.capturedAtEpochMs) ||
    worker.lastSeenEpochMs > worker.capturedAtEpochMs + 5_000 ||
    worker.capturedAtEpochMs - worker.lastSeenEpochMs > 60_000) {
  throw new Error('OPERATIONAL_STATE_REALTIME_WORKER_NOT_READY');
}
if (baselinePath) {
  const baseline = JSON.parse(readFileSync(resolve(baselinePath), 'utf8'));
  for (const name of ['policy', 'behaviorMode', 'runtime']) {
    if (!isDeepStrictEqual(current[name], baseline[name])) throw new Error(`OPERATIONAL_STATE_DRIFT:${name}`);
  }
  if (validationMode === 'strict' && !isDeepStrictEqual(current.queues, baseline.queues)) {
    throw new Error('OPERATIONAL_STATE_DRIFT:queues');
  }
  if (current.realtimeWorker.workerId !== baseline.realtimeWorker?.workerId ||
      current.realtimeWorker.mode !== baseline.realtimeWorker?.mode ||
      current.realtimeWorker.sendEnabled !== baseline.realtimeWorker?.sendEnabled ||
      current.realtimeWorker.lastSeenEpochMs <= baseline.realtimeWorker?.lastSeenEpochMs) {
    throw new Error('OPERATIONAL_STATE_REALTIME_HEARTBEAT_NOT_ADVANCING');
  }
}
console.log(`operational state validation: PASS mode=${validationMode}`);
