# Round29 — actual deterministic readiness

T1commit6f4bee95;spec/previous complete evidence 39007cadd9b6d5f8482f274916a6afe048895d3d;implementationBaseSha 296cdcfbf5759f5bf9cbb24acf3dc63005589361. Final third new round27-29 retains all120A2/42A3+auxexact28. Owner-only newprompt;verifier28/config/bars/bounds/fallback/review unchanged. No provider generation before readiness.

| Actual command | Observed result |
| --- | --- |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round29.mjs;git add explicit frozen files;git commit | exit0,T1prompt/input/treatment identities frozen,0generation |
| C3_CHECKPOINT_A_ROUND=29;C3_TEST_CODEX_TRANSPORT=1;node --test apps/worker/evals/single-agent-semantic-verifier/round-29.test.mjs | observed REDexit1,UNKNOWN_CHECKPOINT_ROUND0/1;minimumfixedselector/retention ->GREEN3/3,0skips |
| node C:/Users/nguye/AppData/Local/Temp/c3-enable-round29.mjs | exit0,only fixed-round selection/retention source change |
| pnpm --filter @lana/worker build | exit0,worker/dependencies built |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs | exit0,155/155,0skips |
| node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs | exit0,29/29,0skips |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts | exit0,41/41 |
| C3_CHECKPOINT_A_ROUND=29;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID |
| git diff --check;git diff --numstat | exit0,protocol+12/-8 only executable delta |
| node C:/Users/nguye/AppData/Local/Temp/c3-prepare-round29.mjs with existing local Vertex credential env | exit0,628/629priorfiles unchanged,protocolonly;14namedfiles secrets0;Codex version/binary/login and Vertex route inspected,0generation |

Node transport tests use local stubs,not providersemantic evidence. Boundary/provider/helper/shared/production unchanged;0new roles/layers/state/gates/parsers/framework/template/repair. Owner8069bytes/verifier8615bytes. Prompt has3unrelated hypothetical tone examples,not answers/facts for fixtures. Official provider docs checked2026-10-09,API/auth/retry code unchanged. Fresh committed clean seal/preflight/A2qualification required;all survivingdrafts verifier mandatory.

Initial history inventory preparation exited1: Round28 READINESS working bytes had CRLF added by the final recording command, while committed Git bytes were LF. Confirmed normalized text equals committed bytes, then node C:/Users/nguye/AppData/Local/Temp/c3-normalize-round28-readiness.mjs restored that one display file to exact39007cad bytes (exit0). Repeated c3-prepare-round29.mjs exit0:628/629historical exact,onlyprotocol changed. No raw/frozen evidence changed or provider call occurred. Initial attempted savepoint failed before staging; only the later successful clean commit is a run source.
