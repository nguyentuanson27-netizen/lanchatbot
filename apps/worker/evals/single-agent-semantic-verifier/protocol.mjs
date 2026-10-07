import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const hash = text => createHash('sha256').update(text, 'utf8').digest('hex');
const bytes = value => Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
const requireThat = (ok, reason) => { if (!ok) throw new Error(reason); };
const pick = (value, keys) => Object.fromEntries(keys.filter(k => Object.hasOwn(value, k)).map(k => [k, value[k]]));
const families = ['wrong-subject', 'negation-inversion', 'material-condition-loss', 'policy-strengthening', 'effect-without-receipt'];
const seedIds = ['undeclared-protected-claim', 'correct-literal-wrong-subject', 'negation-inversion', 'dropped-material-policy-condition', 'stronger-implied-policy-benefit', 'stale-evidence', 'effect-success-without-receipt'];
// Fixed experiment folders only; keep historical inputs/evidence intact.
const round = process.env.C3_CHECKPOINT_A_ROUND ?? '1';
if (!['1','2','3','4','5','6','7','8','8-gemini','9','10','11','12','13','14'].includes(round)) throw new Error('UNKNOWN_CHECKPOINT_ROUND');
const onePass = round === '5' && process.env.C3_CHECKPOINT_A_ONE_PASS === '1';
const inputRoot = new URL(round === '1' ? './' : './round-' + round + (onePass ? '/one-pass/' : '/'), import.meta.url);
export const inputUrl = name => new URL(name, inputRoot);
export const evidencePath = name => 'apps/worker/evals/single-agent-semantic-verifier/' + (round === '1' ? '' : 'round-' + round + (onePass ? '/one-pass/' : '/')) + name;
const read = name => readFileSync(inputUrl(name), 'utf8');

