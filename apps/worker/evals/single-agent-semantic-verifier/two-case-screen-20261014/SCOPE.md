# Two-case screen → conditional full Checkpoint A — 2026-10-14

Owner asks to apply general principles to the two failed turns, rerun those exact cases, and only after both PASS run full A2 then A3. Starting HEAD `1865c0584f4223d5c9ed6733aad089e06cc00764`; refreshed main/implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing branch/draftPR390 retained; all historical inputs/results unchanged.

## Candidate changes

- Replace existing product-advice sections in both prompts. Product-wide design/material/style/care advice does not require SIZE_FIT; selecting size/saying it fits the current customer still does. Grounded expected-comfort advice remains allowed. Judge the outcome the whole reply asserts; emphasis or intended duration alone does not establish a tested/guaranteed physical property. Measurements/tests establish their own result and scope, not unrelated properties.
- Replace the owner changed-context line: when a known risk conflicts with the customer's priority, make an explicit recommendation for the present option. A risk need not be certain to recommend avoiding it. A substitute needs evidence for the actual concern; no substitute is required to give a clear conclusion.
- No new examples/stock answers/case IDs/evaluator labels or product-specific production rules. The three existing generic voice examples remain unchanged. Size/policy/ETA/style/capability/authority/schemas/fallback/source data and model settings unchanged. No profile/source limitation is removed to ease a pass.
- Owner prompt [sales principles](../prompts/fashion-sales-owner-sales-principles-20261014.vi.txt):9,120bytes, +135 versus prior8,985bytes (1.50%). Verifier [sales principles](../prompts/semantic-verifier-sales-principles-20261014.vi.txt):9,084bytes, +66 versus9,018 (0.73%). This is paragraph replacement, not a shorter-prompt quality claim. Exact hashes in [plan](plan.json).

## Frozen order and attempts

Exactly `r5-competitor-price` and `r14-stage-light-change`, fresh N1, at most4generations: owner Vertex `gemini-3.5-flash-lite`/HIGH and verifier OpenAI `gpt-6.1-sol`/high. Max1generation per role/attempt, retry0; no rewrite/reverify, voting, best-of-N or hidden attempt. Reuse the existing diagnostic dispatcher/early persistence/exact-text evaluator/final gate/adapters/publisher/source checks. Fixed new loader pins these two previously failed rows, unchanged R67 contexts and new prompts; no generic orchestration framework or third online role.

Commit executable/config → clean worktree → capture runtime `DIAGNOSTIC_RUN_SOURCE_SHA` from HEAD → inspect existing CLI/login/Vertex route and preflight → run both once → commit raw → whole actual-terminal primary review using existing10dimensions/bars before rejected-draft/verdict diagnostics. Keep human scores null. Both rows must be SEND_ELIGIBLE and quality PASS; verifier PASS alone is insufficient. Source/persistence/auth/capacity interruption retains every missing/unknown/error, no retry.

If either row fails: STOP, preserve both outcomes and create checkpoint report; full A2/A3 NOT_RUN. No automatic prompt changes or another screen. If both pass: owner already authorizes full followup, so continue without asking again. Freeze/seal full executable/config source before full A2 and separately capture A3runSourceSha only after complete fresh A2PASS. Candidate prompt/context/model identities must remain the same; any material change invalidates this screen for the followup.

Full population stays138A2cases and42A3cases. Preserve R67 repetition policy: two existing historical A2 regression groups×3, other136×1=142A2attempts (91UNSAFE/51SAFE); full42A3×1 only after A2PASS. This adds no case or label. Screen2 plus conditional full142+42 =186registered case attempts; at most230role generations before deterministic precheck reductions. Full42 regenerates both screened cases and retains both sets of outcomes; no adoption/cherry-picking. Any unsafe eligible A2PASS hardFAIL/STOP; keep errors and all unrun in denominator.

Report provenance, exact bodies/firewall/bindings/gates, roles/requests, models/prompts/schema/corpus hashes, all terminal outcomes, primary quality and operational usage/latency/error/cost limits. This is development Checkpoint A only: no promotion holdout, production wiring, tool/state/mutation, repair loop, merge/deploy/live send or post-A. Stop at owner GO/STOP/BLOCKED after the authorized conditional work.

## Actual readiness before screen

New fixed-loader/request tests observed RED0/2 before entrypoint; GREEN2/2 within34focused PASS,0skip, exit0. Command: with `C3_CHECKPOINT_A_ROUND=39`, `C3_TEST_CODEX_TRANSPORT=1`, `node --test --test-concurrency=1` over `two-case-screen-20261014.test.mjs`, `failure-recheck-20261014.test.mjs`, `protocol.test.mjs`, `codex-inference.test.mjs`, `gemini-inference.test.mjs`. Logs: `C:/Users/nguye/AppData/Local/Temp/c3-two-case-screen-{red,focused}.{stdout,stderr}.log`.

Worker/shared/core/adapter/compiled-helper sources unchanged from prior checked preparation (422eval/79boundary+Vertex/21protected+assembly/build/typecheck/lint); these are prior checks, not claimed rerun here. No provider API change; reuse existing adapters and same-day official-document checks. Fresh full-run readiness will run required focused/full/worker checks if the two-case screen passes and full-run admission is implemented.

Self-review: no keyword rule, case-shaped answer, policy hardcode, source deletion or evaluator request leak; scope separates product-wide advice from individual fit and an uncertainty about a risk from a recommendation. Model behavior remains unproven until provider results. Source SHA captured only at runtime, never written back into frozen plan.
