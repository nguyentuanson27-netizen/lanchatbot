# Round18 — actual deterministic readiness

T1savepoint d1786765. Main refreshed to296cdcfbf5759f5bf9cbb24acf3dc63005589361; starting/spec1cb2bc15c24ffa7b177f54262652907ae5d88f9d. Read required spec/amendment/plan/todo/project guidance before changes. Checkpoint A only. Local provider route inspection made0generations. Official Google model/thinking docs checked before reusing unchanged Vertex adapter.

Commands below actually executed in the implementation worktree. Node uses C3_CHECKPOINT_A_ROUND=18 except the isolated fit RED used17 to bypass the then-unsupported18 selector. C3_TEST_CODEX_TRANSPORT=1 enables installed CLI/local stub tests with0provider generation.

| Actual command | Observed result |
|---|---|
| selected17 node --test --test-name-pattern='indoor dress' apps/worker/evals/single-agent-semantic-verifier/round-18.test.mjs before correction | exit1,0/1, missing current VA512 fit assertion |
| selected18 node --test apps/worker/evals/single-agent-semantic-verifier/round-18.test.mjs before selector support | exit1 UNKNOWN_CHECKPOINT_ROUND,0/1 |
| same focused test after initial correction | exit1,2/3; gate STALE because existing profile sourceVersions had not been bound to new factSnapshotVersion |
| same focused test after binding correction | exit0,3/3,0skip |
| C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs | exit0,112/112,0skip; protocol/firewall/runner/Codex/Gemini adapter including installed CLI/local stubs |
| C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs | exit0,11/11,0skip; no model generation |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts | exit0,21/21 |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker build | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0 FROZEN_PROTOCOL_VALID,84A2/42A3 |
| node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round16.mjs with approved local credential path in env | exit0; same approved Codex0.159.2/binary hash and VertexGeminiHIGH/global route available,0generation; no credential output |
| historical hash inventory/readback in local preparation helper | exit0,372/373existing evalfiles exact; only protocol.mjs changed |
| git diff --check | exit0 |

Minimum fix: offline VA512 fit from unchanged existing SizeEngine/profile/chart, matching snapshot metadata on its two unchanged-content profile envelopes; fixed18 evaluation selection/retention assertions. Protocol+25/-7lines and3newtests. Shared/production boundary, provider adapters, every historical corpus/prompt/evidence/review unchanged. Online semantic roles/layers/gates/state added0; no parser/router/templates/regex/framework/repair/reverify/third role or production wiring. Numeric bars and verifier prompt unchanged. Readiness GREEN before providers. Subsequent actual phase commands/results will be appended after execution.

## T3 — observed real provider execution

Clean executable/config runtime a2RunSourceSha `151dc2c3a07a2f7a0e082ea975bbaf8f1e38339a`. Actual commands with C3_CHECKPOINT_A_ROUND=18: capture A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); protocol.mjs --preflight-a2; run-a2.mjs; protocol.mjs --validate-a2; node C:/Users/nguye/AppData/Local/Temp/c3-audit-round18.mjs. All exit0. A2PASS84/84,57UNSAFE/27SAFE,unsafe eligiblefalsePASS0,safe reject1/27=3.70%,80generations/max1/retry0,error0/timeout0,all usage available. Retained safe r4-safe-policy rejected MATERIAL_CONDITION_LOSS; no corpus or prompt rescue.7sources/11frozenassets/80capturedbodies match;372/373historical evalfiles exact,protocolonly. Only now A3 permitted.

## T4 — observed generation, review and export

Clean runtime a3RunSourceSha `b68b58b6fa2ad224116e77d47bcc8ca4d0e77c7d`. C3_CHECKPOINT_A_ROUND=18; approved local Vertex credential file supplied through env,not repo/output; A3_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); A2_STATUS=PASS. Actual commands: protocol.mjs --preflight-a3; run-a3.mjs; protocol.mjs --validate-a3; node C:/Users/nguye/AppData/Local/Temp/c3-review-round18-compact.mjs with ranges0–4,4–9,9–16,14–21,20–27,25–33,32–40,38–42; node C:/Users/nguye/AppData/Local/Temp/c3-score-round18.mjs; c3-audit-round18.mjs; c3-report-round18.mjs; c3-verify-export-round18.mjs. Each exit0. Review read each complete history/current request/actual terminal before its10diagnostic ratings; pending printed rows were revisited,not treated as completed outcomes. No extra provider judge.

42owner+42mandatoryverifier once,max1/retry0,error0/timeout0,36eligible/6fallback/0handoff/0no-send. Raw qualityBLOCKED and human-null preserved;separate primary42reviews/420ratings yield24PASS/18FAIL,A3FAIL/STOP,not independent/human/owner acceptance. Families6/11concern,6/9partial,7/10correction,2/9policy,3/3simple. Fallback14.29%>10%. Repaired VA512fit casePASS separately.

Audit7sources/11assets/164capturedbodies exact;372/373old evalfiles unchanged,protocolonly. Export verifies42exactterminals/420ratings,raw JSON unchanged,sealed inputs unchanged/links valid/human-null. Total164generation+1auth,744751input/71461outputtokens,Gemini2221candidate+55913thinking. Costunknown. Raw operational helper Gemini token keys unsupported;normalized audit reads captured usage rather than changing source/raw evidence. A3verifierp50/p957014/13964ms;addedverification7020/13971ms;end-to-end13095/19350ms. No result-driven prompt/regex/template patch or post-A.