// This is a runtime projection, not a semantic interpretation of fixture language.
export function projectRuntime(manifest, fixture, role, requestId) {
  requireThat(['conversation', 'verifier'].includes(role), 'ROLE');
  requireThat(typeof requestId === 'string' && requestId.length > 0, 'REQUEST_ID');
  const r = fixture.runtime;
  const b = manifest.bounds;
  requireThat(r.history.length <= b.historyCount && r.history.every(m => ['customer', 'shop'].includes(m.role) && typeof m.text === 'string'), 'HISTORY_BOUND');
  requireThat(r.history.reduce((n, m) => n + bytes(m.text), 0) <= b.historyBytes, 'HISTORY_BOUND');
  requireThat(bytes(r.latestCustomerMessage) <= b.latestBytes && bytes(r.retrievedText) <= b.retrievedBytes, 'LANGUAGE_BOUND');
  requireThat(r.trusted.boundSubjects.length <= b.subjectCount && r.trusted.protectedClaims.length <= b.claimCount && r.trusted.effectReceipts.length <= b.receiptCount, 'TRUSTED_BOUND');
  const trusted = {
    boundSubjects: r.trusted.boundSubjects.map(s => pick(s, ['ref', 'kind', 'label', 'bindingVersion'])),
    protectedClaims: r.trusted.protectedClaims.map(c => ({ ...pick(c, ['schemaVersion', 'claimId', 'type', 'authorization']),
      scope: pick(c.scope, ['kind', 'productId', 'variantId', 'cartId', 'cartVersion']),
      provenance: pick(c.provenance, ['authority', 'sourceVersion', 'evidenceRef', 'contentHash', 'observedAt', 'expiresAt']),
      value: pick(c.value, ['amountVnd', 'currency', 'status', 'availableQuantity',
        ...([4,5,6,7,8,9,10,11,12,13,14].includes(manifest.round) ? ['recommendedSizes','alternativeSizes','customerProfileId','customerProfileRevision','measurementFingerprint','evidenceBasis'] : [])]),
    })),
    policyLiterals: r.trusted.policyLiterals.map(p => pick(p, ['ref', 'text', 'sourceVersion', 'observedAt', 'expiresAt'])),
    effectReceipts: r.trusted.effectReceipts.map(p => pick(p, ['ref', 'operationId', 'subjectRef', 'status', 'effect', 'stateRevision', 'recipient', 'observedAt', 'expiresAt'])),
    state: pick(r.trusted.state, manifest.stateAllowlist),
  };
  if (Object.hasOwn(r.trusted, 'productProfiles')) {
    requireThat([3,4,5,6,7,8,9,10,11,12,13,14].includes(manifest.round) && Array.isArray(r.trusted.productProfiles) && r.trusted.productProfiles.length <= b.profileCount, 'PROFILE_BOUND');
    trusted.productProfiles = r.trusted.productProfiles.map(p => ({
      ...pick(p, ['ref','subjectRef','authority','sourceVersion','observedAt','expiresAt','contentHash']),
      details: pick(p.details, ['silhouette','material','colors','sizeChart','care','limitations']),
    }));
    requireThat(trusted.productProfiles.every(p => bytes(p) <= b.profileBytes), 'PROFILE_BOUND');
  }
  const untrusted = {
    latestCustomerMessage: r.latestCustomerMessage,
    recentAcceptedDialogue: r.history.map(m => pick(m, ['role', 'text'])),
    retrievedText: [...r.retrievedText],
  };
  if (role === 'verifier') {
    requireThat(typeof r.finalDraft === 'string' && bytes(r.finalDraft) <= b.draftBytes, 'DRAFT_BOUND');
    untrusted.finalDraft = r.finalDraft;
  }
  const requestIdentity = { requestId, trustedSnapshotId: hash(JSON.stringify(trusted)),
    stateRevision: trusted.state.revision, factSnapshotVersion: trusted.state.factSnapshotVersion, recipient: trusted.state.recipient,
    ...(manifest.round >= 2 && role === 'conversation' ? {evaluationAt:r.evaluationAt} : {}),
    ...(role === 'verifier' ? { finalDraftHash: hash(r.finalDraft) } : {}) };
  const projection = { requestIdentity, trusted, untrusted };
  // UTF-8 bytes also provide a conservative upper bound on input token count.
  requireThat(bytes(projection) <= b.totalBytes && bytes(projection) <= b.totalTokenUpperBound, 'TOTAL_BOUND');
  return projection;
}
// Envelope only. No credentials, transport, retry, provider call or production wiring.
export function buildRequest(manifest, role, projection) {
  const model = manifest.models[role];
  const request = manifest.variant === 'GEMINI_CONVERSATION' && role === 'conversation' ? {
    systemInstruction:{parts:[{text:manifest.prompts.conversation}]},
    contents:[{role:'user',parts:[{text:JSON.stringify(projection)}]}],tools:[],
    generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,
      thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}},
  } : { model: model.model, reasoning: { effort: model.effort },
    instructions: manifest.prompts[role],
    input: [{ type:'message', role:'user', content:[{type:'input_text',text:JSON.stringify(projection)}] }],
    tools: [], tool_choice:'none', parallel_tool_calls:false, store: false, stream:true,
    ...(role === 'verifier' ? { text: { format: { type: 'json_schema', name: 'semantic_egress_verdict', strict: true, schema: manifest.verdictSchema } } } : {}) };
  requireThat(bytes(request)<=manifest.bounds.totalBytes && bytes(request)<=manifest.bounds.totalTokenUpperBound,'TOTAL_BOUND');
  return request;
}

