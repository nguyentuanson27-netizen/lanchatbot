# Phase B — bounded selling-option read correction

Owner authorizes revising the independently reviewed plan and implementing the fix. Intake HEAD: `d09f2231d5032b8bed84494f34c50d64dbe844a3`. Refreshed `origin/main` / implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing branch/PR391 remain the delivery surface. This is implementation and deterministic verification, not a provider run or source publication.

## Evidence and limits

The last priority replay produced 0 USABLE / 2 NEEDS_EDIT / 4 fallback. One price lookup needed another offer read after search + default read exhausted the two tool rounds. Three protected-semantic refusals and two weak sales replies are separate problems; giving all selling options in one read does not prove they improve. The final-only provider violation remains unresolved and must still fail closed.

The independent read-only reviewer returned REVISE_PLAN at intake HEAD. Incorporate its three P2 findings: bound all-option expansion and preserve default semantics; retain meaningful current-fit instructions because hardPrecheck runs after the draft; give every later candidate its own source identity and complete denominator. Registry publication is a source trace, not a demonstrated candidate-code defect.

## 1. One read, explicitly scoped options

Owning files: `single-agent-commerce-read-only-tools.ts`, existing native tool declaration/projection in `gemini-inference.mjs`, and their tests. Reuse `resolveCatalogFacts`, variant/claim construction, current read/filter literals and readback.

- An omitted offerType reads the existing default plus a bounded `sellingOptions` summary of each source-confirmed option from the SAME fetched POS snapshot. Each option has its own offerType, variant/evidence identity, price/stock/optional ETA, availability and snapshot metadata; protected-claim provenance stays in the existing trusted context.
- Top-level offerType/facts keep their existing default meaning, explicitly described in the tool declaration. They are never a generic price for every component. Supplying offerType still reads only that option. Do not change global OFFER_PRIORITY or infer the customer's chosen offer in code.
- Preserve size/color/region filters separately for each option. Reading stock is not a personal fit or a cart selection. Preserve component-sale evidence, source identity/expiry and final readback of non-default options.
- Null/stale/unavailable POS means unknown options, not an empty list, set-only sales or out of stock. A confirmed empty mapping is distinct. One unavailable option does not erase another option or independent product content.
- Bound the expansion by the existing 8-subject and 32-claim limits, including product subjects and already retained reads. Reject overflow using the current rejected-tool path; do not return a truncated list as complete. Keep the runtime's existing 8KB bound for the ENTIRE batch and the native adapter's 32KB serialized-request bound. Do not increase limits, calls or tool rounds.
- Keep original native history/call IDs, signatures, receipts and evaluator firewall. Sanitize availability reasons in option summaries through the existing public reason allowlist. No new model role, router, prose parser, state store or recovery loop.

## 2. Trace registry publication using existing code

Inspect the captured registry/index evidence and current registry -> p23c profile/job/publisher -> Qdrant consumer -> candidate path. Producer/consumer already support product_attributes and publisher supports PAYLOAD_ONLY. Record source/version, affected captured points, relevant payload delta and the existing publication action. Do not infer the cause of a historical publication gap without evidence, invent lining/opacity facts, or execute publication in this code-fix task. Leave genuinely UNKNOWN properties unknown. No new synchronization mechanism.

## 3. Keep the advisory baseline intact

Owner prompt remains byte-exact at SHA256 `74c8102ef88e970fca18e84f5d186406a4d21ac5d27bafc383c6476b85394b43`; verifier prompt remains `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d`. Do not remove fit/state/receipt instructions in this slice. Code's post-draft rejection cannot replace useful guidance before generation. A later prompt change needs its own evidence and identity; no new case examples or instruction accumulation here.

## 4. Verification and run policy

Observe focused RED before implementation. Cover default versus explicit offers, all-option price/stock scopes, unchanged/changed non-default readback, freshness, filters, absent versus empty POS, independent partial results, subject/claim bounds, aggregate tool-result overflow and captured native-request projection. Reuse current negative authority/final-gate coverage. Run the affected worker source suite, Node eval suite, existing protected-claims/reply-assembler tests, worker typecheck/build/lint. No shared-package source change is planned; run owning additional checks if that changes.

Actual commands/results and source trace go in IMPLEMENTATION.md. Tests establish boundary/projection behavior, not model compliance, naturalness or a sales-quality PASS. Preserve all historical corpora/prompts/run evidence and labels.

For a later authorized model replay: keep the existing 24-case priority permutation, models and N1/max120 for 24 B1 + 7 stateful. Freeze one clean candidate before any request; run the six priority cases once. Only if all six actual terminal outcomes are usable and safe, continue the remaining 18 B1 and seven stateful at the same source/config. Otherwise record them NOT_RUN. Do not rerun successful portions or combine success across candidates. Any subsequent prompt change creates a new identity and denominator. The current runner reads live sources per case; unless the actual source/tool inputs are held equal, report before/after observations and leave causal attribution UNKNOWN.

## Delivery and rollback

Save the revised plan, then observed RED/minimum GREEN, then verification/documentation as incremental commits on PR391. Self-review the final diff. Rollback is a new revert of this correction; preserve historical run evidence. Stop after the requested fix. Sales/live acceptance remains STOP, real-source checkout remains BLOCKED by missing authoritative region mapping, and A remains OWNER_BYPASS. No provider generation, source/index publication, merge/deploy/live send or Phase C is authorized by this implementation.
