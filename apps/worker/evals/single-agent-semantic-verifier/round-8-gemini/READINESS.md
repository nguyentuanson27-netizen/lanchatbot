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
