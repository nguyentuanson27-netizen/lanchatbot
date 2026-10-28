# Phase C foundation — 28/10/2026

**Qualification: BLOCKED / NOT_RUN.** No Phase C provider requests, measured grades, matched C3 campaign or new real-adapter run. B NOT_GO remains unchanged. Approval of this tooling is separate from qualification.

Implementation base `f160dfa4f7e0c8b3e29232570710d99d4f5ed012`; refreshed main / owner-selected C3 baseline `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; branch `feat/c3-phase-c-qualification-20261028`. [Plan](../../../../docs/specs/c3-phase-c-qualification-plan-20261028.md) follows architecture §§13–16,21 and boundary amendment §§11–12. No C runSourceSha exists yet.

[Owner decisions](owner-decisions.json): N1, absolute SINGLE/JOURNEY ≥90% separately, safe usability ≥90%, no hard safety/state/effect/privacy failure, net wins ≥10pp in BOTH modes for replacement. Planned candidate model identities remain Gemini3.5FlashLite HIGH + GPT6.1Sol HIGH from the B manifest. C3 matched effective model/config remains unverified; baseline source approval alone does not establish model or persisted state parity.

## Built scope

CLI init/check/seal/absolute/blind/assess; actual source/config/prompt inventory and owner-decision binding; clean source and exact registered input guards; complete denominator/error accounting; both-arm runtime wire binding; exact verifier draft/request/trusted-snapshot wire binding; state/history continuity; role paths; separate target/replacement/real-adapter decisions; absolute/comparative blind whole-outcome packets with facts/state/effects/receipts/media; explicit operational metrics by arm/mode, unavailable usage accounting and p50/p95. Rollout is always unauthorized.

Draft corpus has16SINGLE +6three-turnJOURNEY +24SAFETY(12safe/12unsafe) outlines. At N1 that would register68arm/scenario slots if bound/approved; this is a planning count, not executed attempts or an observed false-PASS denominator. No source facts or grades are fabricated to make these outlines executable.

No production entrypoint/shared business code/owner or verifier prompt changed; zero online semantic roles added. These modules validate imported evidence. They do not authenticate hand-authored JSON as a provider response or execute the collector/real-adapter drivers.

## Actual verification

- Initial evaluator RED3fail/5pass → GREEN8/8; nested-label regression RED1fail/12pass → GREEN13/13.
- Observed RED17pass/3fail for baseline safety/reset, empty/silent terminal and trajectory bugs → GREEN20/20. Bridge/initial-world regression RED20pass/2fail → GREEN22/22.
- Latest `node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"`:32/32PASS,0skip, including disposable-git seal/assess/absolute/blind, source/threshold/unresolved-input/preregistration-time/output-path rejection. All model responses/grades in these tests are synthetic.
- `pnpm --filter @lana/worker test:evals`:707PASS/0FAIL/2SKIP(709total) on earlier foundation snapshot; existing installed-Codex-to-local-stub tests skipped. Final verifier-binding changes were then covered by focused32/32; unchanged A/B suites were not reinterpreted as model results.
- `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker lint`:exit0. Normal dependency builds ran; no shared package source changed.
- Draft-author generation and `node --check .../cli.mjs` ran. First author run rejected duplicate safety runtime contexts; dedup fingerprint now includes the registered finalDraft so a safe/unsafe draft pair is not mistaken for one identical input.
- Same independent reviewer returned REQUEST_CHANGES, re-reviewed and found source/runtime/history/verifier-wire gaps; fixes/regressions are included. Final reviewer disposition is recorded separately after final source review.

## Remaining work before a Phase C run

1. **Collector and matched C3 bridge not built.** Inspected main `track-c-c3-journey-adapter.ts` requires BEHAVIOR_SIMULATION; `track-c-c3-v5-benchmark-runner.ts` exposes no persistence/effect port. `track-c-c3-two-pass-candidate.ts` references C1 fixture IDs. These existing paths cannot simply be relabeled as the required new persisted stateful comparison.
2. **Effective generation parity unresolved.** Inspected main defaults use JSON/max1024 without establishing the candidate's explicit HIGH/8192/plain-text settings. The bridge must freeze matched effective model/config while preserving genuine C3 orchestration/output contracts.
3. **World/corpus unbound.** SAFETY draft placeholders, source facts, pre-state bindings, naturalness/coverage/source review and development separation inventory are pending. No seal issued.
4. **No measured evidence.** Actual human grades, generation/error/latency/token/cost data, structural trace audit and seven real-adapter invariants are still NOT_RUN.

Next work is genuine collectors/bridge and source-bound fresh inputs, then clean-source registration and execution. See [collector contract and commands](README.md). Do not infer Phase C PASS or replacement authorization from foundation test/review approval.
