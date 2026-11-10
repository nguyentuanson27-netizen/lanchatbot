# Contract-fix provider replay — 2026-10-18

Owner requests one new model round after fixes at intake `7e5cfc61d154a09cda2e9286c1a8b55864ca0921`. Main freshly fetched: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Implementation/tests and26isolated real-PG controls are retained in ../contract-fix-20261018/IMPLEMENTATION.md. Current protocol tests45PASS and source readback0generations completed before freeze. No new executable/prompt/model/config/criteria fix in this request.

## Fixed population and order

Same24B1 cases and7stateful cases. cases.priority.json is only a permutation of the existing24-case corpus: old slots1,3,5,6,8,17,19,23 first, then all16remaining slots in their original order. Assert deep equality per caseId before registration. No wording, context, sourceMode, evaluator or purpose edits. This lets existing --range1:8 run the priority group in one process per repetition, reusing current runner instead of adding another dispatch API or rebuilding once per case.

- Priority:8B1 ×3 plus3separate ordered seven-turn stateful journeys=45outcomes/max168generation requests.
- Collect the entire45priority denominator, including errors and downstream stateful outcomes. Preserve raw evidence before whole-outcome primary before rejected-draft/verdict diagnosis. No best-of/majority, generation retry, removal or replacement of errors.
- Only if that group meets the existing plan criteria:remaining16B1 once via --range9:24. Overall maximum61outcomes/max232generation requests,31unique cases. No initial diagnostic/second candidate/extra full replay.
- Unresolved safety, selected-variant/NONE/tool-budget, source/provider failures, unusable advice or checkout/confirmation failures mean STOP before remaining16. Minor polish alone is not failure; subjective styling, appropriate fact confirmation and legitimate upsell remain allowed. Review whole actual history/reply/capture, never keyword coverage. OwnerAcceptance=null.

## Runtime and authority

Keep Vertex global Gemini3.5 Flash Lite HIGH owner and GPT-6.1 Sol High verifier through existing Codex login; exact model/version/generation/prompt/schema/source/corpus/tool hashes in FROZEN_INPUTS.json. One generation HTTP request per invocation, retry0; normal new-information owner continuations remain bounded3generations/2toolrounds/6calls/1verifier. No classifier skips semantic verification for model final drafts. Code-only post-effect summaries use existing cart/fact readiness, distinct from verifier PASS.

Native processes can overlap inference up to2; serialize shared build/import startup with existing output readiness. No new agent role or subagent generation. All outputs go to separate new Temp directories; never overwrite old evidence. Three stateful test DBs are independent and dropped, source PostgreSQL remains read-only, delivery is capture-only. No source publication, live customer send/POS mutation/deploy/merge or Phase C. A remains OWNER_BYPASS, not A PASS/newA2/A3qualification.

Commit frozen inputs, require clean executable/config, capture HEAD at runtime and preflight before generation. Do not write that HEAD into frozen source. If the conditional remaining stage runs after evidence commits, its runtime HEAD is recorded separately; require identical frozen executable/config bytes and do not mislabel it as the first head. No executable/config edits after sealing.

Review/audit every actual outcome and request count; report verifier p50/p95/added verification latency, timeout/error rates, tokens/cost coverage, actual fallback/handoff/no-send meanings, exact captures, label/privacy projection, unknowns and recommendation. No attribution of all failures to prompt; live source and stateful histories can differ between observations. Preserve all historical results.
