# Proposed correction after the 31-outcome replay — 2026-10-16

Planning/review only. Intake HEAD `5f5080c68f60c852984b6952949b0182623e6bfa`; measured run source `183ad77ef8116a28c0f6cbec22056a9ae5b29f2b`. No runtime/source publication/model request is authorized by this planning task. Existing historical raw, primary labels and STOP remain unchanged.

One [independent plan review](INDEPENDENT_PLAN_REVIEW.md) found two P2 issues in the original proposal: specify how the current range-only runner executes failed cases first, and include the owning ETA resolver's tests. Both are corrected below. Also narrow the offer projection to preserve non-offer/read literals. These corrections do not establish runtime readiness or sales acceptance.

## Goal and evidence

Help the customer choose and buy clothing with useful, natural advice and executable actions. Report sales quality, semantic safety and completed state/effects separately. B1 has 18 USABLE / 1 NEEDS_EDIT / 5 fallback; the six changed-occasion/buying-concern cases have only 2 USABLE / 1 NEEDS_EDIT / 3 fallback. Stateful has four useful captured transaction replies, one requested handoff, one ETA-blocked checkout handoff and one dependent no-send.

Confirmed: availableOffers is serialized under owner policy; owner availability loses reason codes; owner gets advertising prose with attributes/presentation absent; two owner tool responses arrive under NONE/tools[]; one HTTP-200 completion cannot be parsed; private checkout reports CART_ETA_UNAVAILABLE. The first two interface defects may contribute to unnecessary calls; their causal contribution and the provider/API cause of unexpected calls are not yet isolated. XML style influence is plausible, not proof that rewriting data alone fixes the owner. Do not blame all fallback on the verifier or imply that fixing these interfaces guarantees 24/24.

Keep one conversational owner, at most one verifier and mandatory verification/current final gate for surviving final drafts. Keep code authority, receipts/CAS/freshness/privacy/permission and exact draft/snapshot bindings. No third model/router/parser, case regex/template, repair/reverify loop, retry, budget increase, framework, new store/gate or production wiring. Models/efforts remain Gemini 3.5 Flash Lite High owner and GPT-6.1 Sol High verifier. Checkpoint A remains OWNER_BYPASS.

## P1 — Owner context has one clear meaning per field

Owning files: `gemini-inference.mjs` and its focused tests; `single-agent-commerce-read-only-tools.ts` only if required to preserve a bounded typed value.

- Keep availableOffers as product selling options. Relocate only the current code-owned offers literal from owner policy into that product's availableOffers, using the existing read_product result where present. Do not infer options from text, all variants or stock. Preserve every non-offer literal, particularly read:<hash> with size/color/region/claim mappings; do not filter policyLiterals wholesale by an assumed shop-rules shape. Preserve all internal/verifier literals, source identity and readback so this owner presentation change does not remove proof of component sale.
- Preserve per-field status plus the existing bounded public source reason when price/stock cannot be read. Unknown source errors remain unknown; do not pass arbitrary error strings/credentials or evaluation sourceMode. Remove the redundant owner-facing missing checklist if it only restates availability/null fields; absent ATTRIBUTES does not mean a product description must be read again. Never turn null into an empty availableOffers list or UNAVAILABLE into not sold/out of stock.
- Preserve native calls/responses, opaque signatures/IDs, changed evidence, receipts and current filters. No history fabrication or blanket stripping of tool data. Keep the exact 32768-byte serialized bound.

Acceptance: captured owner request contains the same verified options/facts, shop policy is not an offers ref, and partial-source status/reason remains distinguishable without evaluator leakage. Verifier context/binding and rejected source changes remain protected. This proves projection correctness, not model adherence or better writing.

## P2 — Diagnose final-only/completion at their current boundary

Owning files: the existing native adapter/parser, runCommerceTurn budget handling and their tests. No replacement provider client or continuation framework.

