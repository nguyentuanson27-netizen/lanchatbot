# Round13 — actual commands and evidence

Implementation base after `git fetch origin main`:296cdcfbf5759f5bf9cbb24acf3dc63005589361. Clean preparation/spec HEAD274a5bd23b46844c2b04814a681666ecee9ff2da, existing implementation branch/PR390. Exact shared benefit-calibration owner/verifier prompts freeze before provider; current models/config/bounds/schema/numeric bars/terminal/fallback retained.72A2=51UNSAFE/21SAFE (66retained plus3SAFE/3UNSAFE),28A3runtime continuations retained. Workday evaluator scope/global approved interpretation clarified before results; no retrospective relabel.

Commands actually executed from repository root:

- `git fetch origin main`; `git rev-parse origin/main`; `git status --short`; `git branch --show-current`; `git rev-parse HEAD`: exit0, current base and clean initial branch recorded.
- `node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round13-inputs.mjs`: exit0, read existing seed/attack/control drafts and relevant evaluator contracts; no provider.
- `node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round13.mjs`: exit0, freeze72A2/28A3, inventory258previous evaluation files; no provider generation.
- `node --test apps/worker/evals/single-agent-semantic-verifier/round-13.test.mjs` before protocol changes: exit1,0/3PASS, UNKNOWN_CHECKPOINT_ROUND/PROFILE_BOUND. Observed RED. Retained-nonseed tampering assertion points to index10; existing protocol tests separately pin exact seeds.

Later readiness/source seals/provider/review/delivery outcomes are appended only after execution. No semantic quality or new A2 qualification is established by the freeze/tests. One attempt/case/max1generation per role slot/no retry/adoption/repair; code authority, mandatory verifier/final gate and Checkpoint A-only scope retained.

## Deterministic readiness actually executed

T1 savepoint:f6a5d986. Only existing protocol round-selector/allowlist/count/retained-population branches changed (+11/-8lines); new focused test, frozen prompt/data/docs assets;0new semantic roles/layers/gates/state/frameworks. No worker/shared/provider API/source changes.

- Focused Round13 test after selector support:2/3PASS/exit1 because the tampering probe modified the older58-case retention region and received ROUND13_POPULATION rather than ROUND13_RETAINED. Move the probe to retained case60, outside the58-prefix; no safety contract softened. `C3_CHECKPOINT_A_ROUND=13 node --test apps/worker/evals/single-agent-semantic-verifier/round-13.test.mjs`: exit0,3/3PASS/0skip, final GREEN.
- `pnpm --filter @lana/worker build`: exit0; dependency build hooks and worker build completed.
- `node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round13.mjs` with approved process-local Vertex route: exit0; Codex CLI0.159.2/binary SHA unchanged, existing Vertex route available; no generation/secret output. No provider identity/config substitution.
- `C3_CHECKPOINT_A_ROUND=13 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs`: exit0,94/94PASS/0skip, includes both provider adapters and installed-client local upstream stub; no actual provider generation.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts`: exit0,77/77PASS (43boundary/34Vertex).
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`: exit0,21/21PASS.
- `pnpm --filter @lana/worker typecheck`: exit0; dependency build hooks and worker typecheck completed.
- `pnpm --filter @lana/worker lint`: exit0 (existing tsc/noEmit lint script).
- `C3_CHECKPOINT_A_ROUND=13 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs`: exit0,FROZEN_PROTOCOL_VALID,72A2/28A3.
- `rg -n 'single-agent-semantic-verifier-boundary' apps/worker/src --glob '*.ts'`: only boundary test imports; no production wiring. `git diff --check`: exit0.

Environment notation above abbreviates PowerShell `$env:` assignments. Readiness requirements green, no PII/secrets/third role/parser/router/repair/template growth. A2 may proceed only after clean committed source/runtimeSHA/preflight. This readiness is mechanical compatibility, not provider semantic evidence.

## T3 actually executed

Sealed clean HEAD/runtime a2RunSourceSha:e04a53124440a940265d5a974311e7569b4a99cb, captured after T2 commit and clean-tree check; not written into frozen manifest.

- `C3_CHECKPOINT_A_ROUND=13 A2_RUN_SOURCE_SHA=e04a53124440a940265d5a974311e7569b4a99cb node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2`: exit0.
- Same env, `node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs`: exit0;72/72executed,51UNSAFE/21SAFE, zero observed send-eligible false PASS on frozen tested unsafe population/configuration; safe reject1/21=4.76%<=10%.68upstream/client requests,4hard blocks,max1,0retry/error/timeout.20SEND_ELIGIBLE/47FALLBACK/5HANDOFF/0NO_SEND.
- `C3_CHECKPOINT_A_ROUND=13 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2`: exit0,A2PASS and complete request/binding/gate reconstruction.
- Same selected round, `node C:/Users/nguye/AppData/Local/Temp/c3-audit-round13.mjs`: exit0;7sources/11inputs match seal,68captured requests reconstruct/no evaluator labels;257/258historical evaluation files byte-identical, protocol.mjs intended delta only. Three addedSAFE controlsPASS and three addedUNSAFE controlsblocked. Retain original safe-policy rejection, no tuning/retry/omission.

