# Round 5 readiness and observed commands

Date2026-10-06 Asia/Saigon. implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361; approved spec/plan source a270cd12218f97cfab7844d165a2b83114e3affa. Owner authorized one round; previous artifacts unchanged. No provider generation has run at this savepoint.

T1 freezes66A2 (48unsafe/18safe) and20A3 with3repetitions, four complete synthetic profiles,9existing-engine size records, conditional code-calculated quote audit,6manual evaluator-only reference replies, per-case buyer goal/obstacle/resolution/progress, model/prompt/schema/serialization/terminal/scoring identities. Quote records are calculation fixtures, not live fulfillment verification. The quote/size preparation scripts are temporary local authoring helpers and not provider/runtime source.

Observed commands:

- `git fetch origin main`; `git rev-parse origin/main`:296cdcfbf5759f5bf9cbb24acf3dc63005589361. Isolated implementation branch reused.
- `node C:/Users/nguye/AppData/Local/Temp/c3-prepare-round5.mjs`; `node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round5.mjs .`:exit0,66A2/20A3 frozen before provider results.
- `node --input-type=module -e "import {inspectCodex} from './apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs'; console.log(JSON.stringify(inspectCodex()));"`:exit0; existing login/client0.159.2 and binary SHA52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a confirmed. No credential read/retained, no generation. Provider adapter reused unchanged, no new API implementation.
- `node --test apps/worker/evals/single-agent-semantic-verifier/round-5.test.mjs`: initial observed RED3pass/3fail (PROFILE_BOUND); then added offline buyer-goal packet regression before implementation. Critical-understanding scoring already works via existing consultation-dimension contract; no scoring layer added.

The final observed RED was3pass/4fail: three Round5 projection checks failed with PROFILE_BOUND and the offline buyer-goal packet lacked buyerGoal. Minimum GREEN was7/7. The existing scoring function already enforced critical understanding when supplied by the frozen manifest; no new scoring mechanism was necessary.

Completed deterministic readiness (environment C3_CHECKPOINT_A_ROUND=5):

- `node --test apps/worker/evals/single-agent-semantic-verifier/round-5.test.mjs`:7/7PASS after minimum implementation.
- With C3_TEST_CODEX_TRANSPORT=1, `node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs`:54/54PASS,0skipped. Includes11provider adapter tests and installed-client transport against a local stub, without upstream generation.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts`:77/77PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21/21PASS.
- `pnpm --filter @lana/worker typecheck`:exit0.
- `pnpm --filter @lana/worker build`:exit0.
- `pnpm --filter @lana/worker lint`:exit0 (standalone rerun; an earlier combined shell call ended1 because its subsequent no-import search found no matches, not because lint failed).
- `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs`:exit0,FROZEN_PROTOCOL_VALID,66A2/20A3.
- `git diff --check`:exit0. No changes to apps/worker/src or packages since Round4 delivery. Production import search found no boundary import.

Executable delta is13added/9deleted lines in protocol.mjs and run-a3.mjs: accept the fixed Round5 inputs and include buyer goals only in the offline assessment packet. No new semantic role/layer, parser, router, retry, repair loop, production template or provider framework. Inputs contain synthetic recipients and source data; no secrets/PII. Pending clean source seals and actual provider results. Same-provider correlated errors remain possible; alias is not an immutable model snapshot. Nothing wired into production.
