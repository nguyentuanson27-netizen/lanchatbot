# Round27 — actual readiness

Owner-authorized max3new rounds27-29. Round27T1commit6785b9ce;starting/specc44aa40f249cc5499def183fc693c24852e04223;main refreshed296cdcfbf5759f5bf9cbb24acf3dc63005589361. New120A2=75UNSAFE/45SAFE,all116A2/42A3 retained exact26. Both newprompt identities/review/config/bounds/terminals/bars frozen before provider;generation0 at this readiness.

| Actual command | Observed result |
| --- | --- |
| git fetch origin main; git rev-parse origin/main | exit0,296cdcfbf5759f5bf9cbb24acf3dc63005589361 |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round27.mjs | exit0,120A2/42A3 |
| node --test apps/worker/evals/single-agent-semantic-verifier/round-27.test.mjs (C3_CHECKPOINT_A_ROUND=27) | initial helper shell quoting failed/no test file; corrected actual test REDexit1,UNKNOWN_CHECKPOINT_ROUND0/1 |
| same focused command after minimum selector/count | REDexit1,2/3,retention expected exception missing |
| same focused command after minimum retention validation | GREENexit0,3/3,0skips |
| pnpm --filter @lana/worker build | exit0,worker+dependencies built |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs | exit0,149/149,0skips |
| node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs | exit0,29/29,0skips |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts | exit0,41/41 |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID |
| git diff --check | exit0 |
| node C:/Users/nguye/AppData/Local/Temp/c3-round27-readiness.mjs | exit0,578/579oldfiles unchanged,protocolonly;13namedfiles secret-scan0;approved Codex/Vertex route inspection available,0generation |

Node adapter tests use C3_TEST_CODEX_TRANSPORT=1 LOCAL upstream stubs;not provider semantic evidence. Build/typecheck/lint and source tests completed before seal. Existing boundary/provider/domain implementations unchanged;no newboundaryRED claim. Code diff only evalprotocol+13/-8,newfocusedfile3tests. Newowner7242bytes/verifier8096bytes,0production/shared/helper/adapter changes or newrole/gate/state/parser/framework/template/repair. Allhistoricalcapturedresults/labels unchanged.

Official [Vertex generation reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) and [Codex configuration](https://developers.openai.com/codex/config-reference) read2026-10-09. Provider/auth/endpoint/retry implementations unchanged. Same frozenCLI/login/model and Vertexproject/global/HIGH route available;availability inspection is not a generation or futureavailability guarantee. No key/token copied.

Providerphase pending at source savepoint:commit clean source/config,HEAD runtime A2_RUN_SOURCE_SHA/preflight/runonce;A3onlyfreshA2PASS. STOP of one failed round permits a new reviewed/frozen round only within ownermax3batch,never a retry/resume of failed slots.
