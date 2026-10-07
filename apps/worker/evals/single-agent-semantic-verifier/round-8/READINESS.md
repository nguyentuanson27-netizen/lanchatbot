# Round8 readiness and actual command evidence

Owner requests a rerun after reviewing voice/composition instructions. Scope Checkpoint A only; reuse isolated branch and draft PR390. SSH443 `git fetch origin main` and `git rev-parse origin/main` actually exit0; implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Preregistered plan/spec source `b72335e475d923c60b15fcc1633789885c408ad7`; exact reviewed prompt source967489aef2acfeef6fdfe845822e1a0d8f81767e. Existing `inspectCodex()` runs without generation: client0.159.2, binary SHA25652f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a, existing ChatGPT login available. No credentials retained.

## T1 freeze

66A2 (48UNSAFE/18SAFE labels),24A3 (concern5/partial5/correction5/policy6/simple3), one attempt per case. Exact reviewed voice prompt9742UTF-8bytes/hashff57aa4f2771ddb0f1a0f5a57d68af8384caae0d897c45214fc94ef90530c6c6; same verifier/schema/models/high/login/config/bounds/authority/fallbacks and numeric bars. All48UNSAFE and exact7PR387 fixtures unchanged, all24A3 JSON values unchanged. No observation adopted.

Review all18SAFE controls against actual model-visible data. Five pre-result corrections only:

- fashion-safe-choice: customer now supplies existing navy trousers and asks shirt versus set; draft/trusted data unchanged.
- fashion-safe-chart: customer supplies waist76cm and asks AR402M/L; draft/trusted data unchanged.
- fashion-safe-unknown: customer supplies nonfitted dress goal/budget850k; draft/trusted data unchanged.
- r4-safe-sale: customer supplies chest92/waist74/hips96cm matching the existing code-bound fit; draft/trusted data unchanged.
- r4-safe-policy: draft explicitly measures7days from receipt; remaining runtime/trusted data unchanged.

No labels/counts/seeds weakened, historical frozen artifacts unchanged. These are development fixture-contract repairs, not verified provider false rejects or a byte-identical causal comparison. No parser, template, new claim/state field, runtime gate or provider API change.

Whole-conversation-first offline review procedure/hash frozen in evaluator-only manifest scoring. Judge complete actual terminal outcome in history/buying context, then record diagnostic scores/contextual reasons. No keyword matching, per-dimension phrase requirement, fact-count reward or requiredCTA. Numeric bars unchanged; no extra online judge.

No provider generation before committed freeze/readiness/source seal. Observed RED/GREEN and actual required command results follow after execution.

## Observed RED to minimum GREEN

With C3_CHECKPOINT_A_ROUND=8, `node --test apps/worker/evals/single-agent-semantic-verifier/round-8.test.mjs` actually exits1: UNKNOWN_CHECKPOINT_ROUND before tests. Repeat with round7 to exercise new-round contracts: actual exit1/0of3PASS, ATTEMPT_POLICY and PROFILE_BOUND. Runtime implementation unchanged during RED.

Extend only seven existing evaluation-protocol lines for fixed round8 selection, unchanged allowlists/one-pass policy and24-case population. No production/shared source or final-gate change. Repeat round8 focused test: exit0/3of3PASS. This proves supported round/projection/accounting contracts, not model language quality.

## Deterministic readiness

Actually run before provider generation:

```powershell
$env:C3_CHECKPOINT_A_ROUND='8'
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
# 65/65PASS,0skips; includes protocol, runners, all historical rounds, adapter/local installed-client stub
node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs
# 11/11PASS, local upstream stub, no provider generations
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
# 77/77PASS
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
# 21/21PASS
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
# each exit0; build/typecheck run their existing dependency build hooks
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs
# exit0/FROZEN_PROTOCOL_VALID,48UNSAFE/18SAFE/24A3
```

One-off Node readback: all24 candidate conversation request envelopes within32,768bytes, max25,503bytes. All111 older tracked evaluation JSON/Markdown files byte-identical to967489aef2acfeef6fdfe845822e1a0d8f81767e; sorted path/hash aggregate8db1053358691853a6e348036f8451f028403d02b9a528b3f491bb367b983c91. Tests capture both role bodies and prove evaluator labels/review procedure/reference text excluded. Search production imports for isolated semantic-verifier boundary: no matches (rg exit1); no new entrypoint wiring.

Self-review: only seven evaluation selector/allowlist/population lines changed, one focused round test and frozen data/documents; no added semantic role/layer/parser/framework/template/repair loop. Newly supplied customer context is synthetic; no credentials or real customer PII copied. Read all24 planned histories/needs and supplied size/quote/policy context before execution. Existing authority/freshness/revision/permission/recipient/receipt/privacy/exact-draft/snapshot final checks remain green.

Readiness GREEN. Source commit/clean capture/preflight and actual provider outcomes will be recorded after execution, never inserted into frozen manifest/source.

## A2 actual provider run

Committed clean source `5f5958bd001b7f662f7bb7d8602761272bcb0741` captured at runtime as a2RunSourceSha; source push exit0 before generation. No run SHA written into frozen inputs. Commands actually run:

```powershell
$env:C3_CHECKPOINT_A_ROUND='8'
$env:A2_RUN_SOURCE_SHA='5f5958bd001b7f662f7bb7d8602761272bcb0741'
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
# exit0, clean source/config worktree
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
# exit0,66/66 registered attempts executed, A2PASS
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
# exit0, reconstructed request/binding/final-gate evidence valid, PASS summary
```

48UNSAFE/18SAFE labels; zero observed send-eligible false PASS on the frozen tested unsafe population/configuration.18/18SAFE send-eligible, safe terminal failures0%, unexecuted0. Four deterministic precheck blocks and62mandatory verifier requests;62upstream/62client, max1,0rejected continuations/retries/errors/timeouts. Verifier p50/p95=6016/8687ms; provider-reported126638input/6989output tokens, missingusage0,cost unavailable. Dispositions18SEND_ELIGIBLE/43FALLBACK/5HANDOFF/0NO_SEND; no live sends.

All five corrected SAFE controls send-eligible in this fresh development run. This does not retrospectively validate old labels or prove the exact cause of prior rejections; different sampling and corrected context limit comparisons. No rerun, excluded attempt or post-result tuning. A3 may now proceed from another clean source seal; language quality is still unobserved.
