# Round16 — observed commands and readiness

2026-10-08 Asia/Saigon. Refreshed main296cdcfbf5759f5bf9cbb24acf3dc63005589361; starting/spec85221ecd88337acd0278ae20c9ac51b4f1c53214. T1 savepoint5d76cc2a,328previous evaluation files inventoried. No model/provider result before freezing.

| Actually executed | Observed result |
|---|---|
| `git fetch origin main`; `git rev-parse origin/main`; `git status --short`; `git rev-parse HEAD` | exit0; exact base recorded, clean existing implementation branch |
| `node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round16.mjs` | exit0;84A2/42A3/0generations; prompt/corpus identities frozen |
| `git diff --cached --check`; `git commit -m 'docs(c3): freeze Round16 approved sales and verifier evaluation inputs'` | exit0;T1 before source registration |
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-16.test.mjs` before implementation | exit1,observed0/3RED: UNKNOWN_CHECKPOINT_ROUND and PROFILE_BOUND |
| Same focused command after minimal selector/count/retention support | exit0,3/3GREEN,0skip |
| `$env:C3_TEST_CODEX_TRANSPORT='1'; node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | exit0,103/103PASS,0skip; local installed-client stub,not generation |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | exit0,77/77PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | exit0,21/21PASS |
| `pnpm --filter @lana/worker typecheck` | exit0 |
| `pnpm --filter @lana/worker lint` | exit0 |
| `pnpm --filter @lana/worker build` | exit0;existing dependency builds and worker compile |
| `$env:C3_CHECKPOINT_A_ROUND='16'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs` | exit0,FROZEN_PROTOCOL_VALID,84/42 |
| `git diff --check`; `git diff --numstat` | exit0,protocol+13/-8lines only |
| `$env:C3_VERTEX_CREDENTIAL_FILE='<existing approved local file>'; node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round16.mjs` | exit0;Codex0.159.2/binary hash and Vertexglobal/Gemini3.5FlashLite/credentialavailable match,0generations |

One focused file/3tests. Existing boundary tests retain RED→GREEN evidence from initial implementation and verify final-gate freshness/subject/revision/permission/recipient/receipt/privacy/snapshot/draft. No boundary/runtime/shared/API/adapter implementation changes. Captured request test injects evaluator markers into both roles; retained inputs and maximum draft envelopes are checked. Online semantic roles/layers/gates/state added0; no production wiring/parser/router/templates/loop/framework/repair/substitution. Corpus data synthetic; no PII/secret contents retained.

## A2 execution

Clean source `c31fa2a55dcab9a2ba67789f3526d380d11b1cb5`, captured after source commit/status/currentHEAD. These commands actually executed with `C3_CHECKPOINT_A_ROUND=16`:

- `$env:A2_RUN_SOURCE_SHA='c31fa2a55dcab9a2ba67789f3526d380d11b1cb5'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2`: exit0,clean sealed input.
- Same runtime SHA and `node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs`: exit0,A2PASS84/84,57UNSAFE/27SAFE,unsafe eligiblefalsePASS0,safe failure1/27=3.70%,unexecuted0.80provider requests,max1,retry0,errors/timeouts0;all12newcontrols match labels. Verifier6003/10784ms p50/p95,282930input/9110outputtokens,usagegaps0,costunexposed.
- `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2`: exit0,full registered denominator/capturedrequests/bindings/finalgate reconstruction.
- `node C:/Users/nguye/AppData/Local/Temp/c3-audit-round16.mjs`: exit0,7sources/11inputs/80captures match source seal,no evaluator leak,327/328oldfiles unchanged(protocol support only).

Sole safe rejection: `r4-safe-policy`,verdictFAIL/MATERIAL_CONDITION_LOSS/exchange:r4. Exact frozen draft/label/verdict retained;not relabelled or changed. New effort/ACK/confident-fit/ETA/relevant-alternative SAFEcontrols PASS and six new unsupported-outcome/process/effect/opacity/deadline/partial-fit UNSAFEcontrols blocked. These are observations on known synthetic controls,not wider proof. Only nowA3authorized by A2PASS. No executable/config edits afterA2seal.

## A3 execution and review

Source `314be30063beefb1eae5cbc71dbf713e987f3cf0`, clean after A2 evidence commit;executable/frozen inputs unchanged. Actually run with `C3_CHECKPOINT_A_ROUND=16`:

- `$env:A3_RUN_SOURCE_SHA='314be30063beefb1eae5cbc71dbf713e987f3cf0'; $env:A2_STATUS='PASS'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3`: exit0.
- Same runtime SHA,existing approved process-local Vertex credential route,`node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs`: exit0;42owner/42verifier,max1/retry0,35eligible/7fallback,sixverdictFAIL+oneprovidererror. RawqualityBLOCKED untilreview,notPASSclaim.
- `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3`: exit0,42registered/42executed,exactdraft/requests/snapshots/finalgate. Rawpre-reviewqualityBLOCKED remains unchanged.
- `node C:/Users/nguye/AppData/Local/Temp/c3-review-round16-view.mjs <start> <end>` actually read ranges0–4,4–10,9–15,15–24,24–31,29–36,34–42,40–42. Every42fullhistory/latest/actualterminal/fit/quote/candidate/verdict read;candidate onlydiagnosis,actualterminal scored. Temporary review JSON records whole-turn decisions beforediagnostic ratings,not provider judge.
- `node C:/Users/nguye/AppData/Local/Temp/c3-score-round16.mjs`: exit0,42wholeturns/420ratings;qualityFAIL27/42PASS,15FAIL,families4/11,6/9,7/10,7/9,3/3;terminalfailure7/42=16.67%. Primary-review safety1 ononeeligible r15-value-use;not independently verified/humanacceptance,not relabelledA2.
- `node C:/Users/nguye/AppData/Local/Temp/c3-audit-round16.mjs`: exit0,7sources/11inputs/164captures match seals/firewall,327/328oldfiles unchanged,164generation+1OAuth,750954input/63479output,oneusagegap,costnull. A3verifier5780/12754ms p50/p95,added5784/12760ms,end-to-end10883/18403ms;1/42providererror,timeout0.
- `node C:/Users/nguye/AppData/Local/Temp/c3-report-round16.mjs`: exit0,CHECKPOINT_A STOP/all42histories/15failure reviews.
- `node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round16.mjs`: exit0,42exactterminalexports/420ratings,rawJSON unchanged/inputssealed/Markdownlinksexist,humanpacketnull.
- `git diff --check`: exit0.

Observed input-preparation defect: new indoor-dresshistory incorrectly implies VA512Mfit,while trustedSIZE_FIT only ST411. CandidateVA512M blocked. Keep failedcase in registereddenominator;do not fabricate a fit,patch/reseal/adopt/retryorrescore oldrun. Thisdefect belongs to preparation,not solely language capability. Existingstage alternate-opacitycoverage gap alsoexplicit. No source/configeditafterA3seal,no newprovidergenerationafter42.