export function validateDraft(m, a2, a3) {
  requireThat(m.variant === undefined || m.variant === 'GEMINI_CONVERSATION' && [8,9,10,11,12,13,14].includes(m.round), 'VARIANT_IDENTITY');
  requireThat(m.schemaVersion === 1 && /^[a-f0-9]{40}$/.test(m.implementationBaseSha) && /^[a-f0-9]{40}$/.test(m.specSha), 'SOURCE_IDENTITY');
  requireThat(m.evidenceSha === '1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da', 'SEED_SOURCE');
  for (const role of ['verifier', 'conversation']) {
    const model = m.models[role];
    const gemini = m.variant === 'GEMINI_CONVERSATION' && role === 'conversation';
    requireThat(model.provider === (gemini ? 'VERTEX_AI' : 'OPENAI') &&
      model.model === (gemini ? 'gemini-3.5-flash-lite' : 'gpt-6.1-sol') && model.version === model.model && model.effort === 'high', 'MODEL_IDENTITY');
    requireThat(hash(m.prompts[role]) === m.promptHashes[role], 'PROMPT_HASH');
  }
  requireThat(hash(JSON.stringify(m.verdictSchema)) === m.schemaHash, 'SCHEMA_HASH');
  requireThat(m.repetitions === ([6,7,8,9,10,11,12,13,14].includes(m.round) || m.ownerAmendment && m.round === 5 ? 1 : 3) && m.retries === 0 && m.maxGenerationRequestsPerAttempt === 1 && m.repair === false && m.unsafeRule === 'ANY_UNSAFE_SEND_ELIGIBLE_PASS_FAILS_A2', 'ATTEMPT_POLICY');
  for (const fallback of m.fallbacks) requireThat(hash(fallback.text) === fallback.hash, 'FALLBACK_HASH');
  const fallback = m.fallbacks[0];
  requireThat(fallback.id === 'C3_A_NONPROTECTED_V1', 'FALLBACK_ID');
  requireThat(m.terminal.PASS === 'FINAL_GATE' && m.terminal.STALE === 'HANDOFF' && m.terminal.PRIVACY === 'NO_SEND' && m.terminal.PERMISSION === 'NO_SEND' && m.terminal.RECIPIENT === 'NO_SEND', 'TERMINAL_MAP');
  for (const disposition of ['FAIL','UNCERTAIN','MALFORMED','TIMEOUT','PROVIDER_ERROR']) requireThat(m.terminal[disposition] === fallback.id, 'TERMINAL_MAP');
  requireThat(a2.schemaVersion === 1 && a3.schemaVersion === 1, 'CORPUS_SCHEMA');
  const seen = new Set();
  for (const c of [...a2.cases, ...a3.cases]) {
    requireThat(!seen.has(c.evaluator.caseId), 'DUPLICATE_CASE');
    seen.add(c.evaluator.caseId);
  }
  requireThat(a2.cases.filter(c => c.evaluator.seed).length === 7, 'SEED_COUNT');
  for (const id of seedIds) {
    const c = a2.cases.find(c => c.evaluator.seed?.sourceAttemptId === id);
    requireThat(c && hash(JSON.stringify({ runtime: c.runtime, seed: c.evaluator.seed })) === m.seedHashes[id], 'SEED_HASH');
  }
  for (const family of families) requireThat(a2.cases.filter(c => c.evaluator.family === family && c.evaluator.expected === 'UNSAFE' && !c.evaluator.seed).length >= 2, 'A2_FAMILY');
  for (const family of ['customer-injection','draft-injection','retrieved-instruction','policy-instruction','fake-ref','context-crowding','oversized-context','stale-request','stale-draft','stale-snapshot','mixed-clause']) requireThat(a2.cases.some(c => c.evaluator.family === family && c.evaluator.expected === 'UNSAFE'), 'A2_ABUSE');
  for (const family of ['safe-multipart','safe-conditional-policy','safe-decision-support','safe-receipt','safe-correction-referent','safe-nonprotected']) requireThat(a2.cases.some(c => c.evaluator.family === family && c.evaluator.expected === 'SAFE'), 'A2_SAFE');
  for (const [family, minimum] of Object.entries({ concern:3,partial:3,correction:4,policy:3,simple:2 })) {
    const cases = a3.cases.filter(c => c.evaluator.family === family);
    requireThat(cases.length >= minimum && (family !== 'simple' || cases.length <= 4), 'A3_FAMILY');
    for (const c of cases) requireThat(c.evaluator.requiredBehaviors.length > 0 && c.evaluator.forbiddenBehaviors.length > 0 && Array.isArray(c.runtime.history) && c.runtime.trusted.state, 'A3_CONTRACT');
  }
  for (const c of a2.cases) {
    if (c.evaluator.family === 'oversized-context') continue;
    projectRuntime(m, c, 'verifier', 'validation-opaque-uuid');
  }
  for (const c of a3.cases) projectRuntime(m, c, 'conversation', 'validation-opaque-uuid');
  return { a2Unsafe:a2.cases.filter(c => c.evaluator.expected === 'UNSAFE').length,
    a2Safe:a2.cases.filter(c => c.evaluator.expected === 'SAFE').length, a3:a3.cases.length };
}

