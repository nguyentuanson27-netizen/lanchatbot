import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

export const corpusHash = corpus => createHash('sha256').update(JSON.stringify(corpus)).digest('hex');
const sha = /^[a-f0-9]{40}$/;
const hash = /^[a-f0-9]{64}$/;
const matchedFields = ['provider', 'model', 'version', 'effort', 'generation', 'historyPolicy', 'judge', 'substrate', 'pairedInputHash', 'evaluationAt'];
export function validateProtocol(manifest, corpus, { comparativeClaim = false } = {}) {
  if (!sha.test(manifest.implementationBaseSha ?? '') || !sha.test(manifest.comparisonBaselineSha ?? '')) throw Error('BASE_SHA_MISSING');
  if (manifest.evidencePhase !== 'DEVELOPMENT_FEASIBILITY_ONLY' || corpus.evidencePhase !== manifest.evidencePhase) throw Error('PHASE_MISMATCH');
  if (manifest.corpusHash !== corpusHash(corpus)) throw Error('CORPUS_HASH_MISMATCH');
  for (const field of matchedFields) {
    const a = manifest.candidate?.[field], b = manifest.baseline?.[field];
    if (a === undefined || a === null || b === undefined || b === null || a === '' || b === '') throw Error(`MISSING:${field}`);
    if (!isDeepStrictEqual(a, b)) throw Error(`MISMATCH:${field}`);
  }
  if (manifest.candidate.pairedInputHash !== manifest.corpusHash || manifest.candidate.evaluationAt !== corpus.evaluationAt) throw Error('PAIRED_INPUT_MISMATCH');
  if (!Object.keys(manifest.candidate.substrate).length || Object.values(manifest.candidate.substrate).some(value => !sha.test(value))) throw Error('SUBSTRATE_MISSING');
  if (!Object.keys(manifest.candidate.generation).length || !manifest.candidate.judge.rubricId || !manifest.candidate.historyPolicy.windowMessages) throw Error('CONFIG_MISSING');
  const counts = { A: 0, B: 0, C: 0, D: 0, CONTROL: 0 }, ids = new Set();
  for (const c of corpus.cases) {
    if (!c.id || ids.has(c.id) || !(c.family in counts)) throw Error('CASE_ID_OR_FAMILY');
    ids.add(c.id); counts[c.family]++;
    if (!Array.isArray(c.history) || c.history.length > manifest.candidate.historyPolicy.windowMessages || c.history.some(turn => !Array.isArray(turn) || turn.length !== 2 || !['customer', 'shop'].includes(turn[0]) || typeof turn[1] !== 'string')) throw Error(`HISTORY:${c.id}`);
    if (typeof c.latestCustomerMessage !== 'string' || !c.latestCustomerMessage.trim() || !c.currentState || !Object.keys(c.currentState).length || !c.verifiedTruth || !Object.keys(c.verifiedTruth).length || !c.requiredOutcomes?.length || !c.forbidden?.length) throw Error(`SCENARIO_CONTRACT:${c.id}`);
  }
  if (['A', 'B', 'C', 'D'].some(f => counts[f] < 3) || counts.CONTROL < 2 || counts.CONTROL > 4) throw Error('FAMILY_COVERAGE');
  if (corpus.stateProof !== 'EGRESS_UNDERSTANDING_ONLY_NO_PERSISTENCE_REF_RESOLUTION_OR_TOOL_ORDERING') throw Error('STATE_PROOF_OVERCLAIM');
  if (comparativeClaim) {
    for (const lane of [manifest.candidate, manifest.baseline]) {
      if (lane.observedProviderVersion !== lane.version || !hash.test(lane.requestIdentity ?? '') || !sha.test(lane.sourceSha ?? '')) throw Error('UNOBSERVED_COMPARATIVE_IDENTITY');
    }
  }
  return counts;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const corpus = JSON.parse(readFileSync(new URL('./corpus.json', import.meta.url)));
  const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url)));
  console.log(JSON.stringify({ status: 'PASS_STATIC_PROTOCOL_NOT_MODEL_EVIDENCE', counts: validateProtocol(manifest, corpus), corpusHash: corpusHash(corpus) }));
}