- Recheck current official Vertex generateContent/function-calling and response contracts before implementation. Replay the stored final-only requests offline against the actual serializer/dispatch path: NONE, no declarations, current budget, native continuation association/signatures and recorded byte/hash. Fix only a demonstrated API/client mismatch; do not assume deleting valid history or adding another prompt instruction solves provider behavior. The existing runtime must never execute a call after the frozen tool budget.
- Reuse telemetry.failureCode/finishReason for finer parse failures: candidate count, known official finish reason, content role/parts and visible-output validity. Add only bounded categories needed to distinguish the observed HTTP-200 failure; do not retain raw provider bodies/thoughts/customer-private data. Future unknown enum values remain UNKNOWN. Do not accept truncated/unsafe/tool-only output as customer text or retry the failed generation.
- Offline replay cannot establish live provider conformance. If no contract defect is demonstrated, retain that cause as unresolved; a later authorized run must measure it. No model/API substitution or hidden diagnostic generation in this task.

Acceptance: deterministic negative controls retain no execution/no retry for final-only tools and malformed completion; positive native continuation/final text still works. Telemetry distinguishes the newly understood completion branches while preserving request/error/token accounting. Live NONE adherence remains unverified until observed.

## P3 — Give the owner usable product information and a sales decision

Dependencies: P1, with current product-source readback. Existing ProductAttributesV1 already has material/component/design/wear fields; reuse it and the current source verification/publication route rather than inventing a sales-memory schema.

- Trace why SV2447 has WEBSTORE_XML content but no attributes/presentation along the existing registry → p23c-profiles → Qdrant payload → stableProductDocumentFromQdrantPayload → candidate path. Distinguish unpublished/unconnected attributes from genuinely missing source facts. ProductAttributesV1 authority is GOOGLE_SHEETS_PRODUCT_REGISTRY: the publisher takes registry overrides/JSON, not automatically every phrase in XML. Do not parse XML into new registry facts or relabel its authority. Prepare any source corrections as a reviewable proposal; do not publish source/index changes in a code-fix task without the appropriate authorization.
- Known material/construction/design data can guide confident styling advice. Keep original evidence and metadata for the verifier. Missing lining/opacity remains unknown, not no lining/easily transparent; breathable marketing description is not a guarantee for a heat-sensitive customer outdoors. Do not demand a separate experiment for every styling opinion or create synthetic shop facts to answer every scenario.
- Rewrite only the existing owner sales/voice paragraphs if necessary after context correction, replacing conflicting/redundant wording instead of appending case instructions. For a concern, make a purchase recommendation and a practical reason or styling choice from what is known. If the decisive property is unverified, help within the supported choice without guaranteeing that property; do not make the entire reply a knowledge limitation or tell the customer to solve shop-data gaps. Alternatives need evidence for any functional guarantee; ordinary styling judgment remains allowed. No per-case examples or fixed sentence/CTA rules.
- Review whole replies, including the apparently usable ones: budget/profile repetition only when it helps the current decision; no penalty for relevant facts or useful upsell. The verifier keeps its protected-semantics job and existing prompt unless a distinct false rejection is established.

Acceptance: actual customer outcome makes a useful choice for the stated concern, reads like shop chat and stays within the approved factual scope. Assess naturalness/coherence/decision together, not by counting keywords or prohibiting isolated phrases. Code tests prove source/projection fidelity; they cannot prove natural conversation. Human acceptance remains separate from the coding agent's review.

## P4 — Complete fulfillment prerequisites without relaxing checkout

Owning path: existing source adapters/fulfillment policy and cart prerequisite resolver; private checkout/authority guards remain intact.

