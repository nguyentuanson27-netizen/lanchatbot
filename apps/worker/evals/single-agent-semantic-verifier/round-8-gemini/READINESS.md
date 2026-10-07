# Round8 Gemini owner comparison — deterministic readiness

Status: GREEN before provider generation. Frozen spec/plan savepoint abcd8f35f178eff53e47945ab1ccb13783ffb32b; T1 inputs b9559c30. implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361 after main refresh. Work remains Checkpoint A only.

Environment for evaluation commands: C3_CHECKPOINT_A_ROUND=8-gemini; installed-client stub tests also C3_TEST_CODEX_TRANSPORT=1. Gemini runtime uses C3_VERTEX_CREDENTIAL_FILE pointing to the existing local service-account file; path/secret contents are not recorded in frozen inputs or provider evidence.

Actual commands and observed outcomes:

- SSH443 git fetch origin main: exit0; origin/main SHA296cdcfbf5759f5bf9cbb24acf3dc63005589361.
- Focused RED with selector8: node --test apps/worker/evals/single-agent-semantic-verifier/round-8-gemini.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs — exit1,1PASS/11FAIL. MODEL_IDENTITY/OpenAI envelope mismatch and missing Gemini implementation observed.
- Same focused command with selector8-gemini after minimum implementation: exit0,12/12PASS.
- pnpm --filter @lana/worker build — exit0, including existing workspace dependency build hooks.
- pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts — exit0,77/77PASS.
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts — exit0,21/21PASS.
- node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs with stub flag1 — exit0,77/77PASS, zero skipped. Includes protocol, deterministic boundary runner, all historical rounds, Gemini adapter, mandatory verification and captured request firewall tests.
- node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs with stub flag1 — exit0,11/11PASS; installed CLI/local upstream stub, zero provider generation.
- pnpm --filter @lana/worker typecheck — exit0, including existing dependency build hooks.
- pnpm --filter @lana/worker lint — exit0.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs with selector8-gemini — exit0,FROZEN_PROTOCOL_VALID.
- git diff --check — exit0 before seal.
- Installed Codex inspection:0.159.2/binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a. Gemini credential inspection initially failed because the credential path environment variable was omitted; corrected command with the existing path exit0. No auth or generation request during inspection.
- One metadata readback was truncated by the tool output limit and failed JSON parsing; this was a readback error, no source/frozen-input mutation or provider request.

Official current documentation checked before API implementation:
https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash-lite
https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking
https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/inference
Model ID gemini-3.5-flash-lite/global; HIGH supported. No custom sampling/penalty fields; one generateContent text candidate, no tools, no retry. Response identity/STOP/final text/UTF8 bounds fail closed. OAuth JWT/endpoint reuse existing Vertex helpers; prior structured agent/proposal and retry seam not used.

All six copied input files are byte-identical to Round8; both prompt hashes/schema/scoring/fallback/state and byte bounds retained. New variant is explicit and restricted to Round8 Gemini owner; verifier remains exact original provider/config. No production entrypoint import, new semantic role, model judge, router/parser/template/repair loop or shared-package source change. This adds one evaluation-only native-fetch text adapter and concrete variant support, no provider framework. Credential/token/JWT/header/raw error/private thoughts never serialized.

A2/A3 run-source SHAs are runtime metadata captured only after clean committed executable/config/frozen inputs. They are not written into this frozen manifest. Provider runs not started when this readiness record was written; no inherited provider PASS.

Staged formatting check later detected three extra blank lines at EOF in new files. A formatting command first failed shell parsing before execution; corrected formatting only before any provider generation, then repeated working-tree/staged checks exit0. No runtime behavior/frozen input changes; clean preflight repeated on final committed source.

## T3 execution

C3_CHECKPOINT_A_ROUND=8-gemini; A2_RUN_SOURCE_SHA=fa24c94f80e0c200f6430d294d2f5e7dcdda2c7a. Committed source/worktree clean before preflight. A formatting-only preceding source also passed preflight but was not run; source was resealed at the SHA above.

- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2 — exit0.
- node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs — exit0,A2PASS66/66,48UNSAFE/18SAFE; unsafe send-eligible falsePASS0/safe failures0;62generation requests/max1,0errors/timeouts/retries.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2 — exit0, complete denominator/request/binding/final-gate readback.
- SSH443 git push origin HEAD of sealed source — exit0.

All returned verifier model IDs gpt-6.1-sol. No Gemini generation yet; A3 permitted only after this fresh A2PASS. Original Round8 evidence preserved.

## T4 execution and offline review

C3_CHECKPOINT_A_ROUND=8-gemini; A2_STATUS=PASS; A3_RUN_SOURCE_SHA=b7e08321d6bb6a16e486e0ae9277912801f8ed33. Existing C3_VERTEX_CREDENTIAL_FILE path supplied locally; no credential value retained. Committed/clean preflight before generation.

- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3 — exit0.
- node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs — exit0,24registered/executed owner slots plus23mandatory verifiers; initial qualityBLOCKED waiting offline scores.16SEND_ELIGIBLE/8FALLBACK; one owner PROVIDER_ERROR, HTTP200/nullfinishReason, no retry. Exit0 is not A3qualityPASS.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3 — exit0 before review, complete evidence/qualityBLOCKED.
- node C:/Users/nguye/AppData/Local/Temp/c3-r8-gemini-export.mjs — exit0, primary-agent whole-conversation review14/24/qualityFAIL and240diagnostic scores, raw attempts/operational unchanged; zero provider requests.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3 — exit0 after review, valid qualityFAIL/24complete scored outcomes.
- node C:/Users/nguye/AppData/Local/Temp/c3-r8-gemini-audit.mjs — exit0, source/frozen-input/compiled executable/historical artifact/request/firewall/terminal/review readback.109generation requests/max1 plus1OAuth;129older artifacts unchanged.
- SSH443 git push origin HEAD for the sealed A3 source — exit0.

Known defect discovered by post-run readback: legacy operational() only sums OpenAI usage keys, so Gemini operational aggregate zero token counts are invalid. Retain all raw records and the original aggregate. Offline audit/report reads23Gemini usage records147135input/27348output; one failed slot usageunknown. Combined known subtotal367503input/37208output, costunavailable. No executable change, source reseal or repeat generation to repair observations. Exact provider cause for HTTP200/nullfinishReason is unknown; no raw payload reconstructed.

RecommendationSTOP: A2PASS/A3FAIL, fallback8/24 above10% plus family/consultation failures. No provider judge, regex/template rescue, production wiring/post-A work, automatic next round/merge/deploy/live send. Artifact-only delivery changes do not justify repeating unchanged worker checks.

- node C:/Users/nguye/AppData/Local/Temp/c3-r8-gemini-report-check.mjs — exit0,12reported hashes match frozen inputs;24assessment terminal texts match raw outcomes;109request denominator/known token subtotal/qualityFAIL integrity checked.
- git diff --check — exit0 after artifact/document updates; staged formatting checked before evidence commit.

The first staged artifact check exited2 on12trailing-space lines in two conversation/review Markdown files. They are exact Gemini terminal text inside fenced blocks (six occurrences per file), not source formatting. Preserve those bytes. Ordinary staged check excludes exactly A3_CONVERSATIONS.md/A3_HUMAN_REVIEW.md; a separate scoped check disables blank-at-eol only for those two files. Exact fenced texts are checked against all24raw outcomes. No reply normalization, .gitattributes growth or provider rerun. The attempted evidence commit did not run after the failed check; following push reported already up-to-date.
