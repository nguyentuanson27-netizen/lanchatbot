# Independent review of the next fix plan — 2026-10-16

Requested by the owner: “cho hướng xử lí - gọi 1 review độc lập hướng xử lí đó”. One fresh-context reviewer, `/root/phase_b_next_fix_plan_review_20261016`, reviewed the proposal against the repository and retained run evidence. No model/effort override was requested or applied for the reviewer; this is a development review role, not an additional commerce-model role.

Reviewed proposal SHA256: `2e0fc2a945176fa64a14632ad53e1184bbc0facc4e050f83b765fdb0e74f32e7`. Intake HEAD `5f5080c68f60c852984b6952949b0182623e6bfa`. The reviewer did not edit files, run tests, call the eval providers, access network/live sources or spawn another reviewer. It read both full CONVERSATIONS (24+7), primary reviews, DIAGNOSTICS/CHECKPOINT_B, owner/verifier prompts, native adapter/core/tests and relevant product/fulfillment source paths.

## Original verdict: NEEDS_REVISION

This verdict applies to the plan, not runtime readiness. No P1 severity finding; two P2 findings require changes to the plan. The reviewer found no supported reason to loosen the verifier.

### P2 — Make the failed-case-first run executable with the existing runner

The original plan's last section asks for cases1/6/7/9/11/15 first, but `protocol.mjs` supports only contiguous `--range` and requires a complete24-case file. Without a concrete partition, an implementer might change the runner or repeat the population.

Smallest remedy: freeze a new24-case copy with just that permutation, preserving every case's runtime/evaluator/sourceMode and the canonical original. Run the same frozen file at `--range 1:6`, then `--range 7:24` in a new output directory if the first six pass whole-outcome review. One B1 denominator24; if stopped, six actual results and18NOT_RUN. Total maximum96B1+24stateful=120generations; never rerun the first range. No selector/framework is needed.

Disposition: incorporated into NEXT_FIX_PLAN.md. It also explicitly keeps source/HEAD and outputs unchanged/outside the worktree across both partitions; commits occur only after collection stops. A stopped B1 partition leaves the seven stateful outcomes NOT_RUN as well, not silently removed.

### P2 — Verify ETA in its owning resolver

P4 proposes source/mapping diagnosis and missing/stale/changed negative controls, but the initial command list omitted `src/realtime-sales-catalog.test.ts`. The resolver requires both PRE_ORDER preparation and region transit values when there is a delivery address; effects/session fixture tests do not establish that contract.

Smallest remedy: if ETA mapping/resolver changes, extend and run its existing suite for the actual changed branch: correct PRE_ORDER/region, missing prep/transit, stale and changed source. Missing shop values remain BLOCKED with a source proposal; no default/fixture may be presented as real checkout completion. Publisher/Qdrant checks are conditional on actually changing those paths.

Disposition: incorporated into P4 and the conditional focused commands. The final implementation command list also includes the existing full worker source suite, not just evals/compiler checks.

### Clarification — Only relocate offers, preserve other policy literals

The initial P1 already requires preserving filters, so the reviewer did not classify this as a separate defect. Its broad phrase “owner policy contains actual shop rules” should still be narrowed: only relocate code-owned offers literals; keep other literals, especially `read:<hash>` carrying size/color/region and claim mappings. Do not filter all policyLiterals by an assumed shop-rules type.

Disposition: narrowed P1 explicitly; verifier/internal literals and non-offer owner evidence remain unchanged.

## Conclusions checked independently

- Case6 really dispatches NONE with zero declarations, has `offers:SD375` in owner policy, and returns `read_policy({ref:"offers:SD375"})`; the previous read already returned offers. Case11 has SV2447 description, missing ATTRIBUTES, stripped availability reason and unnecessary subsequent search/tool call. These establish interface state and behavior, not their causal contribution.
- Case15 is HTTP200 / OWNER_COMPLETION / UNKNOWN finish. The exact response subtype is not recoverable from retained evidence. Keep that cause unresolved unless a contract defect is demonstrated.
- Advertising XML plus absent attributes/presentation matches the voice problem in case7, but does not prove that changing data alone fixes the owner.
- Stateful-open generation3 has STOCK PRE_ORDER / available quantity0. Disclosure before purchase confirmation has existing factual support; no detector/tool is needed.
- Case1/9 semantic refusals are supported. No distinct false rejection is established for changing the verifier.
- ProductAttributesV1 uses Google Sheets registry authority; the publisher builds it from registry overrides/JSON. Do not extract XML and relabel it with registry authority. XML remains usable content with its own provenance.

## Architecture, sales goal and limits

The reviewer supports the proposed ownership: code for authority/state/effects/receipts/privacy and final gate; owner for source use, choices and conversation; verifier for protected semantics; source owners for product/ETA data. P3/P4 are conditional investigations, not already identified source patches. Missing values require an authorized source proposal, not a new schema or made-up fact. Ordinary styling advice does not require a separate lab test.

The plan does not impose keywords/templates/CTA/checklists, pile more prompt instructions on top or ask the verifier to judge sales quality. Projection changes can still affect good cases, so the remaining18B1 and seven stateful outcomes matter. N1 does not establish stable behavior, human acceptance or A/C/live readiness.

The supported findings above were applied by the author after this original review. Implementation, provider replay, source publication and runtime GO remain NOT_RUN/ungranted.

## Same-reviewer confirmation after corrections

The same reviewer checked corrected proposal SHA256 `4c9cc60d7f64f1ea55d767cf853b1dbe93d5b97daff55b0187e62115e4f42676` and returned **READY_TO_IMPLEMENT_PLAN**, with no remaining required changes in the corrected items. It confirmed the frozen full24 permutation/two disjoint ranges/same HEAD/no intermediate commits/aggregate denominator/18+7NOT_RUN; owning ETA resolver tests; preservation of non-offer/read literals; registry authority; and full worker source checks.

This is one independent reviewer with a correction readback, not a second reviewer or runtime gate. It did not run tests/providers or access network/live sources. The confirmation is of plan clarity, not runtime GO, successful checkout or human acceptance of sales quality.

Author's documentation-only closeout: `git diff --check` and the existing offline closeout helper exited0. All39 retained raw hashes and six committed primary blobs remain unchanged;48JSON files/215JSONL rows parse, local report links resolve and secret-pattern scan has0matches. Only the plan/review and task documents changed; new provider requests0. No runtime suite/typecheck/build/lint was rerun for this planning task.
