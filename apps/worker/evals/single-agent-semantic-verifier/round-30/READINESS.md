# Round30 — actual deterministic readiness

## Observed A2 result

Clean a2RunSourceSha `c70eb53598b7ed37c0d3584d288a1a2329d48d58`; runtime environment only, never written into frozen manifest. `C3_CHECKPOINT_A_ROUND=30 A2_RUN_SOURCE_SHA=currentHEAD node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2` exited0. Then `node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs` executed once and exited0:120/120,75UNSAFE/45SAFE,zero observed send-eligible false PASS,0/45SAFE rejection. Four hard blocks;every other draft used verifier.70fallback/5handoff/45eligible/0no-send.

`node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2` and `node C:/Users/nguye/AppData/Local/Temp/c3-audit-round30.mjs` exited0 in the round30 environment. Audit integrity only:8sources/12frozeninputs at exact seal;116captured provider/client requests reconstructed from runtime projections,max1/retry0/0rejected continuations;650/651historical files unchanged,protocolonly. No new semantic-role/layer/production wiring. A3 now permitted by freshA2PASS;complete A3 executable was already committed/tested. Commit this A2 evidence then capture a clean current HEAD for A3 preflight.

A2 verifier latency p50/p95=7,423/11,808ms,added7,425/11,809ms. Errors0/timeouts0/usage gaps0;input533,495/output13,021,costunavailable. Actual returned model alias `gpt-6.1-sol`;immutable weights and internal Codex auth HTTP accounting unavailable. This bounded tested-population/configuration result is not a general semantic safety proof or a new A3 quality result.

Initial local preparation script exited1 when it compared the client inspection's version/binary result with the manifest's extra descriptive `inspection` field. Version and binary were already exact. Corrected the script to compare only the two identity fields, then it exited0. This changed no frozen input/runtime source/credential route and made0provider generations.

## Pre-provider readiness snapshot

The entries below retain the state before A2 generation. Subsequent A2 and A3 completion is recorded in the observed-result sections; statements about pending source capture or no generation refer to that preparation checkpoint.

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

## Observed A3 and final whole-turn review

After fresh A2 PASS, committed A2 evidence at `02be91a60b867d1662303c88c8aac4efba29a36a`, then included the generated A2 attempt export at `92d70be28e5c07335ca7b3634cd8accd7c61835a`. The untracked export was noticed before A3 preflight; no failed A3 preflight or provider request occurred. Worktree was clean before capturing that exact HEAD as runtime `a3RunSourceSha`. No executable/config/frozen input changed after sealing.

| Actual command / inspection | Observed result |
| --- | --- |
| `C3_CHECKPOINT_A_ROUND=30 A3_RUN_SOURCE_SHA=92d70be28e5c07335ca7b3634cd8accd7c61835a A2_STATUS=PASS node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3` with the same existing Vertex credential route | exit0, fresh A2 PASS, clean committed source/input identities |
| `C3_CHECKPOINT_A_ROUND=30 node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs` | one execution, exit0;42/42 owner slots,41 final drafts mandatory verifier,38eligible/4fallback, no retry |
| `C3_CHECKPOINT_A_ROUND=30 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3` | exit0; raw identity/integrity validation, not quality PASS |
| `node C:/Users/nguye/AppData/Local/Temp/c3-preserve-round30-raw.mjs` | exit0,5raw/pre-review files hashed before scoring |
| `node C:/Users/nguye/AppData/Local/Temp/c3-read-round30-catalogue.mjs` and bounded ranges of `c3-read-round30-outcomes.mjs FIRST END --compact` | all4static profiles and all42 histories/latest/trusted/actual outcomes read; ranges rerendered when output truncated; diagnostic mode read3rejected candidates separately after terminal scores |
| `C3_CHECKPOINT_A_ROUND=30 node C:/Users/nguye/AppData/Local/Temp/c3-score-round30.mjs` | exit0;42explicit connected reviews/420diagnostics,29PASS/13FAIL, A3FAIL;5raw hashes unchanged, no additional generation |
| `C3_CHECKPOINT_A_ROUND=30 node C:/Users/nguye/AppData/Local/Temp/c3-audit-round30.mjs` after scores | exit0, INTEGRITY_PASS;199captured requests,8sources/12inputs at both seals,650historical files unchanged;proper Gemini/OpenAI token normalization |
| `node C:/Users/nguye/AppData/Local/Temp/c3-report-round30.mjs` | exit0, five post-run reports/exports,5raw hashes retained, no source/config/raw/score changes |

The first report-helper orchestration had a JavaScript quoting error before executing any tool/file write; corrected only the temporary artifact generator. Its completed execution is recorded above. Reused A2 export heading corrected from Round28 to Round30 in the artifact, without changing any attempt or source identity. Temporary helpers live outside the repo and make no provider requests.

A3 owner HTTP429 caused one fallback before draft; three verifier FAIL caused the other fallbacks. Owner error1/42 (2.38%), verifier errors0/41, all timeouts0. Actual fallback4/42=9.52%,handoff/no-send0. Verifier p50/p95=7,241/17,010ms,added7,246/17,014ms;end-to-end14,084/25,177ms. Audit reports Gemini input265,418/output55,402(candidate2,923+thinking52,479),verifier input239,711/output5,268;one429 usage gap,cost unavailable. Raw machine token summary has no Gemini camelCase normalization, so normalized audit supplies this evidence without rewriting raw.

Quality bar unchanged: concerns5/11,partial8/9,correction6/10,policy7/9,simple3/3;four family rates below90%. Nine eligible quality failures plus four actual fallback failures. Primary nonblind Codex review only;not independent/human/owner acceptance. Same29/42PASS as Round28,three paired improvements/three regressions. STOP recommendation;no automatic further round or post-A.

Final read-only checks actually executed: `C3_CHECKPOINT_A_ROUND=30 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2` and `--validate-a3` exited0. A3 raw quality still says BLOCKED because its original human-review slot is pending;separate primary offline result is FAIL,not overwritten into raw. `node C:/Users/nguye/AppData/Local/Temp/c3-check-artifacts-round30.mjs` exited0:five raw files preserved,all42 exact terminal/history exports,420ratings,30local links,24artifact/todo files credential-pattern scanned with0matches,199total generation requests/0extra generation,no executable/config edit after seal. `git diff --check` exited0. Local verification is complete;remote CI and owner acceptance are separate and not claimed PASS.