- Trace the missing authoritative ETA for the selected PRE_ORDER SKU and region. Reuse already configured source/policy/region mappings; first determine whether the source is missing or its mapping is wrong. In realtime-sales-catalog, inspect zero-stock preparation min/max, the resolved region's transit min/max and source expiry separately; any missing preparation or transit currently returns CART_ETA_UNAVAILABLE. A supported code mapping defect can be fixed; a missing shop value needs authorized source publication, not a default or fabricated fixture. Retain CART_ETA_UNAVAILABLE if still missing.
- The existing STOCK fact already exposes PRE_ORDER to the owner after add_to_cart. Include that material purchase information before asking for confirmation; do not turn a cart ACK into an in-stock/delivery claim. Use the existing owner task/context, not a new phrase detector or forced ACK template.
- Handoff changes ownership/event/tag and may intentionally have no customer text. Read the actual handoff rule before treating silence as failure; do not promise an external notification or let the bot continue after HUMAN authority. Step6 remains a dependent outcome of step5, not a second model failure.

Acceptance: source-backed ETA preserves region/start/range/expiry and reaches private preview/confirmation when available; negative stale/missing/changed cases still fail closed. If the mapping/resolver changes, extend its existing realtime-sales-catalog.test.ts suite for that actual branch: PRE_ORDER/region, missing prep/transit, stale and changed source. Effects/session fixtures do not replace this resolver evidence. Distinguish synthetic COD/bank composition from real-source purchase completion. If source ETA is still absent, report this boundary BLOCKED while other implementation work proceeds. No live order/send/publication is inferred.

## Verification and a later run

Implement P1/P2 as separate focused RED→GREEN slices; protect known-good price/stock/policy/component/name lookup and state/receipt paths. P3/P4 can proceed independently once their source contracts are understood. Do not rewrite all four systems together or add tests that merely match prompt strings.

Commands selected from the current plan (to run only during authorized implementation):

```text
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker exec vitest run src
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

If ETA mapping/resolver changes, run the owning focused suites before the full source suite:

```text
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts src/realtime-sales-cycle.test.ts
```

Run affected shared-package checks only if source there changes. Run publisher/Qdrant adapter checks only when those paths change. Reuse current owned-database COD/bank composition runner when state/checkout/handoff code changes; source checks stay read-only. Never claim current checks PASS from the previous run's evidence.

A later requested model batch retains the same 24 B1 + 7 stateful cases, N1, maximum120 generation invocations, no replacements/retries. The existing runner only supports contiguous --range and a complete24-case input. Use a new24-case copy whose sole change is permutation: old cases1/6/7/9/11/15 first, then the remaining18 in their original relative order. Preserve every caseId, runtime, evaluator and sourceMode; canonical cases.b1.json and historical corpora stay unchanged. Freeze the new copy/hash/order/source before requests; runtimeCase continues to exclude evaluator metadata.

Run the same frozen copy with --range 1:6, then --range 7:24 into a different new output directory only if the first six actual whole outcomes are usable and safe. Never rerun the first range. Keep the same clean HEAD/config/prompt through both partitions; store raw outputs and terminal-only review notes outside the worktree, without committing or changing source between them. Preserve raw before each partition's review; do not inspect rejected drafts or patch source during this decision. After collection stops/completes, commit all collected raw before the scored primary review/diagnosis artifacts. This uses the existing runner/registration/reporting, not a new selector or durable gate.

The aggregate B1 denominator is24 with maximum96generations across both ranges, plus seven stateful outcomes/max24generations in original journey order. Retain both range registrations, disjoint case IDs and actual request accounting; report max120 total. If stopped after the first six, record their actual results, 18B1 NOT_RUN and seven stateful NOT_RUN with reasons; never call it a full31-outcome run. Registered NOT_RUN outcomes are coverage limits, not model failures or missing attempts to replace. Stateful reports checkout blockage without disguising it as success. Preserve every actual generation/error/fallback/unknown. Human review/variance/stability remain unmeasured by N1. No run is executed by this plan.

## Complexity and stopping point

Prefer owner presentation changes, existing bounded error categories and fixing source mappings over new architecture. Expected roles/layers/stores/gates/schema migrations: zero. Do not add a deterministic prose assembler, generic Vietnamese parser, advisory mini-framework or fallback growth to rescue failed cases. Stop after the requested planning and one independent review. Proposed implementation and provider evidence remain NOT_RUN.
