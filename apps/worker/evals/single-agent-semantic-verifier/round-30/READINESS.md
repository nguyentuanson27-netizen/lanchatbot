# Round30 — actual deterministic readiness

Initial local preparation script exited1 when it compared the client inspection's version/binary result with the manifest's extra descriptive `inspection` field. Version and binary were already exact. Corrected the script to compare only the two identity fields, then it exited0. This changed no frozen input/runtime source/credential route and made0provider generations.

One new owner-authorized context-presentation experiment against exact round28;previous27–29 batch remainsSTOP. T1savepointd5d2fb68,implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361,spec/startingSHA0f1b8fe2f6666f886ab2e1bfe1b06c452d578ba3.120A2(75UNSAFE/45SAFE)/42A3 retained with all history/runtime/evaluators/facts/config/bars/fallback. OwnerREADABLE_FACTS_V1 only;verifier JSON unchanged. No provider generation yet.

| Actual command | Observed result |
| --- | --- |
| git fetch origin main;git rev-parse origin/main | exit0,main296cdcfbf5759f5bf9cbb24acf3dc63005589361 |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round30.mjs;git add explicit scope/inputs;git commit | exit0,T1protocol/inputs frozen |
| C3_CHECKPOINT_A_ROUND=28 node --test apps/worker/evals/single-agent-semantic-verifier/round-30.test.mjs before admission | REDexit1,0/4PASS;UNKNOWN_CHECKPOINT_ROUND,UNREGISTERED_CONTEXT_PRESENTATION,PROFILE_BOUND |
| C3_CHECKPOINT_A_ROUND=30 node --test apps/worker/evals/single-agent-semantic-verifier/round-30.test.mjs after minimum admission | GREENexit0,4/4,0skips |
| C3_CHECKPOINT_A_ROUND=30 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs | exit0,168/168,0skips |
| Same environment,node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/conversation-context.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs | exit0,38/38,0skips(included in168) |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts | exit0,41/41 |
| pnpm --filter @lana/worker build | exit0,declared dependencies built |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| C3_CHECKPOINT_A_ROUND=30 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID |
| git diff --check;git diff --numstat | exit0,protocol+20/-10 only existing executable delta |
| node C:/Users/nguye/AppData/Local/Temp/c3-prepare-round30.mjs with existing local Vertex credential env | exit0,650/651historical files unchanged,protocolonly;11namedfiles credential-pattern scan0;selected Codex exactbinary/version/login and Vertex route available,0generation |

PowerShell uses actual $env variables for settings above. Local adapter/transport tests are stubs,not provider semantic outcomes. The initial unit test was corrected to respect existing separate conversation/verifier requestIds and target a nonseed case for the retention check;runtime bindings unchanged. Source admission admits only fixed30 and enforces complete28control configuration and corpus retention using the existing validator.4tests added,no runtime/parser/role/state/gate/provider/API/repair changes. Both prompts byteexact28,all7auxiliary files byteexact28;format preparation tests preserve complete42projections and84historical envelopes. Provider docs were checked2026-10-09 in prior same-day work;no providerAPI change.

Models remain Gemini3.5FlashLite/global/HIGH owner andGPT6.1Sol/high verifier,approved aliases not immutable weights. Availability inspection makes no model/quota probe and does not prove future generation availability. Vertex helper hashfb2054f3b82da64be777ba6b3accde769000864e7c8fa7a8346db973f79390fe. Clean committed seal/preflight and freshA2qualification are next;no sourceSHA is written into frozen manifest.
