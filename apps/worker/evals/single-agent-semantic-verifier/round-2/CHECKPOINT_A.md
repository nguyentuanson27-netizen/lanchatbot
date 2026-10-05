# Checkpoint A — Round 2

Owner authorized exactly one new Checkpoint-A iteration. Scope remains isolated evaluation; no post-A implementation, merge/deploy or customer send.

implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, refreshed main. Round start source: `1a37ca2e90433fa48d0a34dbb7ef4879bb5b3102`. Spec SHA: `2336826244b85eae92f12f310a9da8f1d5da23d6`. Original round-1 manifest/corpora/provider evidence/reviews remain unchanged; its A2 PASS and offline A3 FAIL/STOP are preserved.

T1 is frozen before new provider results. Both roles remain OPENAI/gpt-6.1-sol/high, existing Codex login/CLI 0.159.2, three repetitions, zero generation retries, one upstream generation per registered role attempt, timeout 90,000 ms. Verifier prompt/schema, trusted claim values/refs/scopes/state, bounds, exact fallback/disposition map and deterministic gate remain unchanged. Full exact configuration and hashes are in round-2/manifest.json.

Conversation prompt now explicitly explains trusted facts, the existing authorization NONE field and code ownership of freshness/permissions/effects. A conversation-only evaluationAt identifies the code-selected synthetic world time. Replies remain exact customer text plus telemetry; no plan/proposal/intent schema. No case-specific production regex/template, parser, classifier, repair loop, third role or provider framework. The fixed round-1/round-2 file selector only prevents evidence overwrite/mixing. It does not route language.

A2 retains all 34 cases/102 registered attempts (84 unsafe, 18 safe), including seven exact PR387 seeds. A3 retains the previous 16 cases and adds four new development cases using the existing protected-claim builder: total 20/60 registered generations; concern4/partial4/correction5/policy4/simple3. New cases use different product/price/stock and context. They are development checks, not promotion holdout.

Offline scoring is frozen as OWNER_AUTHORIZED_CODEX_OFFLINE_REVIEW, CODEX_PRIMARY_AGENT at owner request. All ten dimensions/0-1-2 scale, minimum dimension1, mean1.5, family90%, factual/action safety2 and maximum terminal failure10% remain unchanged. Scorer is not independent/blinded; no human scores will be fabricated. Scope interpretation is preregistered before results in the manifest. No majority vote or post-result tuning.

Actual readiness commands:

- `node --test apps/worker/evals/single-agent-semantic-verifier/round-2.test.mjs`: observed RED 0/3, then GREEN 3/3 (clock, captured runtime/evaluator firewall, isolated folder selector).
- With `C3_TEST_CODEX_TRANSPORT=1`: `node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/run-a2.test.mjs apps/worker/evals/single-agent-semantic-verifier/run-a3.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-2.test.mjs`: 34/34 PASS, no skips. Installed CLI adapter case uses only a local stub, not model evidence.
- With `C3_CHECKPOINT_A_ROUND=2`: `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs`: FROZEN_PROTOCOL_VALID, round2/34 A2 cases/20 A3 cases, exit0.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts`: 30/30 PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`: 21/21 PASS.
- `pnpm --filter @lana/worker typecheck`: PASS.
- `pnpm --filter @lana/worker build`: PASS.
- `pnpm --filter @lana/worker lint`: PASS.

Shared-package source/dependencies/worker boundary/provider adapter are unchanged. Original protected claims/assembly tests and code-owned DLP/authority checks are reused. No production wiring or PII/secrets added.

a2RunSourceSha: pending clean source seal; A2 not executed in round2 yet. a3RunSourceSha: pending, A3 forbidden until A2 PASS. No provider results/false-PASS/quality/operational claim yet. Current recommendation pending measured evidence; stop after this single round at owner GO/STOP/BLOCKED.
