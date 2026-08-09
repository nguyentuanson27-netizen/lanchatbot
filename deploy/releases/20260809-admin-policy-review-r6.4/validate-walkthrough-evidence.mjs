import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , evidencePath, releaseTag, releaseCommit] = process.argv;
if (!evidencePath || !releaseTag || !releaseCommit) {
  throw new Error('USAGE: validate-walkthrough-evidence.mjs <evidence> <tag> <commit>');
}
const evidence = JSON.parse(readFileSync(resolve(evidencePath), 'utf8'));
const allowedKeys = new Set([
  'schemaVersion', 'releaseTag', 'releaseCommit', 'checkedAt', 'environment',
  'result', 'checks', 'piiIncluded', 'secretsIncluded', 'notes'
]);
if (!evidence || Array.isArray(evidence) || Object.keys(evidence).some((key) => !allowedKeys.has(key))) {
  throw new Error('ADMIN_UI_WALKTHROUGH_UNKNOWN_FIELD');
}
if (evidence.schemaVersion !== 1 || evidence.releaseTag !== releaseTag || evidence.releaseCommit !== releaseCommit) {
  throw new Error('ADMIN_UI_WALKTHROUGH_RELEASE_IDENTITY');
}
if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(evidence.checkedAt ?? '') || !Number.isFinite(Date.parse(evidence.checkedAt))) {
  throw new Error('ADMIN_UI_WALKTHROUGH_TIMESTAMP');
}
if (typeof evidence.environment !== 'string' || evidence.environment.length < 3 || evidence.result !== 'PASS') {
  throw new Error('ADMIN_UI_WALKTHROUGH_RESULT');
}
const requiredChecks = [
  'authBoundary',
  'policyReviewTable',
  'drawerLatestRequestWins',
  'singleLifecycleAction',
  'batchValidateApprove',
  'ambiguousRecovery',
  'keyboardNavigation'
];
if (!evidence.checks || Array.isArray(evidence.checks) ||
    Object.keys(evidence.checks).some((key) => !requiredChecks.includes(key)) ||
    requiredChecks.some((key) => evidence.checks[key] !== 'PASS')) {
  throw new Error('ADMIN_UI_WALKTHROUGH_CHECKS');
}
if (evidence.piiIncluded !== false || evidence.secretsIncluded !== false) {
  throw new Error('ADMIN_UI_WALKTHROUGH_SENSITIVE_DATA');
}
if (evidence.notes !== undefined && (typeof evidence.notes !== 'string' || evidence.notes.length > 500)) {
  throw new Error('ADMIN_UI_WALKTHROUGH_NOTES');
}
console.log('admin UI walkthrough evidence validation: PASS');
