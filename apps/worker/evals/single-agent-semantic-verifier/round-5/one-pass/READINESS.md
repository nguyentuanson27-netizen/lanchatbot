# Round5 one-pass continuation readiness

Owner changes future cases to one attempt,2026-10-06. Approved amended plan source94fc894c7b2b4999a2fa829b24cdb15a0e673b67; implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361. Same authorized round, no post-A.

Original198-registration run stopped after92completed results at the next source-cleanliness check when OWNER_AMENDMENT.md was created. Its in-flight result/accounting was saved before stopping. Original evidence bytes SHA25649e086a4fc145e9a113340323f7d84c546ceb031b1f5fad066ea8cd6f1fdf0d3; original a2RunSourceSha6e371a13d8f257d556e3a5b28e50d16b41f15552. Exit1 A2_RUN_FAILED_CLOSED is an intentional owner interruption, not A2PASS. All198 registrations/92results/106unexecuted, including83requests and2transport errors, remain in ../a2-evidence.json.

Amended registrations adopt every92completed attempt with original source SHA, then35untouched cases once=127actual A2 outcomes (104unsafe/23safe).35old first slots carry forward;71extra repetitions withdrawn by owner. Never rerun a completed case, drop an error or select a representative repetition. A3 frozen20cases once. Models/prompts/corpora/quality/usability/fallback identities unchanged; only registration policy and source identity amended before any continuation result.

Actual commands/results after amendment:

- `node C:/Users/nguye/AppData/Local/Temp/c3-r5-one-pass-freeze.mjs .`:exit0,92adopted/35remaining/127amended A2/20A3.
- `node --test apps/worker/evals/single-agent-semantic-verifier/one-pass.test.mjs`:observed RED0pass/2fail (wrong input selector; missing registration function), then minimum GREEN2/2.
- C3_CHECKPOINT_A_ROUND=5,C3_TEST_CODEX_TRANSPORT=1; `node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs`:56/56PASS,0skips, including11adapter tests against local stub only.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts`:77/77PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21/21PASS.
- `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker lint`:each actual exit0 after amendment.
- C3_CHECKPOINT_A_ROUND=5,C3_CHECKPOINT_A_ONE_PASS=1; `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs`:FROZEN_PROTOCOL_VALID,exit0.
- `git diff --check`:exit0.

Minimum amendment executable delta22added/6deleted lines in existing protocol/runner; no new online role/layer/parser/router/repair/framework/production gate. Original Round5 delta13added/9deleted in protocol/A3 runner remains. No apps/worker/src or shared package source touched this round. Pending clean sealed continuation source, provider results and terminal assessment. Same alias/model correlation and synthetic single-turn limitations persist.
