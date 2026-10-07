# Round10 deterministic readiness

implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361 after git fetch origin main exit0 and exact rev-parse. spec/plan/review source f1e504c34fdbaaf056786c71ac33e9f720643b84; T1freeze savepoint4857a9fe. Reuse authorized branch/draftPR390. Frozen66A2 (48UNSAFE/18SAFE),24A3 (5concern/5partial/5correction/6policy/3simple); all drafts/labels/history/evaluator contracts unchanged from Round9. Only v2 prompts and non-seed authored policy context/source change, exact7PR387 seeds retained. Synthetic data, no real-shop readiness.

Actual commands:
- git fetch origin main; git rev-parse origin/main: exit0/base above.
- node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round10.mjs: exit0, frozen inputs prepared without generation.
- C3_CHECKPOINT_A_ROUND=10; node --test apps/worker/evals/single-agent-semantic-verifier/round-10.test.mjs: observed RED exit1/0PASS1FAIL UNKNOWN_CHECKPOINT_ROUND; minimum explicit selector support GREEN exit0/3PASS.
- C3_TEST_CODEX_TRANSPORT=1; node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs: exit0/85PASS/zero skips. Protocol, adapters, captured label firewall, mandatory verifier/final gate. Codex installed-client test uses local upstream stub, not real provider.
- pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts: exit0/77PASS (43boundary/34Vertex).
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts: exit0/21PASS.
- pnpm --filter @lana/worker build: exit0.
- pnpm --filter @lana/worker typecheck: exit0.
- pnpm --filter @lana/worker lint: exit0.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs: exit0/FROZEN_PROTOCOL_VALID.
- git diff --check: exit0.

Build/typecheck dependency hooks ran; no shared-source edits. No API implementation change, reuse frozen documented adapters/config with one request/registered role slot, no retry/continuation/repair. Credential inspection with existing local route: Codex0.159.2/binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a; Gemini credential available/global/HIGH/node24.19.0/helperfb2054f3b82da64be777ba6b3accde769000864e7c8fa7a8346db973f79390fe. Initial inspection lacked process-local credential-path variable and failed before any auth/generation; supplied existing path and succeeded, no secrets recorded. Ancillary rg failed on PowerShell brace/glob syntax; corrected targeted searches. A documentation patch first failed matching a nonexistent heading before any mutation. Local checks are not semantic quality evidence.

Complexity delta: protocol +7/-7lines for explicit round10 support; one focused57line test, reused seam/adapters unchanged. No production entrypoint/shared package/code authority change, new role/layer/parser/router/templates/generic framework/recovery/repair. Both role request bodies checked for24histories with4096-byte verifier placeholder,32,768-byte bound; no evaluator labels/references. Existing protection and final-gate tests reused.

Known raw legacy aggregate limitations: unexecuted safe slots may count as safeFailures after early stop; not observed rejects or measured safe usability. terminalFailureRate with unexecuted denominator is not an observed-terminal rate. Gemini usage uses different keys: report raw records separately; no zero-token or missing-cost claim. Whole-terminal offline review by primary agent is not independent/human/owner acceptance.

Commit complete source/config/frozen inputs and clean tree before runtime source capture/preflight. Do not insert runtime SHA into frozen source. Unsafe send-eligible PASS => A2FAIL/STOP; only A2PASS enables sealed A3. No post-A/deploy/live send.

## T3 actual A2PASS

Committed clean a2RunSourceSha f311a570efcd27efd6df86b1c7ebe4705cf154af; protocol --preflight-a2 exit0; run-a2.mjs exit0/PASS; protocol --validate-a2 exit0; one-off c3-round10-audit.mjs exit0,62captured requests/bindings/final gates reconstruct,7sources/11inputs match seal,166historical JSON/MD/TXT files byte-identical to9afd65ca. All66executed (48UNSAFE/18SAFE), zero observed send-eligible false PASS,0safe rejects/unexecuted.62requests/max1/0errors/timeouts/retries. Verifier p50/p955917/8585ms,183619input/6283outputtokens,costnull. Terminals18SEND_ELIGIBLE/43FALLBACK/5HANDOFF/0NO_SEND;72.73% overall includes intentionally unsafe cases, not safe usability (0/18failure). Offline audit initially read wrong returned-model key, corrected to modelVersion without changing raw evidence; all62reportgpt-6.1-sol. No source/config/input changes after A2seal.

A3runner/generator is already complete and unchanged. Save this A2 evidence/readiness, commit/clean then capture currentHEAD as runtime a3RunSourceSha, preflight with A2PASS. No SHA written into frozen manifest.

## T4 actual A3FAIL and offline review

a3RunSourceSha7572909d4f5730c9faaf9fecc96d2c88c5f933e9, clean preflightA3exit0 with A2PASS. run-a3.mjs exit0/24executed; its qualityBLOCKED awaiting offline scores, not qualityPASS. protocol --validate-a3 exit0 reconstructs valid evidence.24owner+24verifier requests,19eligible/5fallback,0errors/timeouts/retries. Primary read all24actual histories/facts/terminal replies before individual scores; c3-review-round10.mjs exit0/14PASS10FAIL, existing whole-reply scorerFAIL. c3-report-round10.mjs exit0/scoring/request/source/token/report audit,0additional requests.7sources/11frozen inputs match A3seal;48request bodies/gates reconstruct. Raw usage preserved, Gemini legacy aggregate0 invalid; actual token totals in CHECKPOINT_A/audit. Raw pending quality/empty human scores remain unchanged, separate offline scores/quality saved. No prompt/input/runtime change or extra generation after results.

Report helper initially failed JavaScript parsing because Markdown fences inside its template string were not escaped; no repo/output/provider mutation occurred in that failed invocation. Escaped the temporary helper and reran successfully, without changing sealed executable/config/inputs.

Delivery staged git diff --cached --check initially exited2 on provider-owned trailing spaces in three display Markdown packets; the combined shell continued to commit/push16220f5d. Corrected only display line-ending whitespace with an explicit canonical-raw note; a3-evidence.json/raw human JSON unchanged (hash readback). No new provider request/frozen-input/source change. Recheck and final delivery readback follow; do not describe that initial formatting check as PASS.