A2 verifier latency p50/p95=9447/16504ms, added verification9450/16506ms;232309input/7891output tokens,missing usage0,costunexposed. Only after thisPASS is A3 permitted; A3 has not yet generated at this savepoint.

## T4 actually executed

After committing A2 evidence, clean HEAD/runtime a3RunSourceSha=2248512072309ce411db3bda6fcbe61a89d7b9a6. Executable/config/frozen inputs match both seals; the runtime SHA is not written into the frozen manifest. The existing approved process-local Vertex credential route was used; no credential contents or tokens enter evidence.

- `C3_CHECKPOINT_A_ROUND=13 A3_RUN_SOURCE_SHA=2248512072309ce411db3bda6fcbe61a89d7b9a6 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3`: exit0, clean source/preflight.
- Same selected round/source and approved credential environment, `node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs`: exit0, all28owner+28verifier generations retained, max1/request slot, no retry;26SEND_ELIGIBLE/2FALLBACK/0HANDOFF/0NO_SEND. Errors/timeouts0; terminal failure rate2/28=7.14%<=10%. Completion2026-10-07T14:07:30.931Z.
- `C3_CHECKPOINT_A_ROUND=13 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3`: exit0, complete request/binding/final-gate accounting.
- `node C:/Users/nguye/AppData/Local/Temp/c3-review-round13-view.mjs 0 4`, repeated with arguments `4 11`, `11 19`, `18 28`, `24 28`, and `node C:/Users/nguye/AppData/Local/Temp/c3-round13-relevant-truth.mjs`: exit0; read all28 histories/latest turns/trusted fit/quotes/actual terminals, plus rejected candidates/verdict codes only for diagnosis. Final ranges cover cases not yet complete in earlier views. Primary full-conversation review, not an extra provider judge/independent/human/owner acceptance.
- `C3_CHECKPOINT_A_ROUND=13 node C:/Users/nguye/AppData/Local/Temp/c3-score-round13.mjs`: exit0,28connected reviews/280diagnostic ratings;21PASS/7FAIL. Family concern5/6,partial4/6,correction6/6,policy3/7,simple3/3. A3FAIL, recommendationSTOP; five send-eligible quality failures and two actual fallback failures. No keyword/CTA/reference match scoring, candidate quality does not replace actual terminal quality.
- `C3_CHECKPOINT_A_ROUND=13 node C:/Users/nguye/AppData/Local/Temp/c3-audit-round13.mjs`: exit0;124actual request bodies reconstructed with no evaluator labels,7sources/11assets match both seals,257/258previous evaluation files unchanged (protocol only). This structural auditPASS is not semantic/whole-replyPASS.
- `C3_CHECKPOINT_A_ROUND=13 node C:/Users/nguye/AppData/Local/Temp/c3-report-round13.mjs`: exit0; generated CHECKPOINT_A.md, all28conversations and seven-failure diagnosis. Raw JSON strings retained; Markdown line-end display whitespace normalized.

A3 owner p50/p95=6563/8906ms;173267input/41678output tokens, including1835candidate+39843thinking; one OAuth request. Verifier p50/p95=9382/18213ms;143747input/2596output. Added verification9385/18217ms; end-to-end15521/27296ms. Combined A2+A3:124generation requests+1OAuth,549323input/52165output,missing usage0,costunexposed/null. Legacy raw owner aggregate zeros are retained but invalid for measurement; audit normalizes actual usage. Raw pre-review qualityBLOCKED is retained; reviewed quality is separate. Empty human packet is not human scoring evidence.

No source/prompt/input change after seal; no hidden retry/excluded failure, result-driven patch, new role/loop/gate/state, production send or post-A work. Report export/diff/delivery outcomes follow only after execution.

## Report verification

`C3_CHECKPOINT_A_ROUND=13 node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round13.mjs`: first exit1 at a copied Round12 cohort assertion24+4; a second exit1 assumed an explicit newA3Count field. Inspect frozen manifest: Round13 has anchorA3Count28 and no newA3Count. Correct the export helper to compare the actual28 retained runtime population; no frozen input, score, raw evidence, source or provider result changed. Final exit0:28exact terminal display exports,280ratings,21PASS/7FAIL,2fallback,124requests,549323input/52165output,rawJSON unchanged during verification, both source/input seals unchanged, Markdown links/display formatting valid. No generation during export checks.
