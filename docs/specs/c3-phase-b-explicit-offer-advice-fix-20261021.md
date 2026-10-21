# Phase B — explicit product read scope and advice priority

Base: `fcde3bcbab30711686354671d83a4e08d56f9845`. Owner requested implementation and one rerun after the review of decision-scope-focus-20261021. Evaluation candidate only; A remains OWNER_BYPASS, no live send or deployment.

## Findings and implementation

The previous 18 actual outcomes were 10 usable, 7 needing edits, one no-send after a new POS observation. In all three set-price attempts the first request already exposed availableOffers and labels, but the owner omitted offerType. The tool returned every offer and the owner repeated them. Therefore missing enum/context was not established as the cause. The previous optional tool argument made this omission legal.

Native read_product now requires offerType: a source code for a selected offer, or explicit null for comparison/discovery. Confirmed source enums are exposed using the same bounded mechanism already used by add_to_cart. Unknown or partly unknown products keep a nullable string, so discovery remains possible. The adapter maps explicit null to the existing optional domain argument without modifying the signed model content. Missing, empty, numeric or over-bound arguments fail the generation, with retained accounting and no repair/retry. Existing domain validation owns product/offer compatibility. Code does not interpret the customer's language or choose an offer.

Official provider documentation checked before changing declarations: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling (function schema supports required, nullable and enum). AUTO mode is preserved; a schema requirement is not a guarantee of model adherence. Selecting null when one offer was clear remains an observable model failure, not silently corrected by code.

Owner advice/voice sections are replaced in place: current buying concern determines the recommendation; the reason must address that concern; a useful main choice is sufficient without defending every other purchase option. Capability guidance explicitly distinguishes read-only information from offering to create a purchase/exchange order. No examples, product facts, policy numbers, evaluator tags, canned replies, semantic router, regex or additional model role are added. Source/tool/state/fit/receipt/policy/privacy constraints are retained. Owner prompt 14,170 → 13,762 bytes. Verifier and its hash remain unchanged.

## Snapshot finding resolved by inspection, not weakened

The previous r3-case09 observation time changed by 30 minutes. RedisBusinessFactsReader returns the stored snapshot unchanged; POS snapshot production assigns synced_at on synchronization, not on each catalog read. Read tools bind this provenance and expiry. This was a new POS observation with equal business values, not a newly invented read timestamp.

The exact-snapshot final gate correctly rejects the old binding. A characterization test proves unchanged source rereads are stable, while a refreshed POS observation remains a different binding even with equal type/scope/value and valid freshness. No source, freshness or final-gate executable is changed. Metadata-refresh no-send remains a known availability limitation; accepting a different authority observation would require an explicit contract change, not an equality shortcut in this fix.

## Verification and self-review

- Observed RED: two focused native offer-contract tests failed before implementation. GREEN: 54 adapter tests, then 103 provider/protocol/owner tests passed with one optional installed-login test skipped.
- 71 runtime/tool tests passed, including the POS-refresh characterization (which already passes under the existing intended gate contract; it is not claimed as a repaired runtime bug).
- Worker build and lint results are recorded in the run report after completion. Lint is the existing TypeScript noEmit command; do not claim a separate typecheck invocation.
- Signed history, unknown-offer discovery, explicit and multi-offer read results, partial evidence, price differences, native authority, request bounds and no-retry paths remain covered by existing tests. The new mechanism adds one required nullable argument and bounded mapping, not a new runtime gate or state layer.
- Prompt changes are hypotheses about advice behavior. Deterministic tests do not prove naturalness, correct sales decisions or model quality. Multiple changes in one candidate prevent causal attribution to an individual prompt bullet; historical samples are not a matched source-controlled experiment.

## Registered next observation

Existing case slots 2/4/15 ×3 first (9 attempts), then 9/17/23/3/5/6/8/16/21 ×1 (9 attempts). Total 18, maximum72 generations. This preserves three repetitions for prior failures and tests partial evidence, single components, unknown-product discovery, excluded exchange use, changed occasion and justified upsell. No corpus edits. Complete all registered attempts despite quality failures, no retry/replacement or in-run fix. Models/configuration remain approved Gemini3.5FlashLite HIGH and GPT6.1Sol high.

Commit implementation, freeze registration and source files, require clean worktree and capture runtime HEAD outside frozen source. Provider/source preflight before dispatch. Read actual outcome/history before rejected drafts/verdict diagnostics; commit primary review first. Inspect selection, reasoning relevance, natural speech, feasible next step and safety in the whole reply. Do not score keyword presence, force cheap purchases or ask verifier to judge voice. If any focus regression remains, stop and report rather than automatically starting a second fix/run or full stateful campaign.
