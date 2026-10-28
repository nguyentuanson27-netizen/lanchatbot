# Contract-correction24-case B1 batch and whole-terminal review

Owner explicitly requests fix all diagnosed groups → one independent review → address findings → rerun24cases → review all outcomes and remaining root causes. Run exactly `cases.b1.json`: **24cases,8purposes×3variants,N1**. CorpusSHA256 `790a28e0415bf4b0bdf23c44993cbe78fe76415827a080e9bb09e777775dca67`. Keep the seven stateful turns and all historical batches separate; they do not replace or enlarge this denominator. Independent review closed its singleP2 at8c7099dd; this is a new run identity after the committed fixes.

## Frozen execution

Use the existing `run.mjs` B1 read-only runner, full range1:24, after the reviewed contract/prompt fixes, with no further source changes during the run. It exposes search_products/read_product/read_policy, not the optional B2/B3 mutation/handoff ports. This capability surface must be considered when evaluating promised next steps. Use actual current PostgreSQL PUBLISHED policy, Qdrant/catalog and Redis POS adapters through the approved read-only source-session route. Preserve the three preregistered POS_UNAVAILABLE cases3/11/19 as source-fault controls; that flag is evaluator-only. Do not substitute product/policy fixtures.

Owner remains Vertex `gemini-3.5-flash-lite` High/global; verifier remains Codex-login `gpt-6.1-sol` High, CLI0.159.2. Owner promptSHA9d477de09ea59dab2f02c3fb4e0c9b9f79a88de189d72267a25e2ef1387180fa, verifier promptSHAe8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d; complete generation/fallback/schema configuration remains the validated manifest. No model substitution, third semantic role, rewrite or repair/reverify loop.

Limits:3owner generations/2tool rounds/6calls/at most1verifier per case; **maximum96generation invocations** for24cases, zero automatic generation retry or best-of-N. Keep errors/timeouts/auth failures/pre-dispatch failures in the attempt denominator. Distinguish prepared envelopes, registered invocations and actual upstream requests; report unknown accounting explicitly rather than treating every envelope as a dispatch. Every hard-precheck-surviving exact final draft needs the semantic verifier and current deterministic gate. No generated final text replaces a fallback in the score.

Commit scope first; require clean executable/config paths; run configuration/source checks and the runner's canonical build; capture current HEAD as runtime bRunSourceSha. Capture hashes of models/config, prompts/schema/tools and exact24case bytes in registration. Do not write the run SHA back into frozen source. Keep all outputs outside Git while generation is active. A changed executable/config or HEAD invalidates that run identity. Save and commit complete raw output before primary scoring, then diagnose rejected drafts/verdicts.

## Whole-conversation assessment

Read every complete customer turn, accepted history, exact terminal text and relevant current source facts. Judge whether the reply helps this customer decide and buy, is coherent and natural Vietnamese, and stays within current truth/capability. **Do not award PASS because keywords or individual fact fragments appear.** A relevant fact used to explain a choice may be helpful; echoing the complete customer profile is not required. Length alone is not a quality rule. Safe handoff/fallback can still be unusable for a question with enough verified information.

Use USABLE / NEEDS_EDIT / UNUSABLE / FALLBACK_OR_NO_SEND as whole-turn judgments, with a specific reason for each case. Record the existing ten dimensions as supporting0–2 assessments of the whole reply: understanding, explicit need completeness, context/correction use, usefulness, decision support, partial-answer behavior, next step, coherence, naturalness, factual/action safety. Scores do not replace the holistic judgment or introduce a post-hoc acceptance threshold. Primary coding-agent review is subjective and nonblind to the task/source; keep rejected drafts/verdicts out of primary review until its savepoint. Human acceptance remains unmeasured.

Each purpose has3variants:

- CHANGED_OCCASION: use the changed occasion to make a sensible shop recommendation; do not invent opacity/heat guarantees or an unverified replacement remedy.
- CURRENT_POLICY: current source overrides old remembered terms; distinguish general rule/conditions from approving a specific order. Apply disqualifying facts in the customer's question directly instead of listing unrelated conditions mechanically.
- PARTIAL_SOURCE: answer the supported product/material part when POS is unavailable; state the actual missing price/stock without invented data or internal tool jargon.
- PRICE: answer the right selling option briefly; avoid unnecessary size questions or invented discounts/checkout totals.
- COMPONENT_PRICE_STOCK: use the correct separate component/size source and distinguish stock from personal fit; any next step must fit the actual read-only capabilities.
- SEARCH_READ: find the requested code/name with code-issued refs and answer from the matched source; do not switch products silently.
- BUYING_CONCERN: advise a concrete, useful choice for the customer's occasion/style/budget using grounded product information; avoid a catalog fact dump or advertising guarantees.
- USED_POLICY: understand whether the described use/washing/tag state disqualifies exchange under current policy; distinguish genuine uncertainty from a direct refusal supported by the question.

Audit evaluator-label separation (including caseId/purpose/variant/sourceMode/expected/scoring fields in nested serialized JSON), exact verifier draft/snapshot binding, per-generation request counts, model versions, error/timeout rates, tokens/cost and descriptive p50/p95 latency. Report family counts, all24 judgments, factual/capability concerns, fallback reasons and code/context/owner/verifier attribution. Keep variance/world changes and subjective review limits visible.

After this single complete24-case run, preserve raw→primary→diagnosis evidence, update tasks/report/PR391 and stop. No automatic extra batch, prompt/code repair, A PASS, Phase C, production wiring, policy publication, migration, live customer mutation/send, merge or deployment is authorized by this test request.

See FROZEN_INPUTS.json for exact approved configuration/hashes and INDEPENDENT_REVIEW.md/PREPARATION.md for fix/readiness evidence. Runtime bRunSourceSha is captured in registration.json from clean HEAD after this freeze commit, never written back into its source. Previous source9a523979 results10USABLE/4NEEDS_EDIT/10fallback are a descriptive comparison only; changed prompts/context/live sources and N1 do not isolate causal or stable model improvement. No post-hoc rubric/label change.
