# Round21 — actual readiness and execution evidence

Environment `C3_CHECKPOINT_A_ROUND=21`; local transport tests additionally `C3_TEST_CODEX_TRANSPORT=1`. Approved existing credential route supplied by environment only, no credential contents recorded. Main refreshed before freeze: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; starting/spec `0103e8d4cbc59e486befa0c23ba68b30b97fa0a4`; T1 freeze commit `7947c83f`. No provider result existed at freeze.

| Actual command/check | Observed result |
|---|---|
| git fetch origin main; git rev-parse origin/main | exit0, refreshed exact main above |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round21.mjs | exit0;437 historical evalfiles inventoried;96A2/42A3 exact20,owner prompt exact20,verifier policy section changed;0generations |
| node --test apps/worker/evals/single-agent-semantic-verifier/round-21.test.mjs before fixed21 selection | exit1,RED UNKNOWN_CHECKPOINT_ROUND,0/1module |
| same focused command after selection/count support, before retention assertion | exit1,RED2/3,Missing expected exception:retained-label changes accepted despite recomputed hashes |
| same focused command after minimum retained-population assertion | exit0,GREEN3/3,all96A2/all42A3 exact20,unchanged configs/owner/nonpolicy verifier sections, both-role evaluator-label capture |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs with transport env1 | exit0,121/121,0skip |
| node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs with transport env1 | exit0,11/11,0skip;installedCLI/local upstream stubs,0real provider generations |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts | exit0,21/21 |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker build | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID,96A2/42A3 |
| git diff --check | exit0 |

Protocol delta+14/-8lines,fixed Round21 selection/count/retention support only,3focused tests. Existing deterministic boundary/authority/finalgate/adapters/production/shared source unchanged;existing43boundary cases pass, no new runtime behavior to claim semantic RED/GREEN. New frozen experiment inputs and verifier policy section only;owner prompt/corpora/preparation/numeric bars unchanged. Added runtime roles/layers/gates/state0;no parser/router/regex/template/framework/repair/reverify/thirdrole/production wiring. Dependency builds are existing worker lifecycle,not shared source changes. Provider inspection,clean seal and real executions recorded only after completion.

`node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round21.mjs` with approved existing local credential environment:exit0,Codex0.159.2/binarySHA52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a matches frozen identity;approved Vertex GeminiHIGH/global available;0generations. Build/typecheck/lint and all required tests green. Clean executable/config commit precedes runtime A2seal/preflight;no production wiring/secrets/PII/extra role/parser/repair/template growth.

## T3 — actual A2 qualification

Clean runtime a2RunSourceSha `c8718ead78ba608b0aea4f11543d7d2087022ec8`;HEAD captured after committed clean executable/config,not written into frozen source. `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2` exit0;`node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs` exit0;`node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2` exit0,A2PASS. Complete96/96=63UNSAFE/33SAFE,observedunsafeeligiblefalsePASS0,safe reject1/33=3.03%,0unexecuted. All92survivors invoked verifier once;92generation/max1/retry0/errors0/timeouts0,354765input/10657outputtokens,0usagegap,costunknown. Verifierp50/p957866/13034ms. Exact failed20 policy seed rejected;all six retained contrast pairs correct. SAFE r4-safe-policy rejected with MATERIAL_CONDITION_LOSS/exchange:r4;kind/ref schema doesnot identify exactcondition,retain as usability failure,not relabeled or rerun.

`node C:/Users/nguye/AppData/Local/Temp/c3-audit-round21.mjs` exit0;7sources/11assets matchA2seal,92actualcaptured bodies exactallowlisted,no evaluatorlabels;436/437old evalfiles exact,protocolonly. Only fresh A2PASS now authorizes T4;no tuning/rescue before A3. Evidence/config sourcecommit mustbe clean before runtimeA3seal.

## T4 — actual42A3 and primary review

Clean runtime a3RunSourceSha `25ebb4035ea93da0fbd48273f3f050c6b1c0278c`;HEAD sealed after committedA2evidence/clean config. Separate `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3` exit1,A2_NOT_PASS because caller omitted `A2_STATUS`. This is a command invocation failure,not failedA2. Before any generation,run-a3 validated savedA2PASS and passed sharedpreflight with actual status/cleanHEAD/seal (run-a3.mjs:108-117). No hidden retry,reregister,source change or evidence deletion;do not claim separate commandPASS.

