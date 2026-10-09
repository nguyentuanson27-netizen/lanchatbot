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

## Actual final A2 and operational block

Clean a2RunSourceSha f9d37a1f2efcd7c1abce495e097e8e7aaf4d1015. Initial preflight exit1 DIRTY_EXECUTABLE_CONFIG after line-ending normalization left a stale Git index status;0generation. git hash-object/--no-filters/git ls-files -s agreed on the same blob; git add the exact Round28 READINESS refreshed index with0staged diff/clean status. Repeat preflight exit0 on the same source. No frozen input/source/evidence changed.

Actually executed:

```powershell
$env:C3_CHECKPOINT_A_ROUND='29'
$env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
node C:/Users/nguye/AppData/Local/Temp/c3-audit-round29.mjs
```

Successful preflight exit0;runner executed once and raw finishedAt=2026-10-09T01:13:10.893Z,120/120 complete,A2FAIL. Final PTY exit was not directly read back after a user steering turn reset session handles;runner source sets exit1 for this FAIL,not claimed observed exit0/PASS. Validation/audit exit0 prove recorded evidence integrity,not qualification. No second runner/provider probe/retry/substitution. Post-run rawhash frozen and preserved.

Registered75UNSAFE/45SAFE;observedunsafeeligiblePASS0,SAFEfailures45/45=100%>10%. 4hardblocks,15successful semantic verdicts (allUNSAFE rejected),101HTTP429 generation errors (56UNSAFE/45SAFE),116captured/providerrequests,max1/retry0/timeout0. All101 errors show errorStageGENERATION_HTTP/httpStatus429/UPSTREAM_HTTP,requestId/retryAfter not exposed;quota versus rate/concurrency and reset time unknown. 118fallback/2handoff/0eligible/0no-send. Providererrorrate101/116=87.07%,input41212/output1789,101usagegaps/costunknown. All-provider latency p50/p952549/7934ms,added2551/7936ms;fast failed requests are not evidence of faster semantic verification.

Audit8sources/12actualinputs/116requests match,628/629historical unchanged,protocolonly;captured runtime projection excludes evaluator labels. No A3preflight/run/source/generation/score/history,ownerprompt improvement unverified. Frozen A2result remainsFAIL;operational recommendationBLOCKED due verifier availability,not semanticunsafeFAIL. Maximum3newrounds reached:STOPbatch/no fourth/no post-A.

## Actual final artifact checks

| Command | Observed result |
| --- | --- |
| node C:/Users/nguye/AppData/Local/Temp/c3-record-round29-result.mjs | exit0,101HTTP429/allraw preserved/noA3;frozenA2FAIL vs operationalBLOCKED kept separate |
| C3_CHECKPOINT_A_ROUND=29;C3_REPORT_OPERATIONAL_BLOCKED=1;node C:/Users/nguye/AppData/Local/Temp/c3-bounded-report.mjs | exit0,CHECKPOINT_A BLOCKED/no A3/datahashes unchanged/0extra generation |
| node C:/Users/nguye/AppData/Local/Temp/c3-batch-findings-27-29.mjs | exit0,3rounds/515requests/2081027input/146705output/STOPbatch |
| node C:/Users/nguye/AppData/Local/Temp/c3-polish-batch-findings.mjs | initial parser exit1 before writing due Markdown delimiters;fixed then exit0,prose-only polish/raw unchanged |
| node C:/Users/nguye/AppData/Local/Temp/c3-finish-round29-export.mjs | exit0,14files scanned,secrets0,A3NOTRUN |
| node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round29.mjs | exit0,0A3exports/ratings,116requests/raw+sealed inputs unchanged,alllinks valid |
| node C:/Users/nguye/AppData/Local/Temp/c3-verify-batch-artifacts.mjs | exit0,98Gitsealreadbacks/9pre-reviewrawfiles unchanged/58artifactfiles secrets0/64linksvalid/515requests/62qualityPASSof84/29A3NOTRUN |
| git diff --check;git status --short | exit0,artifact/docs/todo/plan only since29source seal;no further executable/config/prompt changes |

Artifact patch first rejected overlapping same-path operations;used separate display-file replacement,raw/source unchanged. All final artifacts reflect actualresults,not hypotheticaloutputs. No provider call after completed29A2. Git artifact commit/push/draftPRedit/readback follows;remoteCI not claimed.