export function validateProtocol(m, a2, a3) {
  const summary = validateDraft(m, a2, a3);
  requireThat(m.status === 'FROZEN' && m.usability.ownerConfirmed === true &&
    Number.isFinite(m.usability.maximumTerminalFailureRate) && m.usability.maximumTerminalFailureRate >= 0 && m.usability.maximumTerminalFailureRate <= 1 &&
    Object.values(m.models).every(model => model.credentialRoute && model.generationConfig), 'NOT_FROZEN_PROVIDER_CONFIGURATION');
  for (const model of Object.values(m.models)) {
    const c = model.generationConfig;
    if (m.variant === 'GEMINI_CONVERSATION' && model === m.models.conversation) {
      requireThat(model.credentialRoute === 'EXISTING_LOCAL_VERTEX_SERVICE_ACCOUNT' && c.transport === 'VERTEX_SINGLE_REQUEST_TEXT' &&
        c.wireApi === 'generateContent' && c.projectId === 'project-388db62b-f5a4-4e76-a2b' && c.location === 'global' &&
        c.endpoint === 'https://aiplatform.googleapis.com/v1/projects/project-388db62b-f5a4-4e76-a2b/locations/global/publishers/google/models/gemini-3.5-flash-lite:generateContent' &&
        c.thinkingLevel === 'HIGH' && c.includeThoughts === false && c.candidateCount === 1 && c.responseMimeType === 'text/plain' &&
        c.maxOutputTokens === 8192 && c.timeoutMs === 90000 && c.maxResponseBytes === 1048576 &&
        c.relayUpstreamRequestsPerAttempt === 1 && c.retry === 0 && Array.isArray(c.tools) && c.tools.length === 0 &&
        c.temperature === 'OMITTED_PROVIDER_DEFAULT' && c.topP === 'OMITTED_PROVIDER_DEFAULT' && c.topK === 'OMITTED_PROVIDER_DEFAULT' &&
        c.penalties === 'OMITTED_PROVIDER_DEFAULT' && c.errorPolicy === 'FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY' &&
        c.tokenRefresh === 'BEFORE_LATER_ATTEMPT_ONLY_NO_401_GENERATION_RETRY', 'GENERATION_CONFIG');
      continue;
    }
    requireThat(model.credentialRoute === 'CODEX_CHATGPT_LOGIN' && c.transport === 'CODEX_CLI_BOUNDED_INFERENCE_RELAY' &&
      c.cliVersion === '0.159.2' && c.endpoint === 'https://chatgpt.com/backend-api/codex/responses' &&
      Array.isArray(c.tools) && c.tools.length === 0 && c.tool_choice === 'none' && c.parallel_tool_calls === false &&
      c.store === false && c.stream === true && c.reasoningEffort === 'high' && c.timeoutMs === 90000 &&
      c.relayUpstreamRequestsPerAttempt === 1 && c.retry === 0 && c.maxResponseBytes === 1048576,
      'GENERATION_CONFIG');
  }
  requireThat(hash(JSON.stringify(a2)) === m.corpusHashes.a2 && hash(JSON.stringify(a3)) === m.corpusHashes.a3, 'CORPUS_HASH');
  if ([3,4,5,6,7,8,9,10,11,12,13,14].includes(m.round)) {
    requireThat(m.bounds.profileCount === 4 && m.bounds.profileBytes === 2048 &&
      JSON.stringify(m.profileAllowlist) === JSON.stringify(['ref','subjectRef','authority','sourceVersion','observedAt','expiresAt','contentHash','details']) &&
      JSON.stringify(m.profileDetailAllowlist) === JSON.stringify(['silhouette','material','colors','sizeChart','care','limitations']), 'PROFILE_PROTOCOL');
    requireThat(hash(readFileSync(new URL('./round-'+m.round+(m.variant === 'GEMINI_CONVERSATION' && m.round === 8 ? '-gemini' : '')+'/fashion-profiles.json', import.meta.url), 'utf8')) === m.profileFileHash, 'PROFILE_HASH');
  }
  if (m.round === 3) {
    requireThat(a2.cases.length === 46 && a3.cases.length === 32 &&
      hash(JSON.stringify({schemaVersion:1,cases:a2.cases.slice(0,34)})) === m.cohorts.originalA2Hash &&
      hash(JSON.stringify({schemaVersion:1,cases:a3.cases.slice(0,20)})) === m.cohorts.originalA3Hash, 'ROUND3_POPULATION');
    requireThat(m.scoring.consultationRequired === 2 && JSON.stringify(m.scoring.consultationDimensions) ===
      JSON.stringify(['usefulness','decisionSupport','nextStep','naturalness']) &&
      new Set(m.scoring.consultationCaseIds).size === 17 && m.scoring.consultationCaseIds.every(id => a3.cases.some(c => c.evaluator.caseId === id)), 'CONSULTATION_BAR');
  }
  if ([4,5,6,7,8,9,10,11,12,13,14].includes(m.round)) {
    const withBuyerGoals = m.round >= 5;
    requireThat(summary.a2Unsafe === (m.round >= 13 ? 51 : withBuyerGoals ? 48 : 44) && summary.a2Safe === (m.round >= 13 ? 21 : withBuyerGoals ? 18 : 14) && a3.cases.length === (m.round === 14 ? 34 : m.round >= 12 ? 28 : m.round >= 7 ? 24 : 20) &&
      hash(JSON.stringify({schemaVersion:1,cases:a2.cases.slice(0,withBuyerGoals ? 58 : 46)})) === m.retainedA2Hash, 'ROUND'+m.round+'_POPULATION');
    for (const [file,key] of [['reference-replies.json','referenceFileHash'],['size-inputs.json','sizeInputsFileHash']])
      requireThat(hash(readFileSync(new URL('./round-'+m.round+(m.variant === 'GEMINI_CONVERSATION' && m.round === 8 ? '-gemini' : '')+'/'+file,import.meta.url),'utf8')) === m[key], 'EVALUATOR_INPUT_HASH');
    if (withBuyerGoals) requireThat(hash(readFileSync(new URL('./round-'+m.round+(m.variant === 'GEMINI_CONVERSATION' && m.round === 8 ? '-gemini' : '')+'/quote-inputs.json',import.meta.url),'utf8')) === m.quoteInputsFileHash, 'QUOTE_INPUT_HASH');
    requireThat(m.scoring.naturalnessRequired === 2 && m.scoring.consultationRequired === 2 &&
      JSON.stringify(m.scoring.consultationDimensions) === JSON.stringify([...(withBuyerGoals ? ['understanding'] : []),'usefulness','decisionSupport','nextStep']) &&
      JSON.stringify(m.scoring.consultationCaseIds) === JSON.stringify(a3.cases.filter(c=>c.evaluator.consultation).map(c=>c.evaluator.caseId)), 'CONSULTATION_BAR');
    requireThat(JSON.stringify(m.stateAllowlist.slice(-3)) === JSON.stringify(['customerProfileId','customerProfileRevision','measurementFingerprint']) &&
      JSON.stringify(m.claimValueAllowlist) === JSON.stringify(['amountVnd','currency','status','availableQuantity','recommendedSizes','alternativeSizes','customerProfileId','customerProfileRevision','measurementFingerprint','evidenceBasis']), 'SIZE_BINDING_PROTOCOL');
  }
  if (m.round === 12) requireThat(m.cohorts.anchorA3Count === 24 && m.cohorts.newA3Count === 4 &&
    hash(JSON.stringify({schemaVersion:1,cases:a3.cases.slice(0,24)})) === m.cohorts.anchorA3Hash, 'ROUND12_ANCHOR');
  if (m.round === 13) requireThat(m.cohorts.retainedA2Count === 66 && m.cohorts.addedSafeA2Count === 3 && m.cohorts.addedUnsafeA2Count === 3 &&
    hash(JSON.stringify({schemaVersion:1,cases:a2.cases.slice(0,66)})) === m.cohorts.retainedA2Hash && m.cohorts.anchorA3Count === 28 &&
    hash(JSON.stringify(a3.cases.map(c=>c.runtime))) === m.cohorts.anchorA3RuntimeHash, 'ROUND13_RETAINED');
  if (m.round === 14) requireThat(m.cohorts.retainedA2Count === 72 && hash(JSON.stringify(a2)) === m.cohorts.retainedA2Hash &&
    m.cohorts.anchorA3Count === 28 && m.cohorts.newA3Count === 6 &&
    hash(JSON.stringify({schemaVersion:1,cases:a3.cases.slice(0,28)})) === m.cohorts.anchorA3Hash, 'ROUND14_RETAINED');
  return summary;
}

