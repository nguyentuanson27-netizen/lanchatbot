# Independent review — fix plan after 93 outcomes

Reviewer: /root/review_fix93_independent (separate subagent).
Reviewed baseline HEAD: e54961fb4344c86b2b5f75bb5e2c0e03fa77d916.
Reviewed FIX_PLAN.md SHA256: c356d6a95f87c471187bedec43aea31f88029fcdd696a199180fe0a88aada13b.
Scope: plan review, no implementation/provider/source writes. Reviewer checked relevant actual replies/traces, resolver, owner/tool prompts, description_override pipeline and run accounting; this is not an independent rescoring of all 93 outcomes.

Verdict: **REVISE_PLAN**. Overall direction is appropriate; three actionable P2 findings need correction before implementation. No new runtime role, framework, budget or additional run is required.

## P2-1 — Context-first changes more than context

Locations in reviewed plan: FIX_PLAN.md:82,127; S2:41–44.
Evidence: gemini-inference.mjs:98–100 includes the whole request.instructions in systemInstruction. Removing duplicated purchase instructions from owner.vi.txt changes B1 system prompt even when effect tools are unavailable. S4 also changes both description and availability projection.

Required correction:
- First eight diagnostic outcomes must use the exact owner prompt before S2/S5, with only the intended context presentation changes.
- Apply S2 after this diagnostic, with a distinct sealed candidate identity.
- If description and reason projection both change, call it a context-presentation experiment; do not attribute changes separately to description or reason.
- S5 keeps that tested context, so its additional prompt changes are explicit.
- This is input binding/order, not an A/B framework.

## P2-2 — Availability reason removal is too broad

Location: FIX_PLAN.md:74.
Evidence: gemini-inference.mjs:14–15,48–49,71–72 exposes source reasons alongside useful business/input reasons: POS_SNAPSHOT_UNAVAILABLE, CATALOG_SNAPSHOT_STALE, OFFER_NOT_FOUND, VARIANT_NOT_FOUND, SIZE_UNSUPPORTED, DELIVERY_REGION_REQUIRED. Status alone does not tell the owner whether to ask for destination, clarify a variant or simply report unavailable source.

Required correction:
- Limit removal in this attempt to the actual tested price/stock source failure, such as POS_SNAPSHOT_UNAVAILABLE.
- Retain selection/input/business reasons; no new enum taxonomy or universal translation layer.
- Verify partial source retains content/status/unknown offers, and destination/variant failures retain actionable reasons.
- Removing a code is an experiment, not proof that the model will stop saying “hệ thống”.

## P2-3 — Conditional S5 branch is unclear after initial eight outcomes

Locations: FIX_PLAN.md:84,126–142.
If the first eight B1 pass but later repetitions/stateful show poor voice, the plan does not explicitly state whether S5 can start. Another61-outcome candidate at that point can exceed69. Initial B1 does not test stateful acknowledgement voice.

Required correction, retaining the same cap:
- S5 may be opened only immediately after the first eight diagnostic outcomes.
- If the run proceeds and problems surface later, retain results and stop; no automatic additional S5 candidate in this task.
- Stateful voice is assessed in the21 stateful outcomes, not inferred from the initial eight B1.
- Any different branching/budget must be decided before execution, never extended after seeing failures.

## Supported decisions

- Shipping addresses the actual owning failure: map southern destinations to current MIEN-NAM transit, keep product preparation time and source freshness separate. Geographic data identifies destinations; shop snapshot supplies delivery times.
- Consolidating tool instructions is a reasonable experiment, but “keep color/direct add” already exists. Only args/state observations can show improvement.
- Reuse description_override with correct source identity/version. p23c-profiles.ts:626,788–793 already supports the path; do not label edited candidate data as original WEBSTORE.
- Keep verifier unchanged initially; observed stage/partial cases do not justify broad policy edits.
- Whole-turn voice review should permit useful fact mentions and upsell. Slightly dry but truthful partial answers are not equivalent to fabricated sales rules or unusable follow-up questions.
- Counts61outcomes/max232requests and69/max264 are arithmetically consistent with existing per-run limits.

## Remaining uncertainty

Neutral descriptions may improve voice but causality is not established. Consolidation cannot guarantee argument reliability. New finish-reason telemetry cannot reconstruct the old UNKNOWN response.

Parent disposition: findings accepted as necessary plan corrections. This file records review only; FIX_PLAN.md remains unchanged at the reviewed hash in this turn. No new tests, model run or implementation claimed.

