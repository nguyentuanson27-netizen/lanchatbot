# Round7 readiness and actual command evidence

implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, refreshed with SSH443 `git fetch origin main`, then `git rev-parse origin/main`; both exit0. Existing isolated branch/PR390 reused, initial tree clean.

## Preparation and freeze

Read current spec/amendment/plan/todo/project instructions, all20 Round6 histories and exact outcomes, prompt, code projection, scoring and relevant supplied data. Root-cause report and shorter task-centered prompt committed in spec/plan source `3656dc663136e6c4ec3c7a7fc78f57ea3bb48d6d`. Existing adapter `inspectCodex()` actually run without generation: client0.159.2, binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`, required ChatGPT login available. No auth/token value retained.

Freeze66A2 (48unsafe/18safe),24A3 (concern5/partial5/correction5/policy6/simple3), one attempt/case. Owner prompt7871 UTF-8 bytes versus9797 prior; exact hash/config and unchanged verifier/schema/authority/bars in manifest. Four new development contrasts use existing trusted data/size bindings. Prior20A3 values,66A2, profile/size/quote/reference files remain unchanged. No result files/provider generation before freeze. Both mutable model aliases/high/login unchanged; no provider API implementation changed or model substituted.

## Observed RED

```powershell
$env:C3_CHECKPOINT_A_ROUND='7'
node --test apps/worker/evals/single-agent-semantic-verifier/round-7.test.mjs
```

Actual exit1, module rejected UNKNOWN_CHECKPOINT_ROUND before tests. Repeated with existing round6 selector to exercise actual contracts against the new manifest:

```powershell
$env:C3_CHECKPOINT_A_ROUND='6'
node --test apps/worker/evals/single-agent-semantic-verifier/round-7.test.mjs
```

Actual exit1,0/3PASS: ATTEMPT_POLICY for frozen one-pass Round7 and PROFILE_BOUND for both direct/captured projections. Runtime implementation unchanged during RED; these are unsupported new-round contracts, not semantic-quality proof. GREEN/readiness/provider run evidence follows only after the minimum fixed support change.

## GREEN and deterministic readiness

Only fixed Round7 enum/allowlist/one-pass/count support changed in existing protocol.mjs:7lines added/7removed. No worker production/shared package source change, no new semantic role/layer/framework/router/parser/templates/repair. Existing final gate reused. No production entrypoint import found for the isolated boundary.

```powershell
$env:C3_CHECKPOINT_A_ROUND='7'
node --test apps/worker/evals/single-agent-semantic-verifier/round-7.test.mjs
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

All actually run: focusedGREEN3/3; full Node62/62,0skips; explicit adapter11/11 including installed client with a local upstream stub and zero provider generation; worker77/77; protected-claims/reply-assembler21/21; worker typecheck/build/lint each exit0 (dependency prebuild included). Diff check exit0. The test suite's existing Vertex retry tests do not define the Checkpoint A provider policy; this round still has retry0.

Local input/history audit:100 historical JSON/Markdown files unchanged from prior delivery fcdfa6d9a8d497e756897f08dcf7bba09314d276; aggregate 980683b49faac1ba2c8c3de0f8fdb86e05a57f5bb0d399237f2238d3fa9babac. All24 owner envelopes within frozen32768-byte bound, max23617bytes. Captured stub requests exclude evaluator markers/keys/reference replies in both roles. No real-shop data/PII/secrets in synthetic corpora or retained requests. All required readiness checks GREEN before sealing/provider execution; no earlier PASS inherited.
