# One Phase B execution-contract model replay — 2026-10-18

Owner requests “tiến hành chạy model đi” after implementation `6c5befcac1edbc3465887e54c02762f39d1a9962`. Refreshed implementationBaseSha/main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing PR391; A remains OWNER_BYPASS. [Implementation, RED/GREEN and verification](../../../../../docs/specs/c3-phase-b-execution-contract-fix-20261018.md).

## Candidate and controls frozen before results

One combined candidate: owner purchase/selection guidance, code-owned execution fields moved to a separate system part, and completion failure classification OWNER_TOOL_MODE. Existing permission/effect checks still reject final-only calls; no automatic retry or late tool execution. This tests the combined correction, not the causal effect of either prompt or projection separately. Provider-internal NONE cause remains unknown. No additional post-result candidate or patch in this run.

Vertex global gemini-3.5-flash-lite HIGH owner and gpt-6.1-sol High verifier via existing routes; exact versions/configs in FROZEN_INPUTS.json. Keep 3owner generations/2tool rounds/6calls/1verifier per public turn, 90s timeout, owner wire65536/verifier32768 bytes, retry0, one upstream generation request per invocation. All hard-precheck-surviving model finals require verifier and final gate. Code-only recovery/checkout/confirmation are distinct from model PASS. Verifier, policy, source config, tool parameter schemas, corpora and thresholds unchanged.

## Population, order and stopping

Reuse ../contract-replay-20261018/cases.priority.json byte-for-byte; preserve all24B1 runtime worlds/questions/evaluator data and all7stateful cases. No answer examples or new corpus fields enter provider input.

1. Dispatch the existing three independent ordered seven-turn stateful journeys first, followed by the first8B1 priority cases ×3. These are the same15unique cases and **45outcomes / max168generation requests** as the previous run, not additional diagnostic requests. Stateful histories develop from each journey's actual captured outcomes; they are not artificially filled with successful replies.
2. Collect all45, including downstream after failure, with no majority/best-of/error replacement/retry. Native processes may overlap at most2 with serialized shared build/import startup. Each stateful disposable DB is independent and must be dropped.
3. Only if the entire priority population meets the existing criteria, run remaining16B1 once (range9:24), overall max61outcomes/232requests. Unresolved safety, selection/NONE/budget, provider/source failure, unusable advice or incomplete checkout/confirmation stops before16. Minor voice polish alone is not failure. No threshold/label changes after results.

Whole actual reply/history/current public context/state decides sales usefulness, decision, next step, naturalness and safety; no keyword grading, cheapest-option requirement or compulsory CTA. Accept legitimate upsell, approved subjective confidence, ordinary layering suggestions and useful correction readback. Preserve ambiguous verdicts as unresolved instead of declaring all rejections correct or relaxing them to raise the score. Human/owner acceptance stays null.

## Source, accounting and reporting

Reuse the completed checks from the unchanged implementation commit; do not repeat full tests to consume time without new edits. Fresh live readback verifies policy/catalog/POS sources with0generation. Freeze executable/config/prompt/schema/corpus/runner hashes; commit, require clean source, capture HEAD to runtime bRunSourceSha, then config/stateful preflight before generation. Never write the run SHA back into frozen source. No executable or frozen-input changes after seal. Evidence-only commits preserve the sealed bytes.

Use current Lana Ops read-only credential/source session. Live PostgreSQL source reads remain read-only; candidate cart/profile/checkout uses only uniquely named disposable test DBs and capture delivery, no real recipient/POS mutation or registry publication. Runtime credentials remain out of Git and reports. No third semantic role, parser, router, state store, repair loop or added budget.

Commit raw45 outcomes before primary review; commit whole-outcome primary before rejected draft/verdict diagnosis. Filter shared logs by generation IDs. Retain every generation/request/error/usage record. OWNER_TOOL_MODE counts as a completion contract error even with HTTP200 and must be distinguished from transport/quota/timeouts. Report3ownership-only controls and6checkout/confirmation milestones separately; inspect actual capture rather than inferring customer outcome from HANDOFF/NO_SEND labels alone. No provider errors are removed from denominators.

Audit exact final/snapshot binding, unchanged draft, all surviving finals verified, evaluator/private-input firewall, raw/frozen hashes, DB cleanup, verifier and added-verification p50/p95, token/cost coverage and actual commands. Source per-read worlds may differ, so comparison is descriptive; no stability/safety/conversion proof or attribution to a single edit. Old evidence and primary judgments remain unchanged.

Stop after report/tasks/draft PR391 update. No A2/A3 qualification, A PASS, automatic next round, live send, source publication, merge/deploy or Phase C.