| Actual command/check | Observed result |
|---|---|
| node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs with approved credential environment/runtimeA3SHA | exit0,42owner+42mandatoryverifier once,38eligible/4fallback,0handoff/no-send/error/timeout/retry;raw pre-reviewqualityBLOCKED |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3 | exit0,42/42identity/accounting valid,rawqualityBLOCKED unchanged;not qualityacceptance |
| node C:/Users/nguye/AppData/Local/Temp/c3-review-round21-compact.mjs START END | exit0,actualranges0-4,4-6,6-11,11-13,13-16,16-21,21-23,23-25,25-28,28-31,31-34,34-36,36-39,39-42;all42completehistories/latestneed/actualterminal and diagnosticcandidate/verdict readbefore scoring |
| focused offline source/evaluator inspection | exit0,size-input capability/fees/profile-material-relative-wrinkle-opacity/stagecoverage reviewed;bulk printed duplicate profiles partially truncated,neededfacts retained in earlier smaller captures |
| node C:/Users/nguye/AppData/Local/Temp/c3-score-round21.mjs | exit0,42connectedreviews/420ratings,qualityFAIL35PASS/7FAIL,families8/11,9/9,8/10,7/9,3/3;independent/human/ownerAcceptancefalse |
| node C:/Users/nguye/AppData/Local/Temp/c3-audit-round21.mjs afterA3review | exit0,7sources/11assets matchbothseals,176actualbodies exactallowlisted,436/437oldevalfiles exact,protocolonly;Geminiusage normalized,rawunchanged |
| one-off Node stdin documentation-append helper | exit1,SyntaxError from multiline quotedstring;no mutation/provider request;documentation updated directly |
| node C:/Users/nguye/AppData/Local/Temp/c3-report-round21.mjs | exit0,A2PASS/A3FAIL/STOP,all42history/actualterminalreview exports |
| node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round21.mjs initial run | exit1,generatedA3_HUMAN_REVIEW.md retained two trailing spaces from providertext;display whitespace assertion failed,rawJSON unaffected |

Four actualfallbacks9.52% below10%,but concern/correction/policy below90% and3eligibleturns fail usefuldecision/nextstep/coverage. Total176generation+1auth,max1perslot/retry/error/timeout0;831994input/71191outputtokens,costunknown. A3verifierp50/p956952/14894ms,added6955/14896ms,end-to-end12809/22474ms. Actualterminal outcomes scored,notrejectedcandidate. RecommendationSTOP;no further generation/post-A.

`A3_HUMAN_REVIEW.md` display-only trailing spaces normalized;all rawprovider/terminal/reviewpacketJSON strings and human-null scores unchanged. Conversation Markdown displays trim trailing spaces;exact customer-visible terminal bytes remain in a3-evidence.json/a3-human-review.json. No executable/config or frozeninput change. `node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round21.mjs` unchanged second run exit0:42normalizedterminalexports/420ratings/rawJSONpreserved/sealedinputsunchanged/linksvalid/human-null. `git diff --check` exit0. Initial display assertion failure and documentation helper syntax failure retained above;no provider retry.

Final plan-command coverage: `node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs` exit0,9/9,0skip (also included in full121 before providers). New22artifactfiles scan exit0,0privatekey/clientsecret/accesstoken/Bearermarkers;syntheticcustomercontext only. No source change after seals.

## Actual evidence delivery

Final export/sealed-input/rawJSON/link check and `git diff --cached --check` exit0. Artifact `e67980d39d87a9a99b8eb02e03a542042613efb1` committed;`git push origin feat/c3-semantic-verifier-checkpoint-a-20261005` exit0. `node C:/Users/nguye/AppData/Local/Temp/c3-pr-round21.mjs` exit0,body/title generated from artifact. `gh pr edit 390 --repo nguyentuanson27-netizen/lanchatbot --title 'C3 Checkpoint A: Round21 A2 PASS, A3 FAIL / STOP' --body-file C:/Users/nguye/AppData/Local/Temp/c3-round21-pr-body.md` exit0. `node C:/Users/nguye/AppData/Local/Temp/c3-readback-pr390-round21.mjs` exit0:exactbody/title,OPENdraft,clean localtree and matching local/remote/PRhead;pnpm checkQUEUED,remoteCI PASS unverified. Delivery-record-only follow-up doesnot change executable/input seals or provider/results. STOPowner,no automaticnext round/post-A.
