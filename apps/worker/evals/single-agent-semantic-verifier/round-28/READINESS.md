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

## Actual A2 provider execution

Clean a2RunSourceSha afa8e85d92ed72af51b40bc56c17a12e26f0c3b6. Registered120=75UNSAFE/45SAFE,executed120,unexecuted0. A2PASS,observed unsafe send-eligible false PASS0;observedSAFE rejects0/45executed SAFE. Full safe usability0. All failures/unexecuted slots retained;no current-run rescue,adoption/relabel/retry.

Actual PowerShell commands:

```powershell
$env:C3_CHECKPOINT_A_ROUND='28'
$env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
node C:/Users/nguye/AppData/Local/Temp/c3-audit-round28.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-record-bounded-a2.mjs 28
```

Preflight/run/validate/audit exit0;run exit0 records disposition,not necessarily A2PASS. Provider116/captured116/max1/retry0;error0/timeout0. Verifierp50/p955557/9397ms,added5558/9398ms;input533508/output12494,usagegap0/costunknown. Source8/actualinputs12/captured116 match;historical603/604unchanged,protocolonly. Audit checks actualnewprompt bytes/hash against manifest and review/treatment document hashes. Every surviving draft invokes verifier. Next A3 requires a new clean committed source seal/preflight.

## Actual A3 and whole-turn primary review

| Actual command | Observed result |
| --- | --- |
| git add explicit A2 evidence/readiness/todo; git commit; git status --short; git rev-parse HEAD | exit0,clean a3RunSourceSha 06a277103935ab82588312b2f5ba8e7a43b69a1f |
| C3_CHECKPOINT_A_ROUND=28; A3_RUN_SOURCE_SHA=currentHEAD; A2_STATUS=PASS; existing local credential; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3 | exit0,FROZEN_PROTOCOL_VALID/clean seal |
| same environment; node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs | exit0,42/42,39eligible/3semanticfallback;42owner+42verifier requests,max1/retry0,error0/timeout0 |
| same environment; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3 | exit0,FROZEN_PROTOCOL_VALID;raw pending-review/human-null preserved |
| Get-FileHash -Algorithm SHA256 for4raw files immediately after runner/Set-Content outside repo | all4 pre-review hashes captured,unchanged after primary review |
| node C:/Users/nguye/AppData/Local/Temp/c3-read-bounded-outcomes.mjs 28 bounded batches0-42 | exit0,all42full histories/latest/evaluator/fit/actualterminal read;trusted facts/context byteexact already reviewed27 |
| C3_CHECKPOINT_A_ROUND=28; node C:/Users/nguye/AppData/Local/Temp/c3-score-round28.mjs | exit0,42connected reviews/420diagnostics/0extra generation,29PASS/13FAIL;families4/11,8/9,7/10,7/9,3/3 ->A3FAIL |
| same environment; node C:/Users/nguye/AppData/Local/Temp/c3-audit-round28.mjs | exit0,8sources/12actualfrozeninputs/200capturedrequests;603/604historical files unchanged,protocolonly |
| node C:/Users/nguye/AppData/Local/Temp/c3-record-round28-result.mjs | exit0,raw pre-review preserved;records observed outcomes |

Total 200generations/max1/retry0,input1032878/output74332,usagegap0/costunavailable;OAuth1,Codex internal auth HTTP accounting unavailable. Verifierp50/p955262/16190ms,added5267/16196ms,end-to-end10619/23199ms. Ten eligible quality failures distinct from3semanticfallbacks;all42 in denominator. Primary subjective nonblind review,not independent/human/owner acceptance.

Final actual artifact checks: C3_CHECKPOINT_A_ROUND=28; node C:/Users/nguye/AppData/Local/Temp/c3-bounded-report.mjs; node C:/Users/nguye/AppData/Local/Temp/c3-finish-round28-export.mjs; node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round28.mjs; git diff --check all exit0.42exact terminal exports/420ratings/29PASS13FAIL/human-null/pre-reviewraw+sealedbytes intact;22files scanned,secrets0,all Markdown links valid. No extra generations.
