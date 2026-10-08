# Round24 — commands actually run

Checkpoint A only. Refreshed main / implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; starting/specSHA `58b7d1a0d5ea5e9f799e240911e9c58f09614bfa`. T1 frozen-input savepoint 0f755e7b2d35d8802d1911e94fc95ee0acd8c4a1. No provider generation before freeze/readiness/source seal. Existing branch and draftPR390.

|Actual command|Observed result|
|---|---|
|git fetch origin main;git rev-parse origin/main;git rev-parse HEAD;git status --short|exit0;main296cdcfbf5759f5bf9cbb24acf3dc63005589361,starting58b7d1a0d5ea5e9f799e240911e9c58f09614bfa,clean existing isolated branch|
|node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round24.mjs|exit0;freeze108A2/42A3 exact23,owner prompt6380bytes/verifier unchanged;512historical evalfiles inventoried;0generations|
|git diff --check;git add -- frozen Round24 inputs/prompt/doc/plan/todo;git commit -m 'eval(c3): freeze Round24 grounded sales decision experiment'|exit0;T1savepoint0f755e7b|
|C3_CHECKPOINT_A_ROUND=24;node --test apps/worker/evals/single-agent-semantic-verifier/round-24.test.mjs before selector support|exit1;RED0/1,module UNKNOWN_CHECKPOINT_ROUND|
|same focused command after minimal selector support, before retention contract|exit1;RED2/3,changed evaluator/context accepted;missing expected exception|
|same focused command after retained-population check|exit0;GREEN3/3;size context change invalidates oldPASS and both captured model requests omit evaluator/admission labels|
|pnpm --filter @lana/worker build|exit0;worker and dependency builds complete|
|C3_CHECKPOINT_A_ROUND=24;C3_TEST_CODEX_TRANSPORT=1;node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs|exit0;134/134,0skips;installed client tested against local stub,0provider generation|
|same env;node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs|exit0;20/20 =protocol9/Codexadapter11,0skips|
|pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts|exit0;77/77 =boundary43/Vertex34|
|pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts|exit0;41/41 =claims7/assembly14/SizeEngine20|
|pnpm --filter @lana/worker lint|exit0|
|pnpm --filter @lana/worker typecheck|exit0;worker and dependency builds complete|
|codex --version;codex login status;local approved Vertex credential availability readback|exit0;CLI0.159.2/ChatGPTlogin/approved route available,0provider generation/no secret output/no quota probe|
|C3_CHECKPOINT_A_ROUND=24;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs;git diff --check|exit0,FROZEN_PROTOCOL_VALID;108A2/42A3|

Scope: owner-prompt-only generative treatment,7433→6380bytes;all corpus/history/evaluator/profile/preparation/verifier/config/bars exact23. Protocol+14/-8 for fixed24/retention,three focused tests;unchanged22-line size preparation helper. New semantic roles/layers/gates/state0;no worker/shared/provider/production changes. Ordinary advisory scope retained,no new H/Wranges or stage alternative facts. Preserve all historical inputs/results;clean committed executable/config required before runtime seal/preflight.
