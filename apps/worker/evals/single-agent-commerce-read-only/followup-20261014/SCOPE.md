# B1 prompt/tool follow-up — 2026-10-14

Owner requests a full prompt/fix review, implementation and a new run. Start at clean `0f4c4eba9be29d6033058ae1be3bebc9daafffbd`, same branch/draft PR391. Refreshed origin/main remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Preserve the prior [eight-case run](../completion-20261014/CHECKPOINT_B.md), raw, scores, findings, A evidence and OWNER_BYPASS.

## Review and bounded implementation

Read the complete owner and verifier prompts, all tool descriptions, owner/verifier projections, actual continuations and all eight terminal conversations. Owning failures:

- Default read_product has a verified price but echoes the requested null offer rather than the resolver's actual selected offer; names/codes alone do not tell the owner which price it already has. Use existing resolver results, including canonical aliases, and preserve each claim's exact scope. Do not reimplement offer priority or infer a set price by arithmetic.
- Missing price/stock currently reports only missing field names. Preserve the existing resolver status/reason separately from an absent POS snapshot, while keeping independently available source content/facts.
- Prompt language about risk/change of occasion can turn absent physical evidence into a negative physical claim. Replace with a general distinction: an unknown property proves neither the property nor its absence; advice can use the stated purchasing requirement without inventing a test result.
- Policy answering must distinguish explaining a rule from confirming complete eligibility. Use known facts in dialogue, disqualify concrete excluded actions first, ask only what changes the decision; do not repeat a checklist or invent unknown eligibility.
- Runtime exposes toolsAllowed to the API but not remaining tool rounds/calls to the owner. Project the existing counters/declared tools into the same owner's request; no new router, stage, retry or model. A final-only invocation still rejects unexpected tool calls mechanically.
- Existing owner instructions require matching current profile/fit fingerprints, but its state projection omits those comparison fields. Include only the already allowed current profile/revision/fingerprint fields, never identity/permission/private checkout.
- Replace redundant owner instructions and remove the stale few-shot examples; distinguish source prose from customer wording, translate technical fields naturally, and restrict follow-up promises to actually available registered actions. Do not add case-specific examples, product codes, prices, policy values or style enums.

Verifier prompt/model/config/schema/terminal fallback stay byte-identical. Audit found valid grounds for both semantic refusals; do not relax it to rescue owner claims. Tool declarations and serialization may change only as documented here. No production entrypoint, new parser/regex/template, state/effect adapter behavior, source publication, live database writes, deploy or Phase C work.

## Evidence and run

Observed RED before contract changes, minimum GREEN, focused owner/tool/state/effect/boundary/protected tests, worker test/typecheck/build/lint, self-review. Preserve prior guard/receipt and real-PostgreSQL evidence, rather than repeating unrelated write tests. Source readback and final gate still reread only used sources.

Reuse exactly the same eight cases, runtime text, history, source modes and evaluator expectations. Reorder only: prior four inadequate cases first (price, changed occasion, current policy, partial source), then the other four in their old relative order. Do not require per-case provider PASS as a hidden condition before collecting the rest; all registered outcomes/errors remain. Whole actual-terminal review uses the previous ten dimensions and the same qualitative sales goals. Human scores remain null unless actually supplied; no keyword matching or relaxed rubric.

Complete source/config → commit/clean → runtime bRunSourceSha (not written back into source) → preflight/source readback → one eight-case N1 batch, max32generation requests (3owner+1verifier per case), retry0. Every hard-precheck-surviving final draft must take its verifier and current gate. An observed unsafe eligible result stops further provider work; undispatched cases remain registered NOT_RUN. Keep outputs external until completion so source identity is not invalidated. No automatic further round or A2/A3.

Raw commit before whole-terminal primary before rejected-draft diagnosis; captured requests must exclude all evaluator metadata through every continuation. Report exact models/hashes/request counts/errors/tokens/cost/latencies and all eight outcomes. Compare by case ID, not reordered index. Live sources can change, so one sample with combined prompt/tool changes does not establish causality or stability. Update tasks and the same draft PR391; stop after delivery.
