# Phase B — owner offer projection fix and one replay, 2026-10-18

Owner requests fix and model run under the [independently revised plan](../../../../../docs/specs/c3-phase-b-offer-projection-fix-plan-20261018.md). Intake `bca8805e8c7d21f17de63f0dd0d7008686dfec90`; freshly fetched main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Continue PR391. Previous45outcomes/evidence remain unchanged and are not outcomes for this candidate.

## Candidate and measured hypothesis

One required change: the B owner read_product projection removes root offerType/variantId/facts/availability only for a proven unfiltered multi-offer response whose matching option retains all those same-response facts/metadata/status/reasons. Partial/explicit/unknown/different evidence stays scoped. Compare raw availability before sanitization. The declaration changes with that projection. No source resolver, protected claim, verifier input, state/effect/receipt, signature, native model part/call identity or authority change.

T2 decision before provider results: **both prompts remain unchanged**. Existing instructions already cover unknown selling options, selected size versus fit, subjective style, proper comparison and choosing a useful direction. This candidate tests presentation only; it does not claim to fix every hallucination, voice issue or provider completion failure. No diagnostic/second candidate or post-result prompt patch.

Keep Vertex global gemini-3.5-flash-lite HIGH owner, gpt-6.1-sol High verifier through existing Codex login, current version/config/credential routes. Exact hashes in FROZEN_INPUTS.json. Bounds65536owner/32768verifier bytes,3owner generations/2tool rounds/6calls/1verifier per public turn,90s timeout, generation retry0/one upstream generation request per invocation. Every surviving final goes to verifier; no classifier skip. Existing code-only recovery/checkout/confirmation stays separate from model PASS.

## Frozen population and stop condition

Use existing ../contract-replay-20261018/cases.priority.json unchanged, not a new permutation. Its first8are old corpus slots1/3/5/6/8/17/19/23. Preserve24B1 questions/runtime/sourceMode/evaluator labels and all7stateful cases.

- Collect all8priority B1×3 plus3independent ordered seven-turn stateful journeys: **45outcomes/max168generation requests**,15unique cases. No early truncation of registered outcomes/downstream after failure.
- Only if all priority outcomes meet the existing frozen criteria: remaining16B1once via range9:24, **overall max61outcomes/232requests/31unique cases**. Unresolved safety, selected-variant/NONE/budget, source/provider failure, unusable advice or checkout/confirmation failure means STOP before16. Minor polish alone is not failure. No majority/best-of, generation retry, error replacement or relabeling.
- Review the whole actual history/capture/state/terminal for usefulness/decision/voice/safety; do not grade keyword coverage or require the cheapest choice. Legitimate upsell, subjective confidence and useful correction readback remain allowed. Keep ambiguous acceptance/fit wording unresolved unless evidence justifies a conclusion; ownerAcceptance=null.
- Commit raw evidence before primary review; commit primary before inspecting rejected drafts/verdict details. Shared logs filtered by attempt generation IDs. Report all45, with3ownership-only controls and6code-owned preview/confirmation milestones separately. Later success does not erase an earlier failed outcome.

## Provenance, operations and delivery

Finish source/tests, freeze inputs, commit and require clean executable/config worktree. Capture HEAD as runtime bRunSourceSha after sealing; never write it back into frozen source. Preflight before generation. No executable/config change after seal. Evidence commits remain distinct; if conditional16run from a later evidence HEAD, record that runtime source separately and require unchanged frozen executable/config bytes.

Reuse current runners and read-only source/credential sessions. Up to2native processes overlap inference; serialize shared build/import startup. No new subagent/model role. Three disposable DBs are independent and dropped. Source PostgreSQL stays read-only; delivery is capture-only. Product registry description remains the existing isolated candidate, not published source. Live public per-read worlds can vary; comparison is descriptive, not causal/stability proof.

Retain request/error accounting, bindings, captured request label/private-input firewall checks, timeout/error/token/cost coverage, verifier and added verification p50/p95, terminal/fallback meanings and exact commands/results. MALFORMED_RESPONSE remains a failed completed attempt even with HTTP200; no hidden generation retry. Provider/credential/source unavailability is recorded, never simulated/substituted.

Stop after reporting/PR391 update. A remains OWNER_BYPASS, B sales/live STOP until assessed; no A2/A3 qualification, source publication, production wiring, real customer/POS mutation/send, merge/deploy or Phase C. Scope complexity: one owner projection/declaration change and tests; no new schema/gate/state/parser/template/role/budget/repair mechanism.
