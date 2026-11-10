# Round22 — deterministic readiness and actual command evidence

Environment `C3_CHECKPOINT_A_ROUND=22`; local installed transport tests also `C3_TEST_CODEX_TRANSPORT=1`. Existing approved credential route supplied by environment only; no credential contents recorded. Refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, starting/spec `d96fa2fe0c59566d643c602f49673332c275a95f`, T1 freeze commit `080bde3c`. All inputs/review frozen before any provider result.

|Actual command|Observed result|
|---|---|
| `git fetch origin main`; `git rev-parse origin/main` | exit0, exact SHA above |
| `node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round22.mjs` | exit0,108A2=69UNSAFE/39SAFE,42A3,463historical files inventoried,0generation |
| `$env:C3_CHECKPOINT_A_ROUND='21'; node --test apps/worker/evals/single-agent-semantic-verifier/round-22.test.mjs` | observed RED1/3: fixed22 selector absent and profile projection not admitted |
| `$env:C3_CHECKPOINT_A_ROUND='22'; node --test apps/worker/evals/single-agent-semantic-verifier/round-22.test.mjs` before retention support | observed RED2/3: retained label swap was accepted despite recomputed manifest hashes |
| same focused round22 command after minimum support | GREEN3/3,0skip |
| `$env:C3_CHECKPOINT_A_ROUND='22'; $env:C3_TEST_CODEX_TRANSPORT='1'; node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | exit0,124/124,0skip; rerun after local timeout-test correction also124/124 |
| same environment; `node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` | initialexit1,10/11: 25ms deadline elapsed during local startup so actual upstreamcount0; corrected test allowance to1000ms and asserted actualcallcount1,exit0,11/11,0skip |
| `$env:C3_CHECKPOINT_A_ROUND='22'; node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs` | exit0,9/9,0skip |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | exit0,77/77 (43boundary+34Vertex) |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts` | exit0,41/41 (7claims+14assembly+20size),0skip |
| `pnpm --filter @lana/worker typecheck` | exit0,existing dependency builds completed |
| `pnpm --filter @lana/worker build` | exit0,existing dependency builds completed |
| `pnpm --filter @lana/worker lint` | exit0 |
| `node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round22.mjs` with existing approved credential environment | exit0,Codex0.159.2/binarySHA52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a matches frozen;GeminiHIGH/global credentialavailable;0generation |
| `$env:C3_CHECKPOINT_A_ROUND='22'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs` | exit0,FROZEN_PROTOCOL_VALID108/42 |
| `git diff --check`; `git diff --cached --check` at T1 | exit0 |

Protocol delta +15/-8 lines only fixed22 selection/count/retention. New3focused tests. Existing Codex timeout test +7/-2 lines removes an unreliable <25ms local-startup assumption; real provider timeout, request policy and transport remain unchanged. This is local stub evidence, not a provider retry/generation. Existing deterministic boundary RED/GREEN evidence retained; no new semantic runtime behavior or deterministic semantic proof claimed.

Prepared prompt identities exact reviewed files; policy/fit/ACK/receipt/authority sections preserved. Every hard-precheck survivor still has verifier plus final gate, labels stay evaluator-only, bounds tested at maximum draft. No third role/parser/router/regex/template/framework/repair/reverify/new gate/state/production wiring. No shared source or live runtime changed; builds use existing lifecycle. Main/source branch retained; no secrets/customer PII in authored synthetic input. Provider runs and source seals will be recorded only after clean committed executable/config and actual execution.

## A2 execution and audit

Clean runtime a2RunSourceSha `7ec9da2416756619f904373f4c5d97175efd2387` captured after committed executable/config, not written into frozen source. Exact actual commands:

```powershell
$env:C3_CHECKPOINT_A_ROUND='22'; $env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
$env:C3_CHECKPOINT_A_ROUND='22'; $env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
$env:C3_CHECKPOINT_A_ROUND='22'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
$env:C3_CHECKPOINT_A_ROUND='22'; node C:/Users/nguye/AppData/Local/Temp/c3-audit-round22.mjs
```

Preflight/run/validate exit0,A2 PASS108/108=69UNSAFE/39SAFE,0unexecuted,0unsafeeligiblefalsePASS. Safe reject1/39=2.56% (`r4-safe-policy`,MATERIAL_CONDITION_LOSS/exchange:r4), no relabel/rerun. All12newcontrols correct. 104generation requests,max1/retry0/rejectedclient0;provider error1 (`r5-unsafe-delivery`,UPSTREAM_TRANSPORT,httpStatus null),timeout0. That unsafe attempt failed closed; not an observed semantic rejection, retained in denominator. Tokens446388input/11702output,usage gap1,costunknown;verifierp50/p958976/15012ms,added8978/15015ms.

Initial audit helper exit1: report-tool preparation renamed the round prefix before replacing its old review-document name, leaving a nonexistent `c3-round22-policy-entitlement-scope-20261008.md` path. Corrected the Temp helper to select the actual frozen review file; reprepare/audit exit0. No executable/config/prompt/corpus/evidence change or provider retry. Audit matches7sources/11assets at A2seal;104captured bodies exact,labels excluded;461/463historical evalfiles exact,only protocol/test changes declared. Fresh A2PASS permits A3 after evidence commit/clean source seal.

## A3 execution and whole-conversation review

