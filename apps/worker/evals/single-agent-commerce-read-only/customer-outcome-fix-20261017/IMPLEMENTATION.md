# Implementation and verification record

Intake `f654893074798dc064992b1eb98a8f659a23bb80`; refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Candidate B1–B3 only; A OWNER_BYPASS. [Plan](PLAN.md) and [source gap/evidence](SHIPPING_SOURCE.md). No new model generation is part of this implementation request.

## Changes

- Owner prompt replaces the two voice paragraphs and clarifies first preorder disclosure. Purchase choice is the subject of the ACK, receipts remain the authority for completed actions, and no example/case answer is injected. Prompt11,756→11,820bytes, +64bytes/0.54%. Owner SHA256 `569b89d98a2d25fb2c03d9f09560f06d4f9e90aa1e2431a0d3813144573da161`; verifier unchanged `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24`. Existing manifest hash refreshed; models/native declarations/budgets remain.
- Current code-owned private preview labels only PRE_ORDER lines; the same protected payload includes corresponding STOCK claims/readiness. No new parser/disclosure tracker/gate or keyword scoring. Ordinary in-stock preview receives no preorder warning; no physical fit/property promise is introduced.
- The current admin matrix already permits holding text per reason, but HandoffDecisionV2 incorrectly rejected any non-after-sales holding rule. Explicit resolved admin matrices now use existing ADMIN_CONTROL provenance and the existing matrix hash/ruleset identity. Default engine silence, after-sales category/reason/tag constraints and strict schema remain. This schema shape is not permission; actual policy resolution, scope, revision and transaction still own authorization. No new policy is published, no default silence is overridden.
- Private handoff that completes Inbox now atomically includes exact configured holding text in the existing Meta outbox intent, with current source/readiness and sendAfterOwnerHandoff. Missing/truncated message intent throws inside transaction; no ownership-only partial success is accepted. Private provider recipient stays code-only. Public handoff retains its existing deferred final egress, preventing duplicate messages. Outbox count is bounded local result metadata, not durable state/employee receipt.
- The existing owner loop reuses the terminal read immediately after a completed tool batch; no I/O occurred before the next iteration. Entry/post-tool checks, verifier final readback and final Outbox checks stay. Independent current conversation and inbox-generation reads start together. No persistent cache, budget increase or retry. No measured latency reduction is claimed without another real run.

## RED evidence and corrections

- Independent test author added the handoff persistence regressions: **4 PASS / 6 FAIL** on the old implementation. Configured dependency rules first exposed the upstream schema mismatch, not just the absent message intent.
- Worker preview/loop/persistence reproduction group: **89 PASS / 8 FAIL**. Contract test: **12 PASS / 1 FAIL**. Minimum correction produced **118 PASS / 1 FAIL** in the broader focused group: the historical after-sales fixture lacked the now-required delivery recipient/outbox count. The fixture now supplies the real required route/count, preserving the original atomic-event assertions; **119 PASS**.
- Concurrent authority-read regression observed **9 PASS / 1 FAIL** with the sequential path, then **10 PASS** with Promise.all. No timing threshold or test sleeps.
- Compiler exposed exactOptionalPropertyTypes in the new test fixture's explicit undefined option; fixed conditional fixture spread, not weakened runtime types.
- Initial real-PG COD and BANK_TRANSFER controls at clean `319616b121c7fe1b6b7aed6076fa5afbdd438c90` each stopped after **10 PASS / 1 FAIL** in the old direct after-sales handoff fixture. That fixture completed its source with a holding reply but omitted the now-required code-only delivery recipient, producing fail-closed `HANDOFF_COMMIT_UNPROVED`. Both reports are retained under `controls/*-initial-failure.json`; both DBs dropped, zero provider generations. The direct fixture now supplies its synthetic route and asserts exactly one persisted message, unchanged after replay, with zero messages on missing-link/superseded controls. Runtime/authority/schema behavior is not relaxed; full controls must run again at a new clean source.
- Follow-up at clean `78c8fe795f28af842400f7fa28ef275659db988b`: COD **10 PASS / 1 FAIL**, BANK_TRANSFER **13 PASS / 1 FAIL**, both DBs dropped, zero generations. COD's positive handoff fixture inherited the disabled test-page flags from the earlier no-payment-message control, so its message intent was correctly suppressed and the handoff rolled back. BANK_TRANSFER had already enabled its capture-only page, passed the direct handoff, then exposed cross-fixture capture: the later dispatcher drained that pending holding message and counted its gate against another conversation. The harness now enables only its disposable page before positive holding controls, scopes captures/gate counts to the fixture's exact recipient/conversation, and retains a bounded direct-commit diagnostic using the existing report pattern. No runtime suppression/atomicity/CAS guard is changed. Raw failures remain under `controls/*-fixture-failure.json`; full controls still require a new clean source.
- At clean `a2930d27ade325cef139676a07ed7b1fd84df4e8`, both branches reached **21 PASS / 1 FAIL**, DBs dropped, zero generations. Configured private handoff committed/enqueued exactly one message with zero owner/verifier calls, but the new test compared captures before running its capture dispatcher. Correct the test ordering: drain the purchase ACK, record the capture boundary, commit the handoff, drain its delivery, then inspect exact text/status. Its name now uses the existing `B composed` prefix so the existing composed-only selector also covers it. No runtime change or weakening of assertions; failures retained under `controls/*-capture-failure.json`.

## Completed checks before the code savepoint

- Full worker: **130files / 1,816 PASS** using the bounded Windows fixture-junction wrapper; original tracked placeholder restored.
- Shared contracts full source: **22files / 223 PASS**, plus contracts build and typecheck exit0.
- Focused worker owning group119PASS before adding the independent-read regression; that added file10PASS afterward, and all are covered by full worker1,816.
- Focused provider/protocol/comparison **49 PASS**; conversation-engine handoff defaults **48 PASS**; protected claims/reply assembler **21 PASS**.
- Worker build, typecheck and lint exit0. Full Node eval: **493 registered / 491 PASS / 0 FAIL / 2 existing optional SKIP**. Real-PG controls follow the clean code savepoint; no provider generation.

Commands actually run:

```text
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/realtime-sales-cycle.test.ts src/single-agent-commerce-persistence.test.ts
pnpm --filter @lana/contracts exec vitest run src/v2/handoff-sales-funnel.test.ts
pnpm --filter @lana/contracts build
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-read-only.test.ts src/realtime-sales-cycle.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/contracts exec vitest run src/v2/handoff-sales-funnel.test.ts src/v4/admin-policy-control.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/contracts exec vitest run src
& C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-worker-wrapper-20261017.ps1
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/conversation-engine exec vitest run src/handoff-fallback-v2.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker lint
pnpm --filter @lana/contracts exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker test:evals
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-current-shipping-source-20261017.mjs C:/Users/nguye/AppData/Local/Temp/c3-current-shipping-source-20261017.json
node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs
git diff --check
```

Shared source touched: contracts; consumer build/focused checks above apply. Full-repo pnpm check, remote CI, provider runs, human acceptance, actual employee delivery and live checkout remain unverified. Existing shipping data exists, but its missing private-address resolution is still a source/config dependency; no invented map/default or source publication. Do not relabel the preceding N1 run or claim these code checks prove naturalness or sales acceptance.