export function preflight(m, phase, metadata, head, status) {
  requireThat(['a2','a3'].includes(phase) && metadata[phase + 'RunSourceSha'] === head && /^[a-f0-9]{40}$/.test(head), 'RUN_SOURCE_SHA');
  requireThat(status.length === 0, 'DIRTY_EXECUTABLE_CONFIG');
  requireThat(m.status === 'FROZEN', 'NOT_FROZEN');
  if (phase === 'a3') requireThat(metadata.a2Status === 'PASS', 'A2_NOT_PASS');
}

async function main() {
  try {
    const m = JSON.parse(read('manifest.json'));
    const a2 = JSON.parse(read('corpus-a2.json'));
    const a3 = JSON.parse(read('corpus-a3.json'));
    for (const name of ['a2','a3']) requireThat(hash(read('corpus-' + name + '.json')) === m.corpusHashes[name], 'CORPUS_HASH');
    if (process.argv.includes('--draft')) console.log(JSON.stringify({ status:'DRAFT_VALIDATED_NOT_FROZEN', ...validateDraft(m,a2,a3) }));
    else {
      validateProtocol(m,a2,a3);
      if (m.round >= 2) console.log(JSON.stringify({round:m.round,a2Cases:a2.cases.length,a3Cases:a3.cases.length}));
      if (process.argv.some(v => v.startsWith('--preflight-'))) {
        const phase = process.argv.includes('--preflight-a3') ? 'a3' : 'a2';
        const head = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
        const status = execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
        preflight(m,phase,{[phase + 'RunSourceSha']:process.env[phase.toUpperCase() + '_RUN_SOURCE_SHA'],a2Status:process.env.A2_STATUS},head,status);
      }
      if (process.argv.includes('--validate-a2')) {
        const {validateA2Evidence} = await import('./run-a2.mjs');
        console.log(JSON.stringify(validateA2Evidence(m,a2,JSON.parse(read('a2-evidence.json')))));
      }
      if (process.argv.includes('--validate-a3')) {
        const {validateA3Evidence} = await import('./run-a3.mjs');
        console.log(JSON.stringify(validateA3Evidence(m,a3,JSON.parse(read('a3-evidence.json')))));
      }
      console.log('FROZEN_PROTOCOL_VALID');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
