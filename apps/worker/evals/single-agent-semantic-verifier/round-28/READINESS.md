# Round28 — actual deterministic readiness

T1commit ae2d7b82;spec/previous complete evidence ccf5cff1269cc297f6589717f23c777986c717e9;implementationBaseSha 296cdcfbf5759f5bf9cbb24acf3dc63005589361. Owner authorizes max3new rounds27-29;this second round retains all120A2/42A3 exact27,config/bars/bounds/fallback unchanged. No provider generation before this readiness.

| Actual command | Observed result |
| --- | --- |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round28.mjs | exit0,T1inputs/prompts/review/treatment frozen;0generation |
| C3_CHECKPOINT_A_ROUND=28; C3_TEST_CODEX_TRANSPORT=1; node --test apps/worker/evals/single-agent-semantic-verifier/round-28.test.mjs | observed initial REDexit1,UNKNOWN_CHECKPOINT_ROUND0/1;minimum selector tests1/3 exposed test assumptions about immutable seeds/oversized contexts. Corrected test scope to nonseed retained cases/projectable contexts;RED1/3 for missing retention and irrelevant prompt word rubric. Removed that word/refroze prompt before provider,minimum retention ->GREEN3/3,0skips |
| pnpm --filter @lana/worker build | exit0,worker/dependencies built |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs | exit0,152/152,0skips |
| node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs | exit0,29/29,0skips |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts | exit0,41/41 |
| C3_CHECKPOINT_A_ROUND=28; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID |
| git diff --check | exit0 |
| node C:/Users/nguye/AppData/Local/Temp/c3-prepare-round28.mjs with existing local Vertex credential env | exit0,603/604prior files unchanged,onlyprotocol;14namedfiles secrets0;Codex CLIversion/binary/login and Vertexroute inspected,0generation |

Node transport tests use LOCAL stubs,not provider evidence. Boundary/claims/assembly/engine/providers/helpers/shared/production unchanged;no semantic safety unit proof claimed. Runtime code delta protocol+12/-8,newfocused3tests. Owner6539bytes/verifier8615bytes;0newruntime roles/layers/state/gates/parsers/framework/template/repair. Treatment doc already frozen before source seal. Official provider documentation read2026-10-09;API/auth/retry code unchanged. Source/run clean seal/preflight and A2freshqualification required;all survivor drafts verifier mandatory.