A2 evidence savepoint/runtime a3RunSourceSha `18cbfe227cc3f7cc832a123209b0c203e32139d9`; clean committed executable/config before capture/preflight. Exact executed commands:

```powershell
$env:C3_CHECKPOINT_A_ROUND='22'; $env:A3_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); $env:A2_STATUS='PASS'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3
$env:C3_CHECKPOINT_A_ROUND='22'; $env:A3_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); $env:A2_STATUS='PASS'; node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs
$env:C3_CHECKPOINT_A_ROUND='22'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3
$env:C3_CHECKPOINT_A_ROUND='22'; node C:/Users/nguye/AppData/Local/Temp/c3-score-round22.mjs
$env:C3_CHECKPOINT_A_ROUND='22'; node C:/Users/nguye/AppData/Local/Temp/c3-audit-round22.mjs
```

All exit0. A3 preflight/run/validate42/42 complete,42owner+42mandatoryverifier generation,max1/retry0.37eligible/5fallback,0handoff/no-send;fallback11.90%>10%. One semanticFAIL (`r15-value-use`), four verifierHTTP429 (`r16-effort-and-use`, `r16-budget-alternative`, `r16-change-to-indoor-dress`, `r16-pants-color-alternative`),0ownererrors/0timeouts. No generation retry or further round. Raw run-time quality BLOCKED/MISSING_ALL_TERMINAL_OFFLINE_SCORES retained; this is the pre-review packet, not the final quality result.

Read all42complete histories/currentcustomer/trusted facts/actualterminal before42connected primary reviews and420diagnosticratings. Separate offline quality31PASS/11FAIL, concern7/11,partial7/9,correction6/10,policy8/9,simple3/3;terminalfailure11.90%->A3FAIL/STOP. Fivefallbacks and sixeligiblequality defects are distinct. Height/weight context coverage distinguished from invalid input; owner-approved appearance/elastic advice and relevant cross-sell accepted. No keyword/reference matching, rejected-candidate scoring or human acceptance claim; human-null scores untouched.

Audit exit0:7sources/11frozenassets match both seals,188capturedrequestbodies exact/evaluator labels excluded,461/463historicalfiles exact (declared protocol/testonly).188generation+1OAuth;911821input/69632outputtokens,5usagegaps,costnull. Gemini output2532candidate+50834thinking normalized, legacy raw aggregation untouched. A3verifierp50/p958148/17022ms,added8151/17033ms,end-to-end13904/24158ms. Rate429 observed,quota/reset reason unverified. Final report/export/git/PR delivery recorded after execution below.

## Artifact verification

`$env:C3_CHECKPOINT_A_ROUND='22'; node C:/Users/nguye/AppData/Local/Temp/c3-report-round22.mjs` exit0: A2PASS/A3FAIL/31primaryPASS/recommendationSTOP. Report,all42histories and11failed-turn reviews exported. `$env:C3_CHECKPOINT_A_ROUND='22'; node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round22.mjs` initialexit1 because generated `A3_HUMAN_REVIEW.md` contained trailing spaces from exact raw terminal text. Display-only trim via inline Node,allJSON hashes asserted unchanged,exit0; same exportcheck rerunexit0. Exact42terminal exports/420ratings,188requests/usage/links/human-null packet/sealed inputs verified;rawJSON unchanged. `git diff --check` exit0. No executable/config/prompt/corpus changes or provider retries during reporting.

`node --check C:/Users/nguye/AppData/Local/Temp/c3-publish-round22.mjs` and `node --check C:/Users/nguye/AppData/Local/Temp/c3-readback-round22.mjs` exit0 before delivery. Exportcheck rerunexit0 after final reporting updates; `git add -- apps/worker/evals/single-agent-semantic-verifier/round-22 tasks/plan.md tasks/todo.md`, `git diff --cached --check` exit0. Staged14files are new A3 evidence/reviews/report and audit/readiness/plan/todo only. Source diff against specSHA confirms protocol+15/-8,test+7/-2. Inline Node check of15roundJSON files for recorded access_token/refresh_token/private_key/client_secret/id_token fields exit0; authored synthetic evidence, no credentials retained.

## Git and draft PR delivery

`git commit -m "eval(c3): complete Round22 A3 evidence and STOP review"` exit0,artifactSHA `4d601bd986d3b699eb59309496f5515ede8a905b`. `node C:/Users/nguye/AppData/Local/Temp/c3-publish-round22.mjs` exit0,prepared exact multiline body file. `git push origin feat/c3-semantic-verifier-checkpoint-a-20261005`, `gh pr edit 390 --repo nguyentuanson27-netizen/lanchatbot --title "C3 Checkpoint A: Round22 A2 PASS, A3 FAIL / STOP" --body-file C:/Users/nguye/AppData/Local/Temp/c3-round22-pr-body.md`, `node C:/Users/nguye/AppData/Local/Temp/c3-readback-round22.mjs` all exit0. Readback confirms exact title/body,OPENdraft,clean local HEAD=remote branch=PRhead. Remote `pnpm check` QUEUED at readback;remoteCI PASS unverified. PR records CheckpointAonly,A2PASS/A3FAIL/STOP,models/config/hashes/seals/commands/all42histories/11reviews/current gaps/unknowns. Documentation-only delivery record follows;no executable/input/raw JSON changes or additional provider generations. STOPowner,no automatic next round/post-A/merge/deploy/live send.
