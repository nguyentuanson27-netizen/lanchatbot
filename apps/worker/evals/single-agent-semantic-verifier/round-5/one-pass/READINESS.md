# Round5 one-pass continuation readiness

Owner changes future cases to one attempt,2026-10-06. Approved amended plan source94fc894c7b2b4999a2fa829b24cdb15a0e673b67; implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361. Same authorized round, no post-A.

Original198-registration run stopped after92completed results at the next source-cleanliness check when OWNER_AMENDMENT.md was created. Its in-flight result/accounting was saved before stopping. Original evidence bytes SHA25649e086a4fc145e9a113340323f7d84c546ceb031b1f5fad066ea8cd6f1fdf0d3; original a2RunSourceSha6e371a13d8f257d556e3a5b28e50d16b41f15552. Exit1 A2_RUN_FAILED_CLOSED is an intentional owner interruption, not A2PASS. All198 registrations/92results/106unexecuted, including83requests and2transport errors, remain in ../a2-evidence.json.

Amended registrations adopt every92completed attempt with original source SHA, then35untouched cases once=127actual A2 outcomes (104unsafe/23safe).35old first slots carry forward;71extra repetitions withdrawn by owner. Never rerun a completed case, drop an error or select a representative repetition. A3 frozen20cases once. Models/prompts/corpora/quality/usability/fallback identities unchanged; only registration policy and source identity amended before any continuation result.

Actual commands/results after amendment:

- `node C:/Users/nguye/AppData/Local/Temp/c3-r5-one-pass-freeze.mjs .`:exit0,92adopted/35remaining/127amended A2/20A3.
- `node --test apps/worker/evals/single-agent-semantic-verifier/one-pass.test.mjs`:observed RED0pass/2fail (wrong input selector; missing registration function), then minimum GREEN2/2.
- C3_CHECKPOINT_A_ROUND=5,C3_TEST_CODEX_TRANSPORT=1; `node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs`:56/56PASS,0skips, including11adapter tests against local stub only.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts`:77/77PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21/21PASS.
- `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker lint`:each actual exit0 after amendment.
- C3_CHECKPOINT_A_ROUND=5,C3_CHECKPOINT_A_ONE_PASS=1; `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs`:FROZEN_PROTOCOL_VALID,exit0.
- `git diff --check`:exit0.

Minimum amendment executable delta22added/6deleted lines in existing protocol/runner; no new online role/layer/parser/router/repair/framework/production gate. Original Round5 delta13added/9deleted in protocol/A3 runner remains. No apps/worker/src or shared package source touched this round. Pending clean sealed continuation source, provider results and terminal assessment. Same alias/model correlation and synthetic single-turn limitations persist.

## Observed A2 continuation

Clean a2RunSourceSha651b2569df7553dd4f970496125b963d30924789; preflight-a2 exit0, run-a2 exit0, validate-a2 exit0 with C3_CHECKPOINT_A_ROUND=5,C3_CHECKPOINT_A_ONE_PASS=1,A2_RUN_SOURCE_SHA captured from HEAD. Complete amended127/127 actual outcomes (92adopted unchanged+35new):104unsafe/23safe, zero observed send-eligible false PASS on the frozen tested population/configuration. A2PASS; safe rejection2/23=8.695652%, both retained (r4-safe-sale:1,r4-safe-policy:1). Original198registration and71owner-withdrawn extra repetitions disclosed above, not silently deleted.

117actual requests, max1 per slot,0continuations/retries,2UPSTREAM_TRANSPORT errors retained from original source,0timeouts, usage unavailable2, cost unavailable. New continuation made34requests (one expired-profile precheck), without provider errors. Every surviving draft invoked verifier. Actual terminals21SEND_ELIGIBLE/93FALLBACK/13HANDOFF/0NO_SEND; intentionally unsafe outcomes dominate overall non-send83.46%, safe denominator remains23.

`node C:/Users/nguye/AppData/Local/Temp/c3-r5-audit.mjs .`:exit0,53older artifacts byte-identical,5current executable/7frozen files match continuation source,92prior results exactly preserved, all117captured bodies exclude evaluator fields/IDs/references/amendment metadata and use frozen model/high/no-tools. No new model choice, rescue tuning or omitted generation. Only A2PASS permits the frozen20-outcome A3.

## Observed A3 and individual assessment

Clean a3RunSourceSha1b701970cb168ea5722848cf274bde33e4150182, with A2evidence committed. C3_CHECKPOINT_A_ROUND=5,C3_CHECKPOINT_A_ONE_PASS=1,A3_RUN_SOURCE_SHA captured from HEAD,A2_STATUS=PASS; preflight-a3/run-a3/validate-a3 each actual exit0.20/20owner generations and20/20mandatory verifier generations, all20exact SEND_ELIGIBLE;0provider errors/timeouts/fallback/handoff/no-send. Raw unscored qualityBLOCKED and null human placeholders remain unchanged, not provider BLOCKED.

Read every20full histories and20actual terminal replies. `node C:/Users/nguye/AppData/Local/Temp/c3-r5-assessment.mjs .`:final exit0,200individual ratings, each with exact terminal quote+case-specific reason; qualityFAIL10/20. Families concern2/4,partial2/4,correction1/5,policy3/4,simple2/3;9naturalness failures and one unsupported nextStep0, price-objection usefulness/next-step weak. All safety2; next-step errors are not mislabeled as observed effects/PII leaks. Primary-agent offline review is not blind/independent/human acceptance. First assembly rejected one lowercased quote, fixed quote capitalization only, then all200quote checks passed with scores/bars unchanged.

Final `node C:/Users/nguye/AppData/Local/Temp/c3-r5-audit.mjs . write`:exit0,157actual captured upstream requests/max1, zero evaluator label/ID/reference/amendment leakage, old53artifacts and all92adopted outcomes preserved. `node C:/Users/nguye/AppData/Local/Temp/c3-r5-report.mjs .`:final exit0, complete report plus parent pointer. Temporary Markdown formatter initially had two JavaScript quoting errors, corrected in the local helper only; no provider/runtime/frozen-source edit or rerun. `git diff --check`:exit0 after assembled artifacts.

STOP recommendation. No automatic additional round, post-A implementation, merge/deploy/live send. Full actual evidence/provenance/limits in CHECKPOINT_A.md; all histories A3_CONVERSATIONS.md and phrase-grounded scores A3_CODEX_REVIEW.md/a3-codex-assessment.json.

## Publication readback

Evidence savepointac9470b815a306cde8e541268d54101642cb8608 pushed to the existing implementation branch; GitHub connector readback confirms draftPR390head/title/body A2PASS/A3FAIL/STOP. GitHub API read over local gh timed out, connector succeeded. SSH22 delivery fetch timed out; strict-known-host existing-identity SSH443 fetch/push exit0, main unchanged296cdcfbf5759f5bf9cbb24acf3dc63005589361. Provider route/config unaffected. CI run37481641515 queued at artifact publication, not claimedPASS. Final documentation follow-up changes only plan/todo/readiness/report and preserves sealed source/inputs/raw captures.
