# Phase C foundation — 28/10/2026

## Collector completion work after foundation approval

Owner subsequently authorized completing Phase C and running models, and selected an independent **GPT-6.1 Sol High offline blind judge**. The following implementation is newer than the foundation approval below and requires its own independent review.

Added source/frozen readers, bind-corpus and real initial-state readback; actual native safety/candidate collectors; same persisted ingress/Outbox envelope for genuine main C3; whole-main/transitive build pinning; native wire codecs without duplicate prompt context; bounded per-turn request ledger/dispatch claims; explicit actual boundary and accepted-output witnesses; source coverage/loss; judge import and complete denominator merging; real-adapter driver. Two optional evaluation-only ports expose the existing native boundary and C3 reference run inside candidate ingress. They do not change default B orchestration or production wiring.

Actual checks so far in this follow-up:215 focused worker PASS (including one real main296-builder/two-pass/guard/shared ingress test with local response stubs);48 Node tests PASS before latest additional coverage/code-owned/merge regressions; direct worker typecheck and build PASS. C3 baseline offline frozen-lockfile install/build PASS,638tracked source/2044built files pinned. These are code tests, not PostgreSQL/model qualification. Final counts and independent disposition are recorded in the follow-up review report.

[Collector implementation review, exact commands and remaining work](COLLECTOR_IMPLEMENTATION_REVIEW.md): same reviewer approved bounded components after fixes;52focusedPASS in that review snapshot; broad repeat728PASS/0FAIL/2existingSKIP after one transient local Round62 failure, which is retained in the report. Approval does not cover missing corpus/search/history-seed work or campaign readiness.

Execution is still **BLOCKED, not complete**. Existing source/credential launcher was tried twice; SSH source host:22 timed out before credentials/public world could be read. No local Vertex credential variables are configured. Docker Desktop daemon is unavailable for local PostgreSQL fallback. The global Codex client is0.164.0, but the existing task-local0.159.2 binary/hash/ChatGPT login was recovered and validated through process-scoped APPDATA; no model change or global installation change. All qualification provider requests and new real-adapter runs remain0. [Readiness evidence](EXECUTION_READINESS_20261028.json).

Fresh corpus/world/source bindings, search snapshot and authored-history seed review remain pending; no seal or runSourceSha exists. Main Context V2 cannot carry all current policy/profile/cart/history evidence; actual coverage loss blocks matched replacement unless separately resolved, even if absolute candidate qualification later passes. Do not label shared worldHash as equal model information or capability-derived wins as isolated language-quality improvement.

The original foundation record follows and remains historical evidence.

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
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts`:57/57PASS.
- On clean sourcef644e0b1, `node .../cli.mjs init --out ../c3-phase-c-draft-config-r2-20261028.json` created actual draft config with0requests. `node .../cli.mjs check --config ../c3-phase-c-draft-config-r2-20261028.json --corpus apps/worker/evals/single-agent-commerce-qualification/holdout.draft.json` correctly returned BLOCKED/missing BASELINE_IDENTITY, BASELINE_MATCHED_BRIDGE_EVIDENCE, BLINDING_REGISTRATION, CORPUS_BINDING_AND_REVIEW,0requests; nonzero exit. This is a preparation check, not a sealed registration or provider result.
- Same independent reviewer: REQUEST_CHANGES → fixes → repeated review → **APPROVE exactf644e0b1**, independently32/32PASS. [Review scope and closed findings](INDEPENDENT_REVIEW.md). Later closure edits are documentation-only.

Spec Git blob identities at reviewed source: architecture `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; boundary amendment `4a09b55d2f3a972a65697738876cc5eab21e7a2b`. These are Git blob SHA1s, not run identities or prompt SHA256s.

## Remaining work before a Phase C run

1. **Collector and matched C3 bridge not built.** Inspected main `track-c-c3-journey-adapter.ts` requires BEHAVIOR_SIMULATION; `track-c-c3-v5-benchmark-runner.ts` exposes no persistence/effect port. `track-c-c3-two-pass-candidate.ts` references C1 fixture IDs. These existing paths cannot simply be relabeled as the required new persisted stateful comparison.
2. **Effective generation parity unresolved.** Inspected main defaults use JSON/max1024 without establishing the candidate's explicit HIGH/8192/plain-text settings. The bridge must freeze matched effective model/config while preserving genuine C3 orchestration/output contracts.
3. **World/corpus unbound.** SAFETY draft placeholders, source facts, pre-state bindings, naturalness/coverage/source review and development separation inventory are pending. No seal issued.
4. **No measured evidence.** Actual human grades, generation/error/latency/token/cost data, structural trace audit and seven real-adapter invariants are still NOT_RUN.

Next work is genuine collectors/bridge and source-bound fresh inputs, then clean-source registration and execution. See [collector contract and commands](README.md). Do not infer Phase C PASS or replacement authorization from foundation test/review approval.
